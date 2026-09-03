/**
 * medicineStore helpers — sync modulu.
 *
 * Sprint 4: Sync-related pure helpers (error parsing, cloud data merge,
 * background sync scheduler).
 * Sprint 47: cloud merge helpers (medicines, logs, reminders, settings).
 */

import { createScopedLogger } from '../../utils/logger';
import { isLocalMedicineImageUri } from '../../services/localMedicineImage';
import type { SavedMedicineCloudData } from '../../services/firestoreSync';
import type { Medicine, MedicineLog, ReminderTime, UserSettings } from '../../types';
// Hangi ayarin buluta gidip gitmedigi TEK KAYNAK: domain/settingsScope.ts
import { stripDeviceLocalSettingsFromCloud } from '../../domain/settingsScope';

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

/**
 * Sprint 47: Medicine merge helper.
 *
 * Local + cloud medicines listesini `updatedAt` alanina gore birlestirir.
 * - Cloud'da var, local'de yok → cloud eklenir
 * - Cloud daha yeni (updatedAt > local) → local guncellenir
 * - Diger durumlar → local korunur
 *
 * Inline `medicineStore.syncFromCloud` icindeki 12 satirlik pattern'i
 * pure helper'a cikarir.
 */
export function mergeMedicinesByUpdatedAt(
  local: Medicine[],
  cloud: Medicine[] | undefined
): Medicine[] {
  if (!cloud || cloud.length === 0) {
    return [...local];
  }

  const localMap = new Map(local.map(m => [m.id, m]));
  const merged: Medicine[] = [...local];

  for (const cloudMedicine of cloud) {
    const localMedicine = localMap.get(cloudMedicine.id);
    if (!localMedicine) {
      merged.push(cloudMedicine);
    } else if (cloudMedicine.updatedAt > localMedicine.updatedAt) {
      const idx = merged.findIndex(m => m.id === cloudMedicine.id);
      if (idx !== -1) {
        merged[idx] = cloudMedicine;
      }
    }
  }

  return merged;
}

/**
 * Sprint 47: MedicineLog merge helper.
 *
 * Local log ID'lerini Set'te tutar, cloud log'larindan duplicate olmayanlari
 * ekler. ID bazli merge — local log oncelikli (son durum korunur).
 */
export function mergeMedicineLogsById(
  local: MedicineLog[],
  cloud: MedicineLog[] | undefined
): MedicineLog[] {
  if (!cloud || cloud.length === 0) {
    return [...local];
  }

  const localIds = new Set(local.map(l => l.id));
  const newCloudLogs = cloud.filter(cl => !localIds.has(cl.id));
  return [...local, ...newCloudLogs];
}

/**
 * Sprint 47: ReminderTime merge helper.
 *
 * ID bazli union — local'de olmayan cloud reminder'lar eklenir.
 */
export function mergeReminderTimesById(
  local: ReminderTime[],
  cloud: ReminderTime[] | undefined
): ReminderTime[] {
  if (!cloud || cloud.length === 0) {
    return [...local];
  }

  const localIds = new Set(local.map(rt => rt.id));
  const newCloudReminders = cloud.filter(crt => !localIds.has(crt.id));
  return [...local, ...newCloudReminders];
}

/**
 * UserSettings merge helper — SON-YAZAN-KAZANIR (v1.7.1).
 *
 * Cloud'dan gelen TANIMLI alanlar local'in ustune yazilir; `undefined`
 * degerler atlanir (Firestore `undefined` kabul etmez, eski sync'lerde eksik
 * alanlar bu sekilde local'i ezmez).
 *
 * ── Duzeltilen kusur ─────────────────────────────────────────────────────
 * Bulut KOSULSUZ kazaniyordu ve `getSettingsFromCloud` her alani
 * `?? varsayilan` ile dondurdugu icin pratikte hicbir alan `undefined`
 * gelmiyordu. Sonuc (cihazda kanitlandi): bir cihazda yapilan ayar
 * degisikligi indirme yarisini kaybederse SESSIZCE geri aliniyordu —
 * yukleme fire-and-forget ve SyncQueue'ya girmiyor. Tam ekran alarm
 * anahtari yeniden baslatmada eski degerine donuyordu.
 *
 * Artik iki tarafta da `settingsUpdatedAt` damgasi varsa YENI olan kazanir.
 * Damga yoksa (yeni kurulum, eski bulut dokumani) eski davranis korunur:
 * bulut kazanir — boylece temiz kurulumda yerel varsayilanlar kullanicinin
 * bulut ayarlarini ezmez.
 *
 * NOT: Karsilastirma DOKUMAN duzeyindedir, alan duzeyinde degil. Iki cihazda
 * ES ZAMANLI farkli alanlarin degistirilmesi hala en yeni dokumani kazandirir.
 * Alan bazli birlestirme icin her alanin kendi damgasi gerekir — bilincli
 * olarak yapilmadi (ayar sayisi kadar damga = dokuman boyutunun iki katindan
 * fazlasi).
 */
export function mergeSettingsWithUndefined(
  local: UserSettings,
  cloud: Partial<UserSettings> | undefined
): UserSettings {
  if (!cloud) {
    return local;
  }

  const localStamp = Date.parse(local.settingsUpdatedAt ?? '');
  const cloudStamp = Date.parse(cloud.settingsUpdatedAt ?? '');
  const bothStamped = !Number.isNaN(localStamp) && !Number.isNaN(cloudStamp);

  if (bothStamped && localStamp > cloudStamp) {
    // Yerel degisiklik daha YENI: bulut dokumani bayat, hicbir alani yazmiyoruz.
    return local;
  }

  // ⚠️ v1.7.9 — CIHAZA OZEL ALANLAR BULUTTAN OKUNMAZ.
  // PIN hash'i, biyometrik anahtari, kilit suresi ve son aktiflik zamani
  // senkron yukune hic girmemeliydi; eski bulut dokumanlari onlari HALA
  // iceriyor olabilir. Gerekce: src/domain/settingsScope.ts dosya basi.
  const cloudWithoutDeviceLocal = stripDeviceLocalSettingsFromCloud(
    cloud as Record<string, unknown>
  );
  const definedEntries = Object.entries(cloudWithoutDeviceLocal).filter(([, v]) => v !== undefined);
  return { ...local, ...Object.fromEntries(definedEntries) } as UserSettings;
}
