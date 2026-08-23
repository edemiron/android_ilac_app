/**
 * FilterChipRow — İlaç listesi filtre çipleri (Tümü, Aktif, Pasif, Stok Az)
 *
 * 2026 Modern Segmented Filter Design:
 * - İkonik & Sayaçlı Kapsül Tasarımı
 * - Seçili durumda parlayan aktif durum vurgusu
 * - Akıcı yatay kaydırma desteği
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { FilterMode } from '../hooks/useMedicinesController';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface FilterChipRowProps {
  filterMode: FilterMode;
  onSelectFilter: (mode: FilterMode) => void;
  colors: ThemeColors;
  language: string;
  isDark?: boolean;
  counts?: {
    all: number;
    active: number;
    inactive: number;
    lowStock: number;
  };
}

export function FilterChipRow({
  filterMode,
  onSelectFilter,
  colors,
  language,
  isDark,
  counts,
}: FilterChipRowProps) {
  const tr = language === 'tr';

  const modes: {
    key: FilterMode;
    label: string;
    icon: string;
    count?: number;
    alertColor?: string;
  }[] = [
    {
      key: 'all',
      label: tr ? 'Tümü' : 'All',
      icon: 'format-list-bulleted',
      count: counts?.all,
    },
    {
      key: 'active',
      label: tr ? 'Aktif' : 'Active',
      icon: 'check-circle-outline',
      count: counts?.active,
      alertColor: colors.success || '#10B981',
    },
    {
      key: 'inactive',
      label: tr ? 'Pasif' : 'Inactive',
      icon: 'pause-circle-outline',
      count: counts?.inactive,
    },
    {
      key: 'lowStock',
      label: tr ? 'Stok Az' : 'Low Stock',
      icon: 'alert-circle-outline',
      count: counts?.lowStock,
      alertColor: colors.error || '#EF4444',
    },
  ];

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChipRow}
      >
        {modes.map(item => {
          const isSelected = filterMode === item.key;
          const showCount = typeof item.count === 'number';

          return (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isSelected
                    ? colors.primary
                    : isDark
                      ? 'rgba(30, 41, 59, 0.7)'
                      : colors.surfaceContainerLow || '#F1F5F9',
                  borderColor: isSelected ? colors.primary : `${colors.border}60`,
                  shadowColor: isSelected ? colors.primary : '#000',
                  shadowOpacity: isSelected ? 0.25 : 0.03,
                  elevation: isSelected ? 3 : 0,
                },
              ]}
              onPress={() => onSelectFilter(item.key)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={item.label}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={16}
                color={
                  isSelected
                    ? colors.textOnPrimary || '#FFFFFF'
                    : item.key === 'lowStock' && (item.count ?? 0) > 0
                      ? colors.error || '#EF4444'
                      : colors.textMuted
                }
              />
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: isSelected ? colors.textOnPrimary || '#FFFFFF' : colors.text,
                    fontWeight: isSelected ? '700' : '600',
                  },
                ]}
              >
                {item.label}
              </Text>

              {showCount && (
                <View
                  style={[
                    styles.countBadge,
                    {
                      backgroundColor: isSelected
                        ? 'rgba(255, 255, 255, 0.25)'
                        : isDark
                          ? 'rgba(255, 255, 255, 0.08)'
                          : 'rgba(0, 0, 0, 0.06)',
                    },
                    item.key === 'lowStock' &&
                      (item.count ?? 0) > 0 &&
                      !isSelected && {
                        backgroundColor: `${colors.error}20`,
                      },
                  ]}
                >
                  <Text
                    style={[
                      styles.countBadgeText,
                      {
                        color: isSelected
                          ? colors.textOnPrimary || '#FFFFFF'
                          : item.key === 'lowStock' && (item.count ?? 0) > 0
                            ? colors.error || '#EF4444'
                            : colors.textMuted,
                      },
                    ]}
                  >
                    {item.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 8,
  },
  filterChipRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1,
    gap: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
  },
  filterChipText: {
    fontSize: 13,
    letterSpacing: -0.1,
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
