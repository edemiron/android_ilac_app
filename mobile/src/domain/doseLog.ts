/**
 * Doz kaydı (dose log) domain çekirdeği — TEK KAYNAK.
 *
 * ⚠️ v1.7.4 (Faz 1.1) — İKİ KRİTİK HATANIN ORTAK ÇÖZÜMÜ
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── HATA 1: Çok dozlu ilaçların sonraki alarmları susturuluyordu ──────────
 * "Bugün bu doz zaten alındı mı?" kontrolü ALTI ayrı yerde şöyle yazılıydı:
 *
 *     ((reminderTimeId && log.reminderTimeId === reminderTimeId) ||
 *      (medicineId     && log.medicineId     === medicineId))      // ← OR!
 *
 * `MedicineLog.medicineId` zorunlu bir alan ve HER logda dolu. `||` yüzünden
 * "ilacın o gün herhangi bir dozu kaydedilmişse" koşul sağlanıyordu.
 * Örnek: İlaç A, rt1=08:00, rt2=20:00. Sabah dozu alınınca akşam alarmı
 *   - arka planda iptal ediliyor (`index.ts` DELIVERED handler),
 *   - `handleIncomingAlarmNavigation` `'dismissed'` dönüyor,
 *   - ekran açılsa bile mount guard kapatıyordu.
 * Yani günde 2+ doz alan HERKES yalnızca ilk dozun alarmını alıyordu —
 * uygulamanın tek işi buydu.
 *
 * Neden testler yakalamadı: `AlarmNavigationStore['medicineLogs']` tipi
 * `medicineId` alanını içermiyordu ve fixture'larda bu alan yoktu; kod ise
 * `(log as any).medicineId` cast'i ile okuyordu. "Farklı reminderTimeId →
 * false" iddiası bu yüzden yanlış pozitif geçiyordu.
 *
 * ── HATA 2: Gün karşılaştırması UTC/yerel karışığıydı ─────────────────────
 * Karşılaştırma `log.scheduledTime.startsWith(<gün>)` ile yapılıyordu; o gün
 * dizesi bazı yerlerde YEREL (`format(now,'yyyy-MM-dd')`), bazı yerlerde UTC
 * (`toISOString().split('T')[0]`) üretiliyordu. Türkiye UTC+3 olduğu için
 * 00:00–03:00 arasındaki dozlar bir ÖNCEKİ güne düşüyordu. Ayrıca
 * `scheduledTime`ın kendisi üç farklı formatta üretiliyor (UTC-Z ISO,
 * saat dilimsiz yerel, epoch-ms string), dolayısıyla dize önekiyle
 * karşılaştırmak zaten güvenilir değildi.
 *
 * Bu modül gün karşılaştırmasını DİZE ÖNEKİ ile değil, zamanı `Date`e
 * çevirip YEREL gün anahtarını hesaplayarak yapar. Böylece üç formatın
 * hepsi doğru güne düşer.
 */

import type { MedicineLog } from '../types';

/** Kaydedilmiş sayılan durumlar — bekleyen/kaçırılan alarmı susturmaz. */
const RESOLVED_STATUSES: ReadonlyArray<MedicineLog['status']> = ['taken', 'skipped'];

/**
 * Bir `Date`in YEREL gün anahtarı (`yyyy-MM-dd`).
 *
 * `toISOString().split('T')[0]` KULLANILMAZ: o UTC gününü verir ve TR'de
 * 00:00–03:00 arası bir önceki günü gösterir.
 */
export function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * `scheduledTime` alanını `Date`e çevirir.
 *
 * Kod tabanında üç format dolaşıyor:
 *   1. `"2026-09-02T05:00:00.000Z"`   → UTC (bildirim yükünden)
 *   2. `"2026-09-02T08:00:00"`        → saat dilimsiz; JS bunu YEREL sayar
 *   3. `"1788365357235"`              → epoch ms **string** (native köprüden)
 *
 * (3) `new Date(...)` ile doğrudan `Invalid Date` üretir; bu yüzden sayısal
 * dizeler önce sayıya çevrilir. Ayrıştırılamayan değer için `null` döner —
 * uydurma bir tarih üretmek yanlış güne kaydetmekten daha kötüdür.
 */
export function parseScheduledTime(scheduledTime?: string | null): Date | null {
  if (!scheduledTime) return null;

  const trimmed = String(scheduledTime).trim();
  if (trimmed.length === 0) return null;

  // Epoch-ms string (yalnızca rakam)
  if (/^\d+$/.test(trimmed)) {
    const asNumber = Number(trimmed);
    if (!Number.isFinite(asNumber)) return null;
    const fromEpoch = new Date(asNumber);
    return Number.isNaN(fromEpoch.getTime()) ? null : fromEpoch;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Bir log kaydı, verilen YEREL güne mi ait? */
export function isLogOnLocalDate(
  log: Pick<MedicineLog, 'scheduledTime'>,
  localDate: string
): boolean {
  const when = parseScheduledTime(log.scheduledTime);
  return when !== null && getLocalDateKey(when) === localDate;
}

export interface DoseIdentity {
  /** Dozun kimliği. VARSA eşleşme YALNIZCA buna göre yapılır. */
  reminderTimeId?: string | null;
  /** Yalnızca `reminderTimeId` yoksa devreye giren geri düşüş. */
  medicineId?: string | null;
}

/**
 * Bu doz, verilen yerel günde çözümlenmiş mi (alındı / atlandı)?
 *
 * ⚠️ `reminderTimeId` varsa `medicineId`ye BAKILMAZ. Eski `||` davranışı
 * ilacın herhangi bir dozunu "bu doz" sayıyordu (bkz. dosya başı, Hata 1).
 * `medicineId` yalnızca `reminderTimeId` hiç yoksa kullanılır — o durumda
 * ayırt edecek başka bilgi yoktur.
 */
export function isDoseLogged(
  logs: ReadonlyArray<
    Pick<MedicineLog, 'reminderTimeId' | 'medicineId' | 'scheduledTime' | 'status'>
  >,
  identity: DoseIdentity,
  now: Date = new Date()
): boolean {
  const { reminderTimeId, medicineId } = identity;
  if (!reminderTimeId && !medicineId) return false;

  const localDate = getLocalDateKey(now);

  return (logs || []).some(log => {
    if (!RESOLVED_STATUSES.includes(log.status)) return false;
    if (!isLogOnLocalDate(log, localDate)) return false;

    if (reminderTimeId) {
      return log.reminderTimeId === reminderTimeId;
    }
    return !!medicineId && log.medicineId === medicineId;
  });
}
