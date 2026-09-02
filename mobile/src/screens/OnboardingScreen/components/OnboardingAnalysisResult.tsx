import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions, ScrollView } from 'react-native';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface OnboardingAnalysisResultProps {
  answers: {
    target?: string | null;
    medCount?: string | null;
    concern?: string | null;
  };
  colors: ThemeColors;
  isDark: boolean;
  language: string;
}

export function OnboardingAnalysisResult({
  answers,
  colors,
  isDark,
  language,
}: OnboardingAnalysisResultProps) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const tr = language === 'tr';

  const isCaregiver = answers.target === 'parents' || answers.target === 'patient';
  const isMultiMed = answers.medCount === 'multi' || answers.medCount === 'heavy';

  return (
    <ScrollView
      style={[styles.container, { width: SCREEN_WIDTH }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Üst Rozet */}
      <View
        style={[
          styles.badge,
          {
            backgroundColor: isDark ? '#064E3B' : '#D1FAE5',
            borderColor: '#10B981',
          },
        ]}
      >
        <Text style={styles.badgeText}>
          {tr ? '✨ KİŞİSELLEŞTİRİLMİŞ SAĞLIK PLANI HAZIR' : '✨ PERSONALIZED PLAN READY'}
        </Text>
      </View>

      <Text style={[styles.mainTitle, { color: colors.text }]}>
        {tr ? 'Tedavi Uyum Başarınız:' : 'Your Treatment Adherence:'}
      </Text>

      {/* Skor & Uyum Kartı */}
      <View
        style={[
          styles.scoreCard,
          {
            backgroundColor: isDark ? colors.card : '#FFFFFF',
            borderColor: '#10B981',
          },
        ]}
      >
        <View style={styles.scoreRow}>
          <View style={styles.circleGraphic}>
            <Text style={styles.scorePercent}>%98.4</Text>
            <Text style={styles.scoreSubtext}>{tr ? 'Hedef Uyum' : 'Target Rate'}</Text>
          </View>
          <View style={styles.scoreExplanation}>
            <Text style={[styles.scoreHeadline, { color: colors.text }]}>
              {tr ? 'Kritik Riskler Sıfırlandı' : 'Critical Risks Minimized'}
            </Text>
            <Text style={[styles.scoreBody, { color: colors.textSecondary }]}>
              {tr
                ? 'Akıllı fail-safe alarmlar ve reçete senkronizasyonu ile doz atlama riski ortadan kalktı.'
                : 'With smart fail-safe alarms and sync, missed dose risks are eliminated.'}
            </Text>
          </View>
        </View>
      </View>

      {/* Plan Özeti & Koruma Maddeleri */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {tr ? '🛡️ Size Özel Aktif Edilen Kalkanlar' : '🛡️ Your Activated Protection Shields'}
      </Text>

      <View style={styles.shieldsList}>
        {/* 1. Exact Alarm Kalkanı */}
        <View style={[styles.shieldItem, { backgroundColor: isDark ? colors.card : '#F8FAFC' }]}>
          <Text style={styles.shieldIcon}>⏰</Text>
          <View style={styles.shieldTextWrap}>
            <Text style={[styles.shieldTitle, { color: colors.text }]}>
              {tr ? 'Arka Planda Susmayan Fail-Safe Alarm' : 'Fail-Safe Background Alarms'}
            </Text>
            <Text style={[styles.shieldDesc, { color: colors.textSecondary }]}>
              {tr
                ? 'Xiaomi, Samsung ve tüm Android cihazlarda pil kısıtlamalarına takılmadan çalar.'
                : 'Bypasses battery optimizations on Xiaomi, Samsung, and Android devices.'}
            </Text>
          </View>
        </View>

        {/* 2. Bakıcı veya Çift Yönlü Takip */}
        {isCaregiver ? (
          <View style={[styles.shieldItem, { backgroundColor: isDark ? colors.card : '#F8FAFC' }]}>
            <Text style={styles.shieldIcon}>👨‍👩‍👧‍👦</Text>
            <View style={styles.shieldTextWrap}>
              <Text style={[styles.shieldTitle, { color: colors.text }]}>
                {tr ? 'Çift Yönlü Bakıcı ve Aile Ağı' : 'Caregiver & Family Sync Network'}
              </Text>
              <Text style={[styles.shieldDesc, { color: colors.textSecondary }]}>
                {tr
                  ? 'İlaç alındığında anında onay bildirimi, aksamada otomatik SMS ve arama desteği.'
                  : 'Instant confirmation when taken, automatic alerts if a dose is delayed.'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.shieldItem, { backgroundColor: isDark ? colors.card : '#F8FAFC' }]}>
            <Text style={styles.shieldIcon}>📸</Text>
            <View style={styles.shieldTextWrap}>
              <Text style={[styles.shieldTitle, { color: colors.text }]}>
                {tr ? 'E-Reçete & Barkod ile Hızlı Giriş' : 'E-Prescription & Barcode Scanning'}
              </Text>
              <Text style={[styles.shieldDesc, { color: colors.textSecondary }]}>
                {tr
                  ? 'Kutuyu veya reçete kodunu kameraya gösterin, tüm saatler anında kurulsun.'
                  : 'Scan box or prescription code to auto-populate schedules in 2 seconds.'}
              </Text>
            </View>
          </View>
        )}

        {/* 3. İlaç ve Besin Etkileşimi */}
        {isMultiMed && (
          <View style={[styles.shieldItem, { backgroundColor: isDark ? colors.card : '#F8FAFC' }]}>
            <Text style={styles.shieldIcon}>⚠️</Text>
            <View style={styles.shieldTextWrap}>
              <Text style={[styles.shieldTitle, { color: colors.text }]}>
                {tr ? 'Klinik İlaç & Besin Etkileşim Koruması' : 'Drug & Food Interaction Guard'}
              </Text>
              <Text style={[styles.shieldDesc, { color: colors.textSecondary }]}>
                {tr
                  ? 'Aynı anda içilmemesi gereken ilaçları ve besin uyarılarını (örn. Greyfurt) bildirir.'
                  : 'Warns against dangerous concurrent medications and food conflicts.'}
              </Text>
            </View>
          </View>
        )}

        {/* 4. Reklamsızlık Garantisi */}
        <View style={[styles.shieldItem, { backgroundColor: isDark ? colors.card : '#F8FAFC' }]}>
          <Text style={styles.shieldIcon}>🚫</Text>
          <View style={styles.shieldTextWrap}>
            <Text style={[styles.shieldTitle, { color: colors.text }]}>
              {tr ? 'Sesli Oyun Reklamsız Deneyim' : 'Zero Intrusive Audio Ads'}
            </Text>
            <Text style={[styles.shieldDesc, { color: colors.textSecondary }]}>
              {tr
                ? 'İlaç alırken sizi asla rahatsız eden sesli reklamlarla bekletmez.'
                : 'Never interrupts your health routine with loud, forced ads.'}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  badgeText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
  scoreCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circleGraphic: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  scorePercent: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },
  scoreSubtext: {
    color: '#E6FFFA',
    fontSize: 10,
    fontWeight: '700',
  },
  scoreExplanation: {
    flex: 1,
  },
  scoreHeadline: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  scoreBody: {
    fontSize: 12,
    lineHeight: 17,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  shieldsList: {
    gap: 10,
  },
  shieldItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
  },
  shieldIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  shieldTextWrap: {
    flex: 1,
  },
  shieldTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  shieldDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
});
