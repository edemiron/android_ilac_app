/**
 * K5 — Kalıcı yazma kuyruğu (outbox).
 *
 * ── Neden var ──────────────────────────────────────────────────────────────
 * `config/firebase.ts` Firestore'u `memoryLocalCache()` ile kuruyor, yani
 * **offline kalıcılık YOK**. Buna bağlı olarak kritik yazımlar fire-and-forget
 * gidiyordu:
 *
 *   medicineStore.ts      saveMedicineLogToCloud(...).catch(err => log.error(...))   ×4
 *   caregiverNotificationService.ts  setDoc(caregiverAlerts) → catch → log.warn
 *
 * Sonuç: telefon çekmeyen bir ortamda atlanan/kaçırılan doz **bakıcıya asla
 * ulaşmıyordu**. Doz logu yerelde kalıp bir sonraki başarılı `syncToCloud` ile
 * buluta gidiyordu ama **anlık bakıcı uyarısı geri gelmiyordu** — uygulamanın
 * birincil güvenlik vaadi (refakatçi takibi) tam da en ihtiyaç duyulan
 * senaryoda sessizce düşüyordu.
 *
 * `utils/syncQueue.ts` bu işi GÖREMEZ: o bir mutex, kalıcı kuyruk değil.
 * `dispose()` bekleyen operasyonları **reject** ediyor ve hiçbir şey diskte
 * tutulmuyor. `offlineResilience.test.ts` "caller retry queue" diye bir şeyden
 * söz ediyordu ama prod'da böyle bir kuyruk hiç yoktu.
 *
 * ── Tasarım kararları ──────────────────────────────────────────────────────
 * 1. **AsyncStorage'da kalıcı** — süreç ölürse, cihaz yeniden başlarsa kuyruk
 *    duruyor.
 * 2. **İdempotent** — her giriş sabit bir `id` taşıyor ve hedef doküman
 *    kimliği de sabit, yani aynı girişin tekrar yazılması çift kayıt
 *    üretmiyor (`setDoc` aynı id ile üzerine yazar). Bu yüzden yeniden deneme
 *    güvenli.
 * 3. **Sınırlı** — `MAX_ENTRIES` tavanı var. O1'den alınan ders: sınırsız
 *    büyüyen persist edilen dizi yıllar içinde yazma gecikmesini artırır.
 *    Taşınca EN ESKİ giriş düşürülür ve bu `log.error` ile kayıt altına alınır
 *    (sessiz veri kaybı olmasın).
 * 4. **Geri çekilmeli (backoff)** — `nextAttemptAt` ile başarısız girişler
 *    hemen yeniden denenmez; kalıcı olarak bozuk bir yazımın sonsuz döngüde
 *    CPU/ağ yakması engellenir. Ama giriş **silinmez**: doz kaydı klinik
 *    veridir, vazgeçmek yerine denemeye devam edilir.
 * 5. **KVKK** — `clearOutbox()` hesap silme akışında çağrılmalı; kuyruk
 *    sağlık verisi taşır. Anahtar `MEDICINE_STORE_STORAGE_KEYS`'e eklendi.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createScopedLogger } from './logger';

const log = createScopedLogger('Outbox');

export const OUTBOX_STORAGE_KEY = '@ilachatirlatici_outbox_v1';

/** Taşma tavanı — en eski giriş düşürülür ve loglanır. */
const MAX_ENTRIES = 200;

/** Bir girişin iki denemesi arasındaki asgari süre (ms). */
const BASE_BACKOFF_MS = 30_000;
const MAX_BACKOFF_MS = 15 * 60_000;

export type OutboxKind = 'medicineLog' | 'caregiverAlert';

export interface OutboxEntry {
  /**
   * Kuyruk içi kimlik. Hedef doküman kimliğiyle aynı olmalı ki yeniden
   * kuyruğa alma (ör. uygulama çökerken) çift giriş üretmesin.
   */
  id: string;
  kind: OutboxKind;
  /**
   * Serileştirilebilir yük. Fonksiyon/Promise İÇEREMEZ — AsyncStorage'a
   * JSON olarak yazılıyor.
   */
  payload: Record<string, unknown>;
  createdAt: number;
  attempts: number;
  /** Bir sonraki deneme zamanı (epoch ms). Backoff için. */
  nextAttemptAt: number;
  lastError?: string;
}

