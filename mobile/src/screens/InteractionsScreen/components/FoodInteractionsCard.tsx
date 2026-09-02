/**
 * FoodInteractionsCard — İlaç - Gıda, Alkol ve Yaşam Tarzı Etkileşim Kartları
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ThemeColors } from '../../../contexts/ThemeContext';
import type { MatchedFoodInteraction } from '../../../services/foodDrugInteractions';
import { getSeverityColor } from '../../../services/drugInteraction';

interface FoodInteractionsCardProps {
  interactions: MatchedFoodInteraction[];
  colors: ThemeColors;
  language: string;
}

export const FoodInteractionsCard: React.FC<FoodInteractionsCardProps> = ({
  interactions,
  colors,
  language,
}) => {
  const isTr = language === 'tr';

  if (!interactions || interactions.length === 0) {
    return (
      <View
        style={[
          styles.emptyCard,
          {
            backgroundColor: colors.success + '15',
            borderColor: colors.success + '30',
          },
        ]}
      >
        <Text style={styles.emptyIcon}>🥗</Text>
        <View style={styles.emptyTextContainer}>
          <Text style={[styles.emptyTitle, { color: colors.success }]}>
            {isTr ? 'Gıda & Alkol Etkileşimi Bulunamadı' : 'No Food & Alcohol Interactions'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {isTr
              ? 'Kayıtlı ilaçlarınızla bilinen kritik bir gıda veya içecek kısıtlaması tespit edilmedi.'
              : 'No major food or beverage restrictions found for your current medicines.'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.summaryBar}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {isTr
            ? `Besin & İçecek Kısıtlamaları (${interactions.length})`
            : `Dietary & Beverage Restrictions (${interactions.length})`}
        </Text>
      </View>

      {interactions.map(item => {
        const severityColor = getSeverityColor(item.severity);

        return (
          <View
            key={item.id}
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: severityColor + '40',
              },
            ]}
          >
            {/* Header: İlaç & Kategori */}
            <View style={styles.cardHeader}>
              <View style={styles.titleRow}>
                <Text style={styles.icon}>{item.icon}</Text>
                <View>
                  <Text style={[styles.medicineName, { color: colors.text }]}>
                    {item.medicineName}
                  </Text>
                  <Text style={[styles.categoryTitle, { color: colors.textSecondary }]}>
                    {item.categoryTitle}
                  </Text>
                </View>
              </View>

              <View style={[styles.severityBadge, { backgroundColor: severityColor + '20' }]}>
                <Text style={[styles.severityText, { color: severityColor }]}>
                  {item.severity === 'high'
                    ? isTr
                      ? 'Kritik Risk'
                      : 'High Risk'
                    : isTr
                      ? 'Dikkat'
                      : 'Caution'}
                </Text>
              </View>
            </View>

            {/* Etki & Açıklama */}
            <Text style={[styles.effectText, { color: colors.text }]}>{item.effect}</Text>

            {/* Zamanlama Kuralı (Varsa) */}
            {item.timingRule ? (
              <View
                style={[
                  styles.timingBox,
                  { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' },
                ]}
              >
                <Text style={styles.timingIcon}>⏰</Text>
                <Text style={[styles.timingText, { color: colors.primary }]}>
                  {item.timingRule}
                </Text>
              </View>
            ) : null}

            {/* Klinik Öneri */}
            <View style={[styles.recommendationBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.recommendationLabel, { color: colors.primary }]}>
                {isTr ? '💡 Klinik Tavsiye:' : '💡 Clinical Advice:'}
              </Text>
              <Text style={[styles.recommendationText, { color: colors.textSecondary }]}>
                {item.recommendation}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  summaryBar: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  emptyTextContainer: {
    flex: 1,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  icon: {
    fontSize: 26,
    marginRight: 10,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '700',
  },
  categoryTitle: {
    fontSize: 12,
    marginTop: 1,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  effectText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  timingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  timingIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  timingText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  recommendationBox: {
    padding: 12,
    borderRadius: 12,
  },
  recommendationLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
