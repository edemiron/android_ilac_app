import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Medicine, 
  ReminderTime, 
  UserSettings, 
  MedicineLog,
  AlarmState 
} from '../types';
import { calculateMedicineTimes } from '../utils/timeCalculator';
import { format } from 'date-fns';
import {
  uploadAllDataToCloud,
  downloadAllDataFromCloud,
  saveMedicineToCloud,
  deleteMedicineFromCloud,
  saveMedicineLogToCloud,
  syncSettingsToCloud,
  SyncData,
} from '../services/firestoreSync';

// Varsayılan renk paleti
export const MEDICINE_COLORS = [
  '#FF6B6B', // Kırmızı
  '#4ECDC4', // Turkuaz
  '#45B7D1', // Mavi
  '#96CEB4', // Yeşil
  '#FFEAA7', // Sarı
  '#DDA0DD', // Mor
  '#FF8C69', // Turuncu
  '#98D8C8', // Mint
];

interface MedicineState {
  // Veriler
  medicines: Medicine[];
  reminderTimes: ReminderTime[];
  medicineLogs: MedicineLog[];
  settings: UserSettings;
  alarmState: AlarmState;
  
  // Sync durumu
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncError: string | null;
  userId: string | null;
  
  // Sync işlemleri
  setUserId: (userId: string | null) => void;
  syncToCloud: () => Promise<void>;
  syncFromCloud: () => Promise<void>;
  clearSyncError: () => void;
  
  // İlaç işlemleri
  addMedicine: (medicine: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>) => string;
  updateMedicine: (id: string, updates: Partial<Medicine>) => void;
  deleteMedicine: (id: string) => void;
  toggleMedicineActive: (id: string) => void;
  
  // Hatırlatma zamanı işlemleri
  updateReminderTime: (id: string, updates: Partial<ReminderTime>) => void;
  regenerateReminderTimes: (medicineId: string) => void;
  
  // Log işlemleri
  logMedicineTaken: (reminderTimeId: string, scheduledTime: string, note?: string) => void;
  logMedicineSkipped: (reminderTimeId: string, scheduledTime: string, note?: string) => void;
  markMissedReminders: () => void;
  
  // Ayar işlemleri
  updateSettings: (updates: Partial<UserSettings>) => void;
  
  // Alarm işlemleri
  setAlarmActive: (medicine: Medicine, reminderTime: ReminderTime, scheduledTime: string) => void;
  dismissAlarm: () => void;
  
  // Yardımcı fonksiyonlar
  getMedicineById: (id: string) => Medicine | undefined;
  getReminderTimesForMedicine: (medicineId: string) => ReminderTime[];
  getTodayReminders: () => { medicine: Medicine; reminderTime: ReminderTime; log?: MedicineLog }[];
  getAdherenceRate: (days?: number) => number;
  
