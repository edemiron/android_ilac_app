/**
 * useNotificationCenterController
 *
 * Bildirim & Hatırlatma Merkezi state ve iş mantığı kontrolcüsü.
 * - Canlı izin & teşhis kontrolü (notifee / powerManager)
 * - Canlı test bildirimi tetikleme
 * - Kronolojik bildirim & ilaç etkinlik akışı (Feed)
 * - Sıradaki yaklaşan alarmlar listesi
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMedicineStore } from '../../../stores/medicineStore';
import {
  checkAllPermissions,
  type PermissionStatus,
} from '../../../utils/notifications/permissions';
import { scheduleTestAlarmNotification } from '../../../utils/notifications/schedule';
import { useHaptics } from '../../../hooks/useHaptics';

export type NotificationCenterTab = 'feed' | 'upcoming';

export interface FeedItem {
  id: string;
  type: 'taken' | 'skipped' | 'snoozed' | 'missed' | 'test' | 'system';
  title: string;
  subtitle: string;
  timestamp: string;
  timeFormatted: string;
  badgeLabel: string;
  badgeColor: string;
  iconName: string;
}

export interface UpcomingAlarmItem {
  id: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  timeString: string;
  countdownText: string;
  instructions?: string;
  color?: string;
}

export function useNotificationCenterController() {
  const haptics = useHaptics();
  const [activeTab, setActiveTab] = useState<NotificationCenterTab>('feed');
  const [permissions, setPermissions] = useState<PermissionStatus | null>(null);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSentMessage, setTestSentMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const medicines = useMedicineStore(state => state.medicines);
  const reminderTimes = useMedicineStore(state => state.reminderTimes);
  const medicineLogs = useMedicineStore(state => state.medicineLogs);
  const snoozes = useMedicineStore(state => state.snoozes);
  const settings = useMedicineStore(state => state.settings);

  // 1. İzinleri ve Teşhis Durumunu Kontrol Et
  const loadPermissions = useCallback(async () => {
    try {
      setIsCheckingPermissions(true);
      const status = await checkAllPermissions();
      setPermissions(status);
    } catch (_error) {
      // Hata durumunda varsayılan güvenli nesne
      setPermissions({
        notifications: true,
        exactAlarm: true,
        batteryOptimization: true,
        dnd: true,
        fullScreenIntent: true,
        powerManagerRestricted: false,
        manufacturer: null,
        isMIUI: false,
      });
    } finally {
      setIsCheckingPermissions(false);
    }
  }, []);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPermissions();
    setRefreshing(false);
  }, [loadPermissions]);

  // 2. Canlı Test Bildirimi Gönder
  const handleSendTestNotification = useCallback(async () => {
    if (isSendingTest) return;
    try {
      setIsSendingTest(true);
      haptics.trigger('medium');
      await scheduleTestAlarmNotification(5 / 60, 'tr', settings);
      haptics.trigger('success');
      setTestSentMessage('Test alarmı 5 saniye sonra çalacak! 🔔');
      setTimeout(() => {
        setTestSentMessage(null);
      }, 5000);
    } catch (_err) {
      console.log('Test bildirimi hatası:', _err);
      haptics.trigger('error');
      setTestSentMessage('Bildirim gönderilemedi. İzinleri kontrol edin.');
      setTimeout(() => {
        setTestSentMessage(null);
      }, 4000);
    } finally {
      setIsSendingTest(false);
    }
  }, [haptics, isSendingTest, settings]);

  // 3. Kronolojik Bildirim & İlaç Etkinlik Akışı (Feed)
  const feedItems = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];

    // İlaç kullanım logları
    const sortedLogs = [...medicineLogs].sort(
      (a, b) =>
        new Date(b.takenAt || b.scheduledTime).getTime() -
        new Date(a.takenAt || a.scheduledTime).getTime()
    );

    for (const log of sortedLogs.slice(0, 30)) {
      const med = medicines.find(m => m.id === log.medicineId);
      const medName = med ? `${med.name} (${med.dosage})` : 'İlaç';
      const eventDate = new Date(log.takenAt || log.scheduledTime);
      const timeStr = eventDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const dateStr = eventDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

      if (log.status === 'taken') {
        items.push({
          id: `log-${log.id}`,
          type: 'taken',
          title: `${medName} Alındı`,
          subtitle: 'Zamanında doz alındı olarak kaydedildi.',
          timestamp: log.takenAt || log.scheduledTime,
          timeFormatted: `${dateStr} • ${timeStr}`,
          badgeLabel: 'Alındı',
          badgeColor: '#10B981',
          iconName: 'checkmark-circle',
        });
      } else if (log.status === 'skipped') {
        items.push({
          id: `log-${log.id}`,
          type: 'skipped',
          title: `${medName} Atlandı`,
          subtitle: 'Kullanıcı tarafından bu doz atlandı.',
          timestamp: log.scheduledTime,
          timeFormatted: `${dateStr} • ${timeStr}`,
          badgeLabel: 'Atlandı',
          badgeColor: '#EF4444',
          iconName: 'close-circle',
        });
      } else if (log.status === 'missed') {
        items.push({
          id: `log-${log.id}`,
          type: 'missed',
          title: `${medName} Kaçırıldı`,
          subtitle: 'Planlanan saatte doz onayı verilmedi.',
          timestamp: log.scheduledTime,
          timeFormatted: `${dateStr} • ${timeStr}`,
          badgeLabel: 'Kaçırıldı',
          badgeColor: '#F59E0B',
          iconName: 'alert-circle',
        });
      }
    }

    // Aktif Snooze kayıtları
    for (const snooze of snoozes) {
      const med = medicines.find(m => m.id === snooze.medicineId);
      const medName = med ? med.name : 'İlaç';
      const snoozeDate = new Date(snooze.triggerTime);
      const timeStr = snoozeDate.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      items.push({
        id: `snooze-${snooze.id}`,
        type: 'snoozed',
        title: `${medName} Ertelendi`,
        subtitle: `Alarm ${timeStr} vaktine yeniden kuruldu.`,
        timestamp: new Date().toISOString(),
        timeFormatted: `Erteleme • ${timeStr}`,
        badgeLabel: 'Ertelendi',
        badgeColor: '#F59E0B',
        iconName: 'time',
      });
    }

    return items;
  }, [medicineLogs, medicines, snoozes]);

  // 4. Sıradaki Yaklaşan Alarmlar (Upcoming Alarms)
  const upcomingAlarms = useMemo<UpcomingAlarmItem[]>(() => {
    const list: UpcomingAlarmItem[] = [];
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const med of medicines) {
      if (!med.isActive) continue;
      const times = reminderTimes.filter(rt => rt.medicineId === med.id && rt.isEnabled !== false);

      for (const rt of times) {
        const [h, m] = rt.time.split(':').map(Number);
        const alarmMinutes = h * 60 + m;
        const diffMinutes = alarmMinutes - currentMinutes;

        let countdown = '';
        if (diffMinutes > 0) {
          const hours = Math.floor(diffMinutes / 60);
          const mins = diffMinutes % 60;
          countdown = hours > 0 ? `${hours} sa ${mins} dk sonra` : `${mins} dk sonra`;
        } else {
          countdown = 'Yarın ' + rt.time;
        }

        let instructionLabel = '';
        if (med.instructions) {
          const map: Record<string, string> = {
            before_meal: 'Yemekten Önce',
            after_meal: 'Yemekten Sonra',
            with_meal: 'Yemekle Birlikte',
            empty_stomach: 'Aç Karnına',
            before_sleep: 'Yatmadan Önce',
            any_time: 'İstediğiniz Zaman',
          };
          instructionLabel = map[med.instructions] || med.instructions;
        }

        list.push({
          id: `${med.id}-${rt.id}`,
          medicineId: med.id,
          medicineName: med.name,
          dosage: med.dosage,
          timeString: rt.time,
          countdownText: countdown,
          instructions: instructionLabel,
          color: med.color,
        });
      }
    }

    // Saate göre sırala
    list.sort((a, b) => a.timeString.localeCompare(b.timeString));
    return list;
  }, [medicines, reminderTimes]);

  // Canlı Kalkan Durumu
  const isShieldHealthy = useMemo(() => {
    if (!permissions) return true;
    return (
      permissions.notifications &&
      permissions.exactAlarm &&
      permissions.batteryOptimization &&
      permissions.fullScreenIntent
    );
  }, [permissions]);

  return {
    activeTab,
    setActiveTab,
    permissions,
    isCheckingPermissions,
    isShieldHealthy,
    isSendingTest,
    testSentMessage,
    feedItems,
    upcomingAlarms,
    refreshing,
    onRefresh,
    handleSendTestNotification,
  };
}
