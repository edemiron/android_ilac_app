/**
 * AutoLockCard — Otomatik kilit zaman aşımı seçim kartı
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface AutoLockCardProps {
  lockTimeout: number;
  onSelectTimeout: (timeout: number) => void;
  colors: ThemeColors;
  isDark?: boolean;
  language: string;
}

export function AutoLockCard({
  lockTimeout,
  onSelectTimeout,
  colors,
  isDark = false,
  language,
}: AutoLockCardProps) {
  const isTr = language === 'tr';
  const timeoutOptions = [0, 1, 5, 15, 30];

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Ionicons name="time" size={13} color="#8B5CF6" style={{ marginRight: 6 }} />
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          {isTr ? 'OTOMATİK KİLİT ZAMAN AŞIMI' : 'AUTO-LOCK TIMEOUT'}
        </Text>
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          },
        ]}
      >
        <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
          {isTr
            ? 'Uygulama arka planda kaldığında ne kadar süre sonra kilitlensin:'
            : 'Lock after app remains in background for:'}
        </Text>

        {/* Single-Row Segmented Capsule Bar */}
        <View
          style={[
            styles.segmentedBar,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#E2E8F0',
            },
          ]}
        >
          {timeoutOptions.map(minutes => {
            const isSelected = lockTimeout === minutes;
            const label =
              minutes === 0 ? (isTr ? 'Hemen' : 'Now') : `${minutes} ${isTr ? 'dk' : 'm'}`;

            return (
              <TouchableOpacity
                key={minutes}
                style={[
                  styles.segmentButton,
                  isSelected && [
                    styles.segmentButtonActive,
                    {
                      backgroundColor: isDark ? '#8B5CF6' : '#FFFFFF',
                    },
                  ],
                ]}
                onPress={() => onSelectTimeout(minutes)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    {
                      color: isSelected
                        ? isDark
                          ? '#FFFFFF'
                          : '#0F172A'
                        : isDark
                          ? '#94A3B8'
                          : '#64748B',
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSubtitle: {
    fontSize: 12.5,
    lineHeight: 17,
    marginBottom: 12,
  },
  segmentedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 16,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  segmentButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentButtonText: {
    fontSize: 12,
  },
});
