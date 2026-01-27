import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, differenceInMinutes } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { useMedicineStore } from '../stores/medicineStore';
import { RootStackParamList, Medicine, ReminderTime, MedicineLog } from '../types';
import { formatTimeDisplay } from '../utils/timeCalculator';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { InlineAdBanner } from '../components/AdBanner';
import { scheduleSnoozeNotification } from '../utils/notifications';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface TodayReminder {
  medicine: Medicine;
  reminderTime: ReminderTime;
  log?: MedicineLog;
}

const SNOOZE_OPTIONS = [5, 10, 15, 30];

const SOFT_RED = '#DC2626';
const SOFT_RED_BG = '#FEF2F2';

function getRelativeTimeText(
  reminderTime: string,
  language: string,
  log?: MedicineLog
): { text: string; isNow: boolean; isPast: boolean; minutesDiff: number } {
  const now = new Date();
  const currentTime = format(now, 'HH:mm');
  const [rH, rM] = reminderTime.split(':').map(Number);
  const reminderDate = new Date();
  reminderDate.setHours(rH, rM, 0, 0);

  const minutesDiff = differenceInMinutes(reminderDate, now);
  const isPast = reminderTime < currentTime;
  const isNow = Math.abs(minutesDiff) <= 2;

  if (log?.status === 'taken') {
    return {
      text: language === 'tr' ? 'Alındı' : 'Taken',
      isNow: false,
      isPast: false,
      minutesDiff,
    };
  }
  if (log?.status === 'skipped') {
    return {
      text: language === 'tr' ? 'Atlandı' : 'Skipped',
      isNow: false,
      isPast: false,
      minutesDiff,
    };
  }

  if (isNow) {
    return { text: language === 'tr' ? 'Şimdi' : 'Now', isNow: true, isPast: false, minutesDiff };
  }

  if (isPast) {
    const absMinutes = Math.abs(minutesDiff);
    if (absMinutes < 60) {
      return {
        text: language === 'tr' ? `${absMinutes} dk önce` : `${absMinutes} min ago`,
        isNow: false,
        isPast: true,
        minutesDiff,
      };
    }
    const hours = Math.floor(absMinutes / 60);
    return {
      text: language === 'tr' ? `${hours} saat önce` : `${hours}h ago`,
      isNow: false,
      isPast: true,
      minutesDiff,
    };
  }

  if (minutesDiff < 60) {
    return {
      text: language === 'tr' ? `${minutesDiff} dk sonra` : `in ${minutesDiff} min`,
      isNow: false,
      isPast: false,
      minutesDiff,
    };
  }
  const hours = Math.floor(minutesDiff / 60);
  return {
    text: language === 'tr' ? `${hours} saat sonra` : `in ${hours}h`,
    isNow: false,
    isPast: false,
    minutesDiff,
  };
}

interface CurrentDoseCardProps {
  reminder: TodayReminder;
  colors: ThemeColors;
  isDark: boolean;
  language: string;
  onTake: () => void;
  onSnooze: (minutes: number) => void;
  onSkip: () => void;
}

