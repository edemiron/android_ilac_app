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
