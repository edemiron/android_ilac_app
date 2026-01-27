import { AppRegistry } from 'react-native';
import notifee, {
  EventType,
  Event,
  AndroidCategory,
  AndroidImportance,
  AndroidVisibility,
  TriggerType,
  AlarmType,
} from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import App from './App';
import { registerBootTask } from './src/utils/bootHandler';
import { useMedicineStore } from './src/stores/medicineStore';
import { stopAlarmSound } from './src/utils/alarmSoundManager';
import { stopSpeaking } from './src/utils/speech';
import { name as appName } from './app.json';

registerBootTask();

async function getSnoozeDurationFromSettings(): Promise<number> {
  try {
    const stored = await AsyncStorage.getItem('medicine-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      const snoozeDuration = parsed?.state?.settings?.snoozeDuration;
      if (typeof snoozeDuration === 'number' && snoozeDuration > 0) {
        console.log('[Background] Snooze duration from settings:', snoozeDuration, 'minutes');
        return snoozeDuration;
      }
    }
  } catch (e) {
    console.error('[Background] Failed to read settings:', e);
  }
  console.log('[Background] Using default snooze duration: 5 minutes');
  return 5;
}

notifee.onBackgroundEvent(async ({ type, detail }: Event) => {
  const { notification, pressAction } = detail;

  console.log('[Background] Event type:', type, 'Notification:', notification?.id);

  switch (type) {
    case EventType.DELIVERED:
      console.log('[Background] Notification delivered:', notification?.id);
      console.log('[Background] Full screen alarm:', notification?.data?.fullScreenAlarm);
      break;

    case EventType.PRESS:
      console.log('[Background] Notification pressed:', notification?.data);
      break;

    case EventType.ACTION_PRESS:
      console.log('[Background] Action pressed:', pressAction?.id);

      await stopAlarmSound();
      await stopSpeaking();
      console.log('[Background] Alarm sound and TTS stopped');

      if (notification?.id) {
        await notifee.cancelNotification(notification.id);
        console.log('[Background] Notification cancelled:', notification.id);
      }

      if (pressAction?.id === 'take' && notification?.data) {
        console.log('[Background] Take action - logging medicine taken');
        try {
          const { logMedicineTaken } = useMedicineStore.getState();
          const reminderTimeId = notification.data.reminderTimeId as string;
          const scheduledTime =
            (notification.data.scheduledTime as string) || new Date().toISOString();
          const medicineId = notification.data.medicineId as string;
          logMedicineTaken(reminderTimeId, scheduledTime, medicineId);
          console.log('[Background] Medicine logged as taken:', medicineId);
        } catch (e) {
          console.error('[Background] Failed to log medicine taken:', e);
        }
      }

      if (pressAction?.id === 'skip' && notification?.data) {
        console.log('[Background] Skip action - logging medicine skipped');
        try {
          const { logMedicineSkipped } = useMedicineStore.getState();
          const reminderTimeId = notification.data.reminderTimeId as string;
          const scheduledTime =
            (notification.data.scheduledTime as string) || new Date().toISOString();
          const medicineId = notification.data.medicineId as string;
          logMedicineSkipped(reminderTimeId, scheduledTime, medicineId);
          console.log('[Background] Medicine logged as skipped:', medicineId);
        } catch (e) {
          console.error('[Background] Failed to log medicine skipped:', e);
        }
      }

      if (pressAction?.id === 'snooze' && notification?.data) {
        const snoozeDurationMinutes = await getSnoozeDurationFromSettings();
        const snoozeTime = new Date(Date.now() + snoozeDurationMinutes * 60 * 1000);
        const timeStr = snoozeTime.toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
        });

        const originalTitle = notification.title || '💊 Ilac';
        const currentSnoozeCount = parseInt((notification.data.snoozeCount as string) || '0', 10);
        const newSnoozeCount = currentSnoozeCount + 1;
        const snoozeTitle = `🔔 ${originalTitle.replace('💊 ', '').replace(/ \(Ertelendi.*\)/, '')} (Ertelendi${newSnoozeCount > 1 ? ` x${newSnoozeCount}` : ''})`;

        const bgSnoozeId = `bg-${Date.now()}`;
        const snoozeNotificationId = `snooze-${bgSnoozeId}`;

        try {
          await notifee.createTriggerNotification(
            {
              id: snoozeNotificationId,
              title: snoozeTitle,
              subtitle: timeStr,
              body: `${notification.body?.split('\n')[0] || 'Ilac almanin zamani!'}\n⏰ ${timeStr}`,
              android: {
                channelId: 'medicine-alarms-v3',
                importance: AndroidImportance.HIGH,
                visibility: AndroidVisibility.PUBLIC,
                category: AndroidCategory.ALARM,
                ongoing: true,
                autoCancel: false,
                loopSound: true,
                sound: 'alarm',
                smallIcon: 'ic_launcher',
                color: '#FF6B6B',
                colorized: true,
                fullScreenAction: {
                  id: 'default',
                  launchActivity: 'com.ilachatirlatici.MainActivity',
                },
                pressAction: { id: 'default', launchActivity: 'com.ilachatirlatici.MainActivity' },
                vibrationPattern: [500, 200, 500, 200, 500, 200],
                actions: [
                  { title: '😴 Ertele', pressAction: { id: 'snooze' } },
                  { title: '⬛ Kapat', pressAction: { id: 'stop' } },
                ],
              },
              data: {
                ...notification.data,
                scheduledTime: snoozeTime.toISOString(),
                isSnooze: 'true',
                snoozeId: bgSnoozeId,
                snoozeCount: String(newSnoozeCount),
                backgroundSnooze: 'true',
              },
            },
            {
              type: TriggerType.TIMESTAMP,
              timestamp: snoozeTime.getTime(),
              alarmManager: {
                allowWhileIdle: true,
                type: AlarmType.SET_ALARM_CLOCK,
              },
            }
          );
          console.log(
            '[Background] Snooze scheduled:',
            snoozeNotificationId,
            'for:',
            snoozeTime.toISOString()
          );
        } catch (e) {
          console.error('[Background] Snooze error:', e);
        }
      }
      break;

    case EventType.DISMISSED:
      console.log('[Background] Notification dismissed:', notification?.id);
      break;
  }
});

// Register the app
AppRegistry.registerComponent(appName, () => App);
