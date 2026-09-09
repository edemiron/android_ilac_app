/**
 * K5 — kalıcı yazma kuyruğu (outbox) birim testleri.
 *
 * Bu modülün var olma nedeni: `config/firebase.ts` Firestore'u
 * `memoryLocalCache()` ile kurduğu için offline kalıcılık YOK ve kritik
 * yazımlar `.catch(err => log.error(...))` ile fire-and-forget gidiyordu.
 * Çevrimdışı atlanan bir doz bakıcıya ASLA ulaşmıyordu.
 *
 * Testler özellikle şunları kilitler:
 *  - KALICILIK (süreç yeniden başlayınca kuyruk duruyor mu)
 *  - İDEMPOTENCY (aynı giriş iki kez kuyruğa alınmıyor / teslim çift kayıt
 *    üretmiyor)
 *  - BACKOFF (başarısızlıkta hemen yeniden deneme yok) ama SİLME YOK
 *    (klinik veriden vazgeçilmez)
 *  - TAVAN (sınırsız büyüme yok — O1'den alınan ders)
 *  - BOZUK VERİ savunması (O3'ten alınan ders)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  OUTBOX_STORAGE_KEY,
  __resetOutboxCacheForTests,
  clearOutbox,
  enqueueOutbox,
  flushOutbox,
  getOutboxEntries,
  getOutboxSize,
} from '../../utils/outboxStore';

beforeEach(async () => {
  await AsyncStorage.clear();
  __resetOutboxCacheForTests();
  jest.clearAllMocks();
});

describe('outboxStore — kuyruğa alma', () => {
  it('girişi ekliyor ve boyutu bildiriyor', async () => {
    await enqueueOutbox('medicineLog', 'log-1', { userId: 'u1' });

    expect(await getOutboxSize()).toBe(1);
    const entries = await getOutboxEntries();
    expect(entries[0]).toMatchObject({ id: 'log-1', kind: 'medicineLog', attempts: 0 });
  });

  it("⚠️ KALICILIK: süreç yeniden başlayınca kuyruk AsyncStorage'dan geri geliyor", async () => {
    await enqueueOutbox('caregiverAlert', 'alert-1', { caregiverId: 'c1' });

    // Bellek önbelleğini sıfırla = uygulama öldü ve yeniden başladı.
    __resetOutboxCacheForTests();

    expect(await getOutboxSize()).toBe(1);
    const entries = await getOutboxEntries();
    expect(entries[0].payload).toEqual({ caregiverId: 'c1' });
  });

  it('⚠️ İDEMPOTENCY: aynı id+kind iki kez eklenirse TEK giriş kalır', async () => {
    await enqueueOutbox('medicineLog', 'log-1', { userId: 'u1', status: 'taken' });
    await enqueueOutbox('medicineLog', 'log-1', { userId: 'u1', status: 'missed' });

    expect(await getOutboxSize()).toBe(1);
    // Yük TAZELENMELİ — son durum kazanır.
    const entries = await getOutboxEntries();
    expect(entries[0].payload).toEqual({ userId: 'u1', status: 'missed' });
  });

  it('aynı id farklı kind ile ayrı giriş olarak tutulur', async () => {
    await enqueueOutbox('medicineLog', 'x1', { a: 1 });
    await enqueueOutbox('caregiverAlert', 'x1', { b: 2 });

    expect(await getOutboxSize()).toBe(2);
  });

  it('boş id ile giriş EKLENMİYOR', async () => {
    await enqueueOutbox('medicineLog', '', { userId: 'u1' });

    expect(await getOutboxSize()).toBe(0);
  });

  it('⚠️ TAVAN: 200 giriş aşılınca EN ESKİLER düşürülür (sınırsız büyüme yok)', async () => {
    for (let i = 0; i < 205; i++) {
      await enqueueOutbox('medicineLog', `log-${String(i).padStart(3, '0')}`, { i });
    }

    expect(await getOutboxSize()).toBe(200);
    const entries = await getOutboxEntries();
    // İlk 5 düşmüş olmalı; en eski kalan log-005.
    expect(entries[0].id).toBe('log-005');
    expect(entries[entries.length - 1].id).toBe('log-204');
  });

  it('⚠️ BOZUK VERİ: depolanan değer dizi değilse boş kabul edilir (çökmez)', async () => {
    await AsyncStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify({ not: 'an array' }));
    __resetOutboxCacheForTests();

    expect(await getOutboxSize()).toBe(0);
  });

  it('⚠️ BOZUK VERİ: şekli bozuk elemanlar ayıklanır, geçerliler korunur', async () => {
    await AsyncStorage.setItem(
      OUTBOX_STORAGE_KEY,
      JSON.stringify([
        { id: 'ok-1', kind: 'medicineLog', payload: { a: 1 }, createdAt: 1, attempts: 0 },
        { id: 42, kind: 'medicineLog', payload: {}, createdAt: 1 }, // id sayı → geçersiz
        { kind: 'medicineLog', payload: {}, createdAt: 1 }, // id yok → geçersiz
        null,
      ])
    );
    __resetOutboxCacheForTests();

    const entries = await getOutboxEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('ok-1');
  });

  it('clearOutbox kuyruğu hem bellekten hem diskten siler (KVKK)', async () => {
    await enqueueOutbox('medicineLog', 'log-1', { userId: 'u1' });
    await clearOutbox();

    expect(await getOutboxSize()).toBe(0);
    __resetOutboxCacheForTests();
    // Diskte de kalmamalı — aksi halde hesap silme sonrası sağlık verisi
    // cihazda kalır (KVKK m.7 / GDPR Art. 17).
    expect(await getOutboxSize()).toBe(0);
  });
});

describe('outboxStore — flush', () => {
  it('başarılı teslimde girişi kuyruktan çıkarıyor', async () => {
    await enqueueOutbox('medicineLog', 'log-1', { userId: 'u1' });

    const deliver = jest.fn(async () => {});
    const result = await flushOutbox(deliver);

    expect(deliver).toHaveBeenCalledTimes(1);
    expect(result.delivered).toBe(1);
    expect(await getOutboxSize()).toBe(0);
  });

  it('⚠️ başarısız teslimde girişi SİLMİYOR, attempts artırıyor ve backoff kuruyor', async () => {
    await enqueueOutbox('medicineLog', 'log-1', { userId: 'u1' });
    const before = Date.now();

    const deliver = jest.fn(async () => {
      throw new Error('ağ yok');
    });
    const result = await flushOutbox(deliver);

    expect(result.failed).toBe(1);
    // Klinik veriden VAZGEÇİLMİYOR.
    expect(await getOutboxSize()).toBe(1);
    const [entry] = await getOutboxEntries();
    expect(entry.attempts).toBe(1);
    expect(entry.lastError).toBe('ağ yok');
    // Backoff geleceğe kurulmalı — hemen yeniden deneme yok.
    expect(entry.nextAttemptAt).toBeGreaterThan(before);
  });

  it('⚠️ backoff süresi dolmadan girişi YENİDEN DENEMİYOR', async () => {
    await enqueueOutbox('medicineLog', 'log-1', { userId: 'u1' });

    const failing = jest.fn(async () => {
      throw new Error('ağ yok');
    });
    await flushOutbox(failing);
    expect(failing).toHaveBeenCalledTimes(1);

    // İkinci flush hemen sonra: backoff nedeniyle teslim denenmemeli.
    const second = jest.fn(async () => {});
    const result = await flushOutbox(second);

    expect(second).not.toHaveBeenCalled();
    expect(result.delivered).toBe(0);
    // Giriş hâlâ kuyrukta.
    expect(await getOutboxSize()).toBe(1);
  });

  it('birden çok girişi EN ESKİ ÖNCE sırasıyla teslim ediyor', async () => {
    await enqueueOutbox('medicineLog', 'log-old', { seq: 1 });
    // createdAt aynı milisaniyede olabilir; sıralama kararlı olmalı.
    await enqueueOutbox('medicineLog', 'log-new', { seq: 2 });

    const order: string[] = [];
    await flushOutbox(async entry => {
      order.push(entry.id);
    });

    expect(order).toEqual(['log-old', 'log-new']);
  });

  it('⚠️ EŞZAMANLI flush girişleri TEK sefer teslim eder (mutex)', async () => {
    await enqueueOutbox('medicineLog', 'log-1', { userId: 'u1' });

    const deliver = jest.fn(async () => {
      // Teslimat sırasında ikinci bir flush tetiklensin (NetInfo + AppState
      // aynı anda gelirse gerçek senaryo bu).
      await new Promise(resolve => setTimeout(resolve, 5));
    });

    const [r1, r2] = await Promise.all([flushOutbox(deliver), flushOutbox(deliver)]);

    // Giriş yalnızca BİR kez teslim edilmeli, aksi halde çift yazma riski.
    expect(deliver).toHaveBeenCalledTimes(1);
    // Eşzamanlı çağıranlar AYNI flush'a katılır — yani aynı sonuç nesnesi.
    // (İkisi ayrı sayılsaydı delivered toplamı 2 olurdu.)
    expect(r1).toBe(r2);
    expect(r1.delivered).toBe(1);
    expect(await getOutboxSize()).toBe(0);
  });

  it('boş kuyrukta flush hiçbir şey yapmıyor', async () => {
    const deliver = jest.fn(async () => {});
    const result = await flushOutbox(deliver);

    expect(deliver).not.toHaveBeenCalled();
    expect(result.delivered).toBe(0);
  });

  it('başarısız giriş başarılı olanı ENGELLEMİYOR (kısmi teslim)', async () => {
    await enqueueOutbox('medicineLog', 'log-bad', { userId: 'u1' });
    await enqueueOutbox('medicineLog', 'log-good', { userId: 'u1' });

    const result = await flushOutbox(async entry => {
      if (entry.id === 'log-bad') throw new Error('bu doküman yazılamıyor');
    });

    expect(result.delivered).toBe(1);
    expect(result.failed).toBe(1);
    const remaining = await getOutboxEntries();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('log-bad');
  });
});
