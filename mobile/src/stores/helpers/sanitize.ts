/**
 * medicineStore helpers — sanitize modülü.
 *
 * Sprint 4: medicineStore.ts (1947 satir) pure helper'lara ayriliyor.
 * Davranis korunuyor — medicineStore.ts buradan import ediyor.
 */

/**
 * Turkce karakter encoding sorunlarini duzelt.
 * Unicode escape sequence'lari decode et (\\u00fc -> u).
 */
export function sanitizeString(str: string | undefined | null): string {
  if (!str) return '';
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

/**
 * Medicine data icindeki string alanlari sanitize et.
 * Generic constraint: name veya dosage alanlarini sanitize eder.
 */
export function sanitizeMedicineData<T extends { name?: string; dosage?: string }>(data: T): T {
  const sanitized = { ...data };

  if (typeof data.name === 'string') {
    sanitized.name = sanitizeString(data.name) as T['name'];
  }

  if (typeof data.dosage === 'string') {
    sanitized.dosage = sanitizeString(data.dosage) as T['dosage'];
  }

  return sanitized;
}