/** Tek bir girişin nasıl teslim edileceği. Başarısızlık için throw etmeli. */
export type OutboxDelivery = (entry: OutboxEntry) => Promise<void>;

let cache: OutboxEntry[] | null = null;
let loading: Promise<OutboxEntry[]> | null = null;
/** Aynı anda tek flush — `syncQueue`'nun mutex fikri, ama kalıcı kuyruk üzerinde. */
let flushing: Promise<FlushResult> | null = null;

export interface FlushResult {
  delivered: number;
  failed: number;
  remaining: number;
}

async function load(): Promise<OutboxEntry[]> {
  if (cache) return cache;
  if (!loading) {
    loading = (async () => {
      try {
        const raw = await AsyncStorage.getItem(OUTBOX_STORAGE_KEY);
        if (!raw) {
          cache = [];
          return cache;
        }
        const parsed = JSON.parse(raw);
        // Bozuk/kısmi veriye karşı savunma: dizi değilse sıfırla, elemanları
        // şekil kontrolünden geçir. O3'ün dersi — buluttan/diskten gelen
        // veriyi doğrulamadan kullanma.
        if (!Array.isArray(parsed)) {
          log.error('Outbox verisi dizi değil, sıfırlanıyor');
          cache = [];
          return cache;
        }
        cache = parsed.filter(
          (e): e is OutboxEntry =>
            !!e &&
            typeof e.id === 'string' &&
            typeof e.kind === 'string' &&
            typeof e.createdAt === 'number' &&
            e.payload !== null &&
            typeof e.payload === 'object'
        );
        return cache;
      } catch (err) {
        log.error('Outbox okunamadı, boş kabul ediliyor', err);
        cache = [];
        return cache;
      } finally {
        loading = null;
      }
    })();
  }
  return loading;
}

async function persist(): Promise<void> {
  if (!cache) return;
  try {
    await AsyncStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(cache));
  } catch (err) {
    // Yazılamazsa girişler bellekte kalır ve bir sonraki flush'ta yeniden
    // denenir. Sessizce yutmuyoruz: bu, kalıcılık garantisinin zayıfladığı an.
    log.error('Outbox diske yazılamadı — girişler yalnızca bellekte', err);
  }
}

/**
 * Bir yazma denemesini kuyruğa alır.
 *
 * @param kind      yükün türü (teslim edici seçimi için)
 * @param id        hedef doküman kimliği — idempotency anahtarı
 * @param payload   serileştirilebilir yük
 */
export async function enqueueOutbox(
  kind: OutboxKind,
  id: string,
  payload: Record<string, unknown>
): Promise<void> {
  if (!id) {
    log.error('enqueueOutbox: boş id, giriş atlandı');
    return;
  }
  const entries = await load();

  // Aynı id zaten kuyruktaysa YENİDEN EKLEME — çökme/yeniden deneme anında
  // çift giriş oluşmasın. Mevcut girişin yükünü tazelemek yeterli.
  const existingIndex = entries.findIndex(e => e.id === id && e.kind === kind);
  if (existingIndex >= 0) {
    entries[existingIndex] = { ...entries[existingIndex], payload };
    cache = entries;
    await persist();
    return;
  }

  const now = Date.now();
  entries.push({
    id,
    kind,
    payload,
    createdAt: now,
    attempts: 0,
    nextAttemptAt: now,
  });

  // Tavan aşımı: EN ESKİ giriş düşürülür. Sessiz değil — klinik veri kaybı
  // loglanmalı ki teşhis edilebilsin.
  if (entries.length > MAX_ENTRIES) {
    const dropped = entries.splice(0, entries.length - MAX_ENTRIES);
    log.error('Outbox tavanı aşıldı, en eski girişler DÜŞÜRÜLDÜ', {
      droppedCount: dropped.length,
      droppedIds: dropped.map(d => d.id),
      kinds: dropped.map(d => d.kind),
    });
  }

  cache = entries;
  await persist();
  log.debug('Outbox giriş eklendi', { kind, id, size: entries.length });
}

