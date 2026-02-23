import React from 'react';
import { View, Text, StyleSheet, Switch, TextInput, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ThemeColors } from '../../contexts/ThemeContext';

interface StockSectionProps {
  enabled: boolean;
  count: number;
  threshold: number;
  unit: string;
  onEnabledChange: (enabled: boolean) => void;
  onCountChange: (count: number) => void;
  onThresholdChange: (threshold: number) => void;
  onUnitChange: (unit: string) => void;
  label: string;
  colors: ThemeColors;
  language: 'tr' | 'en';
}

const STOCK_UNITS = [
  { value: 'tablet', labelTr: 'Tablet', labelEn: 'Tablet' },
  { value: 'kapsul', labelTr: 'Kapsül', labelEn: 'Capsule' },
  { value: 'damla', labelTr: 'Damla', labelEn: 'Drop' },
];

export function StockSection({
  enabled,
  count,
  threshold,
  unit,
  onEnabledChange,
  onCountChange,
  onThresholdChange,
  onUnitChange,
  label,
  colors,
  language,
}: StockSectionProps) {
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Switch
          value={enabled}
          onValueChange={onEnabledChange}
          trackColor={{ false: colors.border, true: colors.primary + '80' }}
          thumbColor={enabled ? colors.primary : colors.textMuted}
        />
      </View>

      {enabled && (
        <View style={styles.content}>
          {/* Satır 1: Birim Seçimi (Tablet / Kapsül) */}
          <View style={styles.unitRow}>
            {STOCK_UNITS.map((u) => (
              <TouchableOpacity
                key={u.value}
                style={[
                  styles.unitBtn,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  unit === u.value && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => onUnitChange(u.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.unitBtnText,
                    { color: colors.text },
                    unit === u.value && { color: '#FFFFFF' },
                  ]}
                >
                  {language === 'tr' ? u.labelTr : u.labelEn}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Satır 2: Stok Miktarı */}
          <View style={styles.stockRow}>
            <TouchableOpacity
              style={[styles.stepBtn, { backgroundColor: colors.primary + '12' }]}
              onPress={() => onCountChange(Math.max(0, count - 10))}
              activeOpacity={0.7}
            >
              <Text style={[styles.stepBtnText, { color: colors.primary }]}>-10</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.stepBtn, { backgroundColor: colors.primary + '12' }]}
              onPress={() => onCountChange(Math.max(0, count - 1))}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={24} color={colors.primary} />
            </TouchableOpacity>

            <View style={[styles.countBox, { borderColor: colors.border }]}>
              <TextInput
                style={[styles.countInput, { color: colors.text }]}
                value={count.toString()}
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  if (!isNaN(num) && num >= 0) onCountChange(num);
                  else if (text === '') onCountChange(0);
                }}
                keyboardType="numeric"
                maxLength={4}
                selectTextOnFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.stepBtn, { backgroundColor: colors.primary + '12' }]}
              onPress={() => onCountChange(count + 1)}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={24} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.stepBtn, { backgroundColor: colors.primary + '12' }]}
              onPress={() => onCountChange(count + 10)}
              activeOpacity={0.7}
            >
              <Text style={[styles.stepBtnText, { color: colors.primary }]}>+10</Text>
            </TouchableOpacity>
          </View>

          {/* Satır 3: Uyarı Eşiği */}
          <View style={[styles.warningRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="alert-circle-outline" size={22} color={colors.warning || '#F59E0B'} />
            <Text style={[styles.warningLabel, { color: colors.textSecondary }]}>
              {language === 'tr' ? 'Uyarı eşiği:' : 'Alert threshold:'}
            </Text>
            <View style={styles.thresholdControls}>
              <TouchableOpacity
                style={[styles.thresholdBtn, { borderColor: colors.border }]}
                onPress={() => onThresholdChange(Math.max(1, threshold - 1))}
              >
                <Ionicons name="remove" size={18} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.thresholdValue, { color: colors.text }]}>{threshold}</Text>
              <TouchableOpacity
                style={[styles.thresholdBtn, { borderColor: colors.border }]}
                onPress={() => onThresholdChange(threshold + 1)}
              >
                <Ionicons name="add" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      marginTop: 20,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    label: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    content: {
      marginTop: 16,
      gap: 16,
    },
    // Satır 1: Birim Seçimi
    unitRow: {
      flexDirection: 'row',
      gap: 12,
    },
    unitBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unitBtnText: {
      fontSize: 16,
      fontWeight: '700',
    },
    // Satır 2: Stok Miktarı
    stockRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    stepBtn: {
      width: 48,
      height: 48,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    stepBtnText: {
      fontSize: 14,
      fontWeight: '700',
    },
    countBox: {
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 8,
      minWidth: 90,
      alignItems: 'center',
    },
    countInput: {
      fontSize: 28,
      fontWeight: '800',
      textAlign: 'center',
      padding: 0,
      minWidth: 60,
    },
    // Satır 3: Uyarı Eşiği
    warningRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 16,
      borderWidth: 1,
      gap: 10,
    },
    warningLabel: {
      fontSize: 14,
      fontWeight: '500',
      flex: 1,
    },
    thresholdControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    thresholdBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    thresholdValue: {
      fontSize: 18,
      fontWeight: '700',
      minWidth: 28,
      textAlign: 'center',
    },
  });
