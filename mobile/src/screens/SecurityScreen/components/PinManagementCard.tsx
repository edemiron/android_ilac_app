/**
 * PinManagementCard — PIN Ayarla / Değiştir kartı
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface PinManagementCardProps {
  hasPin: boolean;
  onPressPinAction: () => void;
  colors: ThemeColors;
  isDark?: boolean;
  language: string;
}

export function PinManagementCard({
  hasPin,
  onPressPinAction,
  colors,
  isDark = false,
  language,
}: PinManagementCardProps) {
  const isTr = language === 'tr';

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Ionicons name="keypad" size={13} color="#F59E0B" style={{ marginRight: 6 }} />
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          {isTr ? 'PIN KODU YÖNETİMİ' : 'PIN MANAGEMENT'}
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
        <TouchableOpacity style={styles.row} onPress={onPressPinAction} activeOpacity={0.7}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.22)' : 'rgba(245, 158, 11, 0.15)',
                borderColor: isDark ? 'rgba(245, 158, 11, 0.40)' : 'rgba(245, 158, 11, 0.30)',
              },
            ]}
          >
            <Ionicons name="keypad" size={18} color="#F59E0B" />
          </View>

          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.text }]}>
              {hasPin
                ? isTr
                  ? 'PIN Kodunu Değiştir'
                  : 'Change PIN Code'
                : isTr
                  ? '4 Haneli PIN Oluştur'
                  : 'Create 4-Digit PIN'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {hasPin
                ? isTr
                  ? 'Mevcut PIN kodunuzu güncelleyin'
                  : 'Update your current security PIN'
                : isTr
                  ? 'Girişte sormak üzere bir şifre belirleyin'
                  : 'Set a password to require on app start'}
            </Text>
          </View>

          <View style={styles.rightBadge}>
            <View
              style={[
                styles.badgePill,
                {
                  backgroundColor: hasPin
                    ? isDark
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(16, 185, 129, 0.10)'
                    : isDark
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(245, 158, 11, 0.10)',
                  borderColor: hasPin ? 'rgba(16, 185, 129, 0.30)' : 'rgba(245, 158, 11, 0.30)',
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: hasPin ? colors.success || '#10B981' : '#F59E0B' },
                ]}
              >
                {hasPin ? (isTr ? '✓ Aktif' : '✓ Active') : isTr ? '+ Ayarla' : '+ Set'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        </TouchableOpacity>
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
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
  },
  textContainer: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  rightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
});
