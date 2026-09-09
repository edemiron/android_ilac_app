/**
 * InteractionDetailCard — Tekil İlaç Etkileşim Detayı Kartı
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ThemeColors } from '../../../contexts/ThemeContext';
import {
  type DrugInteraction,
  getSeverityColor,
  getSeverityIcon,
} from '../../../services/drugInteraction';

interface InteractionDetailCardProps {
  interaction: DrugInteraction;
  getSeverityText: (severity: DrugInteraction['severity']) => string;
  colors: ThemeColors;
  language: string;
}

export function InteractionDetailCard({
  interaction,
  getSeverityText,
  colors,
  language,
}: InteractionDetailCardProps) {
  const severityColor = getSeverityColor(interaction.severity);
  const severityIcon = getSeverityIcon(interaction.severity);

  return (
    <View style={[styles.interactionCard, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.drugsContainer}>
          <Text style={[styles.drugName, { color: colors.text }]}>{interaction.drug1}</Text>
          <Text style={[styles.plusSign, { color: colors.textMuted }]}>+</Text>
          <Text style={[styles.drugName, { color: colors.text }]}>{interaction.drug2}</Text>
        </View>
        <View style={[styles.severityBadge, { backgroundColor: severityColor + '20' }]}>
          <Text style={styles.severityIcon}>{severityIcon}</Text>
          <Text style={[styles.severityText, { color: severityColor }]}>
            {getSeverityText(interaction.severity)}
          </Text>
        </View>
      </View>

      {/* Description */}
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {interaction.description}
      </Text>

      {/* Recommendation */}
      {interaction.recommendation ? (
        <View style={[styles.actionContainer, { backgroundColor: colors.background }]}>
          <Text style={[styles.actionLabel, { color: colors.primary }]}>
            {language === 'tr' ? 'Öneri:' : 'Recommendation:'}
          </Text>
          <Text style={[styles.actionText, { color: colors.text }]}>
            {interaction.recommendation}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  interactionCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  drugsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginRight: 8,
  },
  drugName: {
    fontSize: 16,
    fontWeight: '700',
  },
  plusSign: {
    marginHorizontal: 6,
    fontSize: 14,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  actionContainer: {
    padding: 12,
    borderRadius: 10,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
