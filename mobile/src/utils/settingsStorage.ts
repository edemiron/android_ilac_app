/**
 * Settings storage migration helpers.
 *
 * Zustand persist middleware'i için eski versiyonlardan yeni versiyona
 * state migration yapar. medicineStore.ts persist config'i tarafından
 * kullanılır.
 */

import type { UserSettings } from '../types';

export const SETTINGS_STORAGE_VERSION = 1;

/**
 * Eski versiyondan yeni versiyona migration yap.
 * NOT: Sprint 4'te medicineStore slice mimarisinde daha kapsamlı
 * migration logic eklenecek. Bu minimal implementasyon mevcut
 * davranışı koruyacak şekilde sadece fallback yapıyor.
 */
export function migrateMedicineStoreState(persistedState: unknown, version: number): unknown {
  // Şimdilik en basit fallback: olduğu gibi geri döndür.
  // İleride: eski format → yeni format dönüşümleri.
  if (version < SETTINGS_STORAGE_VERSION) {
    return persistedState;
  }
  return persistedState;
}

/**
 * Stored settings snapshot'i al (varsa).
 * Test ortaminda ve migration sirasinda kullanilir.
 */
export function getStoredMedicineSnapshot(): UserSettings | null {
  // Bu fonksiyon Sprint 4'te implement edilecek.
  return null;
}

/**
 * Stored settings snapshot'i kaydet.
 */
export function saveStoredMedicineSnapshot(_settings: UserSettings): void {
  // Bu fonksiyon Sprint 4'te implement edilecek.
}
