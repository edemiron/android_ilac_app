/**
 * useHomeController — HomeScreen Presenter / Controller Hook
 *
 * Design Pattern: Presenter / Controller (Single Responsibility)
 * UI render ile iş mantığını, zaman dilimi gruplamalarını ve
 * hatırlatma aksiyonlarını ayrıştırır.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  format,
  differenceInDays,
  startOfDay,
  parseISO,
  startOfWeek,
  addDays,
  isSameDay,
} from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { useMedicineStore } from '../../../stores/medicineStore';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useUserProfile } from '../../../hooks/useUserProfile';
import { useAlert } from '../../../contexts/AlertContext';
import { scheduleSnoozeNotification } from '../../../utils/notifications';
import { getRelativeTimeText } from '../helpers';
import { isMedicineScheduledForDate } from '../../../utils/timeCalculator';
import {
  checkAndShowPersistentNotifications,
  dismissAllPersistentNotifications,
} from '../../../utils/persistentNotification';
import { refreshWidget } from '../../../services/widgetService';
import { createScopedLogger } from '../../../utils/logger';
import type { TodayReminder } from '../types';
import type { TimeSlotGroupData } from '../components/TimeSlotGrid';
import type { Medicine } from '../../../types';

const log = createScopedLogger('HomeController');

export type FilterTab = 'all' | 'pending' | 'taken' | 'missed';

export function useHomeController() {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { showSuccess, showError } = useAlert();

  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
  const [activeModalSlotKey, setActiveModalSlotKey] = useState<
    'morning' | 'noon' | 'evening' | 'night' | null
  >(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [expiryModalVisible, setExpiryModalVisible] = useState(false);
  const [expiringMedicines, setExpiringMedicines] = useState<Medicine[]>([]);
  const [expiryWarningShown, setExpiryWarningShown] = useState(false);
  const [skipModalVisible, setSkipModalVisible] = useState(false);
  const [skipTargetReminder, setSkipTargetReminder] = useState<{
    reminderTimeId: string;
    medicineId: string;
    medicineName: string;
  } | null>(null);

  const dateLocale = language === 'tr' ? tr : enUS;

  // Zustand state & actions
  const medicines = useMedicineStore(state => state.medicines);
  const reminderTimes = useMedicineStore(state => state.reminderTimes);
  const medicineLogs = useMedicineStore(state => state.medicineLogs);
  const settings = useMedicineStore(state => state.settings);
  const snoozes = useMedicineStore(state => state.snoozes);

  const getTodayReminders = useMedicineStore(state => state.getTodayReminders);
  const logMedicineTaken = useMedicineStore(state => state.logMedicineTaken);
  const logMedicineSkipped = useMedicineStore(state => state.logMedicineSkipped);
  const getCurrentStreak = useMedicineStore(state => state.getCurrentStreak);
  const createSnooze = useMedicineStore(state => state.createSnooze);
  const getLowStockMedicines = useMedicineStore(state => state.getLowStockMedicines);
  const updateSettings = useMedicineStore(state => state.updateSettings);

  const isSeniorMode = settings?.seniorModeEnabled ?? false;
  const toggleSeniorMode = useCallback(() => {
    updateSettings({ seniorModeEnabled: !isSeniorMode });
  }, [isSeniorMode, updateSettings]);

  const lowStockMedicines = useMemo(() => getLowStockMedicines(), [getLowStockMedicines]);

  // Son kullanma tarihi kontrolü
  useEffect(() => {
    if (expiryWarningShown) return;

    const checkExpiringMedicines = () => {
      const today = startOfDay(new Date());
      const expiring = medicines.filter(medicine => {
        if (!medicine.expiryDate || !medicine.isActive) return false;

        const expiryDate = startOfDay(parseISO(medicine.expiryDate));
        const daysLeft = differenceInDays(expiryDate, today);
        const reminderDays = medicine.expiryReminderDays || 30;

        return daysLeft <= reminderDays;
      });

      if (expiring.length > 0) {
        setExpiringMedicines(expiring);
        setExpiryModalVisible(true);
        setExpiryWarningShown(true);
      }
    };

    const timer = setTimeout(checkExpiringMedicines, 1000);
    return () => clearTimeout(timer);
  }, [medicines, expiryWarningShown]);

  // Kalıcı bildirim kontrolü
  useEffect(() => {
    if (!settings.persistentNotificationEnabled) {
      dismissAllPersistentNotifications();
      return;
    }

    const checkPendingMedicines = async () => {
      try {
        await checkAndShowPersistentNotifications(medicines, reminderTimes, medicineLogs);
      } catch (error) {
        log.warn('Kalıcı bildirim kontrolü hatası', error);
      }
    };

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        dismissAllPersistentNotifications();
        refreshWidget();
      } else if (nextAppState === 'background') {
        checkPendingMedicines();
      }
    };

    dismissAllPersistentNotifications();
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [medicines, reminderTimes, medicineLogs, settings.persistentNotificationEnabled]);

  const isSelectedDateToday = useMemo(() => {
    return isSameDay(selectedCalendarDate, new Date());
  }, [selectedCalendarDate]);

  // Seçilen güne göre hatırlatmalar
  const todayReminders = useMemo(() => {
    if (isSelectedDateToday) {
      return getTodayReminders();
    }
    const targetDateStr = format(selectedCalendarDate, 'yyyy-MM-dd');
    const dayLogMap = new Map(
      medicineLogs
        .filter(l => l.scheduledTime.startsWith(targetDateStr))
        .map(l => [`${l.reminderTimeId}_${l.scheduledTime}`, l])
    );

    const result: TodayReminder[] = [];

    medicines
      .filter(m => m.isActive && isMedicineScheduledForDate(m, selectedCalendarDate))
      .forEach(medicine => {
        const times = reminderTimes.filter(rt => rt.medicineId === medicine.id && rt.isEnabled);

        times.forEach(reminderTime => {
          const scheduledTime = `${targetDateStr}T${reminderTime.time}:00`;
          const log = dayLogMap.get(`${reminderTime.id}_${scheduledTime}`);

          result.push({ medicine, reminderTime, log });
        });
      });

    result.sort((a, b) => a.reminderTime.time.localeCompare(b.reminderTime.time));
    return result;
  }, [
    isSelectedDateToday,
    selectedCalendarDate,
    medicines,
    reminderTimes,
    medicineLogs,
    getTodayReminders,
  ]);

  // Haftalık özet
  const weeklyLogsSummary = useMemo(() => {
    const summary: Record<string, { total: number; taken: number; pending: number }> = {};
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const dayStr = format(day, 'yyyy-MM-dd');
      let total = 0;
      medicines
        .filter(m => m.isActive && isMedicineScheduledForDate(m, day))
        .forEach(m => {
          total += reminderTimes.filter(rt => rt.medicineId === m.id && rt.isEnabled).length;
        });
      const dayLogs = medicineLogs.filter(l => l.scheduledTime.startsWith(dayStr));
      const taken = dayLogs.filter(l => l.status === 'taken').length;
      const skipped = dayLogs.filter(l => l.status === 'skipped').length;
      const pending = Math.max(0, total - taken - skipped);
      summary[dayStr] = { total, taken, pending };
    }
    return summary;
  }, [medicines, reminderTimes, medicineLogs]);

  const currentStreak = useMemo(() => getCurrentStreak(), [getCurrentStreak]);
  const currentTime = format(new Date(), 'HH:mm');

  // currentReminder
  const currentReminder = useMemo(() => {
    return (
      todayReminders.find(r => {
        if (r.log?.status === 'taken' || r.log?.status === 'skipped') return false;
        const { isPast, isNow, minutesDiff } = getRelativeTimeText(
          r.reminderTime.time,
          language,
          r.log
        );
        return isNow || (isPast && Math.abs(minutesDiff) <= 30) || (!isPast && minutesDiff <= 60);
      }) ||
      todayReminders.find(r => {
        if (r.log?.status === 'taken' || r.log?.status === 'skipped') return false;
        return r.reminderTime.time > currentTime;
      }) ||
      todayReminders.find(r => !r.log)
    );
  }, [todayReminders, language, currentTime]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  const handleTake = useCallback(
    (reminderTimeId: string) => {
      const targetDateStr = format(selectedCalendarDate, 'yyyy-MM-dd');
      const reminder = todayReminders.find(r => r.reminderTime.id === reminderTimeId);
      if (reminder) {
        const scheduledTime = `${targetDateStr}T${reminder.reminderTime.time}:00`;
        logMedicineTaken(reminderTimeId, scheduledTime, reminder.medicine.id);
      }
    },
    [selectedCalendarDate, todayReminders, logMedicineTaken]
  );

  const handleSkip = useCallback(
    (reminderTimeId: string) => {
      const reminder = todayReminders.find(r => r.reminderTime.id === reminderTimeId);
      if (reminder) {
        setSkipTargetReminder({
          reminderTimeId,
          medicineId: reminder.medicine.id,
          medicineName: reminder.medicine.name,
        });
        setSkipModalVisible(true);
      }
    },
    [todayReminders]
  );

  const handleConfirmSkip = useCallback(
    (reason: string, customNote?: string) => {
      if (!skipTargetReminder) return;
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const reminder = todayReminders.find(
        r => r.reminderTime.id === skipTargetReminder.reminderTimeId
      );
      if (reminder) {
        const scheduledTime = `${todayStr}T${reminder.reminderTime.time}:00`;
        logMedicineSkipped(
          skipTargetReminder.reminderTimeId,
          scheduledTime,
          reminder.medicine.id,
          customNote,
          reason,
          customNote
        );
      }
      setSkipModalVisible(false);
      setSkipTargetReminder(null);
    },
    [skipTargetReminder, todayReminders, logMedicineSkipped]
  );

  const handleSnooze = useCallback(
    async (reminder: TodayReminder, minutes: number) => {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const originalScheduledTime = `${todayStr}T${reminder.reminderTime.time}:00`;
      const triggerTime = new Date(Date.now() + minutes * 60 * 1000);
      const notificationId = `snooze-${reminder.medicine.id}-${Date.now()}`;

      try {
        const snooze = createSnooze(
          reminder.medicine.id,
          reminder.reminderTime.id,
          originalScheduledTime,
          triggerTime,
          notificationId
        );

        await scheduleSnoozeNotification({
          medicine: reminder.medicine,
          reminderTime: reminder.reminderTime,
          snoozeDuration: minutes,
          snoozeId: snooze.id,
          originalScheduledTime,
          snoozeCount: snooze.snoozeCount,
        });

        showSuccess(
          language === 'tr' ? 'Ertelendi' : 'Snoozed',
          language === 'tr'
            ? `${reminder.medicine.name} ${minutes} dakika sonra hatırlatılacak.`
            : `${reminder.medicine.name} will be reminded in ${minutes} minutes.`
        );
      } catch (_error) {
        showError(
          language === 'tr' ? 'Hata' : 'Error',
          language === 'tr' ? 'Erteleme başarısız oldu.' : 'Failed to snooze.'
        );
      }
    },
    [createSnooze, language, showSuccess, showError]
  );

  const { completedCount, totalCount, remainingCount } = useMemo(() => {
    const total = todayReminders.length;
    const completed = todayReminders.filter(r => r.log?.status === 'taken').length;
    const skipped = todayReminders.filter(r => r.log?.status === 'skipped').length;
    return {
      totalCount: total,
      completedCount: completed,
      remainingCount: total - completed - skipped,
    };
  }, [todayReminders]);

  const firstName = user?.displayName?.split(' ')[0] || '';

  const getTimeBasedGreeting = (): string => {
    const hour = new Date().getHours();
    if (language !== 'tr') {
      if (hour >= 5 && hour < 12) return 'Good morning';
      if (hour >= 12 && hour < 17) return 'Good afternoon';
      if (hour >= 17 && hour < 22) return 'Good evening';
      return 'Good night';
    }
    if (hour >= 5 && hour < 12) return 'Günaydın';
    if (hour >= 12 && hour < 17) return 'İyi günler';
    if (hour >= 17 && hour < 22) return 'İyi akşamlar';
    return 'İyi geceler';
  };

  const getDynamicDate = (): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dateKey = today.toDateString();
    const tomorrowKey = tomorrow.toDateString();
    if (language !== 'tr') {
      if (dateKey === today.toDateString()) return 'Today';
      if (tomorrowKey === today.toDateString()) return 'Tomorrow';
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      if (today >= weekStart && today < new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)) {
        return 'This week';
      }
      return format(today, 'EEE, d MMM', { locale: enUS });
    }
    if (dateKey === today.toDateString()) return 'Bugün';
    if (tomorrowKey === today.toDateString()) return 'Yarın';
    const weekStart2 = new Date(today);
    weekStart2.setDate(today.getDate() - today.getDay());
    if (today >= weekStart2 && today < new Date(weekStart2.getTime() + 7 * 24 * 60 * 60 * 1000)) {
      return 'Bu hafta';
    }
    return format(today, 'd MMMM, EEEE', { locale: tr });
  };

  const timeGreeting = getTimeBasedGreeting();
  const dynamicDate = getDynamicDate();
  const greeting = firstName ? `${timeGreeting}, ${firstName}` : timeGreeting;

  // Filter timeline based on active tab + deduplicate
  const filteredTimeline = useMemo(() => {
    return todayReminders.filter(reminder => {
      if (currentReminder && reminder.reminderTime.id === currentReminder.reminderTime.id) {
        return false;
      }

      if (activeTab === 'all') return true;

      const logStatus = reminder.log?.status;
      const isTaken = logStatus === 'taken';
      const isSkipped = logStatus === 'skipped';
      const isCompleted = isTaken || isSkipped;

      const reminderDate = new Date();
      reminderDate.setHours(
        parseInt(reminder.reminderTime.time.split(':')[0], 10),
        parseInt(reminder.reminderTime.time.split(':')[1], 10),
        0,
        0
      );
      const isPastDue = new Date() > reminderDate;

      if (activeTab === 'taken') return isTaken;
      if (activeTab === 'missed') return isSkipped || (!isCompleted && isPastDue);
      if (activeTab === 'pending') return !isCompleted && !isPastDue;
      return true;
    });
  }, [todayReminders, activeTab, currentReminder]);

  // Zaman dilimlerine göre gruplandır
  const groupedTimeline = useMemo((): TimeSlotGroupData[] => {
    const slots: TimeSlotGroupData[] = [
      { key: 'morning', emoji: '🌅', label: language === 'tr' ? 'Sabah' : 'Morning', items: [] },
      { key: 'noon', emoji: '☀️', label: language === 'tr' ? 'Öğle' : 'Noon', items: [] },
      { key: 'evening', emoji: '🌆', label: language === 'tr' ? 'Akşam' : 'Evening', items: [] },
      { key: 'night', emoji: '🌙', label: language === 'tr' ? 'Gece' : 'Night', items: [] },
    ];

    filteredTimeline.forEach(reminder => {
      const hour = parseInt(reminder.reminderTime.time.split(':')[0], 10);
      if (hour < 12) slots[0].items.push(reminder);
      else if (hour < 17) slots[1].items.push(reminder);
      else if (hour < 21) slots[2].items.push(reminder);
      else slots[3].items.push(reminder);
    });

    return slots;
  }, [filteredTimeline, language]);

  const activeSlotKey = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'noon';
    if (hour < 21) return 'evening';
    return 'night';
  }, []);

  const selectedModalSlot = useMemo(() => {
    if (!activeModalSlotKey) return null;
    return groupedTimeline.find(s => s.key === activeModalSlotKey) || null;
  }, [groupedTimeline, activeModalSlotKey]);

  return {
    colors,
    isDark,
    language,
    user,
    profile,
    dateLocale,
    firstName,
    greeting,
    dynamicDate,
    selectedCalendarDate,
    setSelectedCalendarDate,
    isSelectedDateToday,
    activeTab,
    setActiveTab,
    refreshing,
    onRefresh,
    todayReminders,
    weeklyLogsSummary,
    completedCount,
    totalCount,
    remainingCount,
    currentStreak,
    currentReminder,
    lowStockMedicines,
    snoozes,
    isSeniorMode,
    toggleSeniorMode,
    activeSlotKey,
    activeModalSlotKey,
    setActiveModalSlotKey,
    groupedTimeline,
    selectedModalSlot,
    expiryModalVisible,
    setExpiryModalVisible,
    expiringMedicines,
    skipModalVisible,
    setSkipModalVisible,
    skipTargetReminder,
    setSkipTargetReminder,
    handleTake,
    handleSkip,
    handleConfirmSkip,
    handleSnooze,
  };
}
