import { create } from 'zustand';
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
  cancelNotification,
  cancelMedicineNotifications,
  stopAlarmVibration,
} from '../utils/notifications';
import { createScopedLogger } from '../utils/logger';
import { updateWidgetData } from '../services/widgetService';
import {
  uploadAllDataToCloud,
  downloadAllDataFromCloud,
  saveMedicineLogToCloud,
  syncSettingsToCloud,
  deleteAllUserData,
  SyncData,
} from '../services/firestoreSync';

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

// Türkçe karakter encoding sorunlarını düzelt
function sanitizeString(str: string | undefined | null): string {
  if (!str) return '';
  // Unicode escape sequence'ları decode et (\u00fc -> ü)
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function sanitizeMedicineData<T extends { name?: string; dosage?: string }>(data: T): T {
  return {
    ...data,
    name: data.name ? sanitizeString(data.name) : data.name,
    dosage: data.dosage ? sanitizeString(data.dosage) : data.dosage,
  };
}

// Varsayılan renk paleti - Hem açık hem koyu modda iyi görünür
export const MEDICINE_COLORS = [
  '#FF6B6B', // Kırmızı
  '#4ECDC4', // Turkuaz
  '#45B7D1', // Mavi
  '#96CEB4', // Yeşil
  '#FFD93D', // Sarı (daha canlı)
  '#C9A0DC', // Mor (daha dengeli)
  '#FF8C69', // Turuncu
  '#98D8C8', // Mint
];

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

  addMedicine: (medicine: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>) => string;
  updateMedicine: (id: string, updates: Partial<Medicine>) => void;
  deleteMedicine: (id: string) => void;
  toggleMedicineActive: (id: string) => void;

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
    notificationId: string
  ) => Snooze;
  deactivateSnooze: (snoozeId: string) => void;
  deactivateSnoozesForMedicine: (medicineId: string) => void;
  getActiveSnooze: (medicineId: string, reminderTimeId: string) => Snooze | undefined;
  getSnoozeByNotificationId: (notificationId: string) => Snooze | undefined;
  cleanupStaleSnoozes: () => Promise<number>;

  updateSettings: (updates: Partial<UserSettings>) => void;

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
 * The sync queue ensures sequential execution.
 */
const scheduleBackgroundSync = (syncFn: () => Promise<void>): void => {
  // Queue the sync but don't block the caller
  syncFn().catch(error => {
    // Log error but don't throw - this is background sync
    log.error('BackgroundSync failed', error);
  });
};

