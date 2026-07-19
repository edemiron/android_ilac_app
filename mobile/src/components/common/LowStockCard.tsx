/**
 * LowStockCard — Sprint 58.5.
 *
 * MD3 "Filled Tonal" uyarı kartı. Stok seviyesi düşük ilaçlar için.
 * Layout A ve Layout B'de ortak kullanılır.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Medicine } from '../../types';

export interface LowStockMedicine {
  name: string;
  stockCount: number;
  stockUnit?: string;
}

interface LowStockCardProps {
  medicines: Medicine[] | LowStockMedicine[];
  onPress?: () => void;
  onDismiss?: () => void;
}

function toLowStock(m: Medicine | LowStockMedicine): LowStockMedicine {
  if ('stockCount' in m) return m as LowStockMedicine;
  const med = m as Medicine;
  return {
    name: med.name,
    stockCount: med.stockCount ?? 0,
    stockUnit: (med as Medicine & { stockUnit?: string }).stockUnit,
  };
}

export function LowStockCard({ medicines, onPress, onDismiss }: LowStockCardProps) {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();

  if (medicines.length === 0) return null;

  const items = medicines.map(toLowStock);
  const subtitle = items
    .map(m => `${m.name} (${m.stockCount} ${m.stockUnit || 'adet'})`)
    .join(', ');

  // MD3 tonlu kart — primaryContainer benzeri, warning tonlu
  const bgColor = isDark ? '#3B2A0A' : '#FEF3C7';
  const iconBg = isDark ? '#78350F' : '#FDE68A';
  const iconColor = isDark ? '#FCD34D' : '#D97706';
  const titleColor = isDark ? '#FCD34D' : '#92400E';
  const subtitleColor = isDark ? '#FDE68A' : '#B45309';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <TouchableOpacity
        style={styles.content}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={(language === 'tr' ? 'Stok azalıyor: ' : 'Low stock: ') + subtitle}
      >
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          <Ionicons name="alert-circle" size={24} color={iconColor} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: titleColor }]}>
            {language === 'tr' ? 'Stok Azalıyor!' : 'Low Stock!'}
          </Text>
          <Text style={[styles.subtitle, { color: subtitleColor }]} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        {!onDismiss && <Ionicons name="chevron-forward" size={20} color={iconColor} />}
      </TouchableOpacity>
      {onDismiss && (
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={onDismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={language === 'tr' ? 'Stok uyarısını kapat' : 'Dismiss stock alert'}
        >
          <Ionicons name="close-circle" size={22} color={iconColor} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    position: 'relative',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dismissBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});
