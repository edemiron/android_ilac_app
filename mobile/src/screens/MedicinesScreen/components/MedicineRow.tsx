/**
 * MedicineRow — İlaçlarım Ekranı İlaç Kartı
 *
 * 2026 Modern Design Architecture:
 * - Sol renk aksanlı & gölgeli Tonal Card yapısı
 * - Degrade arka planlı 3D squircle form ikonu
 * - Zenginleştirilmiş hiyerarşi (Dozaj, Sıklık, Yemek Talimatı, Stok Göstergesi, Sıradaki Saat)
 * - Dokunsal geri bildirim ve pürüzsüz basış efektleri
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  getInstructionIconName,
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
  const isTr = language === 'tr';
  const medColor = medicine.color || colors.primary || '#0D9488';

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

  // SKT Rozeti
  const renderExpiryBadge = () => {
    if (!medicine.expiryDate) return null;
    const status = expiryStatus;
    const palette = getExpiryColor(medicine.expiryDate, medicine.expiryReminderDays, colors);
    const expiryIcon =
      status === 'expired'
        ? 'alert-circle'
        : status === 'expiring'
          ? 'time-outline'
          : 'calendar-outline';

    if (status === 'expired') {
      return (
        <View style={[styles.badgePill, { backgroundColor: palette.bg }]}>
          <Ionicons name={expiryIcon} size={11} color={palette.fg} />
          <Text style={[styles.badgePillText, { color: palette.fg }]}>
            {isTr ? 'Süresi doldu' : 'Expired'}
          </Text>
        </View>
      );
    }
    if (status === 'expiring') {
      return (
        <View style={[styles.badgePill, { backgroundColor: palette.bg }]}>
          <Ionicons name={expiryIcon} size={11} color={palette.fg} />
          <Text style={[styles.badgePillText, { color: palette.fg }]}>
            {isTr ? 'SKT Yakında' : 'Expiring Soon'}
          </Text>
        </View>
      );
    }
    if (status === 'ok') {
      return (
        <View style={[styles.badgePill, { backgroundColor: palette.bg }]}>
          <Ionicons name={expiryIcon} size={11} color={palette.fg} />
          <Text style={[styles.badgePillText, { color: palette.fg }]}>
            {formatExpiryDate(medicine.expiryDate, language)}
          </Text>
        </View>
      );
    }
    return null;
  };

  // Stok Rozeti
  const stockPalette = getStockColor(medicine.stockCount, medicine.stockThreshold, colors);
  const renderStockBadge = () => {
    if (!stockPalette || medicine.stockEnabled === false) return null;
    if (medicine.stockCount === undefined) return null;
    const label =
      stockPalette.variant === 'critical'
        ? isTr
          ? `Stok az (${medicine.stockCount})`
          : `Low Stock (${medicine.stockCount})`
        : isTr
          ? `${medicine.stockCount} kaldı`
          : `${medicine.stockCount} left`;
    return (
      <View style={[styles.badgePill, { backgroundColor: stockPalette.bg }]}>
        <Ionicons
          name={stockPalette.variant === 'critical' ? 'alert-circle' : 'cube-outline'}
          size={11}
          color={stockPalette.fg}
        />
        <Text style={[styles.badgePillText, { color: stockPalette.fg }]}>{label}</Text>
      </View>
    );
  };

  const nextTime = getNextTime(times);
  const otherCount = times.length - 1;
  const isNextFuture = nextTime ? isFutureTime(nextTime) : false;
  const iconInfo = getMedicineFormIcon(medicine);
  const instructionIcon = getInstructionIconName(medicine.instructions);
  const instructionText = medicine.instructions
    ? getInstructionText(medicine.instructions, language)
    : null;

  return (
    <TouchableOpacity
      style={[
        styles.medicineCard,
        {
          backgroundColor: colors.card,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
          shadowColor: isDark ? '#000000' : medColor,
          shadowOpacity: isDark ? 0.3 : 0.08,
          elevation: isDark ? 1 : 3,
        },
        !medicine.isActive && { opacity: 0.65 },
        isSelected && {
          backgroundColor: `${colors.primary}12`,
          borderColor: colors.primary,
          borderWidth: 1.5,
        },
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.75}
    >
      {/* Sol Renk Aksan Çubuğu */}
      <View
        style={[
          styles.accentBar,
          {
            backgroundColor: medicine.isActive ? medColor : colors.textMuted,
          },
        ]}
      />

      <View style={styles.cardInner}>
        {/* Çoklu Seçim Checkbox */}
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

        {/* Squircle Form Avatar with Gradient */}
        <View style={styles.avatarWrapper}>
          {medicine.imageUri ? (
            <Image source={{ uri: medicine.imageUri }} style={styles.avatarImage} />
          ) : (
            <LinearGradient
              colors={
                medicine.isActive
                  ? [`${medColor}33`, `${medColor}15`]
                  : [`${colors.textMuted}25`, `${colors.textMuted}10`]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.avatarGradient,
                {
                  borderColor: medicine.isActive ? `${medColor}55` : `${colors.textMuted}40`,
                },
              ]}
            >
              {iconInfo.lib === 'mci' ? (
                <MaterialCommunityIcons
                  name={iconInfo.name}
                  size={24}
                  color={medicine.isActive ? medColor : colors.textMuted}
                />
              ) : (
                <Ionicons
                  name={iconInfo.name as never}
                  size={24}
                  color={medicine.isActive ? medColor : colors.textMuted}
                />
              )}
            </LinearGradient>
          )}
        </View>

        {/* İlaç Bilgi Bloğu */}
        <View style={styles.contentContainer}>
          {/* Başlık Satırı */}
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.medicineTitle,
                { color: colors.text },
                !medicine.isActive && { color: colors.textMuted },
              ]}
              numberOfLines={1}
            >
              {medicine.name}
            </Text>

            {!medicine.isActive && (
              <Pill
                label={isTr ? 'Duraklatıldı' : 'Paused'}
                variant="warning"
                size="xs"
                style={{ marginLeft: 6 }}
              />
            )}
          </View>

          {/* Doz & Sıklık Açıklaması */}
          <Text style={[styles.dosageText, { color: colors.textMuted }]}>
            {decodeDosage(medicine.dosage)}
            {medicine.dosage ? ' • ' : ''}
            {t('medicines_times_per_day', { count: medicine.frequency })}
          </Text>

          {/* Mikro Etiketler ve Saat Çipleri */}
          <View style={styles.chipsContainer}>
            {/* Yemek / Kullanım Talimatı Rozeti */}
            {instructionText && (
              <View
                style={[
                  styles.microTag,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.05)',
                    borderColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(15, 23, 42, 0.08)',
                  },
                ]}
              >
                <Ionicons
                  name={instructionIcon}
                  size={12}
                  color={colors.textSecondary || colors.textMuted}
                />
                <Text style={[styles.microTagText, { color: colors.text }]}>{instructionText}</Text>
              </View>
            )}

            {/* Sıradaki Saat Çipi (Yüksek Kontrastlı & Net) */}
            {nextTime && (
              <View
                style={[
                  styles.timeChip,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(15, 23, 42, 0.05)',
                    borderColor:
                      medicine.isActive && isNextFuture
                        ? `${medColor}99`
                        : isDark
                          ? 'rgba(255, 255, 255, 0.12)'
                          : 'rgba(15, 23, 42, 0.09)',
                  },
                ]}
              >
                {/* İlaç Renk Gösterge Noktası */}
                <View
                  style={[
                    styles.timeDot,
                    {
                      backgroundColor:
                        medicine.isActive && isNextFuture ? medColor : colors.textMuted,
                    },
                  ]}
                />
                <Ionicons name="time-outline" size={12} color={colors.text} />
                <Text
                  style={[
                    styles.timeChipText,
                    {
                      color: colors.text,
                      fontWeight: isNextFuture ? '700' : '600',
                    },
                  ]}
                >
                  {formatTimeDisplay(nextTime)}
                </Text>
                {otherCount > 0 && (
                  <View
                    style={[
                      styles.otherCountBadge,
                      {
                        backgroundColor: isDark
                          ? 'rgba(255, 255, 255, 0.12)'
                          : 'rgba(15, 23, 42, 0.08)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.otherCountText,
                        { color: colors.textSecondary || colors.text },
                      ]}
                    >
                      +{otherCount}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Stok ve SKT Rozetleri */}
            {renderStockBadge()}
            {renderExpiryBadge()}
          </View>
        </View>

        {/* Sağ Menü Butonu */}
        <TouchableOpacity
          onPress={() => onShowActionMenu(medicine, onToggleActive, onDelete)}
          style={styles.moreButton}
          hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={isTr ? 'İlaç Seçenekleri' : 'Medicine Options'}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  medicineCard: {
    borderRadius: 18,
    marginVertical: 5,
    marginHorizontal: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4.5,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    paddingLeft: 16,
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
  avatarWrapper: {
    marginRight: 13,
  },
  avatarGradient: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 16,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  medicineTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  dosageText: {
    fontSize: 12.5,
    fontWeight: '500',
    marginBottom: 6,
  },
  chipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  microTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  microTagText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 9,
    borderWidth: 1,
    gap: 4,
  },
  timeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timeChipText: {
    fontSize: 11,
    letterSpacing: -0.1,
  },
  otherCountBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 2,
  },
  otherCountText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3.5,
  },
  badgePillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  moreButton: {
    padding: 6,
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
