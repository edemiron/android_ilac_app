/**
 * HomeScreen — Ana İlaç Takip Ekranı
 *
 * Design Pattern: Clean UI View / Presenter Pattern
 * İş mantığı, state ve zaman dilimi hesaplamaları `useHomeController` Presenter Hook'una
 * delege edilmiştir. Bu dosya yalnızca UI render ve layout koordinasyonundan sorumludur.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, differenceInDays, startOfDay, parseISO } from 'date-fns';

import { RootStackParamList } from '../types';
import { withAlpha, ALPHA } from '../utils/colors';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { SkipReasonModal } from '../components/common/SkipReasonModal';

// Alt Bileşenler
import { CurrentDoseCard } from './HomeScreen/components/CurrentDoseCard';
import { Header } from './HomeScreen/components/Header';
import { WeeklyCalendarStrip } from './HomeScreen/components/WeeklyCalendarStrip';
import { TimeSlotGrid } from './HomeScreen/components/TimeSlotGrid';
import { TimeSlotModal } from './HomeScreen/components/TimeSlotModal';
import { SeniorHomeView } from './HomeScreen/components/SeniorHomeView';

// Presenter Hook
import { useHomeController } from './HomeScreen/hooks/useHomeController';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const {
    colors,
    isDark,
    language,
    user,
    firstName,
    dateLocale,
    greeting,
    dynamicDate,
    selectedCalendarDate,
    setSelectedCalendarDate,
    isSelectedDateToday,
    refreshing,
    onRefresh,
    todayReminders,
    weeklyLogsSummary,
    completedCount,
    totalCount,
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
  } = useHomeController();

  // 1. Yaşlı Dostu Modu (Senior Mode View)
  if (isSeniorMode) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SeniorHomeView
          displayName={user?.displayName || firstName}
          todayReminders={todayReminders}
          lowStockMedicines={lowStockMedicines}
          onTakeMedicine={async (reminderTimeId: string) => {
            handleTake(reminderTimeId);
          }}
          onSnoozeMedicine={async (reminderTimeId: string) => {
            const reminder = todayReminders.find(r => r.reminderTime.id === reminderTimeId);
            if (reminder) {
              await handleSnooze(reminder, 15);
            }
          }}
          onSkipMedicine={(reminderTimeId: string, medicineId: string, medicineName: string) => {
            setSkipTargetReminder({ reminderTimeId, medicineId, medicineName });
            setSkipModalVisible(true);
          }}
          onToggleSeniorMode={toggleSeniorMode}
          onNavigateToPharmacy={() => navigation.navigate('DutyPharmacy' as never)}
        />
        <SkipReasonModal
          visible={skipModalVisible}
          medicineName={skipTargetReminder?.medicineName || ''}
          onCancel={() => {
            setSkipModalVisible(false);
            setSkipTargetReminder(null);
          }}
          onConfirm={handleConfirmSkip}
        />
      </SafeAreaView>
    );
  }

  // 2. Standart Görünüm (Standard Timeline View)
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* 1. Header (Avatar + Selamlama + Günlük İlerleme Göstergesi) */}
        <Header
          greeting={greeting}
          dynamicDate={dynamicDate}
          totalDoses={totalCount}
          completedCount={completedCount}
          currentStreak={currentStreak}
          displayName={user?.displayName ?? ''}
          onAvatarPress={() => navigation.navigate('Settings' as never)}
          onCaregiverPress={() => navigation.navigate('Caregiver' as never)}
          onNotificationPress={() => navigation.navigate('NotificationCenter' as never)}
          onSettingsPress={() => navigation.navigate('Settings' as never)}
        />

        {/* 2. Compact Haftalık Takvim Çubuğu */}
        <WeeklyCalendarStrip
          selectedDate={selectedCalendarDate}
          onSelectDate={setSelectedCalendarDate}
          medicineLogsSummary={weeklyLogsSummary}
        />

        {/* 2.5. Stok Azaldı & Nöbetçi Eczane Köprüsü */}
        {lowStockMedicines && lowStockMedicines.length > 0 && (
          <TouchableOpacity
            onPress={() => navigation.navigate('DutyPharmacy' as never)}
            style={[
              styles.slimLowStockBanner,
              {
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB',
                borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : '#FDE68A',
              },
            ]}
            activeOpacity={0.8}
          >
            <View style={styles.slimLowStockLeft}>
              <Ionicons name="warning" size={15} color="#F59E0B" />
              <Text
                style={[styles.slimLowStockText, { color: isDark ? '#FDE68A' : '#92400E' }]}
                numberOfLines={1}
              >
                {lowStockMedicines.length}{' '}
                {language === 'tr' ? 'ilacın stoğu azalıyor' : 'medicines low on stock'}
              </Text>
            </View>
            <View style={styles.slimLowStockAction}>
              <Text
                style={[styles.slimLowStockActionText, { color: isDark ? '#38BDF8' : '#0284C7' }]}
              >
                {language === 'tr' ? 'Nöbetçi Eczaneler ›' : 'Pharmacies ›'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* 3. Bölüm Başlığı & Alınan Doz Özeti */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleLeft}>
            <Text style={[styles.sectionTitleText, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              {isSelectedDateToday
                ? language === 'tr'
                  ? 'Sıradaki İlaç'
                  : 'Next Dose'
                : format(selectedCalendarDate, language === 'tr' ? 'd MMMM, EEEE' : 'EEEE, MMM d', {
                    locale: dateLocale,
                  }) + (language === 'tr' ? ' İlaçları' : '')}
            </Text>
            {!isSelectedDateToday && (
              <TouchableOpacity
                onPress={() => setSelectedCalendarDate(new Date())}
                style={[
                  styles.todayBadgeBtn,
                  {
                    backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#EFF6FF',
                    borderColor: isDark ? '#38BDF8' : '#93C5FD',
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.todayBadgeBtnText, { color: isDark ? '#38BDF8' : '#0284C7' }]}>
                  {language === 'tr' ? 'Bugün ↩' : 'Today ↩'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.doseSummaryText, { color: colors.textMuted }]}>
            {completedCount}/{totalCount} {language === 'tr' ? 'Alındı' : 'Taken'}
          </Text>
        </View>

        {/* 4. Sıradaki İlaç (Current Dose Hero Card) */}
        <CurrentDoseCard
          reminder={currentReminder}
          colors={colors}
          isDark={isDark}
          language={language}
          onTake={() => currentReminder && handleTake(currentReminder.reminderTime.id)}
          onSnooze={minutes => currentReminder && handleSnooze(currentReminder, minutes)}
          onSkip={() => {
            if (currentReminder) {
              handleSkip(currentReminder.reminderTime.id);
            }
          }}
        />

        {/* 5. 2x2 Zaman Dilimi Izgarası (Sabah, Öğle, Akşam, Gece) */}
        <TimeSlotGrid
          slots={groupedTimeline}
          activeSlotKey={activeSlotKey}
          onSelectSlot={slotKey => setActiveModalSlotKey(slotKey)}
          colors={colors}
          isDark={isDark}
          language={language}
        />

        {/* 6. Zaman Dilimi Detay Modalı (Bottom Sheet) */}
        <TimeSlotModal
          visible={!!activeModalSlotKey}
          slot={selectedModalSlot}
          onClose={() => setActiveModalSlotKey(null)}
          colors={colors}
          isDark={isDark}
          language={language}
          onTakeNow={handleTake}
          snoozes={snoozes}
        />

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Son Kullanma Tarihi Uyarısı Modalı */}
      <ConfirmDialog
        visible={expiryModalVisible}
        title={language === 'tr' ? 'Son Kullanma Tarihi Uyarısı' : 'Expiry Date Warning'}
        message={
          language === 'tr'
            ? 'Aşağıdaki ilaçların son kullanma tarihi yaklaşıyor veya dolmuş:'
            : 'The following medicines are expiring soon or have expired:'
        }
        confirmLabel={language === 'tr' ? 'Tamam' : 'OK'}
        hideCancel
        onConfirm={() => setExpiryModalVisible(false)}
        onClose={() => setExpiryModalVisible(false)}
      >
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
                    { backgroundColor: withAlpha(medicine.color, ALPHA.fill) },
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
      </ConfirmDialog>

      {/* İlaç Atlama Nedeni Modalı */}
      <SkipReasonModal
        visible={skipModalVisible}
        medicineName={skipTargetReminder?.medicineName}
        onConfirm={handleConfirmSkip}
        onCancel={() => {
          setSkipModalVisible(false);
          setSkipTargetReminder(null);
        }}
      />
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
  slimLowStockBanner: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slimLowStockLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  slimLowStockText: {
    fontSize: 12,
    fontWeight: '600',
  },
  slimLowStockAction: {
    paddingLeft: 6,
  },
  slimLowStockActionText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sectionTitleText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  todayBadgeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  todayBadgeBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  doseSummaryText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  expiryMedicineList: {
    gap: 8,
    marginTop: 8,
  },
  expiryMedicineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    gap: 10,
  },
  expiryMedicineIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiryMedicineInfo: {
    flex: 1,
  },
  expiryMedicineName: {
    fontSize: 13,
    fontWeight: '600',
  },
  expiryMedicineDate: {
    fontSize: 11,
    marginTop: 2,
  },
});