export const useMedicineStore = create<MedicineState>()(
  persist(
    (set, get) => ({
      medicines: [],
      reminderTimes: [],
      medicineLogs: [],
      snoozes: [],
      settings: {
        wakeUpTime: '08:00',
        sleepTime: '23:00',
        notificationSound: 'default',
        vibrationEnabled: true,
        fullScreenAlarmEnabled: true,
        language: 'tr',
        alarmSound: 'alarm',
        alarmVolume: 80,
        snoozeDuration: 5,
        maxSnoozeCount: 3,
        quietHoursEnabled: false,
        quietHoursStart: '23:00',
        quietHoursEnd: '07:00',
        alarmModeEnabled: true,
        conflictIntervalMinutes: 10,
        // Güvenlik ayarları
        securityEnabled: false,
        securityType: 'none',
        biometricsEnabled: false,
        lockTimeout: 0,
        // TTS ayarları
        ttsEnabled: true,
        ttsVolume: 80,
        ttsRepeatCount: 1,
        ttsSpeakMedicineName: true,
        ttsSpeakDosage: true,
        ttsSpeakInstructions: true,
        // Kalıcı bildirim ayarları
        persistentNotificationEnabled: true,
        persistentNotificationDuration: 60,
      },
      alarmState: {
        isActive: false,
      },

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
              const mergedLogs = [...localLogs, ...newCloudLogs];

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

              set({
                medicines: mergedMedicines,
                reminderTimes: mergedReminders,
                medicineLogs: mergedLogs,
                // Settings için deep merge - cloud'dan gelenleri local'in üzerine yazma
                // Sadece cloud'da var olan ve local'de olmayan alanları ekle
                settings: {
                  ...localState.settings,
                  ...Object.fromEntries(
                    Object.entries(cloudData.settings || {}).filter(([, v]) => v !== undefined)
                  ),
                } as UserSettings,
                isSyncing: false,
                lastSyncAt: new Date().toISOString(),
              });

              // NOT: Artık merge sonrası otomatik upload yapılmıyor!
              // Bu gereksiz API çağrılarına ve potansiyel race condition'lara neden oluyordu.
              // Cloud'a upload sadece veri değişikliği yapıldığında (addMedicine, updateMedicine vb.) yapılır.
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

      // İlaç ekleme
      addMedicine: medicineData => {
        const id = generateId();
        const now = new Date().toISOString();
        const { settings, userId } = get();

        // Türkçe karakter encoding sorunlarını düzelt
        const sanitizedData = sanitizeMedicineData(medicineData);

        const newMedicine: Medicine = {
          ...sanitizedData,
          id,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        };

        let times: Omit<ReminderTime, 'notificationId'>[];

        // CustomTimes varsa onu kullan, yoksa otomatik hesapla
        if (medicineData.customTimes && medicineData.customTimes.length > 0) {
          times = medicineData.customTimes.map((time, index) => ({
            id: `${id}_${index}`,
            medicineId: id,
            time,
            isEnabled: true,
          }));
        } else {
          times = calculateMedicineTimes(id, {
            wakeUpTime: settings.wakeUpTime,
            sleepTime: settings.sleepTime,
            frequency: medicineData.frequency,
            instruction: medicineData.instructions,
          });
        }

        set(state => ({
          medicines: [...state.medicines, newMedicine],
          reminderTimes: [...state.reminderTimes, ...times],
        }));

        // Buluta kaydet (arka planda)
        if (userId) {
          scheduleBackgroundSync(() => get().syncToCloud());
        }

        // Widget'ı güncelle (güvenli mod - hata olursa app çökmez)
        if (Platform.OS === 'android') {
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

        // Buluta kaydet (arka planda)
        if (userId) {
          scheduleBackgroundSync(() => get().syncToCloud());
        }

        // Widget'ı güncelle (güvenli mod)
        if (Platform.OS === 'android') {
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
        const { userId } = get();

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
          scheduleBackgroundSync(() => get().syncToCloud());
        }

        // Widget'ı güncelle (güvenli mod)
        try {
          if (Platform.OS === 'android') {
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
      toggleMedicineActive: id => {
        const { userId } = get();

        set(state => ({
          medicines: state.medicines.map(m => (m.id === id ? { ...m, isActive: !m.isActive } : m)),
        }));

        if (userId) {
          scheduleBackgroundSync(() => get().syncToCloud());
        }

        // Widget'ı güncelle
        const { medicines, reminderTimes, medicineLogs } = get();
        updateWidgetData(medicines, reminderTimes, medicineLogs);
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

      logMedicineTaken: (reminderTimeId, scheduledTime, medicineIdFallback, note) => {
        log.debug('logMedicineTaken called', { reminderTimeId, scheduledTime });

        const { userId, medicines } = get();
        const medicineLog = get()._createMedicineLog(
          'taken',
          reminderTimeId,
          scheduledTime,
          medicineIdFallback,
          note
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
                'taken'
              ).catch(err => log.error('Bakıcı bildirimi hatası', err));
            }
          );
        }

        const { notificationId, activeSnoozes } = get()._cleanupNotifications(
          medicineLog.medicineId,
          reminderTimeId
        );

        set(state => ({
          medicineLogs: [...state.medicineLogs, medicineLog],
          snoozes: state.snoozes.map(s =>
            activeSnoozes.some(as => as.id === s.id) ? { ...s, isActive: false } : s
          ),
        }));

        log.debug('Ilac alindi, bildirimler iptal edildi', {
          notificationId,
          cancelledSnoozes: activeSnoozes.length,
        });

        // Stok takibi aktifse stoku azalt (sadece taken'da)
        get().decrementStock(medicineLog.medicineId);

        if (userId) {
          saveMedicineLogToCloud(userId, medicineLog).catch(err =>
            log.error('Failed to save log to cloud', err)
          );
        }

        // Widget'ı güncelle (ilaç alındı)
        if (Platform.OS === 'android') {
          setTimeout(() => {
            try {
              const { medicines, reminderTimes, medicineLogs } = get();
              updateWidgetData(medicines, reminderTimes, medicineLogs).catch(() => {});
            } catch (e) {
              log.debug('Widget hatası (logMedicineTaken)', e);
            }
          }, 500);
        }
      },

      logMedicineSkipped: (reminderTimeId, scheduledTime, medicineIdFallback, note) => {
        log.debug('logMedicineSkipped called', { reminderTimeId, scheduledTime });

        const { userId, medicines } = get();
        const medicineLog = get()._createMedicineLog(
          'skipped',
          reminderTimeId,
          scheduledTime,
          medicineIdFallback,
          note
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

        set(state => ({
          medicineLogs: [...state.medicineLogs, medicineLog],
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
        if (Platform.OS === 'android') {
          setTimeout(() => {
            try {
              const { medicines, reminderTimes, medicineLogs } = get();
              updateWidgetData(medicines, reminderTimes, medicineLogs).catch(() => {});
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
            medicineLogs: [...state.medicineLogs, ...missedLogs],
          }));

          if (userId) {
            scheduleBackgroundSync(() => get().syncToCloud());
          }
        }
      },

      createSnooze: (
        medicineId,
        reminderTimeId,
        originalScheduledTime,
        triggerTime,
        notificationId
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
          id: generateId(),
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
        const { snoozes, medicines } = get();
        const now = new Date();
        const staleThreshold = 5 * 60 * 1000;

        const staleSnoozes = snoozes.filter(s => {
          if (!s.isActive) return false;

          const triggerTime = new Date(s.triggerTime);
          const isStale = triggerTime.getTime() + staleThreshold < now.getTime();

          const medicineExists = medicines.some(m => m.id === s.medicineId && m.isActive);

          return isStale || !medicineExists;
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

      updateSettings: updates => {
        const { userId } = get();

        set(state => ({
          settings: { ...state.settings, ...updates },
        }));

        // Uyku/uyanma saati değiştiyse tüm ilaçların zamanlarını güncelle
        if (updates.wakeUpTime !== undefined || updates.sleepTime !== undefined) {
          const { medicines } = get();
          medicines.forEach(m => {
            if (m.isActive) {
              get().regenerateReminderTimes(m.id);
            }
          });
        }

        // Buluta kaydet
        if (userId) {
          const { settings } = get();
          syncSettingsToCloud(userId, settings).catch(err =>
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

        const result: { medicine: Medicine; reminderTime: ReminderTime; log?: MedicineLog }[] = [];

        medicines
          .filter(m => m.isActive)
          .forEach(medicine => {
            const times = reminderTimes.filter(rt => rt.medicineId === medicine.id && rt.isEnabled);

            times.forEach(reminderTime => {
              const log = medicineLogs.find(
                l => l.reminderTimeId === reminderTime.id && l.scheduledTime.startsWith(today)
              );

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

        const recentLogs = medicineLogs.filter(log => new Date(log.scheduledTime) >= startDate);

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

        const activeMedicineIds = new Set(medicines.filter(m => m.isActive).map(m => m.id));

        const activeReminderCount = reminderTimes.filter(
          rt => activeMedicineIds.has(rt.medicineId) && rt.isEnabled
        ).length;

        if (activeReminderCount === 0) return 0;

        // OPTİMİZASYON: MedicineLogs'u tarihe göre önceden indexle - O(n) yerine O(m)
        // Bu, her gün için tüm diziyi taramak yerine, doğrudan o günün loglarına erişmemizi sağlar
        const logsByDate = new Map<string, typeof medicineLogs>();

        for (const log of medicineLogs) {
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
      getNextAvailableColor: () => {
        const { medicines } = get();

        // Sadece aktif ilaçların renklerini al
        const usedColors = medicines.filter(m => m.isActive).map(m => m.color);

        // İlk kullanılmayan rengi bul
        const unusedColor = MEDICINE_COLORS.find(color => !usedColors.includes(color));
        if (unusedColor) {
          return unusedColor;
        }

        // Tüm renkler kullanılıyorsa, en az kullanılan rengi bul
        const colorCounts = new Map<string, number>();
        MEDICINE_COLORS.forEach(color => colorCounts.set(color, 0));

        usedColors.forEach(color => {
          const count = colorCounts.get(color) || 0;
          colorCounts.set(color, count + 1);
        });

        let minCount = Infinity;
        let leastUsedColor = MEDICINE_COLORS[0];

        colorCounts.forEach((count, color) => {
          if (count < minCount) {
            minCount = count;
            leastUsedColor = color;
          }
        });

        return leastUsedColor;
      },

      clearAllData: async (options?: { deleteFromCloud?: boolean }) => {
        const { userId, medicines } = get();
        const shouldDeleteFromCloud = options?.deleteFromCloud ?? false;

        log.info('Tum veriler temizleniyor', {
          medicineCount: medicines.length,
          shouldDeleteFromCloud,
        });

        try {
          // 1. Önce TÜM bildirimleri iptal et (UCES: Zero-tolerance for orphaned alarms)
          const { cancelAllNotifications, stopAlarmVibration } =
            await import('../utils/notifications');
          await cancelAllNotifications();
          stopAlarmVibration();
          log.debug('Tum bildirimler iptal edildi');

          // 2. Her ilacın bildirimlerini ayrı ayrı iptal et (double safety)
          const { cancelMedicineNotifications } = await import('../utils/notifications');
          for (const medicine of medicines) {
            try {
              await cancelMedicineNotifications(medicine.id);
            } catch (e) {
              log.warn(`Bildirim iptali hatasi: ${medicine.id}`, e);
            }
          }
          log.debug('Tum ilac bildirimleri iptal edildi');

          // 3. AsyncStorage'ı temizle (persist middleware için kritik)
          await AsyncStorage.multiRemove([
            'medicine-store',
            'medicine-store-sync-queue',
            '@medicine_storage',
          ]);
          log.debug('AsyncStorage temizlendi');

          // 4. Local state'i temizle
          set({
            medicines: [],
            reminderTimes: [],
            medicineLogs: [],
            snoozes: [],
            alarmState: {
              isPlaying: false,
              activeAlarms: [],
              currentMedicineId: null,
            },
            settings: {
              wakeUpTime: '08:00',
              sleepTime: '23:00',
              notificationSound: 'default',
              vibrationEnabled: true,
              fullScreenAlarmEnabled: true,
              language: 'tr',
              alarmSound: 'alarm',
              alarmVolume: 80,
              snoozeDuration: 5,
              maxSnoozeCount: 3,
              quietHoursEnabled: false,
              quietHoursStart: '23:00',
              quietHoursEnd: '07:00',
              alarmModeEnabled: true,
              conflictIntervalMinutes: 10,
              securityEnabled: false,
              securityType: 'none',
              biometricsEnabled: false,
              lockTimeout: 0,
              ttsEnabled: true,
              ttsVolume: 80,
              ttsRepeatCount: 1,
              ttsSpeakMedicineName: true,
              ttsSpeakDosage: true,
              ttsSpeakInstructions: true,
              persistentNotificationEnabled: true,
              persistentNotificationDuration: 60,
            },
            lastSyncAt: null,
          });

          // 5. Cloud'dan da sil (isteğe bağlı)
          if (shouldDeleteFromCloud && userId) {
            log.info('Tum veriler cloud dan da siliniyor', { userId });
            deleteAllUserData(userId).catch(error => {
              log.error('Cloud veri silme hatasi', error);
            });
          }

          log.info('Tum veriler basariyla temizlendi');
        } catch (error) {
          log.error('clearAllData hatasi', error);
          throw error; // Re-throw to let caller handle
        }
      },

      // Veri import et (buluttan gelen veriler için)
      importData: (data: SyncData) => {
        // Validate incoming data with Zod schema
        const validationResult = validateSyncData(data);

        if (!validationResult.success) {
          log.error('ImportData validation failed', new Error(validationResult.error.message));
          // Don't import invalid data - this protects against corrupted cloud data
          return;
        }

        const validatedData = validationResult.data;

        set({
          medicines: validatedData.medicines,
          reminderTimes: validatedData.reminderTimes,
          medicineLogs: validatedData.medicineLogs,
          settings: validatedData.settings,
          lastSyncAt: new Date().toISOString(),
        });
      },
    }),
    {
      name: STORAGE_KEYS.MEDICINE_STORAGE,
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
 * Aktif ilaçları getir (memoized)
 */
export function useActiveMedicines(): Medicine[] {
  return useMedicineStore(
    state => state.medicines.filter(m => m.isActive),
    // Shallow equality check
    (a, b) => a.length === b.length && a.every((m, i) => m.id === b[i]?.id)
  );
}

/**
 * Bugünkü hatırlatmaları getir (memoized)
 */
export function useTodayReminders(): ReturnType<MedicineState['getTodayReminders']> {
  return useMedicineStore(state => state.getTodayReminders());
}

/**
 * Stok azalan ilaçları getir (memoized)
 */
export function useLowStockMedicines(): Medicine[] {
  return useMedicineStore(state => state.getLowStockMedicines());
}

/**
 * Uyum oranını getir (memoized)
 */
export function useAdherenceRate(days = 7): number {
  return useMedicineStore(state => state.getAdherenceRate(days));
}

/**
 * Mevcut seriyi getir (memoized)
 */
export function useCurrentStreak(): number {
  return useMedicineStore(state => state.getCurrentStreak());
}
