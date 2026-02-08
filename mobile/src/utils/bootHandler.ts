import { AppRegistry } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, {
  TimestampTrigger,
  TriggerType,
  AlarmType,
  AndroidCategory,
  AndroidImportance,
  AndroidVisibility,
} from '@notifee/react-native';
import { createScopedLogger } from './logger';
import { scheduleMedicineNotification } from './notifications';
import { Medicine, ReminderTime } from '../types';
import { STORAGE_KEYS, CHANNELS, NOTIFICATION_IDS } from '../constants';

const log = createScopedLogger('BootHandler');

const ALARM_CHANNEL_ID = CHANNELS.ALARM;
const REMINDER_CHANNEL_ID = CHANNELS.REMINDER;
const BOOT_RECOVERY_KEY = STORAGE_KEYS.BOOT_RECOVERY;
const SYNC_NOTIFICATION_ID = NOTIFICATION_IDS.ALARM_SYNC;

// bootHandler'da AsyncStorage'dan okunan veriler tam Medicine/ReminderTime olmayabilir
// Ama scheduleMedicineNotification sadece id, name, dosage, time gibi alanları kullanıyor
type StoredMedicine = Pick<Medicine, 'id' | 'name' | 'dosage' | 'isActive'>;
type StoredReminderTime = Pick<ReminderTime, 'id' | 'medicineId' | 'time' | 'isEnabled'>;

interface Snooze {
  id: string;
  medicineId: string;
  reminderTimeId: string;
  originalScheduledTime: string;
  triggerTime: string;
  notificationId: string;
  snoozeCount: number;
  isActive: boolean;
}

interface StoredState {
  state: {
    medicines: StoredMedicine[];
    reminderTimes: StoredReminderTime[];
    snoozes: Snooze[];
  };
}

interface TaskData {
  trigger: string;
  timestamp: number;
}

// parseTimeToDate fonksiyonu kaldırıldı - artık notifications.ts'deki scheduleMedicineNotification kullanılıyor

// scheduleReminderNotification artik notifications.ts'den kullaniliyor

async function scheduleActiveSnooze(
  snooze: Snooze,
  medicine: StoredMedicine
): Promise<string | null> {
  const triggerTime = new Date(snooze.triggerTime);

  if (triggerTime <= new Date()) {
    log.debug('Snooze time has passed, skipping', { snoozeId: snooze.id });
    return null;
  }

  const timeStr = triggerTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerTime.getTime(),
    alarmManager: {
      allowWhileIdle: true,
      type: AlarmType.RTC_WAKEUP,
    },
  };

  try {
    const notificationId = await notifee.createTriggerNotification(
      {
        id: snooze.notificationId,
        title: `🔔 ${medicine.name} (Ertelendi${snooze.snoozeCount > 1 ? ` x${snooze.snoozeCount}` : ''})`,
        subtitle: timeStr,
        body: `${medicine.dosage} almanin zamani!\n⏰ ${timeStr}`,
        android: {
          channelId: ALARM_CHANNEL_ID,
          category: AndroidCategory.ALARM,
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          ongoing: true,
          autoCancel: false,
          loopSound: true,
          fullScreenAction: {
            id: 'default',
            launchActivity: 'com.ilachatirlatici.MainActivity',
          },
          pressAction: {
            id: 'default',
            launchActivity: 'com.ilachatirlatici.MainActivity',
          },
          smallIcon: 'ic_launcher',
          color: '#FF6B6B',
          colorized: true,
          sound: 'alarm',
          vibrationPattern: [500, 200, 500, 200, 500, 200],
          actions: [
            { title: '😴 Ertele', pressAction: { id: 'snooze' } },
            { title: '✅ Aldım', pressAction: { id: 'take' } },
          ],
        },
        data: {
          medicineId: snooze.medicineId,
          reminderTimeId: snooze.reminderTimeId,
          scheduledTime: triggerTime.toISOString(),
          originalScheduledTime: snooze.originalScheduledTime,
          fullScreenAlarm: 'true',
          isSnooze: 'true',
          snoozeId: snooze.id,
          snoozeCount: String(snooze.snoozeCount),
        },
      },
      trigger
    );

    return notificationId;
  } catch (error) {
    log.error('Failed to schedule snooze', error);
    return null;
  }
}

export interface BootRecoveryResult {
  reminders: number;
  snoozes: number;
  trigger: string;
  timestamp: string;
}

