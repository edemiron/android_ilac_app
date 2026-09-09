/**
 * K6 — AI klinik tavsiyesi güvenlik kapısı
 *
 * ── Kusur neydi ───────────────────────────────────────────────────────────
 * Gemini'ın ürettiği klinik tavsiye (etkileşim uyarıları, 0-100 "güvenlik
 * skoru", besin zamanlama kuralları) DOĞRULANMADAN ve FERAGAT METNİ OLMADAN
 * hastaya gösteriliyordu:
 *
 *   - Skor: `typeof parsed.overallSafetyScore === 'number' ? ... : 85`
 *     → skor YOKSA 85 UYDURULUYORDU, ve 0-100 dışına çıkabiliyordu
 *     (999 veya -5 renk/eşik mantığını bozar).
 *   - Hata yolunda: `success: false` ile birlikte `overallSafetyScore: 80`.
 *   - Kart `report ?` ile kapı kuruyordu; `report.success` HİÇ OKUNMUYORDU
 *     → BAŞARISIZ bir analiz, uydurma 80 skoruyla hastaya GEÇERLİ BİR
 *     KLİNİK HÜKÜM olarak render ediliyordu.
 *   - Diziler yalnızca `Array.isArray` ile kontrol ediliyordu; eleman şekli
 *     (`fw.timingRule`, `fw.severity`) ham okunuyordu.
 *   - Kartta hiçbir "hekime/eczacıya danışın" veya "tıbbi tavsiye değildir"
 *     ibaresi yoktu; tek AI işareti "🤖 Gemini 3.6 Flash" rozetiydi. Prompt
 *     ise modeli "klinik farmakolog ve tıp doktoru" olarak sunmaya
 *     yönlendiriyordu.
 *
 * Yaşlı bir kullanıcı halüsinasyon olmuş bir "sütü 4 saat kes" talimatını
 * hekim talimatı sanabilirdi.
 *
 * ── Neden kaynak-tarama kapısı ────────────────────────────────────────────
 * Fonksiyonun gerçek davranışını test etmek Gemini callable'ını mock'lamayı
 * gerektiriyor; bu dosya ise DEĞİŞMEZLERİ kilitliyor: uydurma skor
 * literalleri geri gelemez, Zod doğrulaması kaldırılamaz, kartın `success`
 * kapısı ve feragat metni silinemez. `firestoreRules.contract.test.ts` ve
 * `a11y.test.ts` ile aynı desen.
 */

/* global __dirname */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..', '..', '..');
const SERVICE_PATH = path.join(ROOT, 'mobile', 'src', 'services', 'aiMedicineService.ts');
const CARD_PATH = path.join(
  ROOT,
  'mobile',
  'src',
  'screens',
  'InteractionsScreen',
  'components',
  'AIClinicalShieldCard.tsx'
);

/** Yorumları atar — kusuru ANLATAN yorumlar kusur sanılmasın. */
const stripComments = (source: string): string =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

const service = stripComments(fs.readFileSync(SERVICE_PATH, 'utf8'));
const card = stripComments(fs.readFileSync(CARD_PATH, 'utf8'));

