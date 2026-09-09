/**
 * Uyum (adherence) hesabi — TEK KAYNAK.
 *
 * ⚠️ v1.7.7 — "GORMEZDEN GELDIGIN DOZ SKORUNU YUKSELTIYOR" HATASI
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Kod tabaninda UC ayri uyum hesabi vardi; ucu de farkli payda ve farkli
 * "veri yok" cevabi kullaniyordu:
 *
 *   | Yer                                        | Payda            | Veri yoksa |
 *   |--------------------------------------------|------------------|-----------|
 *   | stores/helpers/dateTime.ts                 | mevcut loglar    | 100 (ya da 0) |
 *   | StatisticsScreen/helpers.ts                | cagiranin totali | 0         |
 *   | useStatisticsController (satir ici, 2 kez) | o gunun loglari  | 100       |
 *
 * Ayni ekranda bos veri icin bir kart %100, digeri %0 gosterebiliyordu.
 *
 * ── ASIL KUSUR: PAYDA ────────────────────────────────────────────────────
 * Ucunun de paydasi "KAYDEDILMIS log sayisi"ydi. Kullanici bir dozu hic
 * islemezse (ne aldi ne atladi) o doz icin HICBIR log olusmuyor — cunku
 * `markMissedReminders` kod tabaninda TANIMLI ama HICBIR YERDEN CAGRILMIYORDU.
 * Dolayisiyla:
 *
 *     Gunde 3 doz planli. Kullanici 1'ini aldi, 2'sini gormezden geldi.
 *     Loglar: 1 x taken.  Uyum = 1/1 = %100.
 *
 * Yani ilacini almamak uyum skorunu YUKSELTIYORDU. Doktora giden rapor icin
 * bu, hatanin en tehlikeli turu: yanlis ama guven veren bir sayi.
 *
 * ── COZUM ────────────────────────────────────────────────────────────────
 * 1. Payda PLANLANAN doz: `taken + skipped + missed`. `markMissedReminders`
 *    artik on plana gelişte cagriliyor, boylece islenmeyen doz `missed`
 *    olarak paydaya giriyor.
 * 2. "Veri yok" durumu UYDURULMUYOR: planlanan doz yoksa oran `null` doner.
 *    Yeni kullaniciya %100 gostermek (ya da %0 ile cesaretini kirmak) yerine
 *    arayuz "—" gosterir.
 */

import type { MedicineLog } from '../types';
import { getLocalDateKey, isLogOnLocalDate } from './doseLog';

/** Uyum paydasina giren durumlar — yani "planlanmis ve sonuclanmis" dozlar. */
const PLANNED_STATUSES: ReadonlyArray<MedicineLog['status']> = ['taken', 'skipped', 'missed'];

export interface DoseOutcomes {
  taken: number;
  skipped: number;
  missed: number;
  /** Uyum paydasi: taken + skipped + missed. `pending` SAYILMAZ. */
  planned: number;
}

export type AdherenceLog = Pick<MedicineLog, 'status' | 'scheduledTime'>;

/**
 * Log listesini doz sonuclarina ayirir.
 *
 * `pending` loglar paydaya GIRMEZ: henuz saati gelmemis bir doz ne alinmis ne
 * kacirilmis sayilir; onu paydaya koymak bugunun skorunu gun icinde surekli
 * dusuk gosterir.
 */
export function countDoseOutcomes(logs: ReadonlyArray<AdherenceLog>): DoseOutcomes {
  let taken = 0;
  let skipped = 0;
  let missed = 0;

  for (const log of logs || []) {
    if (log.status === 'taken') taken += 1;
    else if (log.status === 'skipped') skipped += 1;
    else if (log.status === 'missed') missed += 1;
  }

  return { taken, skipped, missed, planned: taken + skipped + missed };
}

/**
 * Uyum orani (0–100) ya da veri yoksa `null`.
 *
 * ⚠️ `null` UYDURULMUS BIR SAYIYLA DEGISTIRILMEMELI. Planlanan doz yoksa
 * uyum tanimsizdir; arayuz "—" gostermelidir.
 */
export function adherenceRate(taken: number, planned: number): number | null {
  if (!Number.isFinite(planned) || planned <= 0) return null;
  const safeTaken = Number.isFinite(taken) ? Math.max(0, taken) : 0;
  return Math.round((Math.min(safeTaken, planned) / planned) * 100);
}

export interface AdherenceSummary extends DoseOutcomes {
  /** 0–100 ya da veri yoksa `null`. */
  rate: number | null;
  /** Kolaylik: `planned > 0`. Arayuzde "—" karari icin. */
  hasData: boolean;
}

/** Bir log kumesinin uyum ozeti. */
export function summarizeAdherence(logs: ReadonlyArray<AdherenceLog>): AdherenceSummary {
  const outcomes = countDoseOutcomes(logs);
  return {
    ...outcomes,
    rate: adherenceRate(outcomes.taken, outcomes.planned),
    hasData: outcomes.planned > 0,
  };
}

/**
 * Belirli bir YEREL gunun uyum ozeti.
 *
 * Gun karsilastirmasi `doseLog.isLogOnLocalDate` ile yapilir — dize oneki ile
 * degil. Gerekce: `doseLog.ts` dosya basi (UTC/yerel karisikligi).
 */
export function summarizeAdherenceForLocalDate(
  logs: ReadonlyArray<AdherenceLog>,
  day: Date
): AdherenceSummary {
  const key = getLocalDateKey(day);
  return summarizeAdherence((logs || []).filter(log => isLogOnLocalDate(log, key)));
}

/** Bir gun "tam uyum" mu? Veri yoksa HAYIR (seri uydurulmaz). */
export function isFullAdherenceDay(summary: AdherenceSummary): boolean {
  return summary.hasData && summary.taken === summary.planned;
}

export { PLANNED_STATUSES };