async function showRecoveryNotification(result: BootRecoveryResult): Promise<void> {
  const total = result.reminders + result.snoozes;
  if (total === 0) return;

  try {
    // Önce varolan bildirimi iptal et (duplicate önleme)
    await notifee.cancelNotification(SYNC_NOTIFICATION_ID);

    await notifee.displayNotification({
      id: SYNC_NOTIFICATION_ID, // Sabit ID ile aynı bildirimi günceller
      title: '✅ Alarmlar Senkronize Edildi',
      body: `${result.reminders} hatirlatma${result.snoozes > 0 ? ` ve ${result.snoozes} erteleme` : ''} yeniden planlandi.`,
      android: {
        channelId: REMINDER_CHANNEL_ID,
        importance: AndroidImportance.DEFAULT,
        visibility: AndroidVisibility.PUBLIC,
        autoCancel: true,
        smallIcon: 'ic_launcher',
        color: '#4ECDC4',
        timestamp: Date.now(),
        showTimestamp: true,
        pressAction: { id: 'default' },
      },
    });
    log.debug('Recovery notification shown', { ...result });
  } catch (error) {
    log.error('Failed to show recovery notification', error);
  }
}

export async function saveBootRecoveryResult(result: BootRecoveryResult): Promise<void> {
  try {
    await AsyncStorage.setItem(BOOT_RECOVERY_KEY, JSON.stringify(result));
  } catch (error) {
    log.error('Failed to save boot recovery result', error);
  }
}

export async function getBootRecoveryResult(): Promise<BootRecoveryResult | null> {
  try {
    const data = await AsyncStorage.getItem(BOOT_RECOVERY_KEY);
    if (!data) return null;
    return JSON.parse(data) as BootRecoveryResult;
  } catch (error) {
    log.error('Failed to get boot recovery result', error);
    return null;
  }
}

export async function clearBootRecoveryResult(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BOOT_RECOVERY_KEY);
  } catch (error) {
    log.error('Failed to clear boot recovery result', error);
  }
}

export async function reRegisterAllAlarms(trigger: string = 'manual'): Promise<BootRecoveryResult> {
  let registeredReminders = 0;
  let registeredSnoozes = 0;
  const timestamp = new Date().toISOString();

  try {
    const storedData = await AsyncStorage.getItem(STORAGE_KEYS.MEDICINE_STORAGE);

    if (!storedData) {
      log.debug('No stored data found');
      return { reminders: 0, snoozes: 0, trigger, timestamp };
    }

    const parsed: StoredState = JSON.parse(storedData);
    const { medicines, reminderTimes, snoozes } = parsed.state;

    if (!medicines || !reminderTimes) {
      log.debug('No medicines or reminder times found');
      return { reminders: 0, snoozes: 0, trigger, timestamp };
    }

    const activeMedicines = medicines.filter(m => m.isActive);
    const medicineMap = new Map(activeMedicines.map(m => [m.id, m]));

    // Her alarm scheduleMedicineNotification içinde kendi eski bildirimini iptal eder
    // cancelAllNotifications çağırmıyoruz - race condition ve kayıp alarm riski var
    log.debug('Re-registering alarms for active medicines', { count: activeMedicines.length });

    for (const reminderTime of reminderTimes) {
      if (!reminderTime.isEnabled) continue;

      const medicine = medicineMap.get(reminderTime.medicineId);
      if (!medicine) continue;

      // notifications.ts'deki fonksiyonu kullan - bypassBuffer=false ile buffer uygula
      const notificationId = await scheduleMedicineNotification(
        medicine as Medicine,
        reminderTime as ReminderTime,
        true, // fullScreenAlarm
        false // bypassBuffer - buffer uygula
      );
      if (notificationId) {
        registeredReminders++;
      }
    }

    if (snoozes) {
      const activeSnoozes = snoozes.filter(s => s.isActive);

      for (const snooze of activeSnoozes) {
        const medicine = medicineMap.get(snooze.medicineId);
        if (!medicine) continue;

        const notificationId = await scheduleActiveSnooze(snooze, medicine);
        if (notificationId) {
          registeredSnoozes++;
        }
      }
    }

    const result: BootRecoveryResult = {
      reminders: registeredReminders,
      snoozes: registeredSnoozes,
      trigger,
      timestamp,
    };

    log.debug('Re-registered alarms', { ...result });

    return result;
  } catch (error) {
    log.error('Failed to re-register alarms', error);
    return { reminders: registeredReminders, snoozes: registeredSnoozes, trigger, timestamp };
  }
}

async function ReRegisterAlarmsTask(taskData: TaskData): Promise<void> {
  const { trigger = 'unknown', timestamp } = taskData || {};

  log.debug('HeadlessJS task started', { trigger, timestamp });

  try {
    const result = await reRegisterAllAlarms(trigger);

    await saveBootRecoveryResult(result);

    await showRecoveryNotification(result);

    log.debug('HeadlessJS task completed', { ...result });
  } catch (error) {
    log.error('HeadlessJS task failed', error);
  }
}

export function registerBootTask(): void {
  AppRegistry.registerHeadlessTask('ReRegisterAlarmsTask', () => ReRegisterAlarmsTask);
  log.debug('ReRegisterAlarmsTask registered');
}
