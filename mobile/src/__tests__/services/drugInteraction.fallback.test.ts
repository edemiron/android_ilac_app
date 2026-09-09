/**
 * Y3 — RxNav API hatası "etkileşim yok" sayılıp yerel fallback'i atlıyordu.
 *
 * ── Kusur ──────────────────────────────────────────────────────────────────
 * `checkInteractionsFromAPI`'nin catch bloğu hata SİNYALİ VERMEDEN
 * `{ hasInteractions: false, interactions: [] }` dönüyordu. Çağıran taraf da
 * koşulsuz `apiSuccess = true` set ediyordu ("API başarılı çalıştı, sonuç boş
 * dönse bile"). Fallback kapısı `if (!apiSuccess || rxcuis.length < drugNames.length)`
 * olduğundan, tüm ilaçlar RxCUI'ye çevrilmişse ve API AĞ HATASI verdiyse yerel
 * veritabanı HİÇ sorgulanmıyordu.
 *
 * Sonuç: çevrimdışı veya kötü ağda kullanıcı "etkileşim bulunamadı" görüyordu —
 * aspirin+varfarin gibi YEREL DB'de kayıtlı yüksek riskli bir çift için bile.
 * Klinik güvenlik ekranının en tehlikeli sessiz başarısızlık modu.
 *
 * ── Neden bu dosya ayrı ────────────────────────────────────────────────────
 * Ana paket `drugInteraction.test.ts` `describe.skip` ile atlanmış durumda
 * (eski senkron imzayı bekliyor) VE `tsconfig.json`'dan hariç tutulmuş. Yani
 * etkileşim servisinin CI kapsaması bu dosya eklenene kadar SIFIRDI ve Y3
 * sınıfı bir regresyon yakalanamazdı.
 *
 * Ayrıca `response.ok` hiç kontrol edilmiyordu: 500 / 429 / bir HTML hata
 * sayfası da sessizce `hasInteractions:false` üretiyordu.
 */

import {
  checkInteractionsFromAPI,
  checkMultipleInteractions,
  type ApiInteractionCheckResult,
} from '../../services/drugInteraction';

const RXCUI_URL = '/REST/rxcui.json';
const INTERACTION_URL = '/REST/interaction/list.json';

const mockFetch = jest.fn();

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('checkInteractionsFromAPI — ok bayrağı', () => {
  it('ağ hatasında ok=false döner (hasInteractions:false DEĞİL, "ulaşılamadı")', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network request failed'));

    const result: ApiInteractionCheckResult = await checkInteractionsFromAPI(
      ['111', '222'],
      ['aspirin', 'warfarin']
    );

    expect(result.ok).toBe(false);
    expect(result.interactions).toEqual([]);
  });

  it('HTTP 500 durumunda ok=false döner', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    const result = await checkInteractionsFromAPI(['111', '222'], ['aspirin', 'warfarin']);

    expect(result.ok).toBe(false);
  });

  it('HTTP 429 (rate limit) durumunda ok=false döner', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({}),
    });

    const result = await checkInteractionsFromAPI(['111', '222'], ['aspirin', 'warfarin']);

    expect(result.ok).toBe(false);
  });

  it('başarılı ama BOŞ yanıt ok=true döner — "gerçekten etkileşim yok" güvenilirdir', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}), // fullInteractionTypeGroup yok
    });

    const result = await checkInteractionsFromAPI(['111', '222'], ['aspirin', 'warfarin']);

    // Bu ayrım kritik: ok=true + boş liste = API gerçekten yanıt verdi.
    // ok=false + boş liste = API'ye ulaşılamadı. İkisi aynı ŞEY DEĞİL.
    expect(result.ok).toBe(true);
    expect(result.hasInteractions).toBe(false);
  });
});

describe('checkMultipleInteractions — Y3 regresyon kapısı', () => {
  /**
   * İki fetch'i ayırt ederek mock'lar:
   *  - rxcui.json → BAŞARILI (her ilaca farklı RxCUI)
   *  - interaction/list.json → istenen şekilde başarısız
   *
   * RxCUI lookup'un başarılı olması ŞART: kusur yalnızca
   * `rxcuis.length === drugNames.length` iken tetikleniyordu. Lookup
   * başarısız olsaydı eski kod da fallback'e düşerdi ve test hiçbir şey
   * kanıtlamazdı.
   */
  const mockLookupsSucceed = () => {
    let counter = 0;
    mockFetch.mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.includes(RXCUI_URL)) {
        counter += 1;
        return {
          ok: true,
          status: 200,
          json: async () => ({ idGroup: { rxnormId: [`cui-${counter}`] } }),
        };
      }
      if (typeof url === 'string' && url.includes(INTERACTION_URL)) {
        throw new Error('Network request failed');
      }
      throw new Error(`Beklenmeyen URL: ${url}`);
    });
  };

  it('⚠️ API ağ hatası verdiğinde YEREL veritabanına düşer ve aspirin+varfarin bulur', async () => {
    mockLookupsSucceed();

    const result = await checkMultipleInteractions(['aspirin', 'warfarin']);

    // Eski kodda bu assert BAŞARISIZ olurdu: apiSuccess=true set edildiği ve
    // rxcuis.length === drugNames.length olduğu için yerel DB hiç
    // sorgulanmıyor, kullanıcı "etkileşim yok" görüyordu.
    expect(result.hasInteractions).toBe(true);
    const pair = result.interactions.find(
      i =>
        (i.drug1.toLowerCase().includes('aspirin') && i.drug2.toLowerCase().includes('warfarin')) ||
        (i.drug1.toLowerCase().includes('warfarin') && i.drug2.toLowerCase().includes('aspirin'))
    );
    expect(pair).toBeDefined();
    expect(pair?.severity).toBe('high');
  });

  it('⚠️ API HTTP 500 verdiğinde de YEREL veritabanına düşer', async () => {
    let counter = 0;
    mockFetch.mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.includes(RXCUI_URL)) {
        counter += 1;
        return {
          ok: true,
          status: 200,
          json: async () => ({ idGroup: { rxnormId: [`cui-${counter}`] } }),
        };
      }
      if (typeof url === 'string' && url.includes(INTERACTION_URL)) {
        return { ok: false, status: 500, json: async () => ({}) };
      }
      throw new Error(`Beklenmeyen URL: ${url}`);
    });

    const result = await checkMultipleInteractions(['aspirin', 'warfarin']);

    expect(result.hasInteractions).toBe(true);
  });

  it('API BAŞARILI ve etkileşim yoksa yerel DB gereksiz yere çalıştırılmaz', async () => {
    let counter = 0;
    mockFetch.mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.includes(RXCUI_URL)) {
        counter += 1;
        return {
          ok: true,
          status: 200,
          json: async () => ({ idGroup: { rxnormId: [`cui-${counter}`] } }),
        };
      }
      if (typeof url === 'string' && url.includes(INTERACTION_URL)) {
        return { ok: true, status: 200, json: async () => ({}) };
      }
      throw new Error(`Beklenmeyen URL: ${url}`);
    });

    // Yerel DB'de kayıtlı bir çift kullanıyoruz: eğer fallback yanlışlıkla
    // çalışırsa etkileşim BULUR ve bu test kırılır. Yani bu assert, düzeltmenin
    // "her zaman fallback"e kaçmadığını da kilitliyor.
    const result = await checkMultipleInteractions(['aspirin', 'warfarin']);

    expect(result.hasInteractions).toBe(false);
  });
});
