import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, differenceInDays, startOfDay, parseISO } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { useMedicineStore } from '../stores/medicineStore';
import { RootStackParamList, Medicine } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useUserProfile } from '../hooks/useUserProfile';
import { InlineAdBanner } from '../components/common/AdBanner';
import { scheduleSnoozeNotification } from '../utils/notifications';
import { formatTimeDisplay } from '../utils/timeCalculator';
import { getRelativeTimeText } from './HomeScreen/helpers';
import { getUniqueMedicineCount } from '../stores/helpers/reminderStats';
import {
  checkAndShowPersistentNotifications,
  dismissAllPersistentNotifications,
} from '../utils/persistentNotification';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('HomeScreen');
import { refreshWidget } from '../services/widgetService';
import { useAlert } from '../contexts/AlertContext';
import { CircularProgress } from '../components/common/CircularProgress';
import { LowStockCard } from '../components/common/LowStockCard';
import { useLowStockDismiss, computeLowStockHash } from '../hooks/useLowStockDismiss';

// Sprint 4.2: HomeScreen.tsx (1962 -> ~1400 satir) modularizasyonu.
// Component'ler ve helper'lar screens/HomeScreen/* altinda.
import { CurrentDoseCard } from './HomeScreen/components/CurrentDoseCard';
import { TimelineItem } from './HomeScreen/components/TimelineItem';
import type { TodayReminder } from './HomeScreen/types';
import { HomeScreenLayoutSwitcher } from '../components/layouts/HomeScreenLayoutSwitcher';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type FilterTab = 'all' | 'pending' | 'taken' | 'missed';

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { profile, isLoading: profileLoading } = useUserProfile();

  // Tab State
  const [activeTab, setActiveTab] = useState<FilterTab>('pending');
  const { language } = useLanguage();
  const { user } = useAuth();
  // canAddMedicine/showAlert — Sprint 19'da handleAddMedicine ile birlikte kaldirildi.
  // Bu satirlar gelecekte premium gating veya alarm ekleme ozelliklerinde kullanilabilir.
  // eslint-disable-next-line unused-imports/no-unused-vars
  const { canAddMedicine } = useSubscription();
  const { isPremium } = useSubscription();
  // eslint-disable-next-line unused-imports/no-unused-vars
  const { showAlert, showSuccess, showError } = useAlert();
  const [refreshing, setRefreshing] = useState(false);
  const [expiryModalVisible, setExpiryModalVisible] = useState(false);
  const [expiringMedicines, setExpiringMedicines] = useState<Medicine[]>([]);
  const [expiryWarningShown, setExpiryWarningShown] = useState(false); // Session'da bir kere göster

  const dateLocale = language === 'tr' ? tr : enUS;

  // Zustand state'lerini ayrı selector'lar ile çek - bu re-render'ı garanti eder
  const medicines = useMedicineStore(state => state.medicines);
  const reminderTimes = useMedicineStore(state => state.reminderTimes);
  const medicineLogs = useMedicineStore(state => state.medicineLogs);
  const settings = useMedicineStore(state => state.settings);

  // Fonksiyonları ayrı çek
  const getTodayReminders = useMedicineStore(state => state.getTodayReminders);
  const logMedicineTaken = useMedicineStore(state => state.logMedicineTaken);
  const logMedicineSkipped = useMedicineStore(state => state.logMedicineSkipped);
  const getAdherenceRate = useMedicineStore(state => state.getAdherenceRate);
  const getCurrentStreak = useMedicineStore(state => state.getCurrentStreak);
  const createSnooze = useMedicineStore(state => state.createSnooze);
  const getLowStockMedicines = useMedicineStore(state => state.getLowStockMedicines);
  const snoozes = useMedicineStore(state => state.snoozes);

  // Stok uyarısı - memoize edildi
  // getLowStockMedicines zaten medicines'i icinden okur (zustand state selector)
  const lowStockMedicines = useMemo(() => getLowStockMedicines(), [getLowStockMedicines]);

  // Sprint 65A: Stok uyarısı persistent dismiss — hash ile auto-invalidation
  const { checkDismissed, dismiss: dismissLowStock } = useLowStockDismiss();
  const lowStockHash = useMemo(
    () => computeLowStockHash(lowStockMedicines.map(m => ({ id: m.id, stockCount: m.stockCount }))),
    [lowStockMedicines]
  );
  const isLowStockDismissed = checkDismissed(lowStockHash);

  // Son kullanma tarihi uyarısı kontrolü
  useEffect(() => {
    // Session'da zaten gösterildiyse tekrar gösterme
    if (expiryWarningShown) return;

    const checkExpiringMedicines = () => {
      const today = startOfDay(new Date());
      const expiring = medicines.filter(medicine => {
        if (!medicine.expiryDate || !medicine.isActive) return false;

        const expiryDate = startOfDay(parseISO(medicine.expiryDate));
        const daysLeft = differenceInDays(expiryDate, today);
        const reminderDays = medicine.expiryReminderDays || 30;

        // Hatırlatma zamanı geldiyse veya süresi geçtiyse
        return daysLeft <= reminderDays;
      });

      if (expiring.length > 0) {
        setExpiringMedicines(expiring);
        setExpiryModalVisible(true);
        setExpiryWarningShown(true); // Bir kere gösterildi, tekrar gösterme
      }
    };

    // Sadece uygulama açıldığında kontrol et
    const timer = setTimeout(checkExpiringMedicines, 1000);
    return () => clearTimeout(timer);
  }, [medicines, expiryWarningShown]);

  // Kalıcı bildirim kontrolü - ilaç alınana kadar bildirim göster
  // SADECE uygulama arka plandayken göster, ön plandayken kaldır
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

    // Uygulama ön plandayken kalıcı bildirimi kaldır
    // Arka plana geçtiğinde tekrar göster
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Uygulama açık — kalıcı bildirimi kaldır
        dismissAllPersistentNotifications();
        // Widget'ı yenile
        refreshWidget();
      } else if (nextAppState === 'background') {
        // Uygulama arka plana geçti — bekleyen ilaç varsa bildirim göster
        checkPendingMedicines();
      }
    };

    // İlk açılışta kalıcı bildirimi kaldır (uygulama zaten açık)
    dismissAllPersistentNotifications();

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [medicines, reminderTimes, medicineLogs, settings.persistentNotificationEnabled]);

  // useMemo ile hesaplamaları optimize et
  // getTodayReminders/getAdherenceRate/getCurrentStreak zustand state selector — kendi içlerinde
  // medicines/reminderTimes/medicineLogs okur, bu nedenle dependency gerekmez.
  const todayReminders = useMemo(() => {
    return getTodayReminders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medicines, reminderTimes, medicineLogs]);

  // adherenceRate ve currentStreak de memoize edildi - performans için
  const _adherenceRate = useMemo(() => getAdherenceRate(7), [getAdherenceRate]);

  const currentStreak = useMemo(() => getCurrentStreak(), [getCurrentStreak]);

  const today = format(new Date(), 'dd MMMM yyyy, EEEE', { locale: dateLocale });
  const currentTime = format(new Date(), 'HH:mm');

  // currentReminder'ı memoize et - performans için
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
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const reminder = todayReminders.find(r => r.reminderTime.id === reminderTimeId);
      if (reminder) {
        const scheduledTime = `${todayStr}T${reminder.reminderTime.time}:00`;
        logMedicineTaken(reminderTimeId, scheduledTime, reminder.medicine.id);
      }
    },
    [todayReminders, logMedicineTaken]
  );

  const handleSkip = useCallback(
    (reminderTimeId: string) => {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const reminder = todayReminders.find(r => r.reminderTime.id === reminderTimeId);
      if (reminder) {
        const scheduledTime = `${todayStr}T${reminder.reminderTime.time}:00`;
        logMedicineSkipped(reminderTimeId, scheduledTime, reminder.medicine.id);
      }
    },
    [todayReminders, logMedicineSkipped]
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

  // İstatistikleri memoize et - her render'da yeniden hesaplamayı önle
  const { completedCount, totalCount, remainingCount, uniqueMedicineCount } = useMemo(() => {
    const total = todayReminders.length;
    const completed = todayReminders.filter(r => r.log?.status === 'taken').length;
    const skipped = todayReminders.filter(r => r.log?.status === 'skipped').length;
    return {
      totalCount: total,
      completedCount: completed,
      remainingCount: total - completed - skipped,
      uniqueMedicineCount: getUniqueMedicineCount(todayReminders),
    };
  }, [todayReminders]);

  const firstName = user?.displayName?.split(' ')[0] || '';

  // Sprint 73B: Time-based greeting + dynamic date
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
      // "This week" check
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

  // Saat dilimine göre selamlama ikonu
  const _getGreetingIcon = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return '🌅'; // Sabah
    if (hour >= 12 && hour < 17) return '☀️'; // Öğlen
    if (hour >= 17 && hour < 21) return '🌆'; // Akşam
    return '🌙'; // Gece
  };

  // İlerleme yüzdesi
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filter timeline based on active tab + deduplicate "Şu An" card (item 3)
  const filteredTimeline = useMemo(() => {
    return todayReminders.filter(reminder => {
      // Eğer "Şu An" kartında gösteriliyorsa listeden gizle (tekrarsızlık)
      if (currentReminder && reminder.reminderTime.id === currentReminder.reminderTime.id) {
        return false;
      }

      if (activeTab === 'all') return true;

      const logStatus = reminder.log?.status;
      const isTaken = logStatus === 'taken';
      const isSkipped = logStatus === 'skipped';
      const isCompleted = isTaken || isSkipped; // İkisi de "bekleyen" olmaktan çıkarır

      const reminderDate = new Date();
      reminderDate.setHours(
        parseInt(reminder.reminderTime.time.split(':')[0], 10),
        parseInt(reminder.reminderTime.time.split(':')[1], 10),
        0,
        0
      );
      const isPastDue = new Date() > reminderDate;

      // status = taken ise "alınanlar"
      // durumu alınmamış ve zamanı geçmiş veya atlanmışsa "Atlananlar/Kaçırılanlar" (missed)
      // durumu alınmamış, atlanmamış ve zamanı geçmemişse "Bekleyenler"

      if (activeTab === 'taken') return isTaken;
      if (activeTab === 'missed') return isSkipped || (!isCompleted && isPastDue);
      if (activeTab === 'pending') return !isCompleted && !isPastDue;
      return true;
    });
  }, [todayReminders, activeTab, currentReminder]);

  // Zaman dilimlerine göre gruplandır (item 1)
  type TimeSlot = { key: string; emoji: string; label: string; items: TodayReminder[] };
  const groupedTimeline = useMemo((): TimeSlot[] => {
    const slots: TimeSlot[] = [
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

    return slots.filter(s => s.items.length > 0);
  }, [filteredTimeline, language]);

  // Collapsible zaman dilimi state'i — hangi slotlar açık
  const [expandedSlots, setExpandedSlots] = useState<Record<string, boolean>>({});

  // Aktif zaman dilimini bul (şu anki saate göre)
  const activeSlotKey = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'noon';
    if (hour < 21) return 'evening';
    return 'night';
  }, []);

  // Sonraki bekleyen zaman dilimini bul
  const nextPendingSlotKey = useMemo(() => {
    const slotOrder = ['morning', 'noon', 'evening', 'night'];
    const activeIdx = slotOrder.indexOf(activeSlotKey);
    for (let i = activeIdx + 1; i < slotOrder.length; i++) {
      const slot = groupedTimeline.find(s => s.key === slotOrder[i]);
      if (slot && slot.items.some(r => !r.log)) return slotOrder[i];
    }
    return null;
  }, [groupedTimeline, activeSlotKey]);

  // Slot açık mı kontrolü: aktif slot + sonraki bekleyen slot varsayılan açık
  const isSlotExpanded = useCallback(
    (slotKey: string) => {
      if (expandedSlots[slotKey] !== undefined) return expandedSlots[slotKey];
      // Varsayılan: aktif zaman dilimi ve sonraki bekleyen açık, geri kalan kapalı
      return slotKey === activeSlotKey || slotKey === nextPendingSlotKey;
    },
    [expandedSlots, activeSlotKey, nextPendingSlotKey]
  );

  const toggleSlot = useCallback(
    (slotKey: string) => {
      setExpandedSlots(prev => ({ ...prev, [slotKey]: !isSlotExpanded(slotKey) }));
    },
    [isSlotExpanded]
  );

  // Sprint 58.5: Layout B (Detaylı) için erken return — 7 MD3 kart
  if (!profileLoading && profile.layout === 'B') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <HomeScreenLayoutSwitcher
          reminder={currentReminder}
          reminders={todayReminders}
          adherence={_adherenceRate}
          streak={currentStreak}
          completedCount={completedCount}
          totalCount={totalCount}
          remainingCount={remainingCount}
          lowStockMedicines={lowStockMedicines}
          isPremium={isPremium}
          onTake={() => currentReminder && handleTake(currentReminder.reminderTime.id)}
          onSnooze={minutes => currentReminder && handleSnooze(currentReminder, minutes)}
          onSkip={() => currentReminder && handleSkip(currentReminder.reminderTime.id)}
          onAddPress={() => navigation.navigate('AddMedicine' as never)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Hero Card - Gradient Karşılama */}
        <View style={[styles.heroCard, { backgroundColor: colors.card }]}>
          {/* Üst Kısım: Selamlama + Uyum Oranı */}
          <View style={styles.heroTop}>
            <View style={styles.heroLeft}>
              <View style={styles.greetingRow}>
                <Text style={[styles.heroGreeting, { color: colors.text }]}>{greeting}</Text>
                <View style={[styles.todayBadge, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.todayBadgeText, { color: colors.primary }]}>
                    {language === 'tr' ? 'Bugün' : 'Today'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.heroDate, { color: colors.textMuted }]}>{dynamicDate}</Text>
            </View>

            {/* Uyum Oranı Circular Progress */}
            <View style={styles.progressContainer}>
              <CircularProgress
                percentage={progressPercent}
                size={70}
                strokeWidth={8}
                progressColor={colors.primary}
                trackColor={isDark ? 'rgba(255, 255, 255, 0.1)' : '#E8F4F4'}
                textColor={colors.primary}
                backgroundColor={isDark ? 'rgba(255, 255, 255, 0.05)' : '#F0F9F9'}
              />
              <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
                {language === 'tr' ? 'Uyum oranı' : 'Adherence'}
              </Text>
            </View>
          </View>

          {/* Stats Row */}
          <View style={[styles.heroStats, { backgroundColor: colors.background }]}>
            <View style={styles.heroStatItem}>
              <View style={[styles.heroStatIcon, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.heroStatValue, { color: colors.text }]}>
                  {totalCount} {language === 'tr' ? 'doz' : 'doses'}
                </Text>
                <Text style={[styles.heroStatLabel, { color: colors.textMuted }]}>
                  {language === 'tr'
                    ? `Bugün · ${uniqueMedicineCount} ${uniqueMedicineCount === 1 ? 'ilaç' : 'ilaç'}`
                    : `Today · ${uniqueMedicineCount} med`}
                </Text>
              </View>
            </View>

            <View style={[styles.heroStatDivider, { backgroundColor: colors.border }]} />

            <View style={styles.heroStatItem}>
              <View
                style={[
                  styles.heroStatIcon,
                  { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.2)' : '#DCFCE7' },
                ]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color={isDark ? '#34D399' : '#16A34A'}
                />
              </View>
              <View>
                <Text style={[styles.heroStatValue, { color: isDark ? '#34D399' : '#16A34A' }]}>
                  {completedCount}
                </Text>
                <Text style={[styles.heroStatLabel, { color: colors.textMuted }]}>
                  {language === 'tr' ? 'Alındı' : 'Taken'}
                </Text>
              </View>
            </View>

            <View style={[styles.heroStatDivider, { backgroundColor: colors.border }]} />

            <View style={styles.heroStatItem}>
              <View
                style={[
                  styles.heroStatIcon,
                  { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7' },
                ]}
              >
                <Ionicons name="time-outline" size={18} color={isDark ? '#F59E0B' : '#D97706'} />
              </View>
              <View>
                <Text style={[styles.heroStatValue, { color: isDark ? '#F59E0B' : '#D97706' }]}>
                  {remainingCount}
                </Text>
                <Text style={[styles.heroStatLabel, { color: colors.textMuted }]}>
                  {language === 'tr' ? 'Bekleyen' : 'Pending'}
                </Text>
              </View>
            </View>
          </View>

          {/* Sonraki İlaç Bilgisi */}
          {currentReminder && (
            <View style={[styles.nextMedicineRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.nextMedicineText, { color: colors.textMuted }]}>
                {language === 'tr' ? 'Sonraki Doz:' : 'Next Dose:'}{' '}
                <Text style={[styles.nextMedicineTime, { color: colors.text }]}>
                  {formatTimeDisplay(currentReminder.reminderTime.time)}
                </Text>
                {' • '}
                <Text style={{ color: colors.text }}>{currentReminder.medicine.name}</Text>
              </Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('AddMedicine', { medicineId: currentReminder.medicine.id })
                }
              >
                <Text style={[styles.quickEditText, { color: colors.primary }]}>
                  {language === 'tr' ? 'Hızlı düzenle' : 'Quick edit'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {currentStreak > 0 && (
          <LinearGradient
            colors={['#F59E0B', '#F97316']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.streakCard}
          >
            <View style={styles.streakContent}>
              <View style={styles.streakIconBox}>
                <Text style={styles.streakIconEmoji}>🔥</Text>
              </View>
              <View style={styles.streakTextContainer}>
                <Text style={styles.streakTitle}>
                  {currentStreak} {language === 'tr' ? 'Gün Seri!' : 'Day Streak!'}
                </Text>
                <Text style={styles.streakSubtitle}>
                  {currentStreak >= 7
                    ? language === 'tr'
                      ? 'Muhteşem gidiyorsun!'
                      : "You're doing amazing!"
                    : language === 'tr'
                      ? 'Devam et!'
                      : 'Keep it up!'}
                </Text>
              </View>
            </View>
          </LinearGradient>
        )}

        {/* Stok Uyarısı (Sprint 65A: persistent dismiss) */}
        {lowStockMedicines.length > 0 && !isLowStockDismissed && (
          <LowStockCard
            medicines={lowStockMedicines}
            onPress={() => navigation.navigate('Medicines' as never)}
            onDismiss={() => dismissLowStock(lowStockHash)}
          />
        )}

        {currentReminder && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>💊</Text>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                {language === 'tr' ? 'ŞU AN' : 'CURRENT'}
              </Text>
            </View>
            <CurrentDoseCard
              reminder={currentReminder}
              colors={colors}
              isDark={isDark}
              language={language}
              onTake={() => handleTake(currentReminder.reminderTime.id)}
              onSnooze={minutes => handleSnooze(currentReminder, minutes)}
              onSkip={() => handleSkip(currentReminder.reminderTime.id)}
            />
          </View>
        )}

        <InlineAdBanner />

        <View style={styles.sectionContainer}>
          {/* Bugünün Planı & Filtreler */}
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="calendar-outline" size={18} color={isDark ? '#F59E0B' : '#D97706'} />
              <Text style={[styles.sectionTitle, { color: isDark ? '#F59E0B' : '#D97706' }]}>
                {language === 'tr' ? 'BUGÜNÜN PLANI' : "TODAY'S PLAN"}
              </Text>
            </View>
          </View>

          {/* Filtre Tabları */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterTabsContainer}
          >
            {[
              { id: 'all', label: language === 'tr' ? 'Tümü' : 'All' },
              { id: 'pending', label: language === 'tr' ? 'Bekleyenler' : 'Pending' },
              { id: 'taken', label: language === 'tr' ? 'Alınanlar' : 'Taken' },
              { id: 'missed', label: language === 'tr' ? 'Atlananlar' : 'Missed' },
            ].map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.filterTab,
                  activeTab === tab.id && { backgroundColor: colors.primary },
                  activeTab !== tab.id && {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6',
                  },
                ]}
                onPress={() => setActiveTab(tab.id as FilterTab)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    activeTab === tab.id ? { color: '#fff' } : { color: colors.textMuted },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* İlaç Listesi — Zaman Dilimine Göre Gruplandırılmış */}
          <View style={[styles.medicineList, { paddingHorizontal: 16 }]}>
            {filteredTimeline.length === 0 ? (
              <View
                style={[
                  styles.emptyState,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name={
                    activeTab === 'taken'
                      ? 'checkmark-circle-outline'
                      : activeTab === 'missed'
                        ? 'happy-outline'
                        : 'calendar-clear-outline'
                  }
                  size={48}
                  color={colors.textMuted}
                />
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                  {activeTab === 'taken'
                    ? language === 'tr'
                      ? 'Henüz ilaç almadınız'
                      : 'No medicines taken yet'
                    : activeTab === 'missed'
                      ? language === 'tr'
                        ? 'Harika! Atlanan ilaç yok'
                        : 'Great! No missed medicines'
                      : activeTab === 'pending'
                        ? language === 'tr'
                          ? 'Bekleyen ilaç yok'
                          : 'No pending medicines'
                        : language === 'tr'
                          ? 'Bugün için planlanmış ilaç yok'
                          : 'No medicines scheduled for today'}
                </Text>
                {activeTab === 'all' && (
                  <Text style={[styles.emptyStateDesc, { color: colors.textMuted }]}>
                    {language === 'tr'
                      ? "İlaç eklemek için alttaki '+' butonunu kullanabilirsiniz."
                      : "Use the '+' button below to add a medicine."}
                  </Text>
                )}
              </View>
            ) : (
              groupedTimeline.map(slot => {
                const slotTaken = slot.items.filter(r => r.log?.status === 'taken').length;
                const slotTotal = slot.items.length;
                const slotDone = slotTaken === slotTotal;
                const todayStr = format(new Date(), 'yyyy-MM-dd');
                const expanded = isSlotExpanded(slot.key);
                return (
                  <View key={slot.key} style={styles.timeSlotGroup}>
                    {/* Zaman Dilimi Başlığı — Tıklanabilir */}
                    <TouchableOpacity
                      style={[styles.timeSlotHeader, { borderBottomColor: colors.border }]}
                      onPress={() => toggleSlot(slot.key)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.timeSlotLeft}>
                        <Text style={styles.timeSlotEmoji}>{slot.emoji}</Text>
                        <Text style={[styles.timeSlotLabel, { color: colors.textSecondary }]}>
                          {slot.label}
                        </Text>
                        <Ionicons
                          name={expanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={colors.textMuted}
                        />
                      </View>
                      <View
                        style={[
                          styles.timeSlotProgress,
                          { backgroundColor: slotDone ? '#10B98115' : colors.primary + '15' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.timeSlotProgressText,
                            { color: slotDone ? '#10B981' : colors.primary },
                          ]}
                        >
                          {slotTaken}/{slotTotal} {slotDone ? '✓' : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    {/* Slot Öğeleri — Collapsible */}
                    {expanded &&
                      slot.items.map((reminder, index) => {
                        const activeSnooze = snoozes.find(
                          s =>
                            s.medicineId === reminder.medicine.id &&
                            s.reminderTimeId === reminder.reminderTime.id &&
                            s.isActive &&
                            s.originalScheduledTime.startsWith(todayStr)
                        );
                        return (
                          <TimelineItem
                            key={reminder.reminderTime.id}
                            reminder={reminder}
                            colors={colors}
                            language={language}
                            onTakeNow={() => handleTake(reminder.reminderTime.id)}
                            isFirst={index === 0}
                            hasActiveSnooze={!!activeSnooze}
                            snoozeTriggerTime={activeSnooze?.triggerTime ?? null}
                          />
                        );
                      })}
                  </View>
                );
              })
            )}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Son Kullanma Tarihi Uyarı Modal */}
      <Modal
        visible={expiryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setExpiryModalVisible(false)}
      >
        <View style={styles.expiryModalOverlay}>
          <View style={[styles.expiryModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.expiryModalHeader}>
              <Ionicons name="warning" size={32} color="#F59E0B" />
              <Text style={[styles.expiryModalTitle, { color: colors.text }]}>
                {language === 'tr' ? 'Son Kullanma Tarihi Uyarısı' : 'Expiry Date Warning'}
              </Text>
            </View>
            <Text style={[styles.expiryModalSubtitle, { color: colors.textMuted }]}>
              {language === 'tr'
                ? 'Aşağıdaki ilaçların son kullanma tarihi yaklaşıyor veya dolmuş:'
                : 'The following medicines are expiring soon or have expired:'}
            </Text>
            <View style={styles.expiryMedicineList}>
              {expiringMedicines.map(medicine => {
                const expiryDate = medicine.expiryDate ? parseISO(medicine.expiryDate) : null;
                const daysLeft = expiryDate
                  ? differenceInDays(startOfDay(expiryDate), startOfDay(new Date()))
                  : 0;
                const isExpired = daysLeft < 0;
                const formattedDate = expiryDate
                  ? format(expiryDate, 'd MMM yyyy', { locale: dateLocale })
                  : '';

                return (
                  <View
                    key={medicine.id}
                    style={[styles.expiryMedicineItem, { backgroundColor: colors.inputBackground }]}
                  >
                    <View
                      style={[
                        styles.expiryMedicineIcon,
                        { backgroundColor: medicine.color + '20' },
                      ]}
                    >
                      <Ionicons name="medical" size={16} color={medicine.color} />
                    </View>
                    <View style={styles.expiryMedicineInfo}>
                      <Text
                        style={[styles.expiryMedicineName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {medicine.name}
                      </Text>
                      <Text
                        style={[
                          styles.expiryMedicineDate,
                          { color: isExpired ? '#EF4444' : '#F59E0B' },
                        ]}
                      >
                        {isExpired
                          ? language === 'tr'
                            ? `Süresi doldu (${formattedDate})`
                            : `Expired (${formattedDate})`
                          : language === 'tr'
                            ? `${daysLeft} gün kaldı (${formattedDate})`
                            : `${daysLeft} days left (${formattedDate})`}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
            <TouchableOpacity
              style={[styles.expiryModalButton, { backgroundColor: colors.primary }]}
              onPress={() => setExpiryModalVisible(false)}
            >
              <Text style={styles.expiryModalButtonText}>{language === 'tr' ? 'Tamam' : 'OK'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  // Hero Card Styles
  heroCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  heroLeft: {
    flex: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  todayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  todayBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroGreeting: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  heroDate: {
    fontSize: 14,
    marginTop: 2,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 11,
    marginTop: 6,
    fontWeight: '500',
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  heroStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heroStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  heroStatLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  heroStatDivider: {
    width: 1,
    marginVertical: 4,
  },
  // Next Medicine Row
  nextMedicineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  nextMedicineText: {
    fontSize: 13,
    flex: 1,
  },
  nextMedicineTime: {
    fontWeight: '600',
  },
  quickEditText: {
    fontSize: 13,
    fontWeight: '600',
  },
  streakCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  streakIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  streakIconEmoji: {
    fontSize: 24,
  },
  streakTextContainer: {
    flex: 1,
  },
  streakTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  streakSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  // Stok Uyarısı
  lowStockCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lowStockContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  lowStockIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  lowStockTextContainer: {
    flex: 1,
  },
  lowStockTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  lowStockSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionContainer: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionIcon: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentDoseCard: {
    borderRadius: 16,
    padding: 18,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  currentDoseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  currentDoseTime: {
    fontSize: 15,
    fontWeight: '500',
  },
  currentDoseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  medicineIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  currentDoseText: {
    flex: 1,
  },
  currentDoseName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  currentDoseDosage: {
    fontSize: 15,
    marginTop: 2,
  },
  currentDoseActions: {
    flexDirection: 'row',
    gap: 10,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateDesc: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyStateIcon: {
    flex: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  takeBtn: {
    flex: 2,
  },
  takeBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  snoozeBtn: {
    flex: 1.5,
    borderWidth: 1.5,
  },
  snoozeBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  skipBtn: {
    width: 48,
    borderWidth: 1.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  snoozeModal: {
    width: '80%',
    borderRadius: 20,
    padding: 24,
  },
  snoozeModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  snoozeOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  snoozeOption: {
    width: '47%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  snoozeOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Filter Tabs - Sprint 55: WCAG 2.5.5 touch target min 36pt
  filterTabsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8, // 8 + 8 = 16pt padding
    minHeight: 36, // WCAG 2.5.5 minimum touch target
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Medicine Card Styles - Ayrı kartlar
  medicineList: {
    gap: 10,
  },
  timelineItem: {
    flexDirection: 'row',
    padding: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    borderLeftWidth: 4,
    borderWidth: 1,
  },
  medicineIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  medicineDetails: {
    fontSize: 13,
  },
  medicineStatus: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  takeNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  takeNowText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  quickTakeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Zaman dilimi gruplandırma stilleri
  timeSlotGroup: {
    marginBottom: 8,
  },
  timeSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 8,
    marginBottom: 6,
    borderBottomWidth: 1,
  },
  timeSlotLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeSlotEmoji: {
    fontSize: 15,
  },
  timeSlotLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  timeSlotProgress: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  timeSlotProgressText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // Expiry Modal Styles
  expiryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  expiryModalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  expiryModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  expiryModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  expiryModalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  expiryMedicineList: {
    gap: 10,
    marginBottom: 20,
  },
  expiryMedicineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  expiryMedicineIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiryMedicineInfo: {
    flex: 1,
  },
  expiryMedicineName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  expiryMedicineDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  expiryModalButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  expiryModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
