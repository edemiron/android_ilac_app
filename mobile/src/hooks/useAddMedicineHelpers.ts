/**
 * useAddMedicine hook pure helper'lari.
 *
 * Sprint 19.3: useAddMedicine.ts (438 satir) icinden pure fonksiyonlar helpers.ts'e
 * tasindi. Bunlar state/hook bagimliligi olmayan, test edilebilir saf donusumler.
 */

import type { MedicineForm } from '../types';

/**
 * Dozaj string'inin basindaki sayiyi ayristir (ornek "500mg tablet" -> "500").
 */
export function parseDosageAmount(dosage: string): string {
  const m = dosage.match(/^([\d.]+)/);
  return m ? m[1] : '1';
}

/**
 * Dozaj string'inden medicine form'u cikar (ornek "500mg tablet" -> "tablet").
 *
 * Önemli: "damla"/"drop" kontrolü "ml" kontrolünden önce yapılmalı,
 * çünkü "damla" kelimesi "ml" substring'ini içerir.
 */
export function parseMedicineForm(dosage: string): MedicineForm {
  const lower = dosage.toLowerCase();
  if (lower.includes('damla') || lower.includes('drop')) return 'drops';
  if (lower.includes('tablet')) return 'tablet';
  if (lower.includes('kaps')) return 'capsule';
  if (lower.includes('ml') || lower.includes('şurup') || lower.includes('syrup')) return 'syrup';
  if (lower.includes('enjeksiyon') || lower.includes('injection') || lower.includes('iğne')) {
    return 'injection';
  }
  return 'tablet';
}

/**
 * Yeni ilac icin baslangic saatlerini olustur (08:00-21:00 arasi esit dagilim).
 */
export function getInitialAutoTimes(count: number): string[] {
  if (count <= 0) return [];
  const startMinutes = 8 * 60;
  const endMinutes = 21 * 60;
  const step = count === 1 ? 0 : (endMinutes - startMinutes) / (count - 1);
  return Array.from({ length: count }, (_, i) => {
    const totalMins = Math.round(startMinutes + step * i);
    const h = Math.floor(totalMins / 60)
      .toString()
      .padStart(2, '0');
    const m = (totalMins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  });
}

/**
 * Medicine form etiketleri (TR).
 */
export const FORM_LABELS_TR: Record<MedicineForm, string> = {
  tablet: 'tablet',
  capsule: 'kapsül',
  syrup: 'ml',
  drops: 'damla',
  injection: 'enjeksiyon',
  cream: 'krem',
  spray: 'sprey',
  patch: 'bant',
  suppository: 'fitil',
  powder: 'sayet',
  other: 'birim',
};

/**
 * Dosage amount + form'dan olusturulan "500 tablet" gibi dosage string'i.
 */
export function buildDosageString(amount: string, form: MedicineForm): string {
  const unit = FORM_LABELS_TR[form] || 'tablet';
  return `${amount || '1'} ${unit}`.trim();
}
