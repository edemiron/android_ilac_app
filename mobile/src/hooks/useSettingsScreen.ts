import { useState, useCallback } from 'react';
import { Platform, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMedicineStore } from '../stores/medicineStore';
import { RootStackParamList } from '../types';
import notifee from '@notifee/react-native';
import {
  sendTestNotification,
  requestNotificationPermissions,
  scheduleTestAlarmNotification,
  scheduleMedicineNotification,
} from '../utils/notifications';
import { checkMultipleInteractions, getSeverityIcon } from '../services/drugInteraction';
import { useAlert } from '../contexts/AlertContext';

// Test ilaç verileri
const TEST_MEDICINE_NAMES = [
  'Aspirin',
  'Parol',
  'Majezik',
  'Arveles',
  'Nurofen',
  'Tylol',
  'Voltaren',
  'Cataflam',
  'Apranax',
  'Dikloron',
  'Aferin',
  'Gripin',
  'Minoset',
  'Vermidon',
  'Dolorex',
];

const TEST_MEDICINE_DOSES = [
  '500mg',
  '200mg',
  '100mg',
  '250mg',
  '400mg',
  '1 tablet',
  '2 tablet',
  '1 kapsu00fcl',
  '5ml',
  '10ml',
];

const TEST_INSTRUCTIONS = [
  'after_meal',
  'before_meal',
  'with_meal',
  'any_time',
  'empty_stomach',
  'before_sleep',
] as const;
import { speak } from '../utils/speech';
import { useTheme, ThemeMode } from '../contexts/ThemeContext';
import { useLanguage, Language } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('SettingsScreen');

type SettingsNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function useSettingsScreen() {
  const navigation = useNavigation<SettingsNavigationProp>();
  const { colors, isDark, theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { showAlert, showSuccess, showError, showInfo, showConfirm, showWarning } = useAlert();
  const {
    settings,
    updateSettings,
    syncToCloud,
    isSyncing,
    lastSyncAt,
    addMedicine,
    deleteMedicine,
    medicines,
    reminderTimes,
  } = useMedicineStore();
  const { user, logout } = useAuth();
  const { isPremium, remainingDays } = useSubscription();

  const [pickerState, setPickerState] = useState({
    showWakeUpPicker: false,
    showSleepPicker: false,
    showThemePicker: false,
    showLanguagePicker: false,
    showSnoozePicker: false,
    showVolumePicker: false,
    showQuietStartPicker: false,
    showQuietEndPicker: false,
    showConflictIntervalPicker: false,
  });

  const togglePicker = useCallback((pickerName: keyof typeof pickerState) => {
    setPickerState(prev => ({
      ...prev,
      [pickerName]: !prev[pickerName],
    }));
  }, []);

  const closePicker = useCallback((pickerName: keyof typeof pickerState) => {
    setPickerState(prev => ({
      ...prev,
      [pickerName]: false,
    }));
  }, []);

  const parseTimeToDate = useCallback((timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }, []);

  const handleTimeChange = useCallback(
    (settingKey: 'wakeUpTime' | 'sleepTime' | 'quietHoursStart' | 'quietHoursEnd') =>
      (event: DateTimePickerEvent, selectedDate?: Date) => {
        const pickerMap: Record<string, keyof typeof pickerState> = {
          wakeUpTime: 'showWakeUpPicker',
          sleepTime: 'showSleepPicker',
          quietHoursStart: 'showQuietStartPicker',
          quietHoursEnd: 'showQuietEndPicker',
        };

        if (Platform.OS !== 'ios') {
          closePicker(pickerMap[settingKey]);
        }

        if (selectedDate) {
          const timeStr = format(selectedDate, 'HH:mm');
          updateSettings({ [settingKey]: timeStr });
        }
      },
    [closePicker, updateSettings]
  );

  const handleTestNotification = useCallback(async () => {
    log.debug('handleTestNotification called');
    try {
      const hasPermission = await requestNotificationPermissions();
      log.debug('Permission result', { hasPermission });
      if (hasPermission) {
        await sendTestNotification();
        log.debug('sendTestNotification completed');
        showSuccess(
          t('success'),
          language === 'tr' ? 'Test bildirimi gönderildi!' : 'Test notification sent!'
        );
      } else {
        showAlert({
          type: 'warning',
          title: t('settings_notification_permission'),
          message:
            language === 'tr'
              ? 'Bildirimlerin çalışması için izin vermeniz gerekiyor.'
              : 'You need to grant permission for notifications to work.',
          buttons: [
            { text: t('cancel'), style: 'cancel' },
            { text: t('settings_open_settings'), onPress: () => Linking.openSettings() },
          ],
        });
      }
    } catch (error) {
      log.error('handleTestNotification error', error);
      showError(t('error'), String(error));
    }
  }, [language, t, showSuccess, showAlert, showError]);

  const handleTestVoice = useCallback(async () => {
    const message =
      language === 'tr'
        ? 'İlaç zamanı! Aspirin, 500 miligram. Yemekten sonra alınız.'
        : 'Medicine time! Aspirin, 500 milligrams. Take after meal.';
    await speak(message, language);
  }, [language]);

  const handleTestFullScreenAlarm = useCallback(() => {
    showConfirm(
      language === 'tr' ? 'Tam Ekran Alarm Testi' : 'Full Screen Alarm Test',
      language === 'tr'
        ? '2 saniye sonra tam ekran alarm açılacak.'
        : 'Full screen alarm will open in 2 seconds.',
      () => {
        setTimeout(() => {
          navigation.navigate('Alarm', {
            medicineId: 'test-medicine',
            reminderTimeId: 'test-reminder',
            scheduledTime: new Date().toISOString(),
          });
        }, 2000);
      },
      { confirmText: language === 'tr' ? 'Başlat' : 'Start', cancelText: t('cancel') }
    );
  }, [language, navigation, t, showConfirm]);

  const handleScheduleTestAlarm = useCallback(
    async (minutes: number) => {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        showAlert({
          type: 'warning',
          title: t('settings_notification_permission'),
          message:
            language === 'tr'
              ? 'Bildirimlerin çalışması için izin vermeniz gerekiyor.'
              : 'You need to grant permission for notifications to work.',
          buttons: [
            { text: t('cancel'), style: 'cancel' },
            { text: t('settings_open_settings'), onPress: () => Linking.openSettings() },
          ],
        });
        return;
      }

      try {
        await scheduleTestAlarmNotification(minutes, language);
        const scheduledTime = new Date(Date.now() + minutes * 60 * 1000);
        const timeStr = format(scheduledTime, 'HH:mm:ss');

        // Saniye veya dakika olarak göster
        const seconds = Math.round(minutes * 60);
        const timeDisplay =
          seconds < 60
            ? language === 'tr'
              ? `${seconds} saniye`
              : `${seconds} seconds`
            : language === 'tr'
              ? `${minutes} dakika`
              : `${minutes} minutes`;

        showSuccess(
          language === 'tr' ? 'Alarm Planlandı' : 'Alarm Scheduled',
          language === 'tr'
            ? `Test alarmı saat ${timeStr} (${timeDisplay} sonra) çalacak.\n\nTelefonu sessiz moda alarak test edebilirsiniz.`
            : `Test alarm will ring at ${timeStr} (in ${timeDisplay}).\n\nYou can test by putting your phone in silent mode.`
        );
      } catch (error: unknown) {
        log.error('Test alarm planlama hatası', error);
        const errorObj = error as { message?: string };
        const errorMessage = errorObj?.message || String(error) || 'Bilinmeyen hata';
        showError(
          t('error'),
          language === 'tr'
            ? `Alarm planlanamadı.\n\nHata: ${errorMessage}`
            : `Failed to schedule alarm.\n\nError: ${errorMessage}`
        );
      }
    },
    [language, t, showAlert, showSuccess, showError]
  );

  const handleSync = useCallback(async () => {
    try {
      await syncToCloud();
      showSuccess(
        t('success'),
        language === 'tr'
          ? 'Verileriniz buluta yedeklendi.'
          : 'Your data has been backed up to cloud.'
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : language === 'tr'
            ? 'Senkronizasyon başarısız oldu.'
            : 'Sync failed.';
      showError(t('error'), errorMessage);
    }
  }, [language, syncToCloud, t, showSuccess, showError]);

  // Test ilacı ekle (1 dakika sonraya alarm)
  const handleAddTestMedicine = useCallback(async () => {
    // Random seçimler
    const randomName = TEST_MEDICINE_NAMES[Math.floor(Math.random() * TEST_MEDICINE_NAMES.length)];
    const randomDose = TEST_MEDICINE_DOSES[Math.floor(Math.random() * TEST_MEDICINE_DOSES.length)];
    const randomInstruction =
      TEST_INSTRUCTIONS[Math.floor(Math.random() * TEST_INSTRUCTIONS.length)];
    const randomColor = `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, '0')}`;

    // 1 dakika sonrası için saat hesapla
    const alarmTime = new Date(Date.now() + 60 * 1000);
    const timeStr = format(alarmTime, 'HH:mm');

    const testMedicineName = `TEST-${randomName}`;

    // İlaç etkileşim kontrolü
    const activeMedicineNames = medicines.filter(m => m.isActive).map(m => m.name);
    const allDrugNames = [...activeMedicineNames, testMedicineName];

    const interactionResult = checkMultipleInteractions(allDrugNames);

    // Belirli bir saat icin cakisma kontrolu
    const checkTimeConflictForTime = (
      targetTime: string
    ): { medicineName: string; time: string }[] => {
      const conflicts: { medicineName: string; time: string }[] = [];

      for (const medicine of medicines) {
        if (!medicine.isActive) continue;

        const medicineReminderTimes = reminderTimes.filter(rt => rt.medicineId === medicine.id);

        for (const rt of medicineReminderTimes) {
          if (rt.time === targetTime) {
            conflicts.push({
              medicineName: medicine.name,
              time: rt.time,
            });
          }
        }
      }

      return conflicts;
    };

    // Saat cakismasi kontrolu - tum cakisan saatleri bulur
    const checkTimeConflict = (): { hasConflict: boolean; conflictMessages: string } => {
      const existingConflicts = checkTimeConflictForTime(timeStr);

      if (existingConflicts.length === 0) {
        return { hasConflict: false, conflictMessages: '' };
      }

      const messages = existingConflicts.map(c => `⏰ ${c.time} - ${c.medicineName}`).join('\n');

      return { hasConflict: true, conflictMessages: messages };
    };

    // Cakismayan ilk saati bul (maksimum 5 dakika ileriye kadar)
    const findNonConflictingTime = (
      baseTime: string
    ): { time: string; offsetMinutes: number } | null => {
      const [hours, mins] = baseTime.split(':').map(Number);
      const baseDate = new Date();
      baseDate.setHours(hours, mins, 0, 0);

      // Maksimum 5 dakika ileriye kadar dene
      for (let offset = 1; offset <= 5; offset++) {
        const candidateDate = new Date(baseDate.getTime() + offset * 60 * 1000);
        const candidateTime = format(candidateDate, 'HH:mm');
        const conflicts = checkTimeConflictForTime(candidateTime);

        if (conflicts.length === 0) {
          return { time: candidateTime, offsetMinutes: offset };
        }
      }

      // 5 dakika icinde cakismayan saat bulunamadi
      return null;
    };

    const doAddMedicine = async () => {
      // Test ilacı ekle
      const medicineId = addMedicine({
        name: testMedicineName,
        dosage: randomDose,
        frequency: 1,
        instructions: randomInstruction,
        color: randomColor,
        customTimes: [timeStr],
        startDate: new Date().toISOString(),
      });

      // Bildirim izni ve planlama
      const hasPermission = await requestNotificationPermissions();
      if (hasPermission) {
        // ReminderTime'ı bul ve bildirim planla
        const newReminderTimes = useMedicineStore.getState().reminderTimes;
        const reminderTime = newReminderTimes.find(rt => rt.medicineId === medicineId);
        const medicine = useMedicineStore.getState().getMedicineById(medicineId);

        if (reminderTime && medicine) {
          await scheduleMedicineNotification(medicine, reminderTime, true, true);
        }
      }

      showSuccess(
        language === 'tr' ? 'Test İlacı Eklendi' : 'Test Medicine Added',
        language === 'tr'
          ? `${randomName} (${randomDose}) eklendi.\n\nAlarm: ${timeStr} (1 dakika sonra)`
          : `${randomName} (${randomDose}) added.\n\nAlarm: ${timeStr} (in 1 minute)`
      );
    };

    // 1 dakika sonraya ekle fonksiyonu
    const doAddMedicineWithOffset = async (offsetMinutes: number) => {
      const newAlarmTime = new Date(Date.now() + (60 + offsetMinutes * 60) * 1000);
      const newTimeStr = format(newAlarmTime, 'HH:mm');

      const medicineId = addMedicine({
        name: testMedicineName,
        dosage: randomDose,
        frequency: 1,
        instructions: randomInstruction,
        color: randomColor,
        customTimes: [newTimeStr],
        startDate: new Date().toISOString(),
      });

      const hasPermission = await requestNotificationPermissions();
      if (hasPermission) {
        const newReminderTimes = useMedicineStore.getState().reminderTimes;
        const reminderTime = newReminderTimes.find(rt => rt.medicineId === medicineId);
        const medicine = useMedicineStore.getState().getMedicineById(medicineId);

        if (reminderTime && medicine) {
          await scheduleMedicineNotification(medicine, reminderTime, true, true);
        }
      }

      showSuccess(
        language === 'tr' ? 'Test İlacı Eklendi' : 'Test Medicine Added',
        language === 'tr'
          ? `${randomName} (${randomDose}) eklendi.\n\nAlarm: ${newTimeStr} (${1 + offsetMinutes} dakika sonra)`
          : `${randomName} (${randomDose}) added.\n\nAlarm: ${newTimeStr} (in ${1 + offsetMinutes} minutes)`
      );
    };

    // Saat cakismasi kontrolu ile devam eden fonksiyon
    const proceedWithTimeConflictCheck = async () => {
      const timeConflictResult = checkTimeConflict();

      if (timeConflictResult.hasConflict) {
        // Cakismayan ilk saati bul (maksimum 5 dakika ileriye kadar)
        const nonConflictingResult = findNonConflictingTime(timeStr);

        if (nonConflictingResult) {
          // Cakismayan saat bulundu
          const { time: suggestedTime, offsetMinutes } = nonConflictingResult;

          showAlert({
            type: 'warning',
            title: language === 'tr' ? 'Saat Çakışması Tespit Edildi' : 'Time Conflict Detected',
            message: `${language === 'tr' ? 'Bu ilaç aşağıdaki ilaçlarla aynı saate denk geliyor:' : 'This medicine conflicts with the following medicines:'}\n\n${timeConflictResult.conflictMessages}\n\n${language === 'tr' ? 'Ne yapmak istersiniz?' : 'What would you like to do?'}`,
            buttons: [
              { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
              {
                text: language === 'tr' ? `${suggestedTime}'e Ekle` : `Add at ${suggestedTime}`,
                onPress: () => doAddMedicineWithOffset(offsetMinutes),
              },
              {
                text: language === 'tr' ? 'Yine de Ekle' : 'Add Anyway',
                style: 'destructive',
                onPress: doAddMedicine,
              },
            ],
          });
        } else {
          // 5 dakika icinde cakismayan saat bulunamadi
          showAlert({
            type: 'warning',
            title: language === 'tr' ? 'Saat Çakışması Tespit Edildi' : 'Time Conflict Detected',
            message: `${language === 'tr' ? 'Bu ilaç aşağıdaki ilaçlarla aynı saate denk geliyor:' : 'This medicine conflicts with the following medicines:'}\n\n${timeConflictResult.conflictMessages}\n\n${language === 'tr' ? '5 dakika içinde uygun boş saat bulunamadı.' : 'No available time slot found within 5 minutes.'}`,
            buttons: [
              { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
              {
                text: language === 'tr' ? 'Yine de Ekle' : 'Add Anyway',
                style: 'destructive',
                onPress: doAddMedicine,
              },
            ],
          });
        }
      } else {
        await doAddMedicine();
      }
    };

    // Önce ilaç etkileşimi kontrolü
    if (interactionResult.hasInteractions) {
      const interactionMessages = interactionResult.interactions
        .map(i => `${getSeverityIcon(i.severity)} ${i.drug1} + ${i.drug2}\n${i.description}`)
        .join('\n\n');

      showAlert({
        type: 'warning',
        title: language === 'tr' ? 'İlaç Etkileşimi Tespit Edildi' : 'Drug Interaction Detected',
        message: `${interactionMessages}\n\n${language === 'tr' ? 'Yine de eklemek istiyor musunuz?' : 'Do you still want to add this medicine?'}`,
        buttons: [
          { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
          {
            text: language === 'tr' ? 'Yine de Ekle' : 'Add Anyway',
            style: 'destructive',
            onPress: proceedWithTimeConflictCheck,
          },
        ],
      });
    } else {
      await proceedWithTimeConflictCheck();
    }
  }, [addMedicine, language, medicines, reminderTimes, showSuccess, showAlert]);

  // Test ilaçlarını sil (TEST- prefix'li olanlar)
  const handleDeleteTestMedicines = useCallback(() => {
    const testMedicines = medicines.filter(m => m.name.startsWith('TEST-'));

    if (testMedicines.length === 0) {
      showInfo(
        language === 'tr' ? 'Bilgi' : 'Info',
        language === 'tr' ? 'Silinecek test ilacı yok.' : 'No test medicines to delete.'
      );
      return;
    }

    showConfirm(
      language === 'tr' ? 'Test İlaçlarını Sil' : 'Delete Test Medicines',
      language === 'tr'
        ? `${testMedicines.length} adet test ilacı silinecek. Emin misiniz?`
        : `${testMedicines.length} test medicines will be deleted. Are you sure?`,
      () => {
        testMedicines.forEach(m => deleteMedicine(m.id));
        showSuccess(
          t('success'),
          language === 'tr'
            ? `${testMedicines.length} test ilacı silindi.`
            : `${testMedicines.length} test medicines deleted.`
        );
      },
      {
        confirmText: language === 'tr' ? 'Sil' : 'Delete',
        cancelText: language === 'tr' ? 'İptal' : 'Cancel',
        destructive: true,
      }
    );
  }, [medicines, deleteMedicine, language, t, showInfo, showConfirm, showSuccess]);

  const handleShowScheduledNotifications = useCallback(async () => {
    try {
      const triggerIds = await notifee.getTriggerNotificationIds();
      const displayedNotifs = await notifee.getDisplayedNotifications();

      const medicineInfo = medicines
        .map(m => {
          const times = reminderTimes.filter(rt => rt.medicineId === m.id);
          return `${m.name}: ${times.map(t => t.time).join(', ')}`;
        })
        .join('\n');

      const triggerInfo =
        triggerIds.length > 0
          ? triggerIds.join('\n')
          : language === 'tr'
            ? 'Hiç planlanmış bildirim yok!'
            : 'No scheduled notifications!';

      showInfo(
        language === 'tr' ? 'Debug Bilgisi' : 'Debug Info',
        `${language === 'tr' ? 'İlaçlar' : 'Medicines'} (${medicines.length}):\n${medicineInfo || 'Yok'}\n\n` +
          `${language === 'tr' ? 'Planlanmış Bildirimler' : 'Scheduled Notifications'} (${triggerIds.length}):\n${triggerInfo}\n\n` +
          `${language === 'tr' ? 'Görüntülen Bildirimler' : 'Displayed Notifications'}: ${displayedNotifs.length}`
      );
    } catch (error) {
      log.error('Debug bilgisi alınamadı', error);
      showError('Error', String(error));
    }
  }, [medicines, reminderTimes, language, showInfo, showError]);

  const handleLogout = useCallback(() => {
    showConfirm(
      language === 'tr' ? 'Çıkış Yap' : 'Logout',
      language === 'tr'
        ? 'Hesabınızdan çıkış yapmak istediğinize emin misiniz?'
        : 'Are you sure you want to logout?',
      async () => {
        try {
          await syncToCloud();
          await logout();
        } catch (error) {
          log.error('Logout error', error);
        }
      },
      {
        confirmText: language === 'tr' ? 'Çıkış Yap' : 'Logout',
        cancelText: t('cancel'),
        destructive: true,
      }
    );
  }, [language, logout, syncToCloud, t, showConfirm]);

  const formatLastSync = useCallback(() => {
    if (!lastSyncAt) {
      return language === 'tr' ? 'Henüz senkronize edilmedi' : 'Never synced';
    }
    const date = new Date(lastSyncAt);
    return format(date, 'dd.MM.yyyy HH:mm');
  }, [language, lastSyncAt]);

  const formatTimeDisplay = useCallback((time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }, []);

  const getThemeLabel = useCallback(
    (themeValue: ThemeMode) => {
      switch (themeValue) {
        case 'light':
          return t('settings_theme_light');
        case 'dark':
          return t('settings_theme_dark');
        case 'system':
          return t('settings_theme_system');
      }
    },
    [t]
  );

  const getLanguageLabel = useCallback((lang: Language) => {
    return lang === 'tr' ? 'Türkçe' : 'English';
  }, []);

  return {
    navigation,
    colors,
    isDark,
    theme,
    setTheme,
    language,
    setLanguage,
    t,
    settings,
    updateSettings,
    isSyncing,
    user,
    isPremium,
    remainingDays,
    pickerState,
    togglePicker,
    closePicker,
    parseTimeToDate,
    handleTimeChange,
    handleTestNotification,
    handleTestVoice,
    handleTestFullScreenAlarm,
    handleScheduleTestAlarm,
    handleAddTestMedicine,
    handleDeleteTestMedicines,
    handleShowScheduledNotifications,
    handleSync,
    handleLogout,
    formatLastSync,
    formatTimeDisplay,
    getThemeLabel,
    getLanguageLabel,
  };
}
