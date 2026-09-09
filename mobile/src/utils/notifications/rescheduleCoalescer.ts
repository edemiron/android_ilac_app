/**
 * Yeniden planlama firtinalarini TEK KOSUYA indirir.
 *
 * ⚠️ v1.7.7 — ACILISTA 45 IPTAL + 45 YENIDEN KURULUM
 * ══════════════════════════════════════════════════════════════════════════
 *
 * "Tum alarmlari yeniden planla" isini birbirinden bagimsiz UC yol tetikliyor
 * ve her biri her etkin hatirlatma icin `scheduleMedicineNotification`
 * cagiriyor — o da ONCE `cancelNotification` yapiyor:
 *
 *   1. `App.tsx` -> `reRegisterAllAlarms('app_startup')`
 *   2. `syncFromCloud` -> `rescheduleActiveNotificationsFromState`
 *      -> ardindan `runNotificationSelfHeal` -> BIR TANE DAHA
 *   3. `updateSettings` / `importData` -> ayni firtina
 *
 * Cihazda olculdu (v1.7.7 oncesi, TEK acilis, 15 hatirlatma):
 *     scheduleNativeAlarm : 45
 *     cancelNativeAlarm   : 45
 * Hepsi ayni dakika icinde. Yani her alarm ucer kez silinip yeniden kuruldu.
 *
 * Bu yalnizca israf degil: iptal penceresi o anda CALAN bir alarma denk
 * gelirse doz hatirlatmasi sessizce dusuyor. (Ayni kok neden periyodik
 * `AlarmCheckWorker`'in kaldirilma gerekcesinde de yaziyor.)
 *
 * ── Bu modul ne yapar ────────────────────────────────────────────────────
 * - Kisa bir pencere icinde gelen istekleri BIRLESTIRIR (trailing debounce):
 *   uc cagiran tek kosuya duser.
 * - Kosu surerken gelen istek KAYBEDILMEZ: "tekrar gerekiyor" isaretlenir ve
 *   kosu bitince BIR kez daha calisir. Boylece kosu ortasinda degisen durum
 *   (buluttan gelen yeni ilac gibi) atlanmaz.
 * - Ayni anda IKI kosu calismaz; iptal/kurulum yarislari olusmaz.
 */

import { createScopedLogger } from '../logger';

const log = createScopedLogger('RescheduleCoalescer');

/**
 * Ard arda gelen istekleri birlestirme penceresi.
 *
 * Acilista uc tetikleyici saniyeler icinde gelir; 1200 ms hepsini toplamaya
 * yeter ve kullanicinin hissedecegi bir gecikme yaratmaz (bu is arka planda,
 * `void` ile cagriliyor).
 */
export const COALESCE_WINDOW_MS = 1200;

type Runner = () => Promise<void>;

let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let pendingRunner: Runner | null = null;
let inFlight: Promise<void> | null = null;
let rerunRequested = false;

async function executeNow(runner: Runner): Promise<void> {
  try {
    await runner();
  } catch (error) {
    log.error('Yeniden planlama kosusu basarisiz', error);
  }
}

async function drain(): Promise<void> {
  // Bu dongu "kosu bitti ama arada yeni istek geldi" durumunu ele alir.
  for (;;) {
    const runner = pendingRunner;
    pendingRunner = null;
    rerunRequested = false;

    if (!runner) return;
    await executeNow(runner);

    if (!rerunRequested || !pendingRunner) return;
    log.debug('Kosu sirasinda yeni istek geldi, bir kez daha calisiliyor');
  }
}

/**
 * Tum alarmlari yeniden planlamayi ISTE.
 *
 * En son verilen `runner` kullanilir: firtinalar ayni isi yaptigi icin en
 * guncel durum uzerinden calismak dogrusudur.
 */
export function requestFullReschedule(runner: Runner, reason: string): void {
  pendingRunner = runner;

  if (inFlight) {
    rerunRequested = true;
    log.debug('Kosu sürüyor, istek birlestirildi', { reason });
    return;
  }

  if (pendingTimer) {
    log.debug('Pencere acik, istek birlestirildi', { reason });
    return;
  }

  log.debug('Yeniden planlama planlandi', { reason, windowMs: COALESCE_WINDOW_MS });
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    inFlight = drain().finally(() => {
      inFlight = null;
    });
  }, COALESCE_WINDOW_MS);
}

/** Yalnizca testler icin. */
export function __resetRescheduleCoalescerForTests(): void {
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = null;
  pendingRunner = null;
  inFlight = null;
  rerunRequested = false;
}
