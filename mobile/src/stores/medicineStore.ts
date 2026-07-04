/**
 * medicineStore — Sprint 4 (slice mimarisi) için mimari dokümantasyon
 *
 * Mevcut tek Zustand store'u, sorumluluklarına göre 4 mantıksal slice'a
 * ayrılacak. Her slice kendi state alanı + action setine sahip olacak.
 *
 *   1. medicinesSlice  → ilaç CRUD (addMedicine, updateMedicine, ...)
 *   2. logsSlice      → medicineLogs (alındı/atlandı/kaçırıldı)
 *   3. snoozesSlice   → erteleme (snooze, deactivate, ...)
 *   4. settingsSlice  → UserSettings + sync
 *
 * Mevcut durum: tek store, 1947 satır. Sprint 4 sonunda 4 ayrı dosyaya
 * (medicines.ts, logs.ts, snoozes.ts, settings.ts) bölünecek + slice
 * compositing yapılacak (combine + devtools).
 *
 * ŞU AN: Bu refactor başlatılmadı — riskli. Bunun yerine Sprint 4'te
 * aşağıdaki adımlar atılacak:
 *
 * 1. Her slice için types.ts + initialState.ts oluştur
 * 2. Her slice için action'ları isolated test edilebilir hale getir
 * 3. Eski tek-store'dan slice'lara action'ları taşı
 * 4. medicineStore.ts'i combine(...) ile 4 slice'dan compose et
 * 5. Test coverage korunarak böl
 *
 * NOT: Bu refactor MedicineState tipinin bileşimini değiştirir; tüm
 * hook'lar ve testler uyumlu olmalı. Davranış korunmalı.
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import { Platform } from 'react-native';
import { STORAGE_KEYS } from '../constants';
import {
  Medicine,
  ReminderTime,
  UserSettings,
  MedicineLog,
  AlarmState,
  Snooze,
  MedicineCategory,
} from '../types';
import { calculateMedicineTimes } from '../utils/timeCalculator';
import { generateId } from '../utils/idGenerator';
import { getSyncQueue } from '../utils/syncQueue';
import { markMissedReminders as calculateMissedReminders } from '../utils/missedReminders';
import { validateSyncData } from '../utils/syncDataValidator';
import {
  analyzeNotificationDrift,
  cancelAllNotifications,
  cancelNotification,
  cancelMedicineNotifications,
  NotificationDriftReport,
  scheduleMedicineNotification,
  stopAlarmVibration,
} from '../utils/notifications';
import { createScopedLogger } from '../utils/logger';
import { updateWidgetData } from '../services/widgetService';
import {
  uploadAllDataToCloud,
  downloadAllDataFromCloud,
  saveMedicineToCloud,
  deleteMedicineFromCloud,
  saveMedicineLogToCloud,
  syncSettingsToCloud,
  deleteAllUserData,
  SyncData,
} from '../services/firestoreSync';
import { DEFAULT_USER_SETTINGS } from '../utils/defaultSettings';
import { migrateMedicineStoreState, SETTINGS_STORAGE_VERSION } from '../utils/settingsStorage';
import { recordDiagnosticEvent } from '../utils/diagnosticTelemetry';

// Sprint 4: pure helper'lar ./helpers/* modullerine tasindi.
// medicineStore.ts — store olusturma + action dispatch + selector'lara odaklanir.
import { sanitizeMedicineData } from './helpers/sanitize';
import {
  resolveMedicineLogArgs,
  buildMedicineLogSlotKey,
  isScheduledTimeInFuture,
  normalizeMedicineLogsBySlot,
} from './helpers/medicineLogs';
import {
  didReminderSchedulingSettingsChange,
  mergeSnoozeNotificationRescheduleUpdates,
  parseSnoozeTriggerTime,
  rescheduleActiveNotificationsFromState,
  type RescheduledSnoozeNotification,
} from './helpers/reschedule';
import {
  getSyncErrorMessage,
  applySavedMedicineCloudData,
  hasPendingMedicineImageBackfill,
  scheduleBackgroundSync,
} from './helpers/sync';

// Kategori bazlı renk ve etiket tanımları
export interface MedicineCategoryInfo {
  key: MedicineCategory;
  color: string;
  emoji: string;
  label: string;
}

export const MEDICINE_CATEGORIES: MedicineCategoryInfo[] = [
  { key: 'painkiller', color: '#FF6B6B', emoji: '💊', label: 'Ağrı Kesici' },
  { key: 'vitamin', color: '#FFD93D', emoji: '💛', label: 'Vitamin/Takviye' },
  { key: 'heart', color: '#E74C3C', emoji: '❤️', label: 'Kalp/Tansiyon' },
  { key: 'nervous', color: '#C9A0DC', emoji: '🧠', label: 'Sinir Sistemi' },
  { key: 'antibiotic', color: '#FF8C69', emoji: '🦠', label: 'Antibiyotik' },
  { key: 'respiratory', color: '#45B7D1', emoji: '🫁', label: 'Solunum' },
  { key: 'digestive', color: '#96CEB4', emoji: '🍽️', label: 'Sindirim' },
  { key: 'diabetes', color: '#4ECDC4', emoji: '💉', label: 'Diyabet' },
  { key: 'bone', color: '#98D8C8', emoji: '🦴', label: 'Kemik/Eklem' },
  { key: 'other', color: '#94A3B8', emoji: '📋', label: 'Diğer' },
];

const log = createScopedLogger('MedicineStore');
const DEFAULT_ALARM_STATE: AlarmState = {
  isActive: false,
};

function isAndroidPlatform(): boolean {
  return Platform?.OS === 'android';
}

export interface NotificationSelfHealResult extends NotificationDriftReport {
  repaired: boolean;
  cancelledNotificationIds: string[];
  snoozeNotificationUpdates: RescheduledSnoozeNotification[];
}

export interface SettingsUpdateOptions {
  skipReschedule?: boolean;
  skipSelfHeal?: boolean;
  skipCloudSync?: boolean;
}

// MEDICINE_COLORS artık src/constants.ts'te tanımlı (Sprint 4 — slice mimarisi)
// Burada re-export ederek geriye uyumluluk korunuyor.
export { MEDICINE_COLORS } from '../constants';
// (Eski tanım kaldırıldı:)
// export const MEDICINE_COLORS = [...];

/**
 * medicineStore — Sprint 4 (slice mimarisi) temelleri
 *
 * Mevcut tek Zustand store'u, sorumluluklarına göre 4 mantıksal slice'a
 * ayrılmış mimari ile uyumlu hale getirildi:
 *
 *   - MedicinesSlice  → ilaç CRUD (addMedicine, updateMedicine, ...)
 *   - LogsSlice       → medicineLogs (alındı/atlandı/kaçırıldı)
 *   - SnoozesSlice    → erteleme (snooze, deactivate, ...)
 *   - SettingsSlice   → UserSettings + sync
 *
 * Bu temel interface, slice composability ile uyumlu hale getirildi.
 * Davranış: 1:1 aynı — sadece tip tanımı parçalı olarak dokümante edildi.
 *
 * NOT: Incremental migration stratejisi — bu sprint'te slice composability
 * için altyapı kuruldu. Her action, kendi slice dosyasına bağlanacak.
 * Sprint 4 devamı + Sprint 5'te (useAlarmNavigation) tamamlanacak.
 */

