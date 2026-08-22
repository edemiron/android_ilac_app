/**
 * StatisticsScreen — Sağlık İstatistikleri ve Raporlama Ekranı
 *
 * Design Pattern: Presenter Pattern / Declarative View
 * Tüm veri türetme ve PDF akışları `useStatisticsController` Presenter Hook'una
 * delege edilmiştir. Bu dosya yalnızca UI düzeni ve sekme organizasyonundan sorumludur.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ScreenHeader } from '../components/common/ScreenHeader';

// Alt Bileşenler (Modular UI)
import { Section } from './StatisticsScreen/components/Section';
import { MonthCalendarView } from './StatisticsScreen/components/MonthCalendarView';
import { HeroAdherenceCard } from './StatisticsScreen/components/HeroAdherenceCard';
import { PeriodSelector } from './StatisticsScreen/components/PeriodSelector';
import { SummaryStatGrid } from './StatisticsScreen/components/SummaryStatGrid';
import { AdherenceLineChart } from './StatisticsScreen/components/AdherenceLineChart';
import { DistributionBars } from './StatisticsScreen/components/DistributionBars';
import { RecentAdherenceHistory } from './StatisticsScreen/components/RecentAdherenceHistory';
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
    suggestions,
    chartData,
    chartConfig,
    medicines,
    reminderTimes,
    medicineLogs,
    showPDFOptions,
  } = useStatisticsController();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        title={language === 'tr' ? 'Sağlık İstatistikleri' : 'Health Statistics'}
        subtitle={
          language === 'tr'
            ? `%${overallStats.adherenceRate} genel uyum oranı`
            : `${overallStats.adherenceRate}% adherence rate`
        }
      />

      {/* 2-Sekmeli Görünüm Seçici (Özet & Grafikler / Uyum Takvimi) */}
      <View style={styles.tabSwitcherWrapper}>
        <View
          style={[
            styles.tabSwitcher,
            {
              backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
              borderColor: isDark ? '#334155' : '#E2E8F0',
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
          >
            <Ionicons
              name="pie-chart"
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
              {language === 'tr' ? 'Özet & Grafikler' : 'Overview & Charts'}
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
              {language === 'tr' ? 'Uyum Takvimi' : 'Adherence Calendar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeStatsTab === 'overview' ? (
        <>
          {/* 1. Hero Uyum Kartı (Circular Progress + Streak) */}
          <HeroAdherenceCard
            overallStats={overallStats}
            selectedPeriod={selectedPeriod}
            colors={colors}
            isDark={isDark}
            language={language}
          />

          {/* 2. PDF Rapor Butonu */}
          <View style={styles.pdfButtonWrapper}>
            <TouchableOpacity
              style={[styles.pdfButton, { backgroundColor: colors.primary }]}
              onPress={showPDFOptions}
              disabled={isGeneratingPDF}
              activeOpacity={0.8}
            >
              {isGeneratingPDF ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.pdfButtonText}>
                    {language === 'tr' ? 'Doktora PDF Raporu Gönder' : 'Generate & Share PDF'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* 3. Kaçırılan Doz Önerileri */}
          {suggestions.length > 0 && (
            <Section
              icon="💡"
              title={language === 'tr' ? 'ÖNERİLER' : 'SUGGESTIONS'}
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
                  <View style={[styles.suggestionIconContainer, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={styles.suggestionEmoji}>⚠️</Text>
                  </View>
                  <View style={styles.suggestionContent}>
                    <Text style={[styles.suggestionText, { color: colors.text }]}>
                      {language === 'tr'
                        ? `${suggestion.time} dozunu sık kaçırıyorsun`
                        : `You often miss the ${suggestion.time} dose`}
                    </Text>
                    <Text style={[styles.suggestionHint, { color: colors.textMuted }]}>
                      {language === 'tr'
                        ? `Son ${selectedPeriod === 'weekly' ? '7' : '30'} günde ${suggestion.missedCount} kez`
                        : `${suggestion.missedCount} times in the last ${selectedPeriod === 'weekly' ? '7' : '30'} days`}
                    </Text>
                  </View>
                </View>
              ))}
            </Section>
          )}

          {/* 4. Dönem Seçici */}
          <Section
            icon="📅"
            title={language === 'tr' ? 'DÖNEM SEÇİMİ' : 'PERIOD'}
            colors={colors}
            isDark={isDark}
          >
            <PeriodSelector
              selectedPeriod={selectedPeriod}
              onSelectPeriod={setSelectedPeriod}
              colors={colors}
              t={t}
            />
          </Section>

          {/* 5. Özet Karo Izgarası */}
          <Section
            icon="📈"
            title={language === 'tr' ? 'ÖZET' : 'SUMMARY'}
            colors={colors}
            isDark={isDark}
          >
            <SummaryStatGrid
              overallStats={overallStats}
              colors={colors}
              t={t}
              language={language}
            />
          </Section>

          {/* 6. Uyum Çizgi Grafiği */}
          <Section
            icon="📉"
            title={language === 'tr' ? 'UYUM GRAFİĞİ' : 'ADHERENCE CHART'}
            colors={colors}
            isDark={isDark}
          >
            <AdherenceLineChart
              dailyStats={dailyStats}
              chartData={chartData}
              chartConfig={chartConfig}
              colors={colors}
              t={t}
            />
          </Section>

          {/* 7. Alındı / Atlandı / Kaçırıldı Dağılımı */}
          {overallStats.total > 0 && (
            <Section
              icon="🥧"
              title={language === 'tr' ? 'DAĞILIM' : 'DISTRIBUTION'}
              colors={colors}
              isDark={isDark}
            >
              <DistributionBars
                overallStats={overallStats}
                colors={colors}
                t={t}
                language={language}
              />
            </Section>
          )}

          {/* 8. Son 7 Günlük Kompakt Geçmiş */}
          <Section icon="📜" title={t('stats_history')} colors={colors} isDark={isDark}>
            <RecentAdherenceHistory
              dailyStats={dailyStats}
              dateLocale={dateLocale}
              colors={colors}
            />
          </Section>
        </>
      ) : (
        <>
          {/* 9. Aylık İnteraktif Takvim Görünümü */}
          <Section
            icon="🗓️"
            title={language === 'tr' ? 'AYLIK UYUM TAKVİMİ' : 'MONTHLY ADHERENCE CALENDAR'}
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

          {/* 10. Doktora PDF Raporu Gönderme Kartı */}
          <Section
            icon="📋"
            title={language === 'tr' ? 'DOKTOR & ECZACI RAPORU' : 'CLINICAL REPORT'}
            colors={colors}
            isDark={isDark}
          >
            <DoctorReportCard
              onShowPDFOptions={showPDFOptions}
              isGeneratingPDF={isGeneratingPDF}
              colors={colors}
              language={language}
            />
          </Section>
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabSwitcherWrapper: {
    paddingHorizontal: 16,
    marginBottom: 12,
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
  pdfButtonWrapper: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pdfButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  suggestionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionEmoji: {
    fontSize: 18,
  },
  suggestionContent: {
    flex: 1,
    marginLeft: 12,
  },
  suggestionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  suggestionHint: {
    fontSize: 13,
    marginTop: 2,
  },
});
