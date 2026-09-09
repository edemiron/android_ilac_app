/**
 * FoodInteractionBadgeList.tsx — Gıda-İlaç Etkileşim Rozetleri (Sprint 104)
 *
 * İlaç adı seçildiğinde otomatik olarak süt, greyfurt, alkol, güneş ve aç karnına
 * kısıtlamalarını görsel rozetler ve açıklayıcı uyarılarla sunar.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { FoodInteractionType } from '../../types';
import { FOOD_INTERACTION_DETAILS } from '../../utils/clinicalSafetyEngine';
import type { ThemeColors } from '../../contexts/ThemeContext';

interface FoodInteractionBadgeListProps {
  interactions: FoodInteractionType[];
  colors: ThemeColors;
  language: 'tr' | 'en';
}

export function FoodInteractionBadgeList({
  interactions,
  colors,
  language,
}: FoodInteractionBadgeListProps) {
  const [selectedType, setSelectedType] = useState<FoodInteractionType | null>(null);

  if (!interactions || interactions.length === 0) return null;

  const selectedInfo = selectedType ? FOOD_INTERACTION_DETAILS[selectedType] : null;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {language === 'tr'
          ? '🥗 Kritik Gıda & Kullanım Kısıtlamaları:'
          : '🥗 Critical Food & Usage Warnings:'}
      </Text>

      <View style={styles.badgeRow}>
        {interactions.map(type => {
          const info = FOOD_INTERACTION_DETAILS[type];
          if (!info) return null;

          const isCritical = info.severity === 'critical';

          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.badge,
                {
                  backgroundColor: isCritical ? '#FEF2F2' : '#FFFBEB',
                  borderColor: isCritical ? '#FCA5A5' : '#FDE68A',
                },
              ]}
              onPress={() => setSelectedType(type)}
              activeOpacity={0.7}
            >
              <Text style={styles.badgeIcon}>{info.icon}</Text>
              <Text style={[styles.badgeText, { color: isCritical ? '#991B1B' : '#92400E' }]}>
                {language === 'tr' ? info.titleTr : info.titleEn}
              </Text>
              <Ionicons
                name="information-circle-outline"
                size={14}
                color={isCritical ? '#DC2626' : '#D97706'}
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Açıklama Modalı */}
      <Modal
        visible={Boolean(selectedType)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedType(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            {selectedInfo && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalIcon}>{selectedInfo.icon}</Text>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {language === 'tr' ? selectedInfo.titleTr : selectedInfo.titleEn}
                  </Text>
                </View>

                <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
                  {language === 'tr' ? selectedInfo.warningTr : selectedInfo.warningEn}
                </Text>

                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.primary }]}
                  onPress={() => setSelectedType(null)}
                >
                  <Text style={styles.modalButtonText}>
                    {language === 'tr' ? 'Anladım' : 'Got it'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  modalBody: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 18,
  },
  modalButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