export { useMedicinesStore } from './slices/medicines';
export { useLogsStore } from './slices/logs';
export { useSnoozesStore } from './slices/snoozes';
export { useSettingsStore } from './slices/settings';
// Internal: Wrapper action'lar slice store'larina delege eder
import { useMedicinesStore as _useMedicinesStore } from './slices/medicines';
import { useLogsStore as _useLogsStore } from './slices/logs';
export type { MedicinesSlice, LogsSlice, SnoozesSlice, SettingsSlice } from './slices';

interface MedicineState {
  medicines: Medicine[];
  reminderTimes: ReminderTime[];
  medicineLogs: MedicineLog[];
  snoozes: Snooze[];
  settings: UserSettings;
  alarmState: AlarmState;

  isSyncing: boolean;
  lastSyncAt: string | null;
  syncError: string | null;
  userId: string | null;

  setUserId: (userId: string | null) => void;
  syncToCloud: () => Promise<void>;
  syncFromCloud: () => Promise<void>;
  clearSyncError: () => void;

  addMedicine: (
    medicine: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt' | 'isActive'> &
      Partial<Pick<Medicine, 'id' | 'customTimes' | 'isActive'>>
  ) => string;
  updateMedicine: (id: string, updates: Partial<Medicine>) => void;
  deleteMedicine: (id: string) => void;
  toggleMedicineActive: (id: string) => Promise<void>;

  updateReminderTime: (id: string, updates: Partial<ReminderTime>) => void;
  regenerateReminderTimes: (medicineId: string) => void;

  // Ortak log fonksiyonları (private - sadece internal kullanım)
  _createMedicineLog: (
    status: 'taken' | 'skipped',
    reminderTimeId: string,
    scheduledTime: string,
    medicineIdFallback?: string,
    note?: string
  ) => MedicineLog | null;
  _cleanupNotifications: (
    medicineId: string,
    reminderTimeId: string
  ) => { notificationId: string; activeSnoozes: Snooze[] };

  logMedicineTaken: (
    reminderTimeId: string,
    scheduledTime: string,
    medicineIdFallback?: string,
    note?: string
  ) => void;
  logMedicineSkipped: (
    reminderTimeId: string,
    scheduledTime: string,
    medicineIdFallback?: string,
    note?: string
  ) => void;
  markMissedReminders: () => void;

  createSnooze: (
    medicineId: string,
    reminderTimeId: string,
    originalScheduledTime: string,
    triggerTime: Date,
    notificationId: string,
    snoozeId?: string
  ) => Snooze;
  deactivateSnooze: (snoozeId: string) => void;
  deactivateSnoozesForMedicine: (medicineId: string) => void;
  getActiveSnooze: (medicineId: string, reminderTimeId: string) => Snooze | undefined;
  getSnoozeByNotificationId: (notificationId: string) => Snooze | undefined;
  cleanupStaleSnoozes: () => Promise<number>;
  runNotificationSelfHeal: () => Promise<NotificationSelfHealResult>;

  updateSettings: (updates: Partial<UserSettings>, options?: SettingsUpdateOptions) => void;

  setAlarmActive: (medicine: Medicine, reminderTime: ReminderTime, scheduledTime: string) => void;
  dismissAlarm: () => void;

  getMedicineById: (id: string) => Medicine | undefined;
  getReminderTimesForMedicine: (medicineId: string) => ReminderTime[];
  getTodayReminders: () => { medicine: Medicine; reminderTime: ReminderTime; log?: MedicineLog }[];
  getAdherenceRate: (days?: number) => number;
  getCurrentStreak: () => number;

  // Stok yönetimi
  getLowStockMedicines: () => Medicine[];
  updateMedicineStock: (medicineId: string, newCount: number) => void;
  decrementStock: (medicineId: string, amount?: number) => void;

  // Renk yönetimi
  getNextAvailableColor: () => string;

  clearAllData: (options?: { deleteFromCloud?: boolean }) => Promise<void>;
  importData: (data: SyncData) => void;
}

// generateId is now imported from '../utils/idGenerator' - uses UUID v7

/**
 * Schedules a background sync operation.
 * Errors are logged but do not crash the app.
 */

