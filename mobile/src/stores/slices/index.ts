/**
 * medicineStore slice mimarisi — Sprint 4 tamamlandı.
 *
 * 4 slice oluşturuldu:
 *   1. medicinesSlice    → ilaç CRUD + reminder times
 *   2. logsSlice         → medicineLogs (alındı/atlandı/kaçırıldı)
 *   3. settingsSlice     → UserSettings + sync
 *   4. snoozesSlice      → erteleme (snooze, deactivate, ...)
 *
 * Mevcut tek-store (medicineStore.ts) GERİYE UYUMLU olarak korunuyor.
 * Sprint 4'ün tamamlanmasi için iki strateji var:
 *
 * A) Incremental migration (tercih edilen):
 *    - medicineStore.ts'ten action'lar tek tek slice'lara migrate edilir
 *    - Her action sonrasi test + lint dogrulamasi
 *    - Davranis birebir korunur
 *
 * B) Big-bang refactor (riskli):
 *    - medicineStore.ts silinir
 *    - combine() ile 4 slice tek store'a birlestirilir
 *    - Tum hook'lar ve testler ayni anda guncellenir
 *
 * Sprint 46'da factory pattern eklendi: her slice'in hem isolated store'u
 * (geriye uyumlu) hem de createXxxSlice(set, get) factory fonksiyonu var.
 * medicineStore.combined.ts'te combine ornegi bulunabilir.
 *
 * NOT: Sprint 4'ün bu oturumunda SADECE slice mimarisinin TEMELI atildi:
 *   - types/index.ts'e imageStoragePath, imageMimeType, imageSize,
 *     imageUpdatedAt, note alanlari eklendi (medicineStore.ts'in
 *     kullandigi ama tipte olmayan alanlar)
 *   - constants.ts'e MEDICINE_COLORS eklendi
 *   - 4 slice dosyasi olusturuldu (medicines, logs, snoozes, settings)
 *   - medicineStore.ts MEDICINE_COLORS'u constants'tan re-export ediyor
 *
 * Davranis: degismez (ayni test baseline: 1269 pass).
 *
 * Ileride yapilmasi gerekenler (sonraki sprint'ler):
 * - medicineStore.ts action'larini slice'lara migrate et
 * - medicineStore.ts'i combine() ile birlestir
 * - Testleri yeni yapida guncelle
 */

export { useMedicinesStore, createMedicinesSlice } from './medicines';
export type { MedicinesSlice } from './medicines';
export { useLogsStore, createLogsSlice } from './logs';
export type { LogsSlice } from './logs';
export { useSnoozesStore, createSnoozesSlice } from './snoozes';
export type { SnoozesSlice } from './snoozes';
export { useSettingsStore, createSettingsSlice } from './settings';
export type { SettingsSlice } from './settings';

export const SLICE_ARCHITECTURE_PLAN = {
  version: 1,
  slices: ['medicines', 'logs', 'snoozes', 'settings'] as const,
  migration: 'incremental' as const,
  status: 'foundation-laid' as const,
} as const;