describe('K6 — AI çıktısı servis katmanında doğrulanıyor', () => {
  it('güvenlik skoru Zod ile 0-100 aralığına ZORUNLU kılınıyor', () => {
    expect(service).toMatch(/safetyScoreSchema = z\.number\(\)\.min\(0\)\.max\(100\)/);
    expect(service).toMatch(/safetyScoreSchema\.safeParse\(/);
  });

  it('⚠️ UYDURMA SKOR LİTERALLERİ YOK (80 / 85)', () => {
    // Eski kod skoru olmadığında 85, hata yolunda 80 döndürüyordu. Bu
    // literallerin geri gelmesi, hastaya olmayan bir klinik hüküm göstermek
    // anlamına gelir. `overallSafetyScore: 0` BİLİNÇLİ olarak serbest:
    // 0 bir skor değil, "skor YOK" işaretidir ve kart onu render etmez.
    expect(service).not.toMatch(/overallSafetyScore:\s*80\b/);
    expect(service).not.toMatch(/overallSafetyScore:\s*85\b/);
  });

  it('başarısız yolların HEPSİ `success: false` + skor 0 dönüyor', () => {
    // Üç başarısızlık yolu var: yanıt yok, skor geçersiz, exception.
    const failures =
      service.match(/success:\s*false,[\s\S]{0,220}?overallSafetyScore:\s*0,/g) ?? [];
    expect(failures.length).toBeGreaterThanOrEqual(3);
  });

  it('dizi elemanları TEK TEK doğrulanıyor (yalnızca Array.isArray değil)', () => {
    expect(service).toMatch(/function validateList/);
    expect(service).toMatch(/schema\.safeParse\(entry\)/);
    // Bozuk eleman düşürülüyor VE bu sessiz değil.
    expect(service).toMatch(/dropped \+= 1/);
    expect(service).toMatch(/geçersiz elemanlar DÜŞÜRÜLDÜ/);
  });

  it('besin uyarısı eleman şekli şemaya bağlı', () => {
    expect(service).toMatch(/foodDrinkWarningSchema = z\.object/);
    expect(service).toMatch(/food: z\.string\(\)\.min\(1\)\.max\(120\)/);
    expect(service).toMatch(/warning: z\.string\(\)\.min\(1\)\.max\(600\)/);
    expect(service).toMatch(/z\.enum\(\['high', 'moderate', 'low'\]\)/);
  });

  it('⚠️ eski ham `Array.isArray` kestirmesi KULLANILMIYOR', () => {
    // `criticalAlerts: Array.isArray(parsed.criticalAlerts) ? parsed.criticalAlerts : []`
    // eleman şeklini hiç doğrulamıyordu.
    expect(service).not.toMatch(/Array\.isArray\(parsed\.criticalAlerts\)/);
    expect(service).not.toMatch(/Array\.isArray\(parsed\.foodDrinkWarnings\)/);
  });

  it("listelerde tavan var (sonsuz AI çıktısı UI'ı kilitlemesin)", () => {
    expect(service).toMatch(/MAX_LIST_ITEMS = 20/);
    expect(service).toMatch(/raw\.slice\(0, MAX_LIST_ITEMS\)/);
  });
});

describe('K6 — kart başarısız analizi klinik hüküm gibi GÖSTERMİYOR', () => {
  it('⚠️ skor kartı `report.success` ile kapılanmış', () => {
    // Eski kod `) : report ? (` ile kapı kuruyordu ve `report.success`
    // ekranın HİÇBİR yerinde okunmuyordu (grep ile doğrulanmıştı).
    expect(card).toMatch(/\{report\.success \? \(/);
  });

  it('⚠️ başarısızlık dalı "güvenlik değerlendirmesi DEĞİLDİR" diyor', () => {
    expect(card).toMatch(/Klinik analiz tamamlanamadı/);
    expect(card).toMatch(/This is NOT a safety assessment/);
  });

  it('⚠️ ZORUNLU FERAGAT metni var (TR + EN)', () => {
    expect(card).toMatch(/TIBBİ TAVSİYE DEĞİLDİR/);
    expect(card).toMatch(/NOT MEDICAL ADVICE/);
    expect(card).toMatch(/hekiminize veya eczacınıza danışın/);
    expect(card).toMatch(/consult your doctor or pharmacist/);
  });

  it('⚠️ feragat BAŞARI dalının dışında — analiz başarılı olsa da görünüyor', () => {
    // Feragat, `report.success ? (...) : (...)` bloğunun TAMAMINDAN SONRA
    // gelmeli. Skor kartının içinde olursa başarısız analizde kaybolur.
    const successGateAt = card.indexOf('{report.success ? (');
    const disclaimerAt = card.indexOf('TIBBİ TAVSİYE DEĞİLDİR');
    expect(successGateAt).toBeGreaterThan(-1);
    expect(disclaimerAt).toBeGreaterThan(-1);
    expect(disclaimerAt).toBeGreaterThan(successGateAt);
  });

  it('yenile butonu erişilebilir (denetimde etiketsizdi)', () => {
    expect(card).toMatch(/accessibilityRole="button"/);
    expect(card).toMatch(/Yapay zeka ile klinik güvenlik analizi başlat/);
    // Hint feragatı buton düzeyinde de tekrarlıyor.
    expect(card).toMatch(/Sonuç tıbbi tavsiye değildir/);
  });
});
