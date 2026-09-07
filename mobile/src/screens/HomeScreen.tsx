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
import { EmergencySosModal } from '../components/common/EmergencySosModal';
import { BatchMedicineImportModal } from '../components/common/BatchMedicineImportModal';

// Alt Bileşenler
import { CurrentDoseCard } from './HomeScreen/components/CurrentDoseCard';
import { Header } from './HomeScreen/components/Header';
import { WeeklyCalendarStrip } from './HomeScreen/components/WeeklyCalendarStrip';
import { TimeSlotGrid } from './HomeScreen/components/TimeSlotGrid';
import { TimeSlotModal } from './HomeScreen/components/TimeSlotModal';
import { SeniorHomeView } from './HomeScreen/components/SeniorHomeView';
import { AlarmHealthBanner } from './HomeScreen/components/AlarmHealthBanner';
import { StatsGrid } from './HomeScreen/components/StatsGrid';

import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

// Presenter Hook
import { useHomeController } from './HomeScreen/hooks/useHomeController';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [batchImportVisible, setBatchImportVisible] = React.useState(false);
  const { isTablet } = useResponsiveLayout();
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
    emergencyModalVisible,
    setEmergencyModalVisible,
    caregiverPhone,
    handleTake,
    handleSkip,
    handleConfirmSkip,
    handleSnooze,
    handleEmergencySos,
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
          onSosPress={handleEmergencySos}
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
        <EmergencySosModal
          visible={emergencyModalVisible}
          onClose={() => setEmergencyModalVisible(false)}
          userId={user?.uid}
          userName={user?.displayName || firstName || 'Hasta'}
          caregiverPhone={caregiverPhone}
          onNavigateToPharmacy={() => navigation.navigate('DutyPharmacy' as never)}
          colors={colors}
          language={language}
        />
      </SafeAreaView>
    );
  }

  // 2. Standart Görünüm (Standard Timeline View)
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[isTablet && styles.tabletContentContainer]}
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
          onSosPress={handleEmergencySos}
        />

        {/* 1.5. Alarm Sağlık & İzin Kalkanı Uyarısı (Eksik kritik izin varsa gösterilir) */}
        <AlarmHealthBanner language={language === 'en' ? 'en' : 'tr'} isDark={isDark} />

        {/* Banners & Section Header Helpers */}
        {(() => {
          const renderBatchImportBanner = () => (
            <TouchableOpacity
              style={[
                styles.batchImportBanner,
                isTablet && styles.tabletNoMargin,
                {
                  backgroundColor: isDark ? 'rgba(78, 205, 196, 0.12)' : '#E6FFFA',
                  borderColor: isDark ? 'rgba(78, 205, 196, 0.3)' : '#B2F5EA',
                },
              ]}
              onPress={() => setBatchImportVisible(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.batchImportIconBg, { backgroundColor: colors.primary }]}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.batchImportTitle, { color: colors.text }]}>
                  {language === 'tr'
                    ? '📸 Çoklu İlaç / Reçete AI ile Tara'
                    : '📸 Batch AI Medicine Import'}
                </Text>
                <Text style={[styles.batchImportSubtitle, { color: colors.textSecondary }]}>
                  {language === 'tr'
                    ? 'Kutuları veya reçeteyi tek fotoğrafla listeye aktarın'
                    : 'Import multiple boxes with one photo'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          );

          const renderLowStockBanner = () => {
            if (!lowStockMedicines || lowStockMedicines.length === 0) return null;
            return (
              <TouchableOpacity
                onPress={() => navigation.navigate('DutyPharmacy' as never)}
                style={[
                  styles.slimLowStockBanner,
                  isTablet && styles.tabletNoMargin,
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
                  <Text style={[styles.slimLowStockActionText, { color: colors.primary }]}>
                    {language === 'tr' ? 'Nöbetçi Eczaneler ›' : 'Pharmacies ›'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          };

          const renderSectionHeader = () => (
            <View style={[styles.sectionHeaderRow, isTablet && styles.tabletNoMargin]}>
              <View style={styles.sectionTitleLeft}>
                <Text style={[styles.sectionTitleText, { color: colors.text }]}>
                  {isSelectedDateToday
                    ? language === 'tr'
                      ? 'Sıradaki İlaç'
                      : 'Next Dose'
                    : format(
                        selectedCalendarDate,
                        language === 'tr' ? 'd MMMM, EEEE' : 'EEEE, MMM d',
                        {
                          locale: dateLocale,
                        }
                      ) + (language === 'tr' ? ' İlaçları' : '')}
                </Text>
                {!isSelectedDateToday && (
                  <TouchableOpacity
                    onPress={() => setSelectedCalendarDate(new Date())}
                    style={[
                      styles.todayBadgeBtn,
                      {
                        backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#EFF6FF',
                        borderColor: colors.primary,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.todayBadgeBtnText, { color: colors.primary }]}>
                      {language === 'tr' ? 'Bugün ↩' : 'Today ↩'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={[styles.doseSummaryText, { color: colors.textMuted }]}>
                {completedCount}/{totalCount} {language === 'tr' ? 'Alındı' : 'Taken'}
              </Text>
            </View>
          );

          if (isTablet) {
            return (
              /* Tablet 2 Sütunlu Responsive Dashboard */
              <View style={styles.tabletDashboardRow}>
                {/* Sol Sütun: Günün Dozları & Zaman Dilimleri */}
                <View style={styles.tabletLeftColumn}>
                  {renderBatchImportBanner()}
                  {renderLowStockBanner()}
                  {renderSectionHeader()}
                  <CurrentDoseCard
                    key={
                      currentReminder
                        ? `current-reminder-${currentReminder.reminderTime.id}`
                        : 'all-reminders-completed'
                    }
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
                  <TimeSlotGrid
                    slots={groupedTimeline}
                    activeSlotKey={activeSlotKey}
                    onSelectSlot={slotKey => setActiveModalSlotKey(slotKey)}
                    colors={colors}
                    isDark={isDark}
                    language={language}
                  />
                </View>

                {/* Sağ Sütun: Haftalık Takvim Çubuğu & Bilgi Paneli */}
                <View style={styles.tabletRightColumn}>
                  <View
                    style={[
                      styles.tabletCalendarCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.tabletCalendarTitle, { color: colors.text }]}>
                      {language === 'tr'
                        ? '📅 Haftalık Takvim & Doz Takibi'
                        : '📅 Weekly Calendar & Adherence'}
                    </Text>
                    <WeeklyCalendarStrip
                      selectedDate={selectedCalendarDate}
                      onSelectDate={setSelectedCalendarDate}
                      medicineLogsSummary={weeklyLogsSummary}
                    />
                  </View>

                  {/* Tablet Özet İstatistikler Grid'i */}
                  <StatsGrid
                    totalCount={totalCount}
                    completedCount={completedCount}
                    remainingCount={Math.max(0, totalCount - completedCount)}
                    lowStockCount={lowStockMedicines?.length ?? 0}
                    style={styles.tabletNoMargin}
                  />

                  {/* Tablet Hızlı Sağlık ve Acil Durum Kısayolları */}
                  <View
                    style={[
                      styles.tabletQuickActionsCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.tabletQuickActionsTitle, { color: colors.text }]}>
                      {language === 'tr' ? '⚡ Hızlı Erişim' : '⚡ Quick Actions'}
                    </Text>
                    <View style={styles.tabletQuickActionsRow}>
                      <TouchableOpacity
                        style={[
                          styles.tabletQuickActionButton,
                          {
                            backgroundColor: isDark ? 'rgba(56, 189, 248, 0.12)' : '#EFF6FF',
                            borderColor: colors.primary,
                          },
                        ]}
                        onPress={() => navigation.navigate('DutyPharmacy' as never)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="medical" size={17} color={colors.primary} />
                        <Text style={[styles.tabletQuickActionText, { color: colors.primary }]}>
                          {language === 'tr' ? 'Nöbetçi Eczane' : 'Pharmacy'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.tabletQuickActionButton,
                          {
                            backgroundColor: isDark ? 'rgba(78, 205, 196, 0.12)' : '#E6FFFA',
                            borderColor: '#4ECDC4',
                          },
                        ]}
                        onPress={() => navigation.navigate('Caregiver' as never)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="people" size={17} color="#4ECDC4" />
                        <Text
                          style={[
                            styles.tabletQuickActionText,
                            { color: isDark ? '#4ECDC4' : '#0D9488' },
                          ]}
                        >
                          {language === 'tr' ? 'Refakatçi' : 'Caregiver'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.tabletQuickActionButton,
                          {
                            backgroundColor: isDark ? 'rgba(168, 85, 247, 0.12)' : '#FAF5FF',
                            borderColor: '#A855F7',
                          },
                        ]}
                        onPress={() => navigation.navigate('Statistics' as never)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="stats-chart" size={17} color="#A855F7" />
                        <Text
                          style={[
                            styles.tabletQuickActionText,
                            { color: isDark ? '#C084FC' : '#7E22CE' },
                          ]}
                        >
                          {language === 'tr' ? 'Raporlar' : 'Reports'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            );
          }

          /* Telefon Tek Sütunlu Akış (Mevcut düzen aynen korunur) */
          return (
            <>
              <WeeklyCalendarStrip
                selectedDate={selectedCalendarDate}
                onSelectDate={setSelectedCalendarDate}
                medicineLogsSummary={weeklyLogsSummary}
              />
              {renderBatchImportBanner()}
              {renderLowStockBanner()}
              {renderSectionHeader()}
              <CurrentDoseCard
                key={
                  currentReminder
                    ? `current-reminder-${currentReminder.reminderTime.id}`
                    : 'all-reminders-completed'
                }
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
              <TimeSlotGrid
                slots={groupedTimeline}
                activeSlotKey={activeSlotKey}
                onSelectSlot={slotKey => setActiveModalSlotKey(slotKey)}
                colors={colors}
                isDark={isDark}
                language={language}
              />
            </>
          );
        })()}

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

      {/* Acil Durum (SOS) Yardım Merkezi Modalı */}
      <EmergencySosModal
        visible={emergencyModalVisible}
        onClose={() => setEmergencyModalVisible(false)}
        userId={user?.uid}
        userName={user?.displayName || firstName || 'Hasta'}
        caregiverPhone={caregiverPhone}
        onNavigateToPharmacy={() => navigation.navigate('DutyPharmacy' as never)}
        colors={colors}
        language={language}
      />

      {/* Çoklu İlaç & Reçete AI İçe Aktarma Modalı */}
      <BatchMedicineImportModal
        visible={batchImportVisible}
        onClose={() => setBatchImportVisible(false)}
        onSuccess={() => onRefresh()}
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
  tabletContentContainer: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  tabletDashboardRow: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    marginTop: 10,
    alignItems: 'flex-start',
  },
  tabletLeftColumn: {
    flex: 1.1,
  },
  tabletRightColumn: {
    flex: 0.9,
    gap: 12,
  },
  tabletCalendarCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabletCalendarTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
  },
  tabletNoMargin: {
    marginHorizontal: 0,
  },
  tabletQuickActionsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 4,
  },
  tabletQuickActionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    marginLeft: 2,
  },
  tabletQuickActionsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  tabletQuickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  tabletQuickActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  batchImportBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  batchImportIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#4ECDC4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchImportTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  batchImportSubtitle: {
    fontSize: 14,
    marginTop: 1,
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
    fontSize: 14,
    fontWeight: '600',
  },
  slimLowStockAction: {
    paddingLeft: 6,
  },
  slimLowStockActionText: {
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '700',
  },
  doseSummaryText: {
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '600',
  },
  expiryMedicineDate: {
    fontSize: 14,
    marginTop: 2,
  },
});
