/**
 * InventoryCard — Stok ve Son Kullanma Tarihi (SKT) Form Kartı
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { ThemeColors } from '../../../contexts/ThemeContext';
import { StockSection, ExpirySection } from '../../../components/addMedicine';

interface InventoryCardProps {
  stockEnabled: boolean;
  stockCount: number;
  stockThreshold: number;
  stockUnit: string;
  onStockEnabledChange: (enabled: boolean) => void;
  onStockCountChange: (count: number) => void;
  onStockThresholdChange: (threshold: number) => void;
  onStockUnitChange: (unit: string) => void;
  expiryDate: string | null;
  expiryReminderDays: number;
  onExpiryDateChange: (date: string | null) => void;
  onExpiryReminderDaysChange: (days: number) => void;
  colors: ThemeColors;
  language: 'tr' | 'en';
  labelExpiry: string;
}

export function InventoryCard({
  stockEnabled,
  stockCount,
  stockThreshold,
  stockUnit,
  onStockEnabledChange,
  onStockCountChange,
  onStockThresholdChange,
  onStockUnitChange,
  expiryDate,
  expiryReminderDays,
  onExpiryDateChange,
  onExpiryReminderDaysChange,
  colors,
  language,
  labelExpiry,
}: InventoryCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <StockSection
        enabled={stockEnabled}
        count={stockCount}
        threshold={stockThreshold}
        unit={stockUnit}
        onEnabledChange={onStockEnabledChange}
        onCountChange={onStockCountChange}
        onThresholdChange={onStockThresholdChange}
        onUnitChange={onStockUnitChange}
        label={language === 'tr' ? 'Stok Takibi' : 'Stock Tracking'}
        colors={colors}
        language={language}
      />

      <ExpirySection
        expiryDate={expiryDate}
        expiryReminderDays={expiryReminderDays}
        onExpiryDateChange={onExpiryDateChange}
        onReminderDaysChange={onExpiryReminderDaysChange}
        label={labelExpiry}
        colors={colors}
        language={language}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    paddingTop: 0,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
});
