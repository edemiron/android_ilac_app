/**
 * dateParts.ts — Takvimin SAF TAMSAYI temsili.
 *
 * INV-1: Bu modülde ve WheelDatePicker'da HİÇBİR ZAMAN `new Date(...)` kurulmaz.
 * Tüm hesaplar tamsayı aritmetiğidir; ISO çıktısı string birleştirmedir.
 * Gerekçe: eslint.config.mjs'in proje genelinde yasakladığı UTC gün tuzağı
 * (TR = UTC+3, 00:00–03:00 önceki güne çözülür) yalnızca Date kurularak
 * tetiklenebilir. Date kurmazsak hata sınıfı yapısal olarak yok olur.
 */

export interface DateParts {
  readonly year: number; // tam sayı, 4 basamak
  readonly month: number; // 1..12 (1 = Ocak). Date.getMonth() DEĞİL — 0 tabanlı değil.
  readonly day: number; // 1..31
}

/** Gregorian artık yıl kuralı. Saf, yan etkisiz. */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const DAYS_IN_MONTH_NON_LEAP: readonly number[] = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** month 1..12. Geçersiz girdi için 0 döner (asla throw etmez — toplam fonksiyon). */
export function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH_NON_LEAP[month - 1] ?? 0;
}

/** Sözlüksel (lexicographic) karşılaştırma. Date'e gerek kalmadan sıralama verir. */
export function compareParts(a: DateParts, b: DateParts): -1 | 0 | 1 {
  if (a.year !== b.year) return a.year < b.year ? -1 : 1;
  if (a.month !== b.month) return a.month < b.month ? -1 : 1;
  if (a.day !== b.day) return a.day < b.day ? -1 : 1;
  return 0;
}

export function partsToIso(p: DateParts): string {
  return (
    String(p.year).padStart(4, '0') +
    '-' +
    String(p.month).padStart(2, '0') +
    '-' +
    String(p.day).padStart(2, '0')
  );
}

export const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Geçersizse null. Asla throw etmez, asla Date kurmaz. */
export function isoToParts(iso: string): DateParts | null {
  const m = ISO_DATE_REGEX.exec(iso);
  if (!m) return null;
  const parts: DateParts = { year: +m[1], month: +m[2], day: +m[3] };
  return isValidParts(parts) ? parts : null;
}

/** month 1..12 VE day gerçek takvim günü (artık yıl dahil) VE year 4 basamak. */
export function isValidParts(p: DateParts): boolean {
  return (
    Number.isInteger(p.year) &&
    p.year >= 1000 &&
    p.year <= 9999 &&
    Number.isInteger(p.month) &&
    p.month >= 1 &&
    p.month <= 12 &&
    Number.isInteger(p.day) &&
    p.day >= 1 &&
    p.day <= daysInMonth(p.year, p.month)
  );
}

export function clampInt(value: number, min: number, max: number): number {
  if (max < min) return min; // INV-6: dejenere aralıkta deterministik davranış
  return value < min ? min : value > max ? max : value;
}