const CurrentDoseCard: React.FC<CurrentDoseCardProps> = ({
  reminder,
  colors,
  isDark,
  language,
  onTake,
  onSnooze,
  onSkip,
}) => {
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);
  const {
    text: relativeTime,
    isNow,
    isPast,
  } = getRelativeTimeText(reminder.reminderTime.time, language, reminder.log);

  const statusColor = isNow ? colors.primary : isPast ? SOFT_RED : colors.textSecondary;

  return (
    <>
      <View
        style={[
          styles.currentDoseCard,
          {
            backgroundColor: colors.card,
            shadowOpacity: isDark ? 0 : 0.08,
            borderLeftColor: isPast ? SOFT_RED : colors.primary,
          },
        ]}
      >
        <View style={styles.currentDoseHeader}>
          <View style={[styles.statusPill, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusPillText, { color: statusColor }]}>{relativeTime}</Text>
          </View>
          <Text style={[styles.currentDoseTime, { color: colors.textSecondary }]}>
            {formatTimeDisplay(reminder.reminderTime.time)}
          </Text>
        </View>

        <View style={styles.currentDoseInfo}>
          <View style={[styles.medicineIcon, { backgroundColor: reminder.medicine.color + '20' }]}>
            <Ionicons name="medical" size={24} color={reminder.medicine.color} />
          </View>
          <View style={styles.currentDoseText}>
            <Text style={[styles.currentDoseName, { color: colors.text }]} numberOfLines={1}>
              {reminder.medicine.name}
            </Text>
            <Text style={[styles.currentDoseDosage, { color: colors.textMuted }]}>
              {reminder.medicine.dosage}
            </Text>
          </View>
        </View>

        <View style={styles.currentDoseActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.takeBtn, { backgroundColor: colors.primary }]}
            onPress={onTake}
          >
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            <Text style={styles.takeBtnText}>{language === 'tr' ? 'Aldım' : 'Taken'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.snoozeBtn, { borderColor: colors.border }]}
            onPress={() => setShowSnoozeOptions(true)}
          >
            <Ionicons name="time-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.snoozeBtnText, { color: colors.textMuted }]}>
              {language === 'tr' ? 'Ertele' : 'Snooze'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.skipBtn, { borderColor: colors.border }]}
            onPress={onSkip}
          >
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showSnoozeOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSnoozeOptions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSnoozeOptions(false)}
        >
          <View style={[styles.snoozeModal, { backgroundColor: colors.card }]}>
            <Text style={[styles.snoozeModalTitle, { color: colors.text }]}>
              {language === 'tr' ? 'Ne kadar erteleyelim?' : 'Snooze for how long?'}
            </Text>
            <View style={styles.snoozeOptionsGrid}>
              {SNOOZE_OPTIONS.map(minutes => (
                <TouchableOpacity
                  key={minutes}
                  style={[styles.snoozeOption, { backgroundColor: colors.background }]}
                  onPress={() => {
                    setShowSnoozeOptions(false);
                    onSnooze(minutes);
                  }}
                >
                  <Text style={[styles.snoozeOptionText, { color: colors.primary }]}>
                    {minutes} {language === 'tr' ? 'dk' : 'min'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

interface TimelineItemProps {
  reminder: TodayReminder;
  colors: ThemeColors;
  language: string;
  onTakeNow: () => void;
  isFirst: boolean;
}

const TimelineItem: React.FC<TimelineItemProps> = ({
  reminder,
  colors,
  language,
  onTakeNow,
  isFirst,
}) => {
  const { log } = reminder;
  const isTaken = log?.status === 'taken';
  const isSkipped = log?.status === 'skipped';
  const { isPast, minutesDiff } = getRelativeTimeText(reminder.reminderTime.time, language, log);
  const isMissed = isPast && !isTaken && !isSkipped;

  // Aktif snooze kontrolü
  const snoozes = useMedicineStore(state => state.snoozes);
  const today = format(new Date(), 'yyyy-MM-dd');
  const hasActiveSnooze = snoozes.some(
    s =>
      s.medicineId === reminder.medicine.id &&
      s.reminderTimeId === reminder.reminderTime.id &&
      s.isActive &&
      s.originalScheduledTime.startsWith(today)
  );

  const getStatusBadge = () => {
    if (isTaken) {
      return {
        text: language === 'tr' ? 'Alındı' : 'Taken',
        color: '#059669',
        bg: '#DCFCE7',
        icon: 'checkmark-circle' as const,
      };
    }
    if (isSkipped) {
      return {
        text: language === 'tr' ? 'Atlandı' : 'Skipped',
        color: colors.textMuted,
        bg: '#F3F4F6',
        icon: 'close-circle' as const,
      };
    }
    // Ertelendi durumu - aktif snooze varsa
    if (hasActiveSnooze) {
      return {
        text: language === 'tr' ? 'Ertelendi' : 'Snoozed',
        color: '#F59E0B',
        bg: '#FEF3C7',
        icon: 'alarm' as const,
      };
    }
    if (isMissed) {
      const absMinutes = Math.abs(minutesDiff);
      const missedText =
        absMinutes < 60
          ? language === 'tr'
            ? `${absMinutes} dk geçti`
            : `${absMinutes}m late`
          : language === 'tr'
            ? `${Math.floor(absMinutes / 60)} saat geçti`
            : `${Math.floor(absMinutes / 60)}h late`;
      return { text: missedText, color: SOFT_RED, bg: SOFT_RED_BG, icon: 'alert-circle' as const };
    }
    return {
      text: language === 'tr' ? 'Bekliyor' : 'Pending',
      color: colors.primary,
      bg: colors.primary + '15',
      icon: 'time' as const,
    };
  };

  const status = getStatusBadge();
  const isCompleted = isTaken || isSkipped;
  const medicineColor = reminder.medicine.color || colors.primary;

  return (
    <View
      style={[
        styles.medicineCard,
        {
          backgroundColor: colors.card,
          borderLeftColor: isCompleted ? colors.textMuted : medicineColor,
          opacity: isCompleted ? 0.7 : 1,
        },
      ]}
    >
      {/* Sol: İlaç İkonu */}
      <View style={[styles.medicineIconBox, { backgroundColor: medicineColor + '20' }]}>
        <Ionicons name="medical" size={22} color={medicineColor} />
      </View>

      {/* Orta: İlaç Bilgisi */}
      <View style={styles.medicineInfo}>
        <View style={styles.medicineHeader}>
          <Text
            style={[
              styles.medicineName,
              { color: colors.text },
              isCompleted && styles.completedText,
            ]}
            numberOfLines={1}
          >
            {reminder.medicine.name}
          </Text>
          <View style={styles.timeChip}>
            <Ionicons name="time-outline" size={12} color={colors.textMuted} />
            <Text
              style={[
                styles.medicineTime,
                { color: isCompleted ? colors.textMuted : colors.text },
                isCompleted && styles.completedTimeText,
              ]}
            >
              {formatTimeDisplay(reminder.reminderTime.time)}
            </Text>
          </View>
        </View>
        <Text style={[styles.medicineDosage, { color: colors.textMuted }]}>
          {reminder.medicine.dosage}
        </Text>
      </View>

      {/* Sağ: Durum */}
      <View style={styles.medicineStatus}>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Ionicons name={status.icon} size={14} color={status.color} />
          <Text style={[styles.statusBadgeText, { color: status.color }]}>{status.text}</Text>
        </View>

        {isMissed && (
          <TouchableOpacity
            style={[styles.takeNowBtn, { backgroundColor: colors.primary }]}
            onPress={onTakeNow}
          >
            <Text style={styles.takeNowBtnText}>{language === 'tr' ? 'Al' : 'Take'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { canAddMedicine } = useSubscription();
  const [refreshing, setRefreshing] = useState(false);

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
  const getMedicineById = useMedicineStore(state => state.getMedicineById);

  const handleAddMedicine = () => {
    const { allowed, reason } = canAddMedicine(medicines.length);

    if (!allowed) {
      Alert.alert(language === 'tr' ? 'İlaç Limiti' : 'Medicine Limit', reason, [
        { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
        {
          text: language === 'tr' ? "Premium'a Geç" : 'Go Premium',
          onPress: () => navigation.navigate('Premium'),
        },
      ]);
      return;
    }

    navigation.navigate('AddMedicine', {});
  };

  // useMemo ile todayReminders'ı hesapla - state değiştiğinde yeniden hesaplanmayı garanti eder
  const todayReminders = useMemo(() => {
    return getTodayReminders();
  }, [medicines, reminderTimes, medicineLogs, getTodayReminders]);
  const adherenceRate = getAdherenceRate(7);
  const currentStreak = getCurrentStreak();

  const today = format(new Date(), 'dd MMMM yyyy, EEEE', { locale: dateLocale });
  const currentTime = format(new Date(), 'HH:mm');

  const currentReminder =
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
    todayReminders.find(r => !r.log);

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

      const snooze = createSnooze(
        reminder.medicine.id,
        reminder.reminderTime.id,
        originalScheduledTime,
        triggerTime,
        notificationId
      );

      try {
        await scheduleSnoozeNotification({
          medicine: reminder.medicine,
          reminderTime: reminder.reminderTime,
          snoozeDuration: minutes,
          snoozeId: snooze.id,
          originalScheduledTime,
          snoozeCount: snooze.snoozeCount,
        });

        Alert.alert(
          language === 'tr' ? 'Ertelendi' : 'Snoozed',
          language === 'tr'
            ? `${reminder.medicine.name} ${minutes} dakika sonra hatırlatılacak.`
            : `${reminder.medicine.name} will be reminded in ${minutes} minutes.`
        );
      } catch (error) {
        Alert.alert(
          language === 'tr' ? 'Hata' : 'Error',
          language === 'tr' ? 'Erteleme başarısız oldu.' : 'Failed to snooze.'
        );
      }
    },
    [createSnooze, language]
  );

  const completedCount = todayReminders.filter(r => r.log?.status === 'taken').length;

  const totalCount = todayReminders.length;
  const remainingCount =
    totalCount -
    todayReminders.filter(r => r.log?.status === 'taken' || r.log?.status === 'skipped').length;

  const firstName = user?.displayName?.split(' ')[0] || '';

  const greeting = firstName
    ? language === 'tr'
      ? `Merhaba, ${firstName}`
      : `Hello, ${firstName}`
    : language === 'tr'
      ? 'Merhaba'
      : 'Hello';

  // Saat dilimine göre selamlama ikonu
  const getGreetingIcon = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return '🌅'; // Sabah
    if (hour >= 12 && hour < 17) return '☀️'; // Öğlen
    if (hour >= 17 && hour < 21) return '🌆'; // Akşam
    return '🌙'; // Gece
  };

  // İlerleme yüzdesi
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Hero Card - Gradient Karşılama */}
        <LinearGradient
          colors={isDark ? ['#1E3A5F', '#0F172A'] : ['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroLeft}>
              <View style={styles.greetingRow}>
                <Text style={styles.greetingIcon}>{getGreetingIcon()}</Text>
                <Text style={styles.heroGreeting}>{greeting}</Text>
              </View>
              <Text style={styles.heroDate}>{today}</Text>
            </View>

            {/* Progress Circle */}
            <View style={styles.progressContainer}>
              <View style={styles.progressCircle}>
                <Text style={styles.progressPercent}>{progressPercent}%</Text>
              </View>
              <Text style={styles.progressLabel}>
                {language === 'tr' ? 'Tamamlandı' : 'Complete'}
              </Text>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <View style={styles.heroStatIcon}>
                <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.heroStatValue}>
                  {totalCount} {language === 'tr' ? 'doz' : 'doses'}
                </Text>
                <Text style={styles.heroStatLabel}>{language === 'tr' ? 'Bugün' : 'Today'}</Text>
              </View>
            </View>

            <View style={styles.heroStatDivider} />

            <View style={styles.heroStatItem}>
              <View style={[styles.heroStatIcon, { backgroundColor: 'rgba(74, 222, 128, 0.3)' }]}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#4ADE80" />
              </View>
              <View>
                <Text style={[styles.heroStatValue, { color: '#4ADE80' }]}>{completedCount}</Text>
                <Text style={styles.heroStatLabel}>{language === 'tr' ? 'Alındı' : 'Taken'}</Text>
              </View>
            </View>

            <View style={styles.heroStatDivider} />

            <View style={styles.heroStatItem}>
              <View style={[styles.heroStatIcon, { backgroundColor: 'rgba(251, 191, 36, 0.3)' }]}>
                <Ionicons name="time-outline" size={18} color="#FBBF24" />
              </View>
              <View>
                <Text style={[styles.heroStatValue, { color: '#FBBF24' }]}>{remainingCount}</Text>
                <Text style={styles.heroStatLabel}>{language === 'tr' ? 'Kalan' : 'Left'}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📋</Text>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              {language === 'tr' ? 'BUGÜNÜN PLANI' : "TODAY'S PLAN"}
            </Text>
          </View>

          {todayReminders.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t('home_no_reminders')}
              </Text>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={handleAddMedicine}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.addButtonText}>{t('home_add_medicine')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.medicineList}>
              {todayReminders.map((reminder, index) => (
                <TimelineItem
                  key={reminder.reminderTime.id}
                  reminder={reminder}
                  colors={colors}
                  language={language}
                  onTakeNow={() => handleTake(reminder.reminderTime.id)}
                  isFirst={index === 0}
                />
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {medicines.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={handleAddMedicine}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}
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
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  heroLeft: {
    flex: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  greetingIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  heroGreeting: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroDate: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 32,
    marginTop: 2,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  progressLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    fontWeight: '600',
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroStatLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  heroStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 4,
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
  // Medicine Card Styles - Ayrı kartlar
  medicineList: {
    gap: 12,
  },
  medicineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  medicineIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  medicineTime: {
    fontSize: 13,
    fontWeight: '600',
  },
  medicineDosage: {
    fontSize: 13,
  },
  medicineStatus: {
    alignItems: 'flex-end',
    gap: 8,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  completedTimeText: {
    textDecorationLine: 'line-through',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  takeNowBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  takeNowBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
