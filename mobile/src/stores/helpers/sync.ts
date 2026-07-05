/**
 * medicineStore helpers — sync modulu.
 *
 * Sprint 4: Sync-related pure helpers (error parsing, cloud data merge,
 * background sync scheduler).
 */

import { createScopedLogger } from '../../utils/logger';
import { isLocalMedicineImageUri } from '../../services/localMedicineImage';
import type { SavedMedicineCloudData } from '../../services/firestoreSync';
import type { Medicine } from '../../types';

const log = createScopedLogger('MedicineStoreSync');

/**
 * Hata objesinden sync-friendly mesaj cikar.
 * Error degilse generic Turkce mesaj doner.
 */
export function getSyncErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Senkronizasyon hatasi';
}

/**
 * Cloud'dan gelen medicine image/data guncellemesini local medicine'e uygula.
 * clearLocalImage=true ise local imageUri temizlenir.
 */
export function applySavedMedicineCloudData(
  medicines: Medicine[],
  medicineId: string,
  cloudData: SavedMedicineCloudData
): Medicine[] {
  return medicines.map(medicine =>
    medicine.id === medicineId
      ? {
          ...medicine,
          updatedAt: cloudData.updatedAt ?? medicine.updatedAt,
          imageUri: cloudData.clearLocalImage
            ? undefined
            : (cloudData.localImageUri ?? medicine.imageUri ?? undefined),
          imageStoragePath: cloudData.imageStoragePath ?? undefined,
          imageMimeType: cloudData.imageMimeType ?? undefined,
          imageSize: cloudData.imageSize ?? undefined,
          imageUpdatedAt: cloudData.imageUpdatedAt ?? undefined,
        }
      : medicine
  );
}

/**
 * Medicine'in henuz cloud'a upload edilmemis local image'i var mi?
 * (Local URI mevcut, ama storage path henuz set edilmemis)
 */
export function hasPendingMedicineImageBackfill(medicine: Medicine): boolean {
  return isLocalMedicineImageUri(medicine.imageUri) && !medicine.imageStoragePath;
}

/**
 * Background sync — caller'i bloklamadan sync calistir.
 * Hata olursa log'la ama firlatma (caller zaten islemi tamamladi).
 */
export function scheduleBackgroundSync(syncFn: () => Promise<void>): void {
  syncFn().catch(error => {
    log.error('BackgroundSync failed', error);
  });
}
