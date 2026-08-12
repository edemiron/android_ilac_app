/**
 * StatsGrid.tsx — Sprint 98 Karol-inspired redesign.
 *
 * Karol "Özet Bilgiler" 2x2 grid'inin İlaç Hatırlatıcı uyarlaması.
 * 4 metrik hücresi: Bugün / Alınan / Bekleyen / Stok Uyarısı.
 * 4. hücre (Stok Uyarısı) tıklanabilir → MedicinesScreen.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { RootStackParamList } from '../../../types';
import { MotiPressable } from '../../../components/common/MotiPressable';
import { motiTransitions } from '../../../theme/moti-config';
import { IconBadge } from './IconBadge';

export interface StatsGridProps {
  /** Bugünkü toplam doz sayısı. */
  totalCount: number;
  /** Alınan doz sayısı. */
  completedCount: number;
  /** Bekleyen doz sayısı. */
  remainingCount: number;
  /** Stok uyarısı olan ilaç sayısı. 0 ise hücre disable gösterilir. */
  lowStockCount: number;
}

interface CellDef {
  iconName: string;
  iconColor: string;
  iconBg?: string;
  value: string;
  label: string;
  /** -1 = disabled (gri). */
  disabled?: boolean;
  onPress?: () => void;
  testID: string;
}

export function StatsGrid({
  totalCount,
  completedCount,
  remainingCount,
  lowStockCount,
}: StatsGridProps) {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const noop = undefined;
  const goToMedicines = () => navigation.navigate('Medicines' as never);

  const cells: CellDef[] = [
    {
      iconName: 'calendar-outline',
      iconColor: colors.primary,
      value: String(totalCount),
      label: language === 'tr' ? 'Bugün' : 'Today',
      onPress: noop,
      testID: 'stats-today',
    },
    {
      iconName: 'checkmark-circle-outline',
      iconColor: isDark ? '#34D399' : '#059669',
      iconBg: isDark ? 'rgba(52, 211, 153, 0.2)' : '#D1FAE5',
      value: String(completedCount),
      label: language === 'tr' ? 'Alınan' : 'Taken',
      onPress: noop,
      testID: 'stats-taken',
    },
    {
      iconName: 'time-outline',
      iconColor: isDark ? '#FCD34D' : '#D97706',
      iconBg: isDark ? 'rgba(252, 211, 77, 0.18)' : '#FEF3C7',
      value: String(remainingCount),
      label: language === 'tr' ? 'Bekleyen' : 'Pending',
      onPress: noop,
      testID: 'stats-pending',
    },
    {
      iconName: 'alert-circle-outline',
      iconColor: lowStockCount === 0 ? colors.textMuted : (isDark ? '#FB7185' : '#B91C1C'),
      iconBg:
        lowStockCount === 0
          ? (isDark ? 'rgba(107, 138, 170, 0.12)' : '#F1F5F9')
          : (isDark ? 'rgba(251, 113, 133, 0.18)' : '#FEE2E2'),
      value: lowStockCount === 0 ? '—' : String(lowStockCount),
      label: language === 'tr' ? 'Stok Uyarısı' : 'Low Stock',
      disabled: lowStockCount === 0,
      onPress: lowStockCount === 0 ? noop : goToMedicines,
      testID: 'stats-lowstock',
    },
  ];

  return (
    // Sprint 100: grid mount fade-in (cells ayri stagger ile sirayla gelir)
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={motiTransitions.standard}
      style={styles.grid}
      accessibilityRole="summary"
      accessibilityLabel={
        language === 'tr'
          ? `Bugün ${totalCount} doz, ${completedCount} alınan, ${remainingCount} bekleyen, ${lowStockCount} stok uyarısı`
          : `Today ${totalCount} doses, ${completedCount} taken, ${remainingCount} pending, ${lowStockCount} low stock`
      }
    >
      {cells.map((cell, index) => (
        // Sprint 100: 4 cell sırayla mount olur (stagger 50ms)
        <MotiView
          key={cell.testID}
          from={{ opacity: 0, translateY: 6 }}
          animate={{ opacity: cell.disabled ? 0.6 : 1, translateY: 0 }}
          transition={{ ...motiTransitions.standard, delay: index * 50 }}
          style={[
            styles.cell,
            {
              backgroundColor: isDark ? colors.surfaceContainerLow : colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {cell.onPress ? (
            <MotiPressable
              style={styles.cellInner}
              onPress={cell.onPress}
              accessibilityRole="button"
              accessibilityLabel={`${cell.label}: ${cell.value}`}
              testID={cell.testID}
              disabled={cell.disabled}
              onPressHaptic="light"
            >
              {renderCellContent(cell, colors)}
            </MotiPressable>
          ) : (
            <View style={styles.cellInner} testID={cell.testID}>
              {renderCellContent(cell, colors)}
            </View>
          )}
        </MotiView>
      ))}
    </MotiView>
  );
}

function renderCellContent(
  cell: CellDef,
  colors: { text: string; textMuted: string }
) {
  return (
    <>
      <IconBadge
        name={cell.iconName}
        color={cell.iconColor}
        backgroundColor={cell.iconBg}
        size={36}
        iconSize={18}
      />
      <Text style={[styles.value, { color: colors.text }]}>{cell.value}</Text>
      <Text style={[styles.label, { color: colors.textMuted }]}>{cell.label}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },
  cell: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
  },
  cellInner: {
    alignItems: 'flex-start',
    gap: 4,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
});
