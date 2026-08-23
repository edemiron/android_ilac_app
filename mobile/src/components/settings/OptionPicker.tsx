/**
 * OptionPicker — Genel İçe Gömülü Çekmece Kapsülü (Indented Inset Drawer)
 *
 * 2026 Modern Dropdown Design:
 * - Kenarlardan girintili (indented) bağımsız alt çekmece kartı
 * - Renkli başlık şeridi (Drawer Header)
 * - Canlı aktif seçim vurgusu ve checkmark
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { useHaptics } from '../../hooks/useHaptics';

interface OptionPickerProps<T extends string | number> {
  options: T[];
  selectedValue: T;
  onSelect: (value: T) => void;
  getLabel: (value: T) => string;
  title?: string;
  icon?: string;
  tintColor?: string;
}

export function OptionPicker<T extends string | number>({
  options,
  selectedValue,
  onSelect,
  getLabel,
  title,
  icon,
  tintColor,
}: OptionPickerProps<T>): React.ReactElement {
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();

  const activeTint = tintColor || '#0D9488';

  const handleSelect = useCallback(
    (value: T) => {
      haptics.selection();
      onSelect(value);
    },
    [haptics, onSelect]
  );

  return (
    <View
      style={[
        styles.drawerContainer,
        {
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : '#F0FDFA',
          borderColor: isDark ? `${activeTint}40` : `${activeTint}25`,
        },
      ]}
    >
      {/* Çekmece Başlık Şeridi */}
      {title && (
        <View
          style={[
            styles.drawerHeader,
            {
              backgroundColor: isDark ? `${activeTint}15` : `${activeTint}10`,
              borderBottomColor: isDark ? `${activeTint}25` : `${activeTint}15`,
            },
          ]}
        >
          {icon && (
            <Ionicons name={icon as any} size={13} color={activeTint} style={{ marginRight: 6 }} />
          )}
          <Text style={[styles.drawerHeaderText, { color: isDark ? '#2DD4BF' : '#0F766E' }]}>
            {title}
          </Text>
        </View>
      )}

      {/* Seçenek Satırları */}
      {options.map((option, idx) => {
        const isSelected = selectedValue === option;

        return (
          <TouchableOpacity
            key={String(option)}
            style={[
              styles.optionRow,
              idx > 0 && {
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              },
              isSelected && {
                backgroundColor: isDark ? 'rgba(13, 148, 136, 0.22)' : 'rgba(13, 148, 136, 0.12)',
              },
            ]}
            onPress={() => handleSelect(option)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.optionText,
                {
                  color: isSelected
                    ? isDark
                      ? '#FFFFFF'
                      : '#0F172A'
                    : isDark
                      ? '#E2E8F0'
                      : '#1E293B',
                  fontWeight: isSelected ? '700' : '500',
                },
              ]}
            >
              {getLabel(option)}
            </Text>

            {isSelected && <Ionicons name="checkmark-circle" size={18} color="#0D9488" />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  drawerHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 46,
  },
  optionText: {
    fontSize: 14,
    flex: 1,
  },
});
