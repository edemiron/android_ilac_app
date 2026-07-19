/**
 * medicineStore combined facade — Sprint 46.
 *
 * 4 bağımsız slice'ı (medicines, logs, snoozes, settings) combine eden
 * facade katmanı. mevcut `useMedicineStore` API'sini korur.
 *
 * NOT: Bu dosya sadece SLICE FACTORY EXPORT'ları için. Asıl `useMedicineStore`
 * hala medicineStore.ts içinde (Sprint 4'teki implementasyon).
 * Sprint 47+'da medicineStore.ts action'ları kademeli olarak
 * slice factory'lere migrate edilecek.
 *
 * Mevcut test'ler backward-compat: eski `useMedicineStore` import'ları
 * doğrudan medicineStore.ts'den geliyor, yeni `useCombinedMedicineStore`
 * opsiyonel bir alternatif.
 */

export {
  useMedicinesStore,
  useLogsStore,
  useSnoozesStore,
  useSettingsStore,
  createMedicinesSlice,
  createLogsSlice,
  createSnoozesSlice,
  createSettingsSlice,
} from './slices';

export type { MedicinesSlice, LogsSlice, SnoozesSlice, SettingsSlice } from './slices';