  // Veri yönetimi
  clearAllData: () => void;
  importData: (data: SyncData) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useMedicineStore = create<MedicineState>()(
  persist(
    (set, get) => ({
      // Başlangıç değerleri
      medicines: [],
      reminderTimes: [],
      medicineLogs: [],
      settings: {
        wakeUpTime: '08:00',
        sleepTime: '23:00',
        notificationSound: 'default',
        vibrationEnabled: true,
        fullScreenAlarmEnabled: true,
        language: 'tr',
        snoozeDuration: 5,
        quietHoursEnabled: false,
        quietHoursStart: '23:00',
        quietHoursEnd: '07:00',
        alarmModeEnabled: true, // Varsayılan olarak açık - sessizde bile çalar
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
      setUserId: (userId) => {
        set({ userId });
      },
      
      // Buluta senkronize et
      syncToCloud: async () => {
        const { userId, medicines, reminderTimes, medicineLogs, settings } = get();
        
        if (!userId) {
          console.log('Kullanıcı girişi yapılmamış, sync atlanıyor.');
          return;
        }
        
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
        } catch (error: any) {
          console.error('Sync hatası:', error);
          set({ 
            isSyncing: false, 
            syncError: error.message || 'Senkronizasyon hatası',
          });
        }
      },
      
      // Buluttan senkronize et
      syncFromCloud: async () => {
        const { userId } = get();
        
        if (!userId) {
          console.log('Kullanıcı girişi yapılmamış, sync atlanıyor.');
          return;
        }
        
        set({ isSyncing: true, syncError: null });
        
        try {
          const cloudData = await downloadAllDataFromCloud(userId);
          
          if (cloudData) {
            set({
              medicines: cloudData.medicines,
              reminderTimes: cloudData.reminderTimes,
              medicineLogs: cloudData.medicineLogs,
              settings: cloudData.settings,
              isSyncing: false,
              lastSyncAt: new Date().toISOString(),
            });
          } else {
            // Bulutta veri yoksa, mevcut verileri yükle
            await get().syncToCloud();
            set({ isSyncing: false });
          }
        } catch (error: any) {
          console.error('Sync hatası:', error);
          set({ 
            isSyncing: false, 
            syncError: error.message || 'Senkronizasyon hatası',
          });
        }
      },
      
      // Sync hatasını temizle
      clearSyncError: () => {
        set({ syncError: null });
      },
      
      // İlaç ekleme
      addMedicine: (medicineData) => {
        const id = generateId();
        const now = new Date().toISOString();
        const { settings, userId } = get();
        
        const newMedicine: Medicine = {
          ...medicineData,
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
        
        set((state) => ({
          medicines: [...state.medicines, newMedicine],
          reminderTimes: [...state.reminderTimes, ...times],
        }));
        
        // Buluta kaydet (arka planda)
        if (userId) {
          get().syncToCloud().catch(console.error);
        }
        
        return id;
      },
      
      // İlaç güncelleme
      updateMedicine: (id, updates) => {
        const now = new Date().toISOString();
        const { userId } = get();
        
        set((state) => ({
          medicines: state.medicines.map((m) =>
            m.id === id ? { ...m, ...updates, updatedAt: now } : m
          ),
        }));
        
        // Frekans değiştiyse zamanları yeniden hesapla
        if (updates.frequency !== undefined || updates.instructions !== undefined) {
          get().regenerateReminderTimes(id);
        }
        
        // Buluta kaydet (arka planda)
        if (userId) {
          get().syncToCloud().catch(console.error);
        }
      },
      
      // İlaç silme
      deleteMedicine: (id) => {
        const { userId } = get();
        
        set((state) => ({
          medicines: state.medicines.filter((m) => m.id !== id),
          reminderTimes: state.reminderTimes.filter((rt) => rt.medicineId !== id),
          medicineLogs: state.medicineLogs.filter((log) => log.medicineId !== id),
        }));
        
        // Bulutta sil (arka planda)
        if (userId) {
          get().syncToCloud().catch(console.error);
        }
      },
      
      // İlaç aktif/pasif
      toggleMedicineActive: (id) => {
        const { userId } = get();
        
        set((state) => ({
          medicines: state.medicines.map((m) =>
            m.id === id ? { ...m, isActive: !m.isActive } : m
          ),
        }));
        
        if (userId) {
          get().syncToCloud().catch(console.error);
        }
      },
      
      // Hatırlatma zamanı güncelleme
      updateReminderTime: (id, updates) => {
        set((state) => ({
          reminderTimes: state.reminderTimes.map((rt) =>
            rt.id === id ? { ...rt, ...updates } : rt
          ),
        }));
      },
      
      // Zamanları yeniden hesapla
      regenerateReminderTimes: (medicineId) => {
        const { medicines, settings, reminderTimes } = get();
        const medicine = medicines.find((m) => m.id === medicineId);
        
        if (!medicine) return;
        
        // CustomTimes varsa yeniden hesaplama yapma
        if (medicine.customTimes && medicine.customTimes.length > 0) {
          // Sadece customTimes'ı kullanarak zamanları güncelle
          const otherTimes = reminderTimes.filter((rt) => rt.medicineId !== medicineId);
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
        const otherTimes = reminderTimes.filter((rt) => rt.medicineId !== medicineId);
        
        // Yeni zamanları hesapla
        const newTimes = calculateMedicineTimes(medicineId, {
          wakeUpTime: settings.wakeUpTime,
          sleepTime: settings.sleepTime,
          frequency: medicine.frequency,
          instruction: medicine.instructions,
        });
        
        set({ reminderTimes: [...otherTimes, ...newTimes] });
      },
      
      // İlaç alındı
      logMedicineTaken: (reminderTimeId, scheduledTime, note) => {
        const { reminderTimes, userId } = get();
        const reminderTime = reminderTimes.find((rt) => rt.id === reminderTimeId);
        
        if (!reminderTime) return;
        
        const log: MedicineLog = {
          id: generateId(),
          medicineId: reminderTime.medicineId,
          reminderTimeId,
          scheduledTime,
          takenAt: new Date().toISOString(),
          status: 'taken',
          note,
        };
        
        set((state) => ({
          medicineLogs: [...state.medicineLogs, log],
        }));
        
        // Buluta kaydet
        if (userId) {
          saveMedicineLogToCloud(userId, log).catch(console.error);
        }
      },
      
      // İlaç atlandı
      logMedicineSkipped: (reminderTimeId, scheduledTime, note) => {
        const { reminderTimes, userId } = get();
        const reminderTime = reminderTimes.find((rt) => rt.id === reminderTimeId);
        
        if (!reminderTime) return;
        
        const log: MedicineLog = {
          id: generateId(),
          medicineId: reminderTime.medicineId,
          reminderTimeId,
          scheduledTime,
          status: 'skipped',
          note,
        };
        
        set((state) => ({
          medicineLogs: [...state.medicineLogs, log],
        }));
        
        // Buluta kaydet
        if (userId) {
          saveMedicineLogToCloud(userId, log).catch(console.error);
        }
      },
      
      // Kaçırılan hatırlatmaları işaretle
      markMissedReminders: () => {
        // Bu fonksiyon arka plan görevinde çağrılabilir
      },
      
      // Ayarları güncelle
      updateSettings: (updates) => {
        const { userId } = get();
        
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }));
        
        // Uyku/uyanma saati değiştiyse tüm ilaçların zamanlarını güncelle
        if (updates.wakeUpTime !== undefined || updates.sleepTime !== undefined) {
          const { medicines } = get();
          medicines.forEach((m) => {
            if (m.isActive) {
              get().regenerateReminderTimes(m.id);
            }
          });
        }
        
        // Buluta kaydet
        if (userId) {
          const { settings } = get();
          syncSettingsToCloud(userId, settings).catch(console.error);
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
        set({
          alarmState: {
            isActive: false,
          },
        });
      },
      
      // ID ile ilaç getir
      getMedicineById: (id) => {
        return get().medicines.find((m) => m.id === id);
      },
      
      // İlaca ait zamanları getir
      getReminderTimesForMedicine: (medicineId) => {
        return get().reminderTimes
          .filter((rt) => rt.medicineId === medicineId)
          .sort((a, b) => a.time.localeCompare(b.time));
      },
      
      // Bugünkü hatırlatmaları getir
      getTodayReminders: () => {
        const { medicines, reminderTimes, medicineLogs } = get();
        const today = format(new Date(), 'yyyy-MM-dd');
        
        const result: { medicine: Medicine; reminderTime: ReminderTime; log?: MedicineLog }[] = [];
        
        medicines
          .filter((m) => m.isActive)
          .forEach((medicine) => {
            const times = reminderTimes.filter((rt) => rt.medicineId === medicine.id && rt.isEnabled);
            
            times.forEach((reminderTime) => {
              const scheduledTime = `${today}T${reminderTime.time}:00`;
              const log = medicineLogs.find(
                (l) => l.reminderTimeId === reminderTime.id && l.scheduledTime.startsWith(today)
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
        const { medicineLogs } = get();
        const now = new Date();
        const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        
        const recentLogs = medicineLogs.filter(
          (log) => new Date(log.scheduledTime) >= startDate
        );
        
        if (recentLogs.length === 0) return 100;
        
        const takenCount = recentLogs.filter((log) => log.status === 'taken').length;
        return Math.round((takenCount / recentLogs.length) * 100);
      },
      
      // Tüm verileri temizle
      clearAllData: () => {
        set({
          medicines: [],
          reminderTimes: [],
          medicineLogs: [],
          settings: {
            wakeUpTime: '08:00',
            sleepTime: '23:00',
            notificationSound: 'default',
            vibrationEnabled: true,
            fullScreenAlarmEnabled: true,
            language: 'tr',
            snoozeDuration: 5,
            quietHoursEnabled: false,
            quietHoursStart: '23:00',
            quietHoursEnd: '07:00',
            alarmModeEnabled: true,
          },
          lastSyncAt: null,
        });
      },
      
      // Veri import et (buluttan gelen veriler için)
      importData: (data: SyncData) => {
        set({
          medicines: data.medicines,
          reminderTimes: data.reminderTimes,
          medicineLogs: data.medicineLogs,
          settings: data.settings,
          lastSyncAt: new Date().toISOString(),
        });
      },
    }),
    {
      name: 'medicine-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        medicines: state.medicines,
        reminderTimes: state.reminderTimes,
        medicineLogs: state.medicineLogs,
        settings: state.settings,
        lastSyncAt: state.lastSyncAt,
        userId: state.userId,
      }),
    }
  )
);