/**
 * Kuyruğu boşaltır. Yalnızca `nextAttemptAt` geçmiş girişler denenir.
 *
 * Eşzamanlı çağrılar tek bir flush'a katılır (mutex) — NetInfo reconnect +
 * AppState foreground + manuel tetikleme aynı anda gelirse girişler iki kez
 * denenmez.
 */
export async function flushOutbox(deliver: OutboxDelivery): Promise<FlushResult> {
  if (flushing) return flushing;

  flushing = (async () => {
    let delivered = 0;
    let failed = 0;

    try {
      const entries = await load();
      const now = Date.now();
      const due = entries.filter(e => e.nextAttemptAt <= now);
      if (due.length === 0) {
        return { delivered: 0, failed: 0, remaining: (cache ?? []).length };
      }

      // Sıra önemli: en eski önce teslim edilmeli ki doz kayıtları kronolojik
      // gitsin ve bir giriş sürekli arkaya itilmesin.
      due.sort((a, b) => a.createdAt - b.createdAt);

      for (const entry of due) {
        try {
          await deliver(entry);
          delivered += 1;
          // Başarılı: kuyruktan çıkar.
          cache = (cache ?? []).filter(e => !(e.id === entry.id && e.kind === entry.kind));
          await persist();
        } catch (err) {
          failed += 1;
          const attempts = (entry.attempts ?? 0) + 1;
          // Üstel geri çekilme, tavanla sınırlı. Giriş SİLİNMİYOR — doz kaydı
          // klinik veridir, vazgeçmek yerine denemeye devam edilir.
          const backoff = Math.min(BASE_BACKOFF_MS * 2 ** (attempts - 1), MAX_BACKOFF_MS);
          const stored = (cache ?? []).find(e => e.id === entry.id && e.kind === entry.kind);
          if (stored) {
            stored.attempts = attempts;
            stored.nextAttemptAt = Date.now() + backoff;
            stored.lastError = err instanceof Error ? err.message : String(err);
          }
          await persist();
          log.warn('Outbox teslimi başarısız, geri çekilmeyle yeniden denenecek', {
            kind: entry.kind,
            id: entry.id,
            attempts,
            backoffMs: backoff,
          });
        }
      }
    } catch (err) {
      log.error('Outbox flush hatası', err);
    } finally {
      flushing = null;
    }

    return { delivered, failed, remaining: (cache ?? []).length };
  })();

  return flushing;
}

/** Kuyruk uzunluğu — UI'da "bekleyen N kayıt" gösterebilmek için. */
export async function getOutboxSize(): Promise<number> {
  const entries = await load();
  return entries.length;
}

/** Bekleyen girişlerin kopyası (teşhis/test için). */
export async function getOutboxEntries(): Promise<OutboxEntry[]> {
  const entries = await load();
  return entries.map(e => ({ ...e }));
}

/**
 * Kuyruğu TAMAMEN boşaltır.
 *
 * ⚠️ KVKK: kuyruk sağlık verisi taşır. Hesap silme akışında
 * (`deleteMyAccount` çağıran yerel temizlik) MUTLAKA çağrılmalı, aksi halde
 * hasta hesabını sildikten sonra doz kayıtları cihazda kalır.
 */
export async function clearOutbox(): Promise<void> {
  cache = [];
  loading = null;
  try {
    await AsyncStorage.removeItem(OUTBOX_STORAGE_KEY);
  } catch (err) {
    log.error('Outbox temizlenemedi', err);
  }
}

/** Test izolasyonu için bellek önbelleğini sıfırlar (disk'e dokunmaz). */
export function __resetOutboxCacheForTests(): void {
  cache = null;
  loading = null;
  flushing = null;
}
