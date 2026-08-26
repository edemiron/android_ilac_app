/**
 * StatisticsScreen — Sağlık & Tedavi Karnesi Ekranı
 *
 * Design Pattern: Presenter Pattern / Declarative View
 * 2026 Modern Health Scorecard & Adherence Architecture:
 * - 🏆 Hero Sağlık Karnesi (Dairesel İlerleme, Başarı Derecesi, Streak ve İnsani Klinik İçgörü)
 * - 📅 Haftalık Doz Takip Çubukları (Borsa çizgisi yerine gün gün net ilaç tamamlama)
 * - 💊 İlaç Bazlı Başarı Analizi (Her ilacın kendi renk aksanlı disiplin karnesi)
 * - 🩺 Hekim & Eczacı Resmi Klinik PDF Raporu Paylaşımı
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ScreenHeader } from '../components/common/ScreenHeader';

// Alt Bileşenler (Modular UI)
import { Section } from './StatisticsScreen/components/Section';
import { MonthCalendarView } from './StatisticsScreen/components/MonthCalendarView';
import { HeroAdherenceCard } from './StatisticsScreen/components/HeroAdherenceCard';
import { PeriodSelector } from './StatisticsScreen/components/PeriodSelector';
import { WeeklyDoseTracker } from './StatisticsScreen/components/WeeklyDoseTracker';
import { MedicineBreakdownList } from './StatisticsScreen/components/MedicineBreakdownList';
import { DoctorReportCard } from './StatisticsScreen/components/DoctorReportCard';

// Presenter Hook
import { useStatisticsController } from './StatisticsScreen/hooks/useStatisticsController';

export default function StatisticsScreen() {
  const {
    colors,
    isDark,
    t,
    language,
    dateLocale,
    selectedPeriod,
    setSelectedPeriod,
    activeStatsTab,
    setActiveStatsTab,
    isGeneratingPDF,
    dailyStats,
    overallStats,
    healthInsight,
    medicineBreakdown,
    suggestions,
    medicines,
    reminderTimes,
    medicineLogs,
    showPDFOptions,
  } = useStatisticsController();

  const isTr = language === 'tr';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title={isTr ? 'Sağlık & Tedavi Karnesi' : 'Health Scorecard'}
          subtitle={
            isTr
              ? `%${overallStats.adherenceRate} Uyum • ${selectedPeriod === 'weekly' ? 'Haftalık Rapor' : 'Aylık Rapor'}`
              : `${overallStats.adherenceRate}% Adherence • ${selectedPeriod === 'weekly' ? 'Weekly' : 'Monthly'}`
          }
        />

        {/* 2-Sekmeli Görünüm Seçici (Karnem & Analiz / Uyum Takvimi) */}
        <View style={styles.tabSwitcherWrapper}>
          <View
            style={[
              styles.tabSwitcher,
              {
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#F1F5F9',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setActiveStatsTab('overview')}
              style={[
                styles.tabButton,
                activeStatsTab === 'overview' && {
                  backgroundColor: colors.primary,
                  ...styles.activeTabShadow,
                },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeStatsTab === 'overview' }}
            >
              <Ionicons
                name="stats-chart"
                size={16}
                color={activeStatsTab === 'overview' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  {
                    fontWeight: activeStatsTab === 'overview' ? '700' : '600',
                    color: activeStatsTab === 'overview' ? '#FFFFFF' : colors.textSecondary,
                  },
                ]}
              >
                {isTr ? 'Sağlık Karnem' : 'Scorecard'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveStatsTab('calendar')}
              style={[
                styles.tabButton,
                activeStatsTab === 'calendar' && {
                  backgroundColor: colors.primary,
                  ...styles.activeTabShadow,
                },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeStatsTab === 'calendar' }}
            >
              <Ionicons
                name="calendar"
                size={16}
                color={activeStatsTab === 'calendar' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  {
                    fontWeight: activeStatsTab === 'calendar' ? '700' : '600',
                    color: activeStatsTab === 'calendar' ? '#FFFFFF' : colors.textSecondary,
                  },
                ]}
              >
                {isTr ? 'Uyum Takvimi' : 'Calendar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {activeStatsTab === 'overview' ? (
          <>
            {/* 1. Hero Sağlık Karnesi & Canlı Başarı Paneli */}
            <HeroAdherenceCard
              overallStats={overallStats}
              selectedPeriod={selectedPeriod}
              healthInsight={healthInsight}
              colors={colors}
              isDark={isDark}
              language={language}
            />

            {/* 2. Dönem Seçici (Haftalık / Aylık) */}
            <PeriodSelector
              selectedPeriod={selectedPeriod}
              onSelectPeriod={setSelectedPeriod}
              colors={colors}
              t={t}
            />

            {/* 3. Günlük Doz Takip Çubukları */}
            <WeeklyDoseTracker
              dailyStats={dailyStats}
              colors={colors}
              isDark={isDark}
              language={language}
            />

            {/* 4. İlaç Bazlı Başarı & Disiplin Analizi */}
            <MedicineBreakdownList
              medicines={medicineBreakdown}
              colors={colors}
              isDark={isDark}
              language={language}
            />

            {/* 5. Akıllı Hatırlatıcı & Doz Önerileri (Eğer Varsa) */}
            {suggestions.length > 0 && (
              <Section
                icon="💡"
                title={isTr ? 'AKILLI ÖNERİLER' : 'SMART SUGGESTIONS'}
                colors={colors}
                isDark={isDark}
              >
                {suggestions.map((suggestion, index) => (
                  <View
                    key={suggestion.time}
                    style={[
                      styles.suggestionRow,
                      index > 0 && {
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: colors.divider,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.suggestionIconContainer,
                        {
                          backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
                        },
                      ]}
                    >
                      <Text style={styles.suggestionEmoji}>⚠️</Text>
                    </View>
                    <View style={styles.suggestionContent}>
                      <Text style={[styles.suggestionText, { color: colors.text }]}>
                        {isTr
                          ? `${suggestion.time} dozunu sık kaçırıyorsunuz`
                          : `You frequently miss the ${suggestion.time} dose`}
                      </Text>
                      <Text style={[styles.suggestionHint, { color: colors.textMuted }]}>
                        {isTr
                          ? `Son ${selectedPeriod === 'weekly' ? '7' : '30'} günde ${suggestion.missedCount} kez atlandı. Alarm saatinizi gözden geçirebilirsiniz.`
                          : `Missed ${suggestion.missedCount} times in the last ${selectedPeriod === 'weekly' ? '7' : '30'} days.`}
                      </Text>
                    </View>
                  </View>
                ))}
              </Section>
            )}

            {/* 6. Hekim & Eczacı Klinik Raporu Paylaşım Kartı */}
            <DoctorReportCard
              onShowPDFOptions={showPDFOptions}
              isGeneratingPDF={isGeneratingPDF}
              colors={colors}
              isDark={isDark}
              language={language}
            />
          </>
        ) : (
          <>
            {/* 7. Aylık İnteraktif Takvim Görünümü */}
            <Section
              icon="🗓️"
              title={isTr ? 'AYLIK UYUM TAKVİMİ' : 'MONTHLY ADHERENCE CALENDAR'}
              colors={colors}
              isDark={isDark}
            >
              <MonthCalendarView
                medicines={medicines}
                reminderTimes={reminderTimes}
                medicineLogs={medicineLogs}
                colors={colors}
                isDark={isDark}
              />
            </Section>

            {/* 8. Doktora PDF Raporu Gönderme Kartı */}
            <DoctorReportCard
              onShowPDFOptions={showPDFOptions}
              isGeneratingPDF={isGeneratingPDF}
              colors={colors}
              isDark={isDark}
              language={language}
            />
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  tabSwitcherWrapper: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  tabSwitcher: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  activeTabShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 13,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  suggestionIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionEmoji: {
    fontSize: 18,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionText: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  suggestionHint: {
    fontSize: 12,
    lineHeight: 16,
  },
});