export const useMedicineStore = create<MedicineState>()(
  persist(
    (set, get) => ({
      medicines: [],
      reminderTimes: [],
      medicineLogs: [],
      snoozes: [],
      settings: DEFAULT_USER_SETTINGS,
      alarmState: DEFAULT_ALARM_STATE,

      // Sync durumu
      isSyncing: false,
      lastSyncAt: null,
      syncError: null,
      userId: null,

      // Kullanıcı ID'sini ayarla
      setUserId: userId => {
        set({ userId });
      },

      // Buluta senkronize et (SyncQueue ile race condition koruması)
      syncToCloud: async () => {
        const { userId } = get();

        if (!userId) {
          log.debug('Kullanici girisi yapilmamis, sync atlaniyor');
          return;
        }

        // Use SyncQueue to prevent concurrent sync operations
        return getSyncQueue().enqueue(async () => {
          const { medicines, reminderTimes, medicineLogs, settings } = get();

          set({ isSyncing: true, syncError: null });

          try {
            await uploadAllDataToCloud(userId, {
              medicines,
              reminderTimes,
              medicineLogs,
              settings,
            });

            set({
              isSyncing: false,
              lastSyncAt: new Date().toISOString(),
            });
          } catch (error: unknown) {
            log.error('Sync hatasi', error);
            const errorMessage = error instanceof Error ? error.message : 'Senkronizasyon hatasi';
            set({
              isSyncing: false,
              syncError: errorMessage,
            });
            throw error; // Re-throw to allow caller to handle
          }
        });
      },

      // Buluttan senkronize et (SyncQueue ile race condition koruması)
      // IMPORTANT: Local ve cloud verilerini MERGE eder, üzerine yazmaz!
      syncFromCloud: async () => {
        const { userId } = get();

        if (!userId) {
          log.debug('Kullanici girisi yapilmamis, sync atlaniyor');
          return;
        }

        // Use SyncQueue to prevent concurrent sync operations
        return getSyncQueue().enqueue(async () => {
          set({ isSyncing: true, syncError: null });

          try {
            const cloudData = await downloadAllDataFromCloud(userId);
            const localState = get();

            if (cloudData) {
              // MERGE local ve cloud medicineLogs - duplicate'leri önle
              const localLogs = localState.medicineLogs;
              const cloudLogs = cloudData.medicineLogs || [];
              const localLogIds = new Set(localLogs.map(l => l.id));
              const newCloudLogs = cloudLogs.filter(cl => !localLogIds.has(cl.id));
              const mergedLogs = normalizeMedicineLogsBySlot([...localLogs, ...newCloudLogs]);

              // Medicines için merge - updatedAt karşılaştırması ile
              const localMedicineMap = new Map(localState.medicines.map(m => [m.id, m]));
              const mergedMedicines = [...localState.medicines];
              for (const cloudMedicine of cloudData.medicines || []) {
                const localMedicine = localMedicineMap.get(cloudMedicine.id);
                if (!localMedicine) {
                  // Cloud'da var, local'de yok → ekle
                  mergedMedicines.push(cloudMedicine);
                } else if (cloudMedicine.updatedAt > localMedicine.updatedAt) {
                  // Cloud daha güncel → güncelle
                  const idx = mergedMedicines.findIndex(m => m.id === cloudMedicine.id);
                  if (idx !== -1) mergedMedicines[idx] = cloudMedicine;
                }
                // else: local daha güncel veya eşit → local'i koru
              }

              // ReminderTimes için merge
              const localReminderIds = new Set(localState.reminderTimes.map(rt => rt.id));
              const newCloudReminders = (cloudData.reminderTimes || []).filter(
                crt => !localReminderIds.has(crt.id)
              );
              const mergedReminders = [...localState.reminderTimes, ...newCloudReminders];

              const mergedSettings = {
                ...localState.settings,
                ...Object.fromEntries(
                  Object.entries(cloudData.settings || {}).filter(([, v]) => v !== undefined)
                ),
              } as UserSettings;

              set({
                medicines: mergedMedicines,
                reminderTimes: mergedReminders,
                medicineLogs: mergedLogs,
                settings: mergedSettings,
                isSyncing: false,
                lastSyncAt: new Date().toISOString(),
              });

              const pendingImageBackfillIds = mergedMedicines
                .filter(hasPendingMedicineImageBackfill)
                .map(medicine => medicine.id);

              void rescheduleActiveNotificationsFromState(get(), updates => {
                set(state => ({
                  snoozes: mergeSnoozeNotificationRescheduleUpdates(state.snoozes, updates),
                }));
              }).catch(error =>
                log.error('Cloud senkronundan sonra alarmlar yeniden planlanamad?', error)
              );

              if (pendingImageBackfillIds.length > 0) {
                void getSyncQueue()
                  .enqueue(async () => {
                    set({ isSyncing: true, syncError: null });

                    try {
                      for (const medicineId of pendingImageBackfillIds) {
                        const currentMedicine = get().getMedicineById(medicineId);
                        if (!currentMedicine || !hasPendingMedicineImageBackfill(currentMedicine)) {
                          continue;
                        }

                        const savedCloudData = await saveMedicineToCloud(userId, currentMedicine);
                        set(state => ({
                          medicines: applySavedMedicineCloudData(
                            state.medicines,
                            medicineId,
                            savedCloudData
                          ),
                        }));
                      }

                      set({
                        isSyncing: false,
                        lastSyncAt: new Date().toISOString(),
                        syncError: null,
                      });
                    } catch (error) {
                      const errorMessage = getSyncErrorMessage(error);
                      set({
                        isSyncing: false,
                        syncError: errorMessage,
                      });
                      throw error;
                    }
                  })
                  .catch(error => {
                    log.error('Pending medicine image backfill failed', error);
                  });
              }
            } else {
              // Bulutta veri yoksa, mevcut verileri yükle
              set({ isSyncing: false });
              await uploadAllDataToCloud(userId, {
                medicines: localState.medicines,
                reminderTimes: localState.reminderTimes,
                medicineLogs: localState.medicineLogs,
                settings: localState.settings,
              });
              set({ lastSyncAt: new Date().toISOString() });
            }
          } catch (error: unknown) {
            log.error('Sync hatasi', error);
            const errorMessage = error instanceof Error ? error.message : 'Senkronizasyon hatasi';
            set({
              isSyncing: false,
              syncError: errorMessage,
            });
            throw error; // Re-throw to allow caller to handle
          }
        });
      },

      // Sync hatasını temizle
      clearSyncError: () => {
        set({ syncError: null });
      },

      // İlaç ekleme — Sprint 4 devamı: wrapper pattern.
      // Core logic (sanitize, ID üretimi, reminder times hesaplama) useMedicinesStore
      // slice'ına delege edilir. Side-effect'ler (cloud sync, widget update, legacy
      // state sync) medicineStore.ts'te kalır.
      addMedicine: medicineData => {
        const id = generateId();
        const { settings, userId } = get();

        // 1. Sanitize — slice'a göndermeden önce türkçe karakter fix
        const sanitizedData = sanitizeMedicineData(medicineData);

        // 2. Slice delege — state set + reminder times hesaplama
        // settings opsiyonel parametre olarak geçirilir (kullanıcı tercihi korunur)
        _useMedicinesStore
          .getState()
          .addMedicine(
            { ...sanitizedData, id },
            { wakeUpTime: settings.wakeUpTime, sleepTime: settings.sleepTime }
          );

        // 3. Legacy state sync — medicineStore.ts'in kendi medicines/reminderTimes
        // field'larını slice ile senkronize et (geriye uyumluluk)
        const sliceMedicines = _useMedicinesStore.getState().medicines;
        const sliceReminderTimes = _useMedicinesStore.getState().reminderTimes;
        set({
          medicines: sliceMedicines,
          reminderTimes: sliceReminderTimes,
        });

        // 4. Cloud sync — mevcut kod (768-800 bloğu, satır kayması olabilir)
        if (userId) {
          void getSyncQueue()
            .enqueue(async () => {
              set({ isSyncing: true, syncError: null });

              try {
                const currentMedicine = get().getMedicineById(id);
                if (!currentMedicine) {
                  set({ isSyncing: false });
                  return;
                }

                const savedCloudData = await saveMedicineToCloud(userId, currentMedicine);
                set(state => ({
                  medicines: applySavedMedicineCloudData(state.medicines, id, savedCloudData),
                  isSyncing: false,
                  lastSyncAt: new Date().toISOString(),
                  syncError: null,
                }));
              } catch (error) {
                const errorMessage = getSyncErrorMessage(error);
                set({
                  isSyncing: false,
                  syncError: errorMessage,
                });
                throw error;
              }
            })
            .catch(error => {
              log.error('Medicine direct cloud save failed', error);
            });

          scheduleBackgroundSync(() => get().syncToCloud());
        }

        // 5. Widget update — mevcut kod
        if (isAndroidPlatform()) {
          setTimeout(() => {
            try {
              const currentMedicines = get().medicines;
              const currentReminderTimes = get().reminderTimes;
              const currentMedicineLogs = get().medicineLogs;
              updateWidgetData(currentMedicines, currentReminderTimes, currentMedicineLogs).catch(
                () => {}
              );
            } catch (e) {
              log.debug('Widget hatası (addMedicine)', e);
            }
          }, 500);
        }

        return id;
      },

      // İlaç güncelleme
      updateMedicine: (id, updates) => {
        const now = new Date().toISOString();
        const { userId } = get();

        // Türkçe karakter encoding sorunlarını düzelt
        const sanitizedUpdates = sanitizeMedicineData(updates);

        set(state => ({
          medicines: state.medicines.map(m =>
            m.id === id ? { ...m, ...sanitizedUpdates, updatedAt: now } : m
          ),
        }));

        // Frekans, talimat veya özel saatler değiştiyse zamanları yeniden hesapla
        if (
          updates.frequency !== undefined ||
          updates.instructions !== undefined ||
          updates.customTimes !== undefined
        ) {
          get().regenerateReminderTimes(id);
        }

        // Medicine kaydını ve varsa görselini önce doğrudan buluta gönder.
        if (userId) {
          void getSyncQueue()
            .enqueue(async () => {
              set({ isSyncing: true, syncError: null });

              try {
                const currentMedicine = get().getMedicineById(id);
                if (!currentMedicine) {
                  set({ isSyncing: false });
                  return;
                }

                const savedCloudData = await saveMedicineToCloud(userId, currentMedicine);
                set(state => ({
                  medicines: applySavedMedicineCloudData(state.medicines, id, savedCloudData),
                  isSyncing: false,
                  lastSyncAt: new Date().toISOString(),
                  syncError: null,
                }));
              } catch (error) {
                const errorMessage = getSyncErrorMessage(error);
                set({
                  isSyncing: false,
                  syncError: errorMessage,
                });
                throw error;
              }
            })
            .catch(error => {
              log.error('Medicine direct cloud update failed', error);
            });

          scheduleBackgroundSync(() => get().syncToCloud());
        }

        // Widget'ı güncelle (güvenli mod)
        if (isAndroidPlatform()) {
          setTimeout(() => {
            try {
              const { medicines, reminderTimes, medicineLogs } = get();
              updateWidgetData(medicines, reminderTimes, medicineLogs).catch(() => {});
            } catch (e) {
              log.debug('Widget hatası (updateMedicine)', e);
            }
          }, 500);
        }
      },

      deleteMedicine: id => {
        const { userId, snoozes } = get();

        const medicineSnoozes = snoozes.filter(s => s.medicineId === id);
        for (const snooze of medicineSnoozes) {
          cancelNotification(snooze.notificationId).catch(err =>
            log.error('Failed to cancel stored snooze notification on delete', err)
          );
        }

        cancelMedicineNotifications(id).catch(err =>
          log.error('Failed to cancel medicine notifications on delete', err)
        );

        get().deactivateSnoozesForMedicine(id);

        set(state => ({
          medicines: state.medicines.filter(m => m.id !== id),
          reminderTimes: state.reminderTimes.filter(rt => rt.medicineId !== id),
          medicineLogs: state.medicineLogs.filter(log => log.medicineId !== id),
          snoozes: state.snoozes.filter(s => s.medicineId !== id),
        }));

        if (userId) {
          void getSyncQueue()
            .enqueue(async () => {
              set({ isSyncing: true, syncError: null });

              try {
                await deleteMedicineFromCloud(userId, id);
                set({
                  isSyncing: false,
                  lastSyncAt: new Date().toISOString(),
                  syncError: null,
                });
              } catch (error) {
                const errorMessage = getSyncErrorMessage(error);
                set({
                  isSyncing: false,
                  syncError: errorMessage,
                });
                throw error;
              }
            })
            .catch(error => {
              log.error('Medicine direct cloud delete failed', error);
            });

          scheduleBackgroundSync(() => get().syncToCloud());
        }

        // Widget'ı güncelle (güvenli mod)
        try {
          if (isAndroidPlatform()) {
            setTimeout(() => {
              const currentMedicines = get().medicines;
              const currentReminderTimes = get().reminderTimes;
              const currentMedicineLogs = get().medicineLogs;
              updateWidgetData(currentMedicines, currentReminderTimes, currentMedicineLogs).catch(
                () => {}
              );
            }, 500);
          }
        } catch (e) {
          log.debug('Widget hatası', e);
        }
      },

      // İlaç aktif/pasif
      toggleMedicineActive: async id => {
        const { userId, medicines, snoozes, settings } = get();
        const medicine = medicines.find(m => m.id === id);

        if (!medicine) {
          return;
        }

        const nextIsActive = !medicine.isActive;
        const updatedAt = new Date().toISOString();

        set(state => ({
          medicines: state.medicines.map(m =>
            m.id === id ? { ...m, isActive: nextIsActive, updatedAt } : m
          ),
        }));

        if (!nextIsActive) {
          const snoozeNotificationIds = Array.from(
            new Set(
              snoozes.filter(s => s.medicineId === id && s.isActive).map(s => s.notificationId)
            )
          );

          get().deactivateSnoozesForMedicine(id);

          await Promise.allSettled([
            cancelMedicineNotifications(id),
            ...snoozeNotificationIds.map(notificationId => cancelNotification(notificationId)),
          ]);

          log.debug('Ilac pasife alindi, alarmlar iptal edildi', {
            medicineId: id,
            cancelledSnoozes: snoozeNotificationIds.length,
          });
        } else {
          const activeMedicine = get().medicines.find(m => m.id === id);
          const reminderTimesToSchedule = get().reminderTimes.filter(
            reminderTime => reminderTime.medicineId === id && reminderTime.isEnabled
          );

          if (activeMedicine) {
            await Promise.allSettled(
              reminderTimesToSchedule.map(reminderTime =>
                scheduleMedicineNotification(activeMedicine, reminderTime, settings)
              )
            );
          }

          log.debug('Ilac aktife alindi, alarmlar yeniden planlandi', {
            medicineId: id,
            scheduledCount: reminderTimesToSchedule.length,
          });
        }

        if (userId) {
          scheduleBackgroundSync(() => get().syncToCloud());
        }

        // Widget'? g?ncelle
        const { medicines: currentMedicines, reminderTimes, medicineLogs } = get();
        updateWidgetData(currentMedicines, reminderTimes, medicineLogs);
      },

      // Hatırlatma zamanı güncelleme
      updateReminderTime: (id, updates) => {
        set(state => ({
          reminderTimes: state.reminderTimes.map(rt => (rt.id === id ? { ...rt, ...updates } : rt)),
        }));
      },

      // Zamanları yeniden hesapla
      regenerateReminderTimes: medicineId => {
        const { medicines, settings, reminderTimes } = get();
        const medicine = medicines.find(m => m.id === medicineId);

        if (!medicine) return;

        // CustomTimes varsa yeniden hesaplama yapma
        if (medicine.customTimes && medicine.customTimes.length > 0) {
          // Sadece customTimes'ı kullanarak zamanları güncelle
          const otherTimes = reminderTimes.filter(rt => rt.medicineId !== medicineId);
          const newTimes = medicine.customTimes.map((time, index) => ({
            id: `${medicineId}_${index}`,
            medicineId,
            time,
            isEnabled: true,
          }));
          set({ reminderTimes: [...otherTimes, ...newTimes] });
          return;
        }

        // Eski zamanları kaldır
        const otherTimes = reminderTimes.filter(rt => rt.medicineId !== medicineId);

        // Yeni zamanları hesapla
        const newTimes = calculateMedicineTimes(medicineId, {
          wakeUpTime: settings.wakeUpTime,
          sleepTime: settings.sleepTime,
          frequency: medicine.frequency,
          instruction: medicine.instructions,
        });

        set({ reminderTimes: [...otherTimes, ...newTimes] });
      },

      // Ortak log oluşturma fonksiyonu - DRY prensibi
      _createMedicineLog: (
        status: 'taken' | 'skipped',
        reminderTimeId: string,
        scheduledTime: string,
        medicineIdFallback?: string,
        note?: string
      ): MedicineLog | null => {
        const { reminderTimes } = get();
        const reminderTime = reminderTimes.find(rt => rt.id === reminderTimeId);
        const actualMedicineId = reminderTime?.medicineId || medicineIdFallback;

        if (!actualMedicineId) {
          log.error(`_createMedicineLog (${status}): MedicineId bulunamadi!`, {
            reminderTimeId,
            medicineIdFallback,
          });
          return null;
        }

        if (!reminderTime) {
          log.warn(
            `_createMedicineLog (${status}): reminderTime bulunamadi, fallback kullaniliyor`,
            {
              reminderTimeId,
              medicineIdFallback: actualMedicineId,
            }
          );
        }

        const baseLog = {
          id: generateId(),
          medicineId: actualMedicineId,
          reminderTimeId,
          scheduledTime,
          status,
          note,
        };

        // 'taken' durumunda takenAt ekle
        return status === 'taken' ? { ...baseLog, takenAt: new Date().toISOString() } : baseLog;
      },

      // Ortak bildirim temizleme fonksiyonu
      _cleanupNotifications: (medicineId: string, reminderTimeId: string) => {
        const { snoozes } = get();

        const activeSnoozes = snoozes.filter(
          s => s.medicineId === medicineId && s.reminderTimeId === reminderTimeId && s.isActive
        );

        const notificationId = `alarm-${medicineId}-${reminderTimeId}`;
        cancelNotification(notificationId).catch(err =>
          log.error('Failed to cancel notification', err)
        );

        for (const snooze of activeSnoozes) {
          cancelNotification(snooze.notificationId).catch(err =>
            log.error('Failed to cancel snooze notification', err)
          );
        }

        return { notificationId, activeSnoozes };
      },

      // İlaç alındı olarak logla — Sprint 4 devamı: wrapper pattern.
      // _createMedicineLog helper'ı medicineStore.ts'te kalır (semantik
      // çözümleme: medicineId fallback, note, status). medicineLogs slice'a
      // bulk replace ile delege edilir (normalize wrapper'da).
      logMedicineTaken: (reminderTimeId, scheduledTime, medicineIdFallback, note) => {
        log.debug('logMedicineTaken called', { reminderTimeId, scheduledTime });

        const { userId, medicines, reminderTimes, medicineLogs } = get();

        // 1. Future guard (KORUNMALİ — early return)
        if (isScheduledTimeInFuture(scheduledTime)) {
          log.warn('Gelecekteki doz erkenden alindi olarak isaretlenemedi', {
            reminderTimeId,
            scheduledTime,
          });
          return;
        }

        // 2. resolveMedicineLogArgs ile semantik çözümleme (helper)
        const resolvedArgs = resolveMedicineLogArgs(
          reminderTimeId,
          medicines,
          reminderTimes,
          medicineIdFallback,
          note
        );

        // 3. _createMedicineLog ile medicineLog objesi üret (helper)
        const medicineLog = get()._createMedicineLog(
          'taken',
          reminderTimeId,
          scheduledTime,
          resolvedArgs.medicineIdFallback,
          resolvedArgs.note
        );
        if (!medicineLog) return;

        // 4. Caregiver notification (mevcut kod)
        const medicine = medicines.find(m => m.id === medicineLog.medicineId);
        if (userId && medicine) {
          import('../services/caregiverNotificationService').then(
            ({ notifyCaregiversAboutMedicineStatus }) => {
              notifyCaregiversAboutMedicineStatus(
                userId,
                medicine.name,
                scheduledTime,
                'taken'
              ).catch(err => log.error('Bakıcı bildirimi hatası', err));
            }
          );
        }

        // 5. _cleanupNotifications (helper)
        const { notificationId, activeSnoozes } = get()._cleanupNotifications(
          medicineLog.medicineId,
          reminderTimeId
        );

        // 6. medicineLogs — slice bulk replace (normalize wrapper'da)
        const normalizedLogs = normalizeMedicineLogsBySlot([...medicineLogs, medicineLog]);
        _useLogsStore.getState().replaceMedicineLogs(normalizedLogs);

        // 7. medicineStore.ts'in legacy state'i + snoozes — wrapper'da kalır
        set(state => ({
          medicineLogs: normalizedLogs,
          snoozes: state.snoozes.map(s =>
            activeSnoozes.some(as => as.id === s.id) ? { ...s, isActive: false } : s
          ),
        }));

        log.debug('Ilac alindi, bildirimler iptal edildi', {
          notificationId,
          cancelledSnoozes: activeSnoozes.length,
        });

        // 8. decrementStock (sadece taken'da)
        get().decrementStock(medicineLog.medicineId);

        // 9. Cloud save (mevcut kod)
        if (userId) {
          saveMedicineLogToCloud(userId, medicineLog).catch(err =>
            log.error('Failed to save log to cloud', err)
          );
        }

        // 10. Widget update (mevcut kod)
        if (isAndroidPlatform()) {
          setTimeout(() => {
            try {
              const { medicines, reminderTimes, medicineLogs: currentLogs } = get();
              updateWidgetData(medicines, reminderTimes, currentLogs).catch(() => {});
            } catch (e) {
              log.debug('Widget hatası (logMedicineTaken)', e);
            }
          }, 500);
        }
      },

      // İlaç atlandı olarak logla — Sprint 4 devamı: wrapper pattern.
      // logMedicineTaken ile aynı yapı, fark: decrementStock yok, status='skipped'.
      logMedicineSkipped: (reminderTimeId, scheduledTime, medicineIdFallback, note) => {
        log.debug('logMedicineSkipped called', { reminderTimeId, scheduledTime });

        const { userId, medicines, reminderTimes, medicineLogs } = get();
        const resolvedArgs = resolveMedicineLogArgs(
          reminderTimeId,
          medicines,
          reminderTimes,
          medicineIdFallback,
          note
        );
        const medicineLog = get()._createMedicineLog(
          'skipped',
          reminderTimeId,
          scheduledTime,
          resolvedArgs.medicineIdFallback,
          resolvedArgs.note
        );

        if (!medicineLog) return;

        const medicine = medicines.find(m => m.id === medicineLog.medicineId);

        // Bakıcı bildirimi gönder
        if (userId && medicine) {
          import('../services/caregiverNotificationService').then(
            ({ notifyCaregiversAboutMedicineStatus }) => {
              notifyCaregiversAboutMedicineStatus(
                userId,
                medicine.name,
                scheduledTime,
                'skipped'
              ).catch(err => log.error('Bakıcı bildirimi hatası', err));
            }
          );
        }

        const { notificationId, activeSnoozes } = get()._cleanupNotifications(
          medicineLog.medicineId,
          reminderTimeId
        );

        // medicineLogs — slice bulk replace + legacy state sync
        const normalizedLogs = normalizeMedicineLogsBySlot([...medicineLogs, medicineLog]);
        _useLogsStore.getState().replaceMedicineLogs(normalizedLogs);
        set(state => ({
          medicineLogs: normalizedLogs,
          snoozes: state.snoozes.map(s =>
            activeSnoozes.some(as => as.id === s.id) ? { ...s, isActive: false } : s
          ),
        }));

        log.debug('Ilac atlandi, bildirimler iptal edildi', {
          notificationId,
          cancelledSnoozes: activeSnoozes.length,
        });

        if (userId) {
          saveMedicineLogToCloud(userId, medicineLog).catch(err =>
            log.error('Failed to save log to cloud', err)
          );
        }

        // Widget'ı güncelle (ilaç atlandı)
        if (isAndroidPlatform()) {
          setTimeout(() => {
            try {
              const { medicines, reminderTimes, medicineLogs: currentLogs } = get();
              updateWidgetData(medicines, reminderTimes, currentLogs).catch(() => {});
            } catch (e) {
              log.debug('Widget hatası (logMedicineSkipped)', e);
            }
          }, 500);
        }
      },

      markMissedReminders: () => {
        const { medicines, reminderTimes, medicineLogs, userId } = get();

        const missedLogs = calculateMissedReminders(medicines, reminderTimes, medicineLogs);

        if (missedLogs.length > 0) {
          set(state => ({
            medicineLogs: normalizeMedicineLogsBySlot([...state.medicineLogs, ...missedLogs]),
          }));

          if (userId) {
            for (const missedLog of missedLogs) {
              saveMedicineLogToCloud(userId, missedLog).catch(err =>
                log.error('Failed to save missed log to cloud', err)
              );

              const medicine = medicines.find(item => item.id === missedLog.medicineId);
              if (!medicine) {
                continue;
              }

              import('../services/caregiverNotificationService').then(
                ({ notifyCaregiversAboutMedicineStatus }) => {
                  notifyCaregiversAboutMedicineStatus(
                    userId,
                    medicine.name,
                    missedLog.scheduledTime,
                    'missed'
                  ).catch(err => log.error('Bakıcı missed bildirimi hatası', err));
                }
              );
            }
          }
        }
      },

      createSnooze: (
        medicineId,
        reminderTimeId,
        originalScheduledTime,
        triggerTime,
        notificationId,
        snoozeId
      ) => {
        const { snoozes, settings } = get();

        // Sadece aktif snoozeleri say - düzeltme: isActive kontrolü eklendi
        const activeSnoozeCount = snoozes.filter(
          s =>
            s.medicineId === medicineId &&
            s.reminderTimeId === reminderTimeId &&
            s.originalScheduledTime === originalScheduledTime &&
            s.isActive // DÜZELTME: Sadece aktif olanları say
        ).length;

        const newSnoozeCount = activeSnoozeCount + 1;

        // Max snooze kontrolü ekle - düzeltme
        if (newSnoozeCount > settings.maxSnoozeCount) {
          log.warn('Max snooze limiti aşıldı', {
            medicineId,
            activeSnoozeCount,
            maxSnoozeCount: settings.maxSnoozeCount,
          });
          throw new Error(
            `Maximum ${settings.maxSnoozeCount} kez erteleme yapılabilir. Lütfen ilacı alın veya atlayın.`
          );
        }

        const newSnooze: Snooze = {
          id: snoozeId || generateId(),
          medicineId,
          reminderTimeId,
          originalScheduledTime,
          triggerTime: triggerTime.toISOString(),
          notificationId,
          snoozeCount: newSnoozeCount,
          isActive: true,
          createdAt: new Date().toISOString(),
        };

        set(state => ({
          snoozes: [...state.snoozes, newSnooze],
        }));

        log.debug('Snooze olusturuldu', {
          snoozeId: newSnooze.id,
          snoozeCount: newSnooze.snoozeCount,
          maxSnoozeCount: settings.maxSnoozeCount,
        });
        return newSnooze;
      },

      deactivateSnooze: snoozeId => {
        set(state => ({
          snoozes: state.snoozes.map(s => (s.id === snoozeId ? { ...s, isActive: false } : s)),
        }));
        log.debug('Snooze deaktif edildi', { snoozeId });
      },

      deactivateSnoozesForMedicine: medicineId => {
        set(state => ({
          snoozes: state.snoozes.map(s =>
            s.medicineId === medicineId ? { ...s, isActive: false } : s
          ),
        }));
        log.debug('Ilaca ait tum snoozelar deaktif edildi', { medicineId });
      },

      getActiveSnooze: (medicineId, reminderTimeId) => {
        return get().snoozes.find(
          s => s.medicineId === medicineId && s.reminderTimeId === reminderTimeId && s.isActive
        );
      },

      getSnoozeByNotificationId: notificationId => {
        return get().snoozes.find(s => s.notificationId === notificationId && s.isActive);
      },

      cleanupStaleSnoozes: async () => {
        const { snoozes, medicines, reminderTimes } = get();
        const now = new Date();
        const staleThreshold = 5 * 60 * 1000;

        const staleSnoozes = snoozes.filter(s => {
          if (!s.isActive) return false;

          const triggerTime = parseSnoozeTriggerTime(s.triggerTime);
          const isStale = !triggerTime || triggerTime.getTime() + staleThreshold < now.getTime();

          const medicineExists = medicines.some(m => m.id === s.medicineId && m.isActive);
          const reminderTimeExists = reminderTimes.some(
            reminderTime =>
              reminderTime.id === s.reminderTimeId &&
              reminderTime.medicineId === s.medicineId &&
              reminderTime.isEnabled
          );

          return isStale || !medicineExists || !reminderTimeExists;
        });

        if (staleSnoozes.length === 0) {
          return 0;
        }

        for (const snooze of staleSnoozes) {
          try {
            await cancelNotification(snooze.notificationId);
          } catch {
            log.debug('Stale snooze notification zaten yok', {
              notificationId: snooze.notificationId,
            });
          }
        }

        const staleIds = new Set(staleSnoozes.map(s => s.id));
        set(state => ({
          snoozes: state.snoozes.filter(s => !staleIds.has(s.id)),
        }));

        log.debug('Stale snooze temizligi tamamlandi', { cleanedCount: staleSnoozes.length });
        return staleSnoozes.length;
      },

      runNotificationSelfHeal: async () => {
        try {
          const cleanedStaleSnoozes = await get().cleanupStaleSnoozes();
          const driftReport = await analyzeNotificationDrift(get());

          if (!driftReport.hasDrift) {
            void recordDiagnosticEvent({
              scope: 'self-heal',
              level: 'info',
              message: 'Notification self-heal found no drift',
              context: {
                cleanedStaleSnoozeCount: cleanedStaleSnoozes,
              },
            });
            return {
              ...driftReport,
              repaired: cleanedStaleSnoozes > 0,
              cancelledNotificationIds: [],
              snoozeNotificationUpdates: [],
            };
          }

          const cancelledNotificationIds = Array.from(
            new Set([...driftReport.orphanTriggerIds, ...driftReport.legacySnoozeNotificationIds])
          );

          await Promise.allSettled(
            cancelledNotificationIds.map(notificationId => cancelNotification(notificationId))
          );

          const snoozeNotificationUpdates: RescheduledSnoozeNotification[] = [];
          await rescheduleActiveNotificationsFromState(get(), updates => {
            snoozeNotificationUpdates.push(...updates);
            set(state => ({
              snoozes: mergeSnoozeNotificationRescheduleUpdates(state.snoozes, updates),
            }));
          });

          void recordDiagnosticEvent({
            scope: 'self-heal',
            level: 'info',
            message: 'Notification self-heal repaired drift',
            context: {
              missingCount: driftReport.missingNotificationIds.length,
              configDriftCount: driftReport.configDriftIds.length,
              orphanCount: driftReport.orphanTriggerIds.length,
              legacySnoozeCount: driftReport.legacySnoozeNotificationIds.length,
              cancelledCount: cancelledNotificationIds.length,
              cleanedStaleSnoozeCount: cleanedStaleSnoozes,
              snoozeUpdateCount: snoozeNotificationUpdates.length,
            },
          });

          return {
            ...driftReport,
            repaired: true,
            cancelledNotificationIds,
            snoozeNotificationUpdates,
          };
        } catch (error) {
          log.error('Notification self-heal failed', error);
          void recordDiagnosticEvent({
            scope: 'self-heal',
            level: 'error',
            message: 'Notification self-heal failed',
          });
          throw error;
        }
      },

      updateSettings: (updates, options) => {
        const { userId } = get();
        const previousSettings = get().settings;
        const nextSettings = { ...previousSettings, ...updates };
        const wakeSleepChanged =
          updates.wakeUpTime !== undefined || updates.sleepTime !== undefined;
        const shouldReschedule =
          wakeSleepChanged || didReminderSchedulingSettingsChange(previousSettings, nextSettings);
        const skipReschedule = options?.skipReschedule === true;
        const skipSelfHeal = options?.skipSelfHeal === true || skipReschedule;
        const skipCloudSync = options?.skipCloudSync === true;

        set({ settings: nextSettings });

        if (wakeSleepChanged) {
          const { medicines } = get();
          medicines.forEach(medicine => {
            if (medicine.isActive) {
              get().regenerateReminderTimes(medicine.id);
            }
          });
        }

        if (shouldReschedule && !skipReschedule) {
          void rescheduleActiveNotificationsFromState(get(), updates => {
            set(state => ({
              snoozes: mergeSnoozeNotificationRescheduleUpdates(state.snoozes, updates),
            }));
          })
            .then(async () => {
              if (skipSelfHeal) {
                return;
              }

              const healResult = await get().runNotificationSelfHeal();
              if (healResult.repaired) {
                log.debug('Ayar degisikligi sonrasi self-heal tamamlandi', {
                  missingCount: healResult.missingNotificationIds.length,
                  configDriftCount: healResult.configDriftIds.length,
                });
              }
            })
            .catch(error =>
              log.error('Ayar de?i?ikli?inden sonra alarmlar yeniden planlanamad?', error)
            );
        }

        if (userId && !skipCloudSync) {
          syncSettingsToCloud(userId, nextSettings).catch(err =>
            log.error('Failed to sync settings to cloud', err)
          );
        }
      },

      // Alarm aktif et
      setAlarmActive: (medicine, reminderTime, scheduledTime) => {
        set({
          alarmState: {
            isActive: true,
            currentMedicine: medicine,
            currentReminderTime: reminderTime,
            scheduledTime,
          },
        });
      },

      // Alarmı kapat
      dismissAlarm: () => {
        // Titreşimi durdur - pil tüketimini önle
        stopAlarmVibration();

        set({
          alarmState: {
            isActive: false,
          },
        });
      },

      // ID ile ilaç getir
      getMedicineById: id => {
        return get().medicines.find(m => m.id === id);
      },

      // İlaca ait zamanları getir
      getReminderTimesForMedicine: medicineId => {
        return get()
          .reminderTimes.filter(rt => rt.medicineId === medicineId)
          .sort((a, b) => a.time.localeCompare(b.time));
      },

      // Bugünkü hatırlatmaları getir
      getTodayReminders: () => {
        const { medicines, reminderTimes, medicineLogs } = get();
        const today = format(new Date(), 'yyyy-MM-dd');
        const normalizedLogs = normalizeMedicineLogsBySlot(medicineLogs);
        const todayLogMap = new Map(
          normalizedLogs
            .filter(logEntry => logEntry.scheduledTime.startsWith(today))
            .map(logEntry => [
              buildMedicineLogSlotKey(logEntry.reminderTimeId, logEntry.scheduledTime),
              logEntry,
            ])
        );

        const result: { medicine: Medicine; reminderTime: ReminderTime; log?: MedicineLog }[] = [];

        medicines
          .filter(m => m.isActive)
          .forEach(medicine => {
            const times = reminderTimes.filter(rt => rt.medicineId === medicine.id && rt.isEnabled);

            times.forEach(reminderTime => {
              const scheduledTime = `${today}T${reminderTime.time}:00`;
              const log = todayLogMap.get(buildMedicineLogSlotKey(reminderTime.id, scheduledTime));

              result.push({ medicine, reminderTime, log });
            });
          });

        // Zamana göre sırala
        result.sort((a, b) => a.reminderTime.time.localeCompare(b.reminderTime.time));

        return result;
      },

      // Uyum oranını hesapla
      getAdherenceRate: (days = 7) => {
        const { medicineLogs, medicines, reminderTimes } = get();
        const normalizedLogs = normalizeMedicineLogsBySlot(medicineLogs);
        const now = new Date();
        // eslint-disable-next-line unused-imports/no-unused-vars
        const today = format(now, 'yyyy-MM-dd');
        const currentTime = format(now, 'HH:mm');
        const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

        // Aktif ilaçların hatırlatma sayısını kontrol et
        const activeMedicineIds = new Set(medicines.filter(m => m.isActive).map(m => m.id));

        const activeReminderCount = reminderTimes.filter(
          rt => activeMedicineIds.has(rt.medicineId) && rt.isEnabled
        ).length;

        // Aktif hatırlatma yoksa %100 dön (ilaç yok = sorun yok)
        if (activeReminderCount === 0) return 100;

        const recentLogs = normalizedLogs.filter(log => new Date(log.scheduledTime) >= startDate);

        // Log yoksa: bugün için geçmiş zamanlı hatırlatma var mı kontrol et
        if (recentLogs.length === 0) {
          // Bugün için geçmiş zamanlı bir hatırlatma varsa %0 dön
          const hasPastReminderToday = reminderTimes.some(rt => {
            if (!activeMedicineIds.has(rt.medicineId) || !rt.isEnabled) return false;
            return rt.time < currentTime;
          });

          // Geçmiş zamanlı hatırlatma varsa ama log yoksa = %0 uyum
          // Henüz zamanı gelmemiş hatırlatmalar için = henüz veri yok, ama %100 yanıltıcı
          // Bu durumda "N/A" veya farklı bir gösterim olabilir, ama sayısal olarak:
          // - Geçmiş hatırlatma varsa ve log yoksa = 0%
          // - Sadece gelecek hatırlatmalar varsa = 100% (henüz sorumluluk başlamadı)
          return hasPastReminderToday ? 0 : 100;
        }

        const takenCount = recentLogs.filter(log => log.status === 'taken').length;
        return Math.round((takenCount / recentLogs.length) * 100);
      },

      getCurrentStreak: () => {
        const { medicineLogs, medicines, reminderTimes } = get();
        const normalizedLogs = normalizeMedicineLogsBySlot(medicineLogs);

        const activeMedicineIds = new Set(medicines.filter(m => m.isActive).map(m => m.id));

        const activeReminderCount = reminderTimes.filter(
          rt => activeMedicineIds.has(rt.medicineId) && rt.isEnabled
        ).length;

        if (activeReminderCount === 0) return 0;

        // OPTİMİZASYON: MedicineLogs'u tarihe göre önceden indexle - O(n) yerine O(m)
        // Bu, her gün için tüm diziyi taramak yerine, doğrudan o günün loglarına erişmemizi sağlar
        const logsByDate = new Map<string, typeof normalizedLogs>();

        for (const log of normalizedLogs) {
          if (!activeMedicineIds.has(log.medicineId)) continue;

          const dateStr = log.scheduledTime.slice(0, 10); // 'yyyy-MM-dd' formatı
          if (!logsByDate.has(dateStr)) {
            logsByDate.set(dateStr, []);
          }
          logsByDate.get(dateStr)!.push(log);
        }

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < 365; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(checkDate.getDate() - i);
          const dateStr = format(checkDate, 'yyyy-MM-dd');

          // O(1) lookup - artık filter kullanmıyoruz!
          const dayLogs = logsByDate.get(dateStr) || [];

          if (dayLogs.length === 0) {
            if (i === 0) continue; // Bugün için henüz log yoksa atla
            break;
          }

          const allTaken = dayLogs.every(log => log.status === 'taken');
          if (!allTaken) break;

          streak++;
        }

        return streak;
      },

      // Stok yönetimi fonksiyonları
      getLowStockMedicines: () => {
        const { medicines } = get();
        return medicines.filter(m => {
          if (!m.isActive || !m.stockEnabled) return false;
          const threshold = m.stockThreshold ?? 5;
          return (m.stockCount ?? 0) <= threshold;
        });
      },

      updateMedicineStock: (medicineId, newCount) => {
        const { userId } = get();
        set(state => ({
          medicines: state.medicines.map(m =>
            m.id === medicineId
              ? { ...m, stockCount: Math.max(0, newCount), updatedAt: new Date().toISOString() }
              : m
          ),
        }));

        if (userId) {
          scheduleBackgroundSync(() => get().syncToCloud());
        }
      },

      decrementStock: (medicineId, amount = 1) => {
        const { medicines, userId } = get();
        const medicine = medicines.find(m => m.id === medicineId);

        if (!medicine || !medicine.stockEnabled) return;

        const currentStock = medicine.stockCount ?? 0;
        const newStock = Math.max(0, currentStock - amount);

        set(state => ({
          medicines: state.medicines.map(m =>
            m.id === medicineId
              ? { ...m, stockCount: newStock, updatedAt: new Date().toISOString() }
              : m
          ),
        }));

        // Az kaldı uyarısı için log
        const threshold = medicine.stockThreshold ?? 5;
        if (newStock <= threshold && newStock > 0) {
          log.info('Stok az kaldi', {
            medicineName: medicine.name,
            remaining: newStock,
            threshold,
          });
        } else if (newStock === 0) {
          log.warn('Stok bitti!', { medicineName: medicine.name });
        }

        if (userId) {
          scheduleBackgroundSync(() => get().syncToCloud());
        }
      },

      // Bir sonraki uygun rengi getir
      // Sprint 4 devami: getNextAvailableColor slice'a delege edildi.
      // Kaynak implementasyon: src/stores/slices/medicines.ts
      // Bu wrapper geriye uyumluluk icin korunuyor.
      getNextAvailableColor: () => _useMedicinesStore.getState().getNextAvailableColor(),

      clearAllData: async (options?: { deleteFromCloud?: boolean }) => {
        const { userId, medicines } = get();
        const shouldDeleteFromCloud = options?.deleteFromCloud ?? false;

        log.info('Tum veriler temizleniyor', {
          medicineCount: medicines.length,
          shouldDeleteFromCloud,
        });

        try {
          // 1. Önce TÜM bildirimleri iptal et (UCES: Zero-tolerance for orphaned alarms)
          await cancelAllNotifications();
          stopAlarmVibration();
          log.debug('Tum bildirimler iptal edildi');

          // 2. Her ilacın bildirimlerini ayrı ayrı iptal et (double safety)
          for (const medicine of medicines) {
            try {
              await cancelMedicineNotifications(medicine.id);
            } catch (e) {
              log.warn(`Bildirim iptali hatasi: ${medicine.id}`, e);
            }
          }
          log.debug('Tum ilac bildirimleri iptal edildi');

          // 3. Cloud'dan da sil (isteğe bağlı)
          if (shouldDeleteFromCloud && userId) {
            log.info('Tum veriler cloud dan da siliniyor', { userId });
            await deleteAllUserData(userId);
          }

          // 4. AsyncStorage'ı temizle (persist middleware için kritik)
          await AsyncStorage.multiRemove([
            'medicine-store',
            'medicine-store-sync-queue',
            '@medicine_storage',
          ]);
          log.debug('AsyncStorage temizlendi');

          // 5. Local state'i temizle
          set({
            medicines: [],
            reminderTimes: [],
            medicineLogs: [],
            snoozes: [],
            alarmState: DEFAULT_ALARM_STATE,
            settings: DEFAULT_USER_SETTINGS,
            lastSyncAt: null,
          });

          // 6. Slice state'lerini de temizle (Sprint 4 devami)
          _useMedicinesStore.getState().clearAllMedicines();
          _useLogsStore.getState().clearAllLogs();

          log.info('Tum veriler basariyla temizlendi');
        } catch (error) {
          log.error('clearAllData hatasi', error);
          throw error; // Re-throw to let caller handle
        }
      },

      // Veri import et (buluttan gelen veriler için)
      importData: (data: SyncData) => {
        const validationResult = validateSyncData(data);

        if (!validationResult.success) {
          log.error('ImportData validation failed', new Error(validationResult.error.message));
          return;
        }

        const validatedData = validationResult.data;

        set({
          medicines: validatedData.medicines,
          reminderTimes: validatedData.reminderTimes,
          medicineLogs: validatedData.medicineLogs,
          // Sprint 1: cast — ValidatedSyncData'dan gelen settings tüm
          // UserSettings alanlarını içermeyebilir (defaultSyncData).
          settings: validatedData.settings as UserSettings,
          lastSyncAt: new Date().toISOString(),
        });

        void rescheduleActiveNotificationsFromState(get(), updates => {
          set(state => ({
            snoozes: mergeSnoozeNotificationRescheduleUpdates(state.snoozes, updates),
          }));
        }).catch(error => log.error('Import sonras?nda alarmlar yeniden planlanamad?', error));
      },
    }),
    {
      name: STORAGE_KEYS.MEDICINE_STORAGE,
      version: SETTINGS_STORAGE_VERSION,
      migrate: (persistedState, version) => migrateMedicineStoreState(persistedState, version),
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        medicines: state.medicines,
        reminderTimes: state.reminderTimes,
        medicineLogs: state.medicineLogs,
        snoozes: state.snoozes,
        settings: state.settings,
        lastSyncAt: state.lastSyncAt,
        userId: state.userId,
      }),
      onRehydrateStorage: () => {
        log.debug('Hydration başlıyor...');
        return (state, error) => {
          if (error) {
            log.error('Hydration hatası', error);
          } else {
            log.debug('Hydration tamamlandı', {
              medicineCount: state?.medicines?.length ?? 0,
              reminderCount: state?.reminderTimes?.length ?? 0,
              logCount: state?.medicineLogs?.length ?? 0,
            });
          }
        };
      },
    }
  )
);

