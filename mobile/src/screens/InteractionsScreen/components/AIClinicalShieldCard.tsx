/**
 * AIClinicalShieldCard — Gemini 3.6 Flash Klinik ve Yaşam Tarzı Rapor Kartı
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { ThemeColors } from '../../../contexts/ThemeContext';
import type { ClinicalInteractionAIReport } from '../../../services/aiMedicineService';
import { getSeverityColor } from '../../../services/drugInteraction';

interface AIClinicalShieldCardProps {
  report: ClinicalInteractionAIReport | null;
  isLoading: boolean;
  onRefresh: () => void;
  colors: ThemeColors;
  language: string;
}

export const AIClinicalShieldCard: React.FC<AIClinicalShieldCardProps> = ({
  report,
  isLoading,
  onRefresh,
  colors,
  language,
}) => {
  const isTr = language === 'tr';

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FF9800';
    return '#F44336';
  };

  return (
    <View style={styles.container}>
      {/* AI Header / Trigger Card */}
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.primary + '30',
          },
        ]}
      >
        <View style={styles.heroHeader}>
          <View style={styles.heroTitleRow}>
            <Text style={styles.aiBadge}>🤖 Gemini 3.6 Flash</Text>
            <Text style={[styles.heroTitle, { color: colors.text }]}>
              {isTr ? 'Klinik Güvenlik Analizi' : 'Clinical Safety Analysis'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: colors.primary }]}
            onPress={onRefresh}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="sparkles" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.refreshButtonText}>{isTr ? 'Analiz Et' : 'Analyze'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
          {isTr
            ? 'Kullandığınız tüm ilaçları, reçeteleri ve dozajları yapay zeka ile çapraz analiz ederek kişiselleştirilmiş klinik güvenlik raporu oluşturun.'
            : 'Cross-analyze all your active medications, prescriptions, and dosages with AI to generate a personalized clinical report.'}
        </Text>
      </View>

      {/* Rapor İçeriği */}
      {isLoading ? (
        <View style={[styles.loadingBox, { backgroundColor: colors.card }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {isTr
              ? 'TİTCK ve FDA farmakolojik veri tabanları ile yapay zeka klinik analizi yapılıyor...'
              : 'Running AI clinical analysis against pharmacology databases...'}
          </Text>
        </View>
      ) : report ? (
        <View style={styles.reportContainer}>
          {/* Güvenlik Skoru & Özet */}
          <View style={[styles.scoreCard, { backgroundColor: colors.card }]}>
            <View style={styles.scoreRow}>
              <View
                style={[
                  styles.scoreBadge,
                  { backgroundColor: getScoreColor(report.overallSafetyScore) + '20' },
                ]}
              >
                <Text
                  style={[styles.scoreNumber, { color: getScoreColor(report.overallSafetyScore) }]}
                >
                  {report.overallSafetyScore}
                </Text>
                <Text
                  style={[styles.scoreLabel, { color: getScoreColor(report.overallSafetyScore) }]}
                >
                  /100
                </Text>
              </View>

              <View style={styles.summaryContainer}>
                <Text style={[styles.summaryTitle, { color: colors.text }]}>
                  {report.overallSafetyScore >= 80
                    ? isTr
                      ? '✅ Güvenli Kombinasyon'
                      : '✅ Safe Combination'
                    : report.overallSafetyScore >= 60
                      ? isTr
                        ? '⚠️ Dikkat Edilmeli'
                        : '⚠️ Caution Advised'
                      : isTr
                        ? '🚨 Yüksek Klinik Risk'
                        : '🚨 High Clinical Risk'}
                </Text>
                <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                  {report.summary}
                </Text>
              </View>
            </View>
          </View>

          {/* Kritik Uyarılar */}
          {report.criticalAlerts && report.criticalAlerts.length > 0 ? (
            <View
              style={[
                styles.sectionBox,
                { backgroundColor: '#F4433615', borderColor: '#F4433630' },
              ]}
            >
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderIcon}>🚨</Text>
                <Text style={[styles.sectionHeaderTitle, { color: '#F44336' }]}>
                  {isTr ? 'Kritik Etkileşim Uyarıları' : 'Critical Interaction Alerts'}
                </Text>
              </View>
              {report.criticalAlerts.map((alert, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <Text style={[styles.bulletDot, { color: '#F44336' }]}>•</Text>
                  <Text style={[styles.bulletText, { color: colors.text }]}>{alert}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Besin & İçecek Uyarıları */}
          {report.foodDrinkWarnings && report.foodDrinkWarnings.length > 0 ? (
            <View style={styles.foodWarningsContainer}>
              <Text style={[styles.subSectionTitle, { color: colors.text }]}>
                {isTr ? '🥗 AI Besin & İçecek Rehberi' : '🥗 AI Dietary Guidelines'}
              </Text>
              {report.foodDrinkWarnings.map((fw, idx) => {
                const sColor = getSeverityColor(fw.severity || 'moderate');
                return (
                  <View
                    key={idx}
                    style={[
                      styles.foodCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: sColor + '30',
                      },
                    ]}
                  >
                    <View style={styles.foodCardHeader}>
                      <Text style={[styles.foodName, { color: colors.text }]}>{fw.food}</Text>
                      <Text style={[styles.affectedMed, { color: colors.primary }]}>
                        {fw.affectedMedicine}
                      </Text>
                    </View>
                    <Text style={[styles.foodWarningText, { color: colors.textSecondary }]}>
                      {fw.warning}
                    </Text>
                    {fw.timingRule ? (
                      <View style={[styles.aiTimingBox, { backgroundColor: colors.background }]}>
                        <Text style={styles.aiTimingIcon}>⏰</Text>
                        <Text style={[styles.aiTimingText, { color: colors.text }]}>
                          {fw.timingRule}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* Yaşam Tarzı & Klinik İpuçları */}
          {report.lifestyleTips && report.lifestyleTips.length > 0 ? (
            <View
              style={[
                styles.sectionBox,
                { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' },
              ]}
            >
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderIcon}>💡</Text>
                <Text style={[styles.sectionHeaderTitle, { color: colors.primary }]}>
                  {isTr ? 'Klinik Yaşam & Kullanım İpuçları' : 'Lifestyle & Clinical Tips'}
                </Text>
              </View>
              {report.lifestyleTips.map((tip, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <Text style={[styles.bulletDot, { color: colors.primary }]}>•</Text>
                  <Text style={[styles.bulletText, { color: colors.text }]}>{tip}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  heroCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroTitleRow: {
    flex: 1,
    marginRight: 10,
  },
  aiBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A2BE2',
    marginBottom: 2,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingBox: {
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  reportContainer: {
    marginTop: 4,
  },
  scoreCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  scoreNumber: {
    fontSize: 22,
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  summaryContainer: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeaderIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bulletDot: {
    fontSize: 16,
    marginRight: 8,
    lineHeight: 20,
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  foodWarningsContainer: {
    marginBottom: 14,
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  foodCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  foodCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  foodName: {
    fontSize: 15,
    fontWeight: '700',
  },
  affectedMed: {
    fontSize: 12,
    fontWeight: '700',
  },
  foodWarningText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  aiTimingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  aiTimingIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  aiTimingText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
});
