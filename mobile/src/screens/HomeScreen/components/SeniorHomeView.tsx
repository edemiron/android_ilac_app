import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { format } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { ClinicalBadge } from '../../../components/common/ClinicalBadge';
import { speakMedicineReminder, stopSpeaking } from '../../../utils/speech';
import type { TodayReminder } from '../types';
import { spacing, radius } from '../../../theme/tokens';

export interface SeniorHomeViewProps {
  displayName?: string;
  todayReminders: TodayReminder[];
  lowStockMedicines?: import('../../../types').Medicine[];
  onTakeMedicine: (reminderTimeId: string, medicineId: string) => Promise<void>;
  onSnoozeMedicine: (reminderTimeId: string, medicineId: string) => Promise<void>;
  onSkipMedicine: (reminderTimeId: string, medicineId: string, medicineName: string) => void;
  onToggleSeniorMode: () => void;
  onNavigateToPharmacy?: () => void;
}

export function SeniorHomeView({
  displayName,
  todayReminders,
  lowStockMedicines,
  onTakeMedicine,
  onSnoozeMedicine,
  onSkipMedicine,
  onToggleSeniorMode,
  onNavigateToPharmacy,
}: SeniorHomeViewProps) {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const [isSpeakingDose, setIsSpeakingDose] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const dateLocale = language === 'tr' ? tr : enUS;
  const todayFormatted = format(new Date(), 'd MMMM EEEE', { locale: dateLocale });

  // Bekleyen veya ilk alınacak ilacı bul
  const pendingReminders = todayReminders.filter(
    r => !r.log || r.log.status === 'pending' || r.log.status === 'missed'
  );
  const activeReminder = pendingReminders[0] || null;
  const otherReminders = todayReminders.filter(r =>
    activeReminder ? r.reminderTime.id !== activeReminder.reminderTime.id : true
  );

  // Sesli Oku Butonu
  const handleSpeakActiveDose = async () => {
    if (!activeReminder) return;
    try {
      if (isSpeakingDose) {
        await stopSpeaking();
        setIsSpeakingDose(false);
      } else {
        setIsSpeakingDose(true);
        await speakMedicineReminder(
          activeReminder.medicine.name,
          activeReminder.medicine.dosage,
          activeReminder.medicine.instructions,
          language as 'tr' | 'en'
        );
        setIsSpeakingDose(false);
      }
    } catch {
      setIsSpeakingDose(false);
    }
  };

  const handleTake = async (reminder: TodayReminder) => {
    ReactNativeHapticFeedback.trigger('notificationSuccess');
    setProcessingId(reminder.reminderTime.id);
    try {
      await onTakeMedicine(reminder.reminderTime.id, reminder.medicine.id);
    } finally {
      setProcessingId(null);
    }
  };

  const handleSnooze = async (reminder: TodayReminder) => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    setProcessingId(reminder.reminderTime.id);
    try {
      await onSnoozeMedicine(reminder.reminderTime.id, reminder.medicine.id);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Üst Bar: Büyük Tarih ve Kolay Mod Rozeti */}
      <View style={styles.topBar}>
        <View style={styles.greetingContainer}>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>{todayFormatted}</Text>
          <Text style={[styles.greetingText, { color: colors.text }]}>
            {language === 'tr' ? 'Merhaba' : 'Hello'}
            {displayName ? `, ${displayName}` : ''}
          </Text>
        </View>

        {/* Standart Moda Geçiş Hapı */}
        <TouchableOpacity
          onPress={onToggleSeniorMode}
          style={[
            styles.modeTogglePill,
            {
              backgroundColor: isDark ? colors.surfaceContainer : '#E2E8F0',
              borderColor: colors.border,
            },
          ]}
          activeOpacity={0.7}
        >
          <Ionicons name="sparkles" size={16} color={colors.primary} />
          <Text style={[styles.modeToggleText, { color: colors.text }]}>
            {language === 'tr' ? 'Standart Mod' : 'Standard'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Ana Odak İlaç Kartı (Aktif İlaç Varsa) */}
      {activeReminder ? (
        <View
          style={[
            styles.heroDoseCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.primary,
            },
          ]}
        >
          {/* Üst Kısım: Saat ve Sesli Dinle Butonu */}
          <View style={styles.cardHeaderRow}>
            <View style={[styles.timeBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="time-outline" size={20} color="#FFFFFF" />
              <Text style={styles.timeBadgeText}>{activeReminder.reminderTime.time}</Text>
            </View>

            <TouchableOpacity
              onPress={handleSpeakActiveDose}
              style={[
                styles.voiceButton,
                {
                  backgroundColor: isSpeakingDose
                    ? colors.secondary
                    : isDark
                      ? colors.surfaceContainer
                      : '#F1F5F9',
                  borderColor: colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isSpeakingDose ? 'volume-high' : 'volume-medium-outline'}
                size={22}
                color={isSpeakingDose ? '#FFFFFF' : colors.primary}
              />
              <Text
                style={[
                  styles.voiceButtonText,
                  { color: isSpeakingDose ? '#FFFFFF' : colors.primary },
                ]}
              >
                {language === 'tr' ? 'Sesli Dinle' : 'Listen'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* İlaç Adı ve Dozajı (Ultra Büyük Yazı) */}
          <View style={styles.medicineInfoContainer}>
            <Text style={[styles.medicineNameText, { color: colors.text }]}>
              {activeReminder.medicine.name}
            </Text>
            <Text style={[styles.medicineDosageText, { color: colors.textSecondary }]}>
              {activeReminder.medicine.dosage}
              {activeReminder.medicine.instructions
                ? ` • ${activeReminder.medicine.instructions}`
                : ''}
            </Text>
          </View>

          {/* Devasa Aksiyon Butonları (64px Yükseklik) */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              onPress={() => handleTake(activeReminder)}
              disabled={processingId === activeReminder.reminderTime.id}
              style={[styles.giantTakeButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              {processingId === activeReminder.reminderTime.id ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={28} color="#FFFFFF" />
                  <Text style={styles.giantTakeButtonText}>
                    {language === 'tr' ? 'İLACI ALDIM' : 'I TOOK IT'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.secondaryActionsRow}>
              <TouchableOpacity
                onPress={() => handleSnooze(activeReminder)}
                style={[
                  styles.secondaryActionButton,
                  {
                    backgroundColor: isDark ? colors.surfaceContainer : '#F1F5F9',
                    borderColor: colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons name="alarm-outline" size={22} color={colors.text} />
                <Text style={[styles.secondaryActionText, { color: colors.text }]}>
                  {language === 'tr' ? '15 Dk Ertele' : 'Snooze 15m'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  onSkipMedicine(
                    activeReminder.reminderTime.id,
                    activeReminder.medicine.id,
                    activeReminder.medicine.name
                  )
                }
                style={[
                  styles.secondaryActionButton,
                  {
                    backgroundColor: isDark ? colors.surfaceContainer : '#F1F5F9',
                    borderColor: colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle-outline" size={22} color={colors.textSecondary} />
                <Text style={[styles.secondaryActionText, { color: colors.textSecondary }]}>
                  {language === 'tr' ? 'Atla' : 'Skip'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        /* 3. Tüm İlaçlar Alındıysa: Büyük Tebrik Kartı */
        <View
          style={[
            styles.allDoneCard,
            {
              backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
              borderColor: '#10B981',
            },
          ]}
        >
          <Ionicons name="checkmark-done-circle" size={56} color="#10B981" />
          <Text style={[styles.allDoneTitle, { color: isDark ? '#A7F3D0' : '#065F46' }]}>
            {language === 'tr' ? 'Tebrikler! Bekleyen İlacınız Yok' : 'All Done for Now!'}
          </Text>
          <Text style={[styles.allDoneSubtitle, { color: isDark ? '#D1FAE5' : '#047857' }]}>
            {language === 'tr'
              ? 'Bugünün tüm planlı ilaçlarını başarıyla aldınız.'
              : "You've taken all your scheduled medications."}
          </Text>
        </View>
      )}

      {/* 3.5. Stok Uyarısı ve Nöbetçi Eczane Kartı */}
      {lowStockMedicines && lowStockMedicines.length > 0 && (
        <View
          style={[
            styles.stockAlertCard,
            {
              backgroundColor: isDark ? '#451A03' : '#FFFBEB',
              borderColor: '#F59E0B',
            },
          ]}
        >
          <View style={styles.stockAlertHeader}>
            <Ionicons name="warning-outline" size={24} color="#F59E0B" />
            <Text style={[styles.stockAlertTitle, { color: isDark ? '#FDE68A' : '#92400E' }]}>
              {language === 'tr' ? 'İlaç Stoğunuz Azaldı!' : 'Medication Running Low!'}
            </Text>
          </View>

          <Text style={[styles.stockAlertSubtitle, { color: isDark ? '#FEF3C7' : '#B45309' }]}>
            {lowStockMedicines
              .map(m => `${m.name} (${m.stockCount ?? 0} ${m.stockUnit || 'adet'})`)
              .join(', ')}
          </Text>

          {onNavigateToPharmacy && (
            <TouchableOpacity
              onPress={onNavigateToPharmacy}
              style={[styles.pharmacyButton, { backgroundColor: '#F59E0B' }]}
              activeOpacity={0.8}
            >
              <Ionicons name="medkit" size={20} color="#FFFFFF" />
              <Text style={styles.pharmacyButtonText}>
                {language === 'tr' ? 'Nöbetçi Eczaneleri Bul' : 'Find On-Duty Pharmacies'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 4. Günün Diğer İlaçları Listesi */}
      {otherReminders.length > 0 && (
        <View style={styles.otherSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {language === 'tr' ? 'Günün Diğer İlaçları' : "Today's Other Medicines"}
          </Text>

          {otherReminders.map(item => {
            const status = item.log?.status ?? 'pending';
            return (
              <View
                key={item.reminderTime.id}
                style={[
                  styles.otherMedicineCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.otherCardLeft}>
                  <Text style={[styles.otherTimeText, { color: colors.primary }]}>
                    {item.reminderTime.time}
                  </Text>
                  <View style={styles.otherInfo}>
                    <Text style={[styles.otherNameText, { color: colors.text }]}>
                      {item.medicine.name}
                    </Text>
                    <Text style={[styles.otherDosageText, { color: colors.textSecondary }]}>
                      {item.medicine.dosage}
                    </Text>
                  </View>
                </View>

                <ClinicalBadge
                  label={
                    status === 'taken'
                      ? language === 'tr'
                        ? 'Alındı'
                        : 'Taken'
                      : status === 'skipped'
                        ? language === 'tr'
                          ? 'Atlandı'
                          : 'Skipped'
                        : language === 'tr'
                          ? 'Bekliyor'
                          : 'Pending'
                  }
                  variant={
                    status === 'taken' ? 'taken' : status === 'skipped' ? 'skipped' : 'neutral'
                  }
                />
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  greetingContainer: {
    flex: 1,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: '700',
  },
  modeTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    gap: 6,
  },
  modeToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  heroDoseCard: {
    borderRadius: 20,
    borderWidth: 2,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    gap: 6,
  },
  timeBadgeText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  voiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 6,
  },
  voiceButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  medicineInfoContainer: {
    marginBottom: spacing.xl,
  },
  medicineNameText: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  medicineDosageText: {
    fontSize: 18,
    fontWeight: '500',
  },
  actionsContainer: {
    gap: spacing.md,
  },
  giantTakeButton: {
    height: 64,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  giantTakeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  secondaryActionButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryActionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  allDoneCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: spacing.xxl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  allDoneTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  allDoneSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  otherSection: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  otherMedicineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  otherCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  otherTimeText: {
    fontSize: 18,
    fontWeight: '700',
  },
  otherInfo: {
    flex: 1,
  },
  otherNameText: {
    fontSize: 17,
    fontWeight: '600',
  },
  otherDosageText: {
    fontSize: 14,
    marginTop: 2,
  },
  stockAlertCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  stockAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 6,
  },
  stockAlertTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  stockAlertSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  pharmacyButton: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pharmacyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
