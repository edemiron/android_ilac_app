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
  language: string;
}

export function AutoLockCard({
  lockTimeout,
  onSelectTimeout,
  colors,
  language,
}: AutoLockCardProps) {
  const timeoutOptions = [0, 1, 5, 15, 30];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}>
      <View style={[styles.cardHeader, { borderColor: colors.border }]}>
        <Ionicons name="time" size={20} color="#8B5CF6" />
        <Text style={[styles.cardTitle, { color: colors.text, marginLeft: 8 }]}>
          {language === 'tr' ? 'Otomatik Kilit' : 'Auto-Lock'}
        </Text>
      </View>

      <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
        {language === 'tr'
          ? 'Uygulama arka planda kaldığında ne kadar sonra kilitlensin'
          : 'Lock after app is in background'}
      </Text>

      <View style={styles.timeoutContainer}>
        {timeoutOptions.map(minutes => {
          const isSelected = lockTimeout === minutes;

          return (
            <TouchableOpacity
              key={minutes}
              style={[
                styles.timeoutButton,
                {
                  backgroundColor: isSelected ? colors.primary : colors.inputBackground,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onSelectTimeout(minutes)}
            >
              <Text
                style={[
                  styles.timeoutButtonText,
                  {
                    color: isSelected ? colors.textOnPrimary : colors.textSecondary,
                  },
                ]}
              >
                {minutes === 0
                  ? language === 'tr'
                    ? 'Hemen'
                    : 'Now'
                  : `${minutes} ${language === 'tr' ? 'dk' : 'min'}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  timeoutContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  timeoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 70,
    alignItems: 'center',
  },
  timeoutButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
