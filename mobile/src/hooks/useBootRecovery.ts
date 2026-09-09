import { useState, useEffect } from 'react';

import { createScopedLogger } from '../utils/logger';
import {
  getBootRecoveryResult,
  clearBootRecoveryResult,
  type BootRecoveryResult,
} from '../utils/bootHandler';

const log = createScopedLogger('BootRecovery');

export interface UseBootRecoveryResult {
  bootRecovery: BootRecoveryResult | null;
  clearBootRecovery: () => void;
}

/**
 * Cihaz yeniden baslatildiktan sonra `BootReceiver`in birakti kurtarma
 * sonucunu okur ve kullaniciya gosterilmek uzere state'e aktarir.
 *
 * ── v1.7.1 sadelestirme ───────────────────────────────────────────────────
 * Bu hook eskiden App.tsx'teki `performStartupCleanup` ile AYNI isi de
 * yapiyordu: goruntulenen bildirimleri temizlemek ve
 * `reRegisterAllAlarms('app_startup')` cagirmak. Sonuc:
 *
 *   1. Her acilista IKI tam iptal+yeniden planlama firtinasi. Cihaz
 *      logcat'inde ayni bildirim kimliklerinin 2-4 kez iptal edildigi
 *      olculdu; tam ekran alarm anahtari degistiginde iki firtina ic ice
 *      gecip ayar KAPALI iken 11 bekleyen native alarm birakmisti.
 *   2. `clearBootRecoveryResult()` iki yerden cagriliyordu — hangisi once
 *      calisirsa sonucu siliyordu, dolayisiyla kurtarma bildirimi
 *      kullaniciya hic gorunmeyebiliyordu.
 *
 * Artik gorev dagilimi net:
 *   - App.tsx  → kanallar, bildirim temizligi, orphan/stale temizligi,
 *                `reRegisterAllAlarms` (TEK cagri)
 *   - bu hook  → yalnizca boot recovery sonucunu okumak ve tuketmek
 */
export function useBootRecovery(): UseBootRecoveryResult {
  const [bootRecovery, setBootRecovery] = useState<BootRecoveryResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    const readBootRecovery = async () => {
      try {
        const recovery = await getBootRecoveryResult();
        if (!recovery) return;
        if (recovery.reminders <= 0 && recovery.snoozes <= 0) {
          // Gosterilecek bir sey yok; yine de tuketip temizle.
          await clearBootRecoveryResult();
          return;
        }

        if (!cancelled) {
          setBootRecovery(recovery);
        }
        await clearBootRecoveryResult();
        log.debug('Boot recovery sonucu okundu', { ...recovery });
      } catch (error) {
        log.error('Boot recovery sonucu okunamadi', error);
      }
    };

    void readBootRecovery();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    bootRecovery,
    clearBootRecovery: () => setBootRecovery(null),
  };
}
