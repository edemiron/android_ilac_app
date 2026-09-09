/**
 * K5 — Outbox teslim koordinatörü.
 *
 * `outboxStore.ts` kalıcı kuyruğu tutar; bu modül (a) her giriş türünün NASIL
 * teslim edileceğini bilir, (b) kuyruğu ne ZAMAN boşaltacağını yönetir.
 *
 * ── Tetikleyiciler ────────────────────────────────────────────────────────
 * 1. Uygulama açılışı (`startOutboxFlusher`)
 * 2. **NetInfo** bağlantı geri geldiğinde — asıl amaç bu. Çevrimdışı yazılan
 *    doz kaydı / bakıcı uyarısı bağlantı döner dönmez teslim edilir.
 * 3. **AppState** `active` olduğunda — kullanıcı uygulamaya geri döndü.
 * 4. Kendi kendini zamanlayan yeniden deneme: flush bittiğinde kuyrukta hâlâ
 *    giriş varsa 60 sn sonra bir kez daha dener; kuyruk boşalınca DURUR.
 *
 * 4. madde bilinçli olarak **polling değil**: sonsuz bir `setInterval` kurmak
 * yerine yalnızca bekleyen iş varken çalışır. Per-entry backoff
 * (`outboxStore.MAX_BACKOFF_MS`) tek bir bozuk girişin CPU/ağ yakmasını
 * engeller. Doz alarmı uygulamasında pil bütçesi klinik bir kısıt.
 *
 * ── İdempotency ───────────────────────────────────────────────────────────
 * Her giriş hedef doküman kimliğini taşır ve teslim `setDoc` ile aynı id'ye
 * yazar; yani bir giriş iki kez teslim edilirse ÇİFT KAYIT OLUŞMAZ. Bu
 * olmadan yeniden deneme güvenli olmazdı (v1.7.6'nın `logMedicineTaken`
 * idempotency guard'ı ile aynı ilke).
 */

import NetInfo from '@react-native-community/netinfo';
import { AppState, type AppStateStatus } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';

import { db } from '../config/firebase';
import { saveMedicineLogToCloud } from '../services/firestoreSync';
import type { MedicineLog } from '../types';
import { createScopedLogger } from './logger';
import {
  enqueueOutbox,
  flushOutbox,
  getOutboxSize,
  type OutboxEntry,
  type OutboxKind,
} from './outboxStore';

const log = createScopedLogger('OutboxFlusher');

/** Kuyrukta bekleyen iş varken yeniden deneme aralığı. */
const RETRY_INTERVAL_MS = 60_000;

/**
 * Bir girişin teslimi. Başarısızlık için THROW etmeli — flusher ancak o zaman
 * girişi kuyrukta tutar ve backoff uygular.
 */
async function deliver(entry: OutboxEntry): Promise<void> {
  if (entry.kind === 'medicineLog') {
    const userId = entry.payload?.userId as string | undefined;
    const medicineLog = entry.payload?.medicineLog as MedicineLog | undefined;
    if (!userId || !medicineLog?.id) {
      // Bozuk giriş: sonsuza dek yeniden denemek yerine açıkça hata ver.
      // `outboxStore` bunu backoff ile yavaşlatır, tavan aşımında düşürür.
      throw new Error('medicineLog outbox girişi eksik veya bozuk');
    }
    await saveMedicineLogToCloud(userId, medicineLog);
    return;
  }

  if (entry.kind === 'caregiverAlert') {
    const caregiverId = entry.payload?.caregiverId as string | undefined;
    const alertId = entry.payload?.alertId as string | undefined;
    const alertData = entry.payload?.alertData as Record<string, unknown> | undefined;
    if (!caregiverId || !alertId || !alertData) {
      throw new Error('caregiverAlert outbox girişi eksik veya bozuk');
    }
    await setDoc(doc(db, 'users', caregiverId, 'caregiverAlerts', alertId), alertData);
    return;
  }

  throw new Error(`Bilinmeyen outbox türü: ${entry.kind as string}`);
}

let started = false;
let unsubscribeNetInfo: (() => void) | null = null;
let appStateSubscription: { remove: () => void } | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

async function runFlush(reason: string): Promise<void> {
  const size = await getOutboxSize();
  if (size === 0) return;

  const result = await flushOutbox(deliver);
  log.debug('Outbox flush', { reason, ...result });

  // Kuyrukta hâlâ iş varsa kendini yeniden zamanla; boşaldıysa DUR.
  if (result.remaining > 0 && !retryTimer) {
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void runFlush('retry-timer');
    }, RETRY_INTERVAL_MS);
  }
}

/**
 * Bir bulut yazımını dener; başarısız olursa KALICI kuyruğa alır.
 *
 * Bu, eski `.catch(err => log.error(...))` deseninin yerini alır. Eski desende
 * hata yalnızca loglanıyor ve yazım **kalıcı olarak kayboluyordu**; şimdi
 * bağlantı geri geldiğinde teslim ediliyor.
 *
 * Fire-and-forget kalır (await edilmez) — çağıran akışı bloklamaz, yani
 * `logMedicineTaken` gibi senkron hissettiren store aksiyonları yavaşlamaz.
 */
export function persistWriteOrEnqueue(
  kind: OutboxKind,
  id: string,
  payload: Record<string, unknown>,
  attempt: () => Promise<void>,
  contextLabel: string
): void {
  void (async () => {
    try {
      await attempt();
    } catch (err) {
      log.warn(`${contextLabel} — outbox'a alındı, bağlantı gelince yeniden denenecek`, err);
      try {
        await enqueueOutbox(kind, id, payload);
        // Hemen bir flush dene: bağlantı aslında varsa (hata geçici bir
        // Firestore sorunuysa) giriş beklemeden teslim edilsin.
        void runFlush('after-enqueue');
      } catch (enqErr) {
        // Burası gerçek veri kaybı noktası — sessiz yutulmaz.
        log.error(`${contextLabel} — OUTBOX'A DA YAZILAMADI, kayıt kaybedildi`, enqErr);
      }
    }
  })();
}

/**
 * Dinleyicileri kurar ve bir ilk flush tetikler.
 *
 * `App.tsx`'ten bir kez çağrılmalı. Tekrar çağrılırsa no-op.
 * @returns durdurma fonksiyonu (test/teardown için)
 */
export function startOutboxFlusher(): () => void {
  if (started) return stopOutboxFlusher;
  started = true;

  void runFlush('startup');

  unsubscribeNetInfo = NetInfo.addEventListener(state => {
    // `isConnected` true olduğunda dene. Bağlantı TÜRÜ (wifi/cellular) bizi
    // ilgilendirmiyor — ölçüm kotası Firestore tarafında, burada değil.
    if (state.isConnected) {
      void runFlush('netinfo-reconnect');
    }
  });

  const onAppStateChange = (next: AppStateStatus) => {
    if (next === 'active') {
      void runFlush('app-foreground');
    }
  };
  appStateSubscription = AppState.addEventListener('change', onAppStateChange);

  log.info('Outbox flusher başlatıldı (NetInfo + AppState)');
  return stopOutboxFlusher;
}

export function stopOutboxFlusher(): void {
  started = false;
  unsubscribeNetInfo?.();
  unsubscribeNetInfo = null;
  appStateSubscription?.remove();
  appStateSubscription = null;
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}
