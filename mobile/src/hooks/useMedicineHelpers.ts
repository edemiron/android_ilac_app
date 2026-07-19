/**
 * useMedicinePersistence pure helpers.
 *
 * Sprint 6.3: useMedicinePersistence.ts (537 satir) hook'unu pure
 * helper fonksiyonlara boluyor.
 */

/**
 * HH:mm formatinda string -> [hours, minutes] tuple.
 * Gecersiz formatta NaN doner.
 */
export function parseTimeString(time: string): [number, number] {
  const parts = time.split(':').map(Number);
  return [parts[0] ?? 0, parts[1] ?? 0];
}

/**
 * [hours, minutes] -> HH:mm formatinda string.
 */
export function formatTimeString(hours: number, minutes: number): string {
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Saat cakismasi olan medicine'lar icin times array'ini kaydir.
 * Verilen interval dakika kadar bos slot arar, bulamazsa cycle eder.
 *
 * Ornek: originalTimes = ['08:00'], intervalMinutes = 30, conflictingTimes = {'08:00'}
 * -> ['08:30'] (08:30 bos)
 */
export function adjustTimesForConflicts(
  originalTimes: string[],
  conflictingTimes: Set<string>,
  intervalMinutes: number,
  maxAttempts = 6
): string[] {
  const adjustedTimes: string[] = [];
  const allOccupiedTimes = new Set(conflictingTimes);

  for (const time of originalTimes) {
    if (!allOccupiedTimes.has(time)) {
      adjustedTimes.push(time);
      allOccupiedTimes.add(time);
      continue;
    }

    let [hours, minutes] = parseTimeString(time);
    let foundSlot = false;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      minutes += intervalMinutes;
      if (minutes >= 60) {
        hours += Math.floor(minutes / 60);
        minutes = minutes % 60;
      }
      if (hours >= 24) {
        hours = hours % 24;
      }

      const candidate = formatTimeString(hours, minutes);

      if (!allOccupiedTimes.has(candidate)) {
        adjustedTimes.push(candidate);
        allOccupiedTimes.add(candidate);
        foundSlot = true;
        break;
      }
    }

    // Slot bulunamadiysa original time'i koru
    if (!foundSlot) {
      adjustedTimes.push(time);
      allOccupiedTimes.add(time);
    }
  }

  return adjustedTimes;
}

/**
 * Medicine kayitli zamanlarini normalize et (siraya koy, unique yap).
 */
export function normalizeMedicineTimes(times: string[]): string[] {
  return Array.from(new Set(times)).sort();
}

/**
 * HH:mm formatinda saat kiyaslamasi.
 * '08:00' < '08:30' < '09:00'.
 */
export function compareTimeStrings(a: string, b: string): number {
  const [ah, am] = parseTimeString(a);
  const [bh, bm] = parseTimeString(b);
  if (ah !== bh) return ah - bh;
  return am - bm;
}

/**
 * Sanitize: medicine name'i normalize et.
 * - Leading/trailing whitespace trim
 * - Multiple spaces tek space'e indir
 * - Empty string donerse null doner
 */
export function sanitizeMedicineName(name: string): string | null {
  if (typeof name !== 'string') return null;
  const trimmed = name.trim().replace(/\s+/g, ' ');
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Sanitize: dosage string normalize.
 * Ornek: '500 mg' -> '500mg', '500  MG' -> '500mg'.
 */
export function sanitizeDosage(dosage: string): string | null {
  if (typeof dosage !== 'string') return null;
  const trimmed = dosage.trim().replace(/\s+/g, '');
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Validation: dosage formati kontrol et (rakam + birim).
 * Kabul edilen format: '500mg', '5ml', '1 tablet', '2 kapsül', '10mg/5ml' vs.
 */
export function isValidDosageFormat(dosage: string): boolean {
  if (typeof dosage !== 'string') return false;
  const sanitized = sanitizeDosage(dosage);
  if (!sanitized) return false;
  // En az bir rakam icermeli (opsiyonel birim ile)
  return /\d/.test(sanitized);
}

/**
 * Validation: reminder time dizisi bos mu / gecersiz saat iceriyor mu.
 */
export function isValidReminderTimes(times: string[]): boolean {
  if (!Array.isArray(times) || times.length === 0) return false;
  return times.every(t => /^\d{2}:\d{2}$/.test(t) && isValidClockTime(t));
}

/**
 * HH:mm formatindaki saat gercek bir saat mi (00:00-23:59).
 */
export function isValidClockTime(time: string): boolean {
  const [hours, minutes] = parseTimeString(time);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return false;
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

/**
 * Form state ozet bilgisi (debug/log icin).
 */
export function summarizeFormState(formState: {
  name?: string;
  dosage?: string;
  frequency?: number;
  useCustomTimes?: boolean;
  customTimes?: string[];
}): string {
  const name = formState.name?.trim() || '(no-name)';
  const dosage = formState.dosage?.trim() || '?';
  const freq = formState.frequency ?? 0;
  const times = formState.useCustomTimes ? (formState.customTimes?.length ?? 0) : freq;
  return `${name} | ${dosage} | ${freq}x/gün | ${times} alarm`;
}
