/**
 * AdvancedOptionsAccordion — Gelişmiş Seçenekler İçe Açılır Çekmecesi
 *
 * Kullanıcının isteğe bağlı olarak açabileceği; Kullanım Takvimi/Kür,
 * İlaç Fotoğrafı, Kategori, Renk, Özel Titreşim ve Stok/SKT alanlarını barındırır.
 * Varsayılan olarak kapalıdır; form boyunu %60 kısaltarak bilişsel yükü sıfırlar.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import type { ThemeColors } from '../../../contexts/ThemeContext';
import type { MedicineCategory, ScheduleType } from '../../../types';
import type { AddMedicineFormState } from '../../../types/addMedicine.types';
import {
  ScheduleSelector,
  ImagePickerSection,
  ColorPicker,
  AdvancedSettingsSection,
  StockSection,
  ExpirySection,
} from '../../../components/addMedicine';

if (
  Platform?.OS === 'android' &&
  UIManager &&
  typeof UIManager.setLayoutAnimationEnabledExperimental === 'function'
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface AdvancedOptionsAccordionProps {
  formState: AddMedicineFormState;
  isEditing: boolean;
  scheduleType: ScheduleType;
  specificDays: number[];
  intervalDays: number;
  cycleDaysOn: number;
  cycleDaysOff: number;
  endDate: string | null;
  onScheduleTypeChange: (type: ScheduleType) => void;
  onSpecificDaysChange: (days: number[]) => void;
  onIntervalDaysChange: (interval: number) => void;
  onCycleChange: (on: number, off: number) => void;
  onEndDateChange: (date: string | null) => void;
  imageUri?: string;
  onImageChange: (uri?: string) => void;
  selectedColor: string;
  onColorChange: (color: string) => void;
  category?: MedicineCategory;
  onCategoryChange: (category: MedicineCategory) => void;
  onVibrationPatternChange: (pattern: 'default' | 'heartbeat' | 'urgent' | 'soft') => void;
  onIsCriticalChange?: (isCritical: boolean) => void;
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

export function AdvancedOptionsAccordion({
  formState,
  isEditing,
  scheduleType,
  specificDays,
  intervalDays,
  cycleDaysOn,
  cycleDaysOff,
  endDate,
  onScheduleTypeChange,
  onSpecificDaysChange,
  onIntervalDaysChange,
  onCycleChange,
  onEndDateChange,
  imageUri,
  onImageChange,
  selectedColor,
  onColorChange,
  category,
  onCategoryChange,
  onVibrationPatternChange,
  onIsCriticalChange,
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
}: AdvancedOptionsAccordionProps) {
  // Aktif gelişmiş özellik sayısı hesaplaması
  const activeCount = useMemo(() => {
    let count = 0;
    if (scheduleType !== 'daily' || endDate !== null) count++;
    if (imageUri) count++;
    if (category) count++;
    if (formState.vibrationPattern && formState.vibrationPattern !== 'default') count++;
    if (stockEnabled) count++;
    if (expiryDate) count++;
    return count;
  }, [
    scheduleType,
    endDate,
    imageUri,
    category,
    formState.vibrationPattern,
    stockEnabled,
    expiryDate,
  ]);

  // Düzenleme modunda aktif ayar varsa açık başlasın, yoksa kapalı
  const [isExpanded, setIsExpanded] = useState<boolean>(() => isEditing && activeCount > 0);

  const toggleAccordion = () => {
    try {
      if (LayoutAnimation && typeof LayoutAnimation.configureNext === 'function') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
    } catch {
      // Ignore animation errors in testing environments
    }
    setIsExpanded(prev => !prev);
  };

  const isTr = language === 'tr';

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Akordiyon Başlığı / Tetikleyici Buton */}
      <TouchableOpacity style={styles.headerButton} onPress={toggleAccordion} activeOpacity={0.7}>
        <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
          <Icon name="options-outline" size={20} color={colors.primary} />
        </View>

        <View style={styles.titleContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]}>
              {isTr ? 'Gelişmiş Seçenekler (İsteğe Bağlı)' : 'Advanced Options (Optional)'}
            </Text>
            {activeCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.badgeText, { color: colors.primary }]}>
                  {activeCount} {isTr ? 'Aktif' : 'Active'}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isTr
              ? 'Kür, Fotoğraf, Kategori, Stok & Titreşim'
              : 'Course, Photo, Category, Stock & Vibration'}
          </Text>
        </View>

        <View style={[styles.chevronBox, { backgroundColor: colors.background }]}>
          <Icon
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textSecondary}
          />
        </View>
      </TouchableOpacity>

      {/* Akordiyon İçeriği */}
      {isExpanded && (
        <View style={[styles.contentContainer, { borderTopColor: colors.border + '60' }]}>
          {/* 1. Kullanım Takvimi & Bitiş Tarihi (Kür) */}
          <View style={styles.sectionDivider}>
            <ScheduleSelector
              scheduleType={scheduleType}
              specificDays={specificDays}
              intervalDays={intervalDays}
              cycleDaysOn={cycleDaysOn}
              cycleDaysOff={cycleDaysOff}
              endDate={endDate}
              onScheduleTypeChange={onScheduleTypeChange}
              onSpecificDaysChange={onSpecificDaysChange}
              onIntervalDaysChange={onIntervalDaysChange}
              onCycleChange={onCycleChange}
              onEndDateChange={onEndDateChange}
              colors={colors}
            />
          </View>

          {/* 2. İlaç Fotoğrafı */}
          <View style={styles.sectionDivider}>
            <ImagePickerSection
              imageUri={imageUri}
              onImageChange={onImageChange}
              label={isTr ? 'İlaç Fotoğrafı' : 'Medicine Photo'}
              colors={colors}
              language={language}
            />
          </View>

          {/* 3. Kategori ve Renk Seçimi */}
          <View style={styles.sectionDivider}>
            <ColorPicker
              value={selectedColor}
              onSelect={onColorChange}
              category={category}
              onCategorySelect={onCategoryChange}
              label={isTr ? 'Kategori & Tema Rengi' : 'Category & Theme Color'}
              colors={colors}
            />
          </View>

          {/* 4. Gelişmiş Titreşim & Alarm */}
          <View style={styles.sectionDivider}>
            <AdvancedSettingsSection
              formState={formState}
              onVibrationPatternChange={onVibrationPatternChange}
              onIsCriticalChange={onIsCriticalChange}
              label={isTr ? 'Özel Titreşim & Hayati Alarm' : 'Custom Vibration & Critical Alarm'}
              colors={colors}
              language={language}
            />
          </View>

          {/* 5. Stok Takibi */}
          <View style={styles.sectionDivider}>
            <StockSection
              enabled={stockEnabled}
              count={stockCount}
              threshold={stockThreshold}
              unit={stockUnit}
              onEnabledChange={onStockEnabledChange}
              onCountChange={onStockCountChange}
              onThresholdChange={onStockThresholdChange}
              onUnitChange={onStockUnitChange}
              label={isTr ? 'Stok Takibi' : 'Stock Tracking'}
              colors={colors}
              language={language}
            />
          </View>

          {/* 6. Son Kullanma Tarihi */}
          <View style={styles.sectionDivider}>
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
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  chevronBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  contentContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionDivider: {
    marginTop: 12,
  },
});