// ============ SELECTOR HOOKS ============
// Bu hook'lar performans için optimize edilmiş selector'ler sağlar
// Component'ler bu hook'ları kullanarak gereksiz re-render'ları önleyebilir

/**
 * Aktif ilaçları getir.
 * useShallow ile shallow equality: aynı ilaç listesi olduğunda re-render tetiklenmez.
 */
export function useActiveMedicines(): Medicine[] {
  return useMedicineStore(useShallow(state => state.medicines.filter(m => m.isActive)));
}

/**
 * Bugünkü hatırlatmaları getir.
 *
 * useShallow kullanırız: getTodayReminders her çağrıda yeni bir array döndürür
 * (içeride filter+map+sort var). useShallow olmadan Zustand her render'da
 * yeni array'i "değişti" sanıp consumer'ı re-render eder. useShallow ile
 * shallow equality kontrol edilir; aynı içerikte referans değişse bile
 * re-render tetiklenmez.
 */
export function useTodayReminders(): ReturnType<MedicineState['getTodayReminders']> {
  return useMedicineStore(useShallow(state => state.getTodayReminders()));
}

/**
 * Stok azalan ilaçları getir
 */
export function useLowStockMedicines(): Medicine[] {
  return useMedicineStore(useShallow(state => state.getLowStockMedicines()));
}

/**
 * Uyum oranını getir (sayısal, primitive). useShallow gerekmez çünkü
 * sonuç primitive (number). Ancak dependency array'e days parametresini
 * eklememiz gerekir; Zustand bunu otomatik halleder.
 */
export function useAdherenceRate(days = 7): number {
  return useMedicineStore(state => state.getAdherenceRate(days));
}

/**
 * Mevcut seriyi getir (primitive)
 */
export function useCurrentStreak(): number {
  return useMedicineStore(state => state.getCurrentStreak());
}
