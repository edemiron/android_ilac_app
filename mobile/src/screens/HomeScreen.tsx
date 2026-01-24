import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { useMedicineStore } from '../stores/medicineStore';
import { RootStackParamList, Medicine, ReminderTime, MedicineLog } from '../types';
import { formatTimeDisplay } from '../utils/timeCalculator';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { InlineAdBanner } from '../components/AdBanner';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ReminderCardProps {
  medicine: Medicine;
  reminderTime: ReminderTime;
  log?: MedicineLog;
  onTake: () => void;
  onSkip: () => void;
  colors: any;
  t: any;
}

const ReminderCard: React.FC<ReminderCardProps> = ({
  medicine,
  reminderTime,
  log,
  onTake,
  onSkip,
  colors,
  t,
}) => {
  const now = new Date();
  const currentTime = format(now, 'HH:mm');
  const isPast = reminderTime.time < currentTime;
  const isTaken = log?.status === 'taken';
  const isSkipped = log?.status === 'skipped';

  return (
    <View
      style={[
        styles.reminderCard,
        { 
          backgroundColor: colors.card,
          borderLeftColor: medicine.color,
        },
        isTaken && { backgroundColor: colors.success + '15' },
        isSkipped && { backgroundColor: colors.error + '10' },
      ]}
    >
      <View style={styles.reminderTime}>
        <Text style={[
          styles.timeText, 
          { color: colors.text },
          (isTaken || isSkipped) && { color: colors.textMuted, textDecorationLine: 'line-through' }
        ]}>
          {formatTimeDisplay(reminderTime.time)}
        </Text>
        {isPast && !isTaken && !isSkipped && (
          <View style={[styles.missedBadge, { backgroundColor: colors.error }]}>
            <Text style={styles.missedText}>{t('home_missed')}</Text>
          </View>
        )}
      </View>

      <View style={styles.reminderInfo}>
        <Text style={[
          styles.medicineName, 
          { color: colors.text },
          (isTaken || isSkipped) && { color: colors.textMuted, textDecorationLine: 'line-through' }
        ]}>
          {medicine.name}
        </Text>
        <Text style={[
          styles.dosageText, 
          { color: colors.textSecondary },
          (isTaken || isSkipped) && { color: colors.textMuted }
        ]}>
          {medicine.dosage}
        </Text>
      </View>

      <View style={styles.reminderActions}>
        {isTaken ? (
          <View style={[styles.statusBadge, { backgroundColor: colors.success }]}>
            <Text style={styles.statusText}>✓ {t('home_taken')}</Text>
          </View>
        ) : isSkipped ? (
          <View style={[styles.statusBadge, { backgroundColor: colors.textMuted }]}>
            <Text style={styles.statusText}>{t('home_skipped')}</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity 
              style={[styles.takeButton, { backgroundColor: colors.primary }]} 
              onPress={onTake}
            >
              <Text style={styles.takeButtonText}>{t('home_taken')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.skipButton, { backgroundColor: colors.inputBackground }]} 
              onPress={onSkip}
            >
              <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
                {t('alarm_skip')}
              </Text>
            </TouchableOpacity>
          </>
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
  const { canAddMedicine, isPremium } = useSubscription();
  const [refreshing, setRefreshing] = useState(false);
  
  const dateLocale = language === 'tr' ? tr : enUS;
  
  const { 
    getTodayReminders, 
    logMedicineTaken, 
    logMedicineSkipped,
    medicines,
    getAdherenceRate,
  } = useMedicineStore();

  // İlaç ekleme kontrolü
  const handleAddMedicine = () => {
    const { allowed, reason } = canAddMedicine(medicines.length);
    
    if (!allowed) {
      Alert.alert(
        language === 'tr' ? 'İlaç Limiti' : 'Medicine Limit',
        reason,
        [
          { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
          { 
            text: language === 'tr' ? 'Premium\'a Geç' : 'Go Premium',
            onPress: () => navigation.navigate('Premium'),
          },
        ]
      );
      return;
    }
    
    navigation.navigate('AddMedicine', {});
  };

  const todayReminders = getTodayReminders();
  const adherenceRate = getAdherenceRate(7);
  
  const today = format(new Date(), 'dd MMMM yyyy, EEEE', { locale: dateLocale });
  const currentTime = format(new Date(), 'HH:mm');

  // Sonraki hatırlatmayı bul
  const nextReminder = todayReminders.find(
    (r) => r.reminderTime.time > currentTime && !r.log
  );

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleTake = (reminderTimeId: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const reminder = todayReminders.find((r) => r.reminderTime.id === reminderTimeId);
    if (reminder) {
      const scheduledTime = `${today}T${reminder.reminderTime.time}:00`;
      logMedicineTaken(reminderTimeId, scheduledTime);
    }
  };

  const handleSkip = (reminderTimeId: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const reminder = todayReminders.find((r) => r.reminderTime.id === reminderTimeId);
    if (reminder) {
      const scheduledTime = `${today}T${reminder.reminderTime.time}:00`;
      logMedicineSkipped(reminderTimeId, scheduledTime);
    }
  };

  const completedCount = todayReminders.filter(
    (r) => r.log?.status === 'taken' || r.log?.status === 'skipped'
  ).length;

  // Kullanıcı adının ilk kısmını al (örn: "Ahmet Yılmaz" -> "Ahmet")
  const firstName = user?.displayName?.split(' ')[0] || '';
  
  // Kişiselleştirilmiş karşılama
  const greeting = firstName 
    ? (language === 'tr' ? `Merhaba, ${firstName}!` : `Hello, ${firstName}!`)
    : (language === 'tr' ? 'Merhaba!' : 'Hello!');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.text }]}>{greeting} 👋</Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>{today}</Text>
        </View>

        {/* Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: colors.text }]}>
              {todayReminders.length}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              {language === 'tr' ? 'Bugün' : 'Today'}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: colors.text }]}>
              {completedCount}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              {language === 'tr' ? 'Tamamlanan' : 'Completed'}
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.divider }]} />
          <View style={styles.summaryItem}>
            <Text style={[
              styles.summaryNumber, 
              { color: adherenceRate >= 80 ? colors.success : colors.error }
            ]}>
              %{adherenceRate}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              {t('home_adherence')}
            </Text>
          </View>
        </View>

        {/* Next Reminder */}
        {nextReminder && (
          <View style={[styles.nextReminderCard, { backgroundColor: colors.primary }]}>
            <Text style={styles.nextReminderLabel}>{t('home_next_reminder')}</Text>
            <View style={styles.nextReminderContent}>
              <View style={[styles.nextReminderIcon, { backgroundColor: nextReminder.medicine.color }]}>
                <Text style={styles.nextReminderIconText}>💊</Text>
              </View>
              <View style={styles.nextReminderInfo}>
                <Text style={styles.nextReminderName}>{nextReminder.medicine.name}</Text>
                <Text style={styles.nextReminderTime}>
                  {formatTimeDisplay(nextReminder.reminderTime.time)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Ad Banner - Rahatsız etmeyen konum */}
        <InlineAdBanner />

        {/* Today's Schedule */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('home_today_reminders')}
          </Text>
          
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
                <Text style={styles.addButtonText}>+ {t('home_add_medicine')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            todayReminders.map((reminder) => (
              <ReminderCard
                key={reminder.reminderTime.id}
                medicine={reminder.medicine}
                reminderTime={reminder.reminderTime}
                log={reminder.log}
                onTake={() => handleTake(reminder.reminderTime.id)}
                onSkip={() => handleSkip(reminder.reminderTime.id)}
                colors={colors}
                t={t}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      {medicines.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={handleAddMedicine}
        >
          <Text style={styles.fabText}>+</Text>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 14,
    marginTop: 4,
  },
  summaryCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    marginVertical: 4,
  },
  nextReminderCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
  },
  nextReminderLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  nextReminderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextReminderIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextReminderIconText: {
    fontSize: 24,
  },
  nextReminderInfo: {
    marginLeft: 12,
  },
  nextReminderName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  nextReminderTime: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reminderTime: {
    minWidth: 70,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  missedBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  missedText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  reminderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '600',
  },
  dosageText: {
    fontSize: 13,
    marginTop: 2,
  },
  reminderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  takeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  takeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  skipButtonText: {
    fontWeight: '500',
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    borderRadius: 16,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 20,
  },
  addButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
  },
});
