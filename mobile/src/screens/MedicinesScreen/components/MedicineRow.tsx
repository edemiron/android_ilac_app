/**
 * MedicinesScreen — MedicineRow bileşeni.
 *
 * Sprint 5.1: MedicinesScreen.tsx (1317 satir) modularizasyonu.
 * Tek bir ilac kart satir render eder (secim modu, expiry badge, action menu).
 *
 * Sprint 81:
 *   - 81A: SKT badge akıllı renk (kırmızı dolmuş, sarı yaklaşıyor, yeşil/muted OK)
 *   - 81B: Stok sayısı badge ("26/30 kaldı")
 *   - 81C: Saat chip zaman bazlı renk (gelecek primary, geçmiş muted)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { format, parseISO } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { ThemeColors } from '../../../contexts/ThemeContext';
import { TranslationKey } from '../../../contexts/LanguageContext';
import { Pill } from '../../../components/common/Pill';
import { Medicine } from '../../../types';
import { formatTimeDisplay, getInstructionText } from '../../../utils/timeCalculator';
import {
  decodeDosage,
  getExpiryStatus,
  getMedicineFormIcon,
  getExpiryColor,
  getStockColor,
  isFutureTime,
} from '../helpers';

interface MedicineRowProps {
  medicine: Medicine;
  times: string[];
  onPress: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  onShowActionMenu: (medicine: Medicine, onToggle: () => void, onDel: () => void) => void;
  colors: ThemeColors;
  isDark: boolean;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  language: 'tr' | 'en';
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onLongPressSelect?: () => void;
}

function formatExpiryDate(dateStr: string, language: 'tr' | 'en'): string {
  try {
    const date = parseISO(dateStr);
    const locale = language === 'tr' ? tr : enUS;
    if (language === 'tr') {
      return `SKT: ${format(date, 'd MMM yyyy', { locale })}`;
    }
    return `EXP: ${format(date, 'MMM d, yyyy', { locale })}`;
  } catch {
    return '';
  }
}

function getNextTime(times: string[]): string | null {
  if (times.length === 0) return null;
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
  const sorted = [...times].sort();
  return sorted.find(t => t > currentTime) || sorted[0];
}

// getExpiryColor, getStockColor, isFutureTime helpers.ts'e tasindi (Sprint 82).

export const MedicineRow: React.FC<MedicineRowProps> = ({
  medicine,
  times,
  onPress,
  onToggleActive,
  onDelete,
  onShowActionMenu,
  colors,
  isDark,
  t,
  language,
  isSelectionMode,
  isSelected,
  onSelect,
  onLongPressSelect,
}) => {
  const handleLongPress = () => {
    if (onLongPressSelect) {
      onLongPressSelect();
      return;
    }
    onShowActionMenu(medicine, onToggleActive, onDelete);
  };

  const handlePress = () => {
    if (isSelectionMode && onSelect) {
      onSelect();
    } else {
      onPress();
    }
  };

  const expiryStatus = getExpiryStatus(medicine.expiryDate, medicine.expiryReminderDays);

  const renderExpiryBadge = () => {
    if (!medicine.expiryDate) return null;
    const status = expiryStatus;
    // Sprint 81A: Akıllı renk — gün sayısına göre 4 seviye
    const palette = getExpiryColor(medicine.expiryDate, medicine.expiryReminderDays, colors);
    const expiryIcon =
      status === 'expired'
        ? 'alert-circle'
        : status === 'expiring'
          ? 'time-outline'
          : 'calendar-outline';

    if (status === 'expired') {
      return (
        <View style={[styles.expiryBadge, { backgroundColor: palette.bg }]}>
          <Ionicons name={expiryIcon} size={12} color={palette.fg} />
          <Text style={[styles.expiryBadgeText, { color: palette.fg }]}>
            {language === 'tr' ? 'Süresi doldu' : 'Expired'}
          </Text>
        </View>
      );
    }
    if (status === 'expiring') {
      return (
        <View style={[styles.expiryBadge, { backgroundColor: palette.bg }]}>
          <Ionicons name={expiryIcon} size={12} color={palette.fg} />
          <Text style={[styles.expiryBadgeText, { color: palette.fg }]}>
            {language === 'tr' ? 'Yakında' : 'Soon'}
          </Text>
        </View>
      );
    }
    if (status === 'ok') {
      return (
        <View style={[styles.expiryBadge, { backgroundColor: palette.bg }]}>
          <Ionicons name={expiryIcon} size={11} color={palette.fg} />
          <Text style={[styles.expiryBadgeText, { color: palette.fg }]}>
            {formatExpiryDate(medicine.expiryDate, language)}
          </Text>
        </View>
      );
    }
    return null;
  };

  // Sprint 81B: Stok badge render
  const stockPalette = getStockColor(medicine.stockCount, medicine.stockThreshold, colors);
  const renderStockBadge = () => {
    if (!stockPalette || medicine.stockEnabled === false) return null;
    if (medicine.stockCount === undefined) return null;
    const tr = language === 'tr';
    const label =
      stockPalette.variant === 'critical'
        ? tr
          ? `Stok az (${medicine.stockCount})`
          : `Low (${medicine.stockCount})`
        : tr
          ? `${medicine.stockCount} kaldı`
          : `${medicine.stockCount} left`;
    return (
      <View style={[styles.stockBadge, { backgroundColor: stockPalette.bg }]}>
        <Ionicons name="cube-outline" size={11} color={stockPalette.fg} />
        <Text style={[styles.stockBadgeText, { color: stockPalette.fg }]}>{label}</Text>
      </View>
    );
  };

  const nextTime = getNextTime(times);
  const otherCount = times.length - 1;
  // Sprint 81C: Gelecek saat primary, geçmiş muted
  const isNextFuture = nextTime ? isFutureTime(nextTime) : false;

  return (
    <TouchableOpacity
      style={[
        styles.medicineCard,
        {
          backgroundColor: colors.card,
          shadowOpacity: isDark ? 0 : 0.08,
          elevation: isDark ? 0 : 2,
        },
        !medicine.isActive && { opacity: 0.6 },
        isSelected && {
          backgroundColor: colors.primary + '15',
          borderColor: colors.primary,
          borderWidth: 2,
        },
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.rowContent}>
        {isSelectionMode && (
          <View
            style={[
              styles.checkbox,
              { borderColor: isSelected ? colors.primary : colors.border },
              isSelected && { backgroundColor: colors.primary },
            ]}
          >
            {isSelected && <Ionicons name="checkmark" size={14} color={colors.textOnPrimary} />}
          </View>
        )}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: medicine.color + '20', overflow: 'hidden' },
          ]}
        >
          {medicine.imageUri ? (
            <Image source={{ uri: medicine.imageUri }} style={{ width: 44, height: 44 }} />
          ) : (
            (() => {
              const iconInfo = getMedicineFormIcon(medicine);
              if (iconInfo.lib === 'mci') {
                return (
                  <MaterialCommunityIcons name={iconInfo.name} size={18} color={medicine.color} />
                );
              }
              return <Ionicons name={iconInfo.name as never} size={18} color={medicine.color} />;
            })()
          )}
        </View>
        <View style={styles.medicineInfo}>
          <View style={styles.medicineHeader}>
            <Text
              style={[
                styles.medicineName,
                { color: colors.text },
                !medicine.isActive && { color: colors.textMuted },
              ]}
              numberOfLines={2}
            >
              {medicine.name}
            </Text>
            {!medicine.isActive && (
              <Pill
                label={language === 'tr' ? 'Duraklatıldı' : 'Paused'}
                variant="warning"
                size="xs"
                style={{ marginRight: 6 }}
              />
            )}
            {renderExpiryBadge()}
            {renderStockBadge()}
          </View>
          <Text style={[styles.medicineDetails, { color: colors.textMuted }]}>
            {decodeDosage(medicine.dosage)} •{' '}
            {t('medicines_times_per_day', { count: medicine.frequency })}
            {medicine.instructions && ` • ${getInstructionText(medicine.instructions, language)}`}
          </Text>
          {nextTime && (
            <View style={styles.timesContainer}>
              {/* Sprint 81C: Gelecek saat primary (medicine.color), geçmiş muted */}
              <View
                style={[
                  styles.timeChip,
                  {
                    backgroundColor: medicine.isActive
                      ? isNextFuture
                        ? medicine.color + '25'
                        : colors.textMuted + '15'
                      : colors.inputBackground,
                    borderWidth: isNextFuture && medicine.isActive ? 1 : 0,
                    borderColor:
                      isNextFuture && medicine.isActive ? medicine.color + '40' : 'transparent',
                  },
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={11}
                  color={
                    medicine.isActive
                      ? isNextFuture
                        ? medicine.color
                        : colors.textMuted
                      : colors.textMuted
                  }
                />
                <Text
                  style={[
                    styles.timeChipText,
                    {
                      color: medicine.isActive
                        ? isNextFuture
                          ? medicine.color
                          : colors.textMuted
                        : colors.textMuted,
                    },
                  ]}
                >
                  {formatTimeDisplay(nextTime)}
                </Text>
              </View>
              {otherCount > 0 && (
                <Text style={[styles.moreTimesText, { color: colors.textMuted }]}>
                  +{otherCount}
                </Text>
              )}
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={() => onShowActionMenu(medicine, onToggleActive, onDelete)}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  medicineCard: {
    borderRadius: 14,
    padding: 14,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  medicineName: {
    fontSize: 15,
    fontWeight: '700',
    marginRight: 6,
  },
  medicineDetails: {
    fontSize: 12,
  },
  // Sprint 106.6: pausedBadge Pill'e migrate — style kaldırıldı
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
  },
  expiryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 3,
  },
  // Sprint 81B: Stok badge stilleri
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 3,
  },
  timesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 4,
  },
  timeChipText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 3,
  },
  moreTimesText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
