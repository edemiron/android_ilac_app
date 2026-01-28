import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMedicineStore } from '../stores/medicineStore';
import { RootStackParamList, Medicine } from '../types';
import { formatTimeDisplay, getInstructionText } from '../utils/timeCalculator';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage, TranslationKey } from '../contexts/LanguageContext';
import { useSubscription } from '../contexts/SubscriptionContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Son kullanma tarihi durumu hesaplama
type ExpiryStatus =
  | { type: 'expired' }
  | { type: 'expires_today' }
  | { type: 'expires_soon'; daysLeft: number }
  | { type: 'ok' }
  | null;

function getExpiryStatus(expiryDate: string | undefined): ExpiryStatus {
  if (!expiryDate) return null;

  try {
    const today = startOfDay(new Date());
    const expiry = startOfDay(parseISO(expiryDate));
    const daysLeft = differenceInDays(expiry, today);

    if (daysLeft < 0) return { type: 'expired' };
    if (daysLeft === 0) return { type: 'expires_today' };
    if (daysLeft <= 30) return { type: 'expires_soon', daysLeft };
    return { type: 'ok' };
  } catch {
    return null;
  }
}

interface SectionProps {
  icon: string;
  title: string;
  count?: number;
  children: React.ReactNode;
  colors: ThemeColors;
  isDark: boolean;
}

const Section: React.FC<SectionProps> = ({ icon, title, count, children, colors, isDark }) => (
  <View
    style={[
      styles.section,
      {
        backgroundColor: colors.card,
        shadowOpacity: isDark ? 0 : 0.05,
        elevation: isDark ? 0 : 1,
      },
    ]}
  >
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionIcon}>{icon}</Text>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>
        {title} {count !== undefined && `(${count})`}
      </Text>
    </View>
    {children}
  </View>
);

interface MedicineRowProps {
  medicine: Medicine;
  times: string[];
  onPress: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  colors: ThemeColors;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  language: 'tr' | 'en';
  isFirst?: boolean;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onLongPressSelect?: () => void;
}

const MedicineRow: React.FC<MedicineRowProps> = ({
  medicine,
  times,
  onPress,
  onToggleActive,
  onDelete,
  colors,
  t,
  language,
  isFirst,
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
    Alert.alert(
      medicine.name,
      language === 'tr' ? 'Ne yapmak istiyorsunuz?' : 'What would you like to do?',
      [
        {
          text: medicine.isActive
            ? language === 'tr'
              ? 'Duraklat'
              : 'Pause'
            : language === 'tr'
              ? 'Aktifleştir'
              : 'Activate',
          onPress: onToggleActive,
        },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              language === 'tr' ? 'İlacı Sil' : 'Delete Medicine',
              t('confirm_delete_medicine'),
              [
                { text: t('cancel'), style: 'cancel' },
                { text: t('delete'), style: 'destructive', onPress: onDelete },
              ]
            );
          },
        },
        { text: t('cancel'), style: 'cancel' },
      ]
    );
  };

  const handlePress = () => {
    if (isSelectionMode && onSelect) {
      onSelect();
    } else {
      onPress();
    }
  };

  // Son kullanma tarihi durumunu hesapla
  const expiryStatus = getExpiryStatus(medicine.expiryDate);

  const getExpiryBadge = () => {
    if (!expiryStatus) return null;

    switch (expiryStatus.type) {
      case 'expired':
        return (
          <View style={[styles.expiryBadge, { backgroundColor: colors.error + '20' }]}>
            <Ionicons name="alert-circle" size={12} color={colors.error} />
            <Text style={[styles.expiryBadgeText, { color: colors.error }]}>
              {language === 'tr' ? 'Süresi doldu' : 'Expired'}
            </Text>
          </View>
        );
      case 'expires_today':
        return (
          <View style={[styles.expiryBadge, { backgroundColor: colors.error + '20' }]}>
            <Ionicons name="alert-circle" size={12} color={colors.error} />
            <Text style={[styles.expiryBadgeText, { color: colors.error }]}>
              {language === 'tr' ? 'Bugün doluyor' : 'Expires today'}
            </Text>
          </View>
        );
      case 'expires_soon':
        return (
          <View
            style={[styles.expiryBadge, { backgroundColor: (colors.warning || '#F59E0B') + '20' }]}
          >
            <Ionicons name="time-outline" size={12} color={colors.warning || '#F59E0B'} />
            <Text style={[styles.expiryBadgeText, { color: colors.warning || '#F59E0B' }]}>
              {language === 'tr' ? `${expiryStatus.daysLeft} gün` : `${expiryStatus.daysLeft} days`}
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.medicineRow,
        !isFirst && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
        !medicine.isActive && { opacity: 0.6 },
        isSelected && { backgroundColor: colors.primary + '15' },
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
            {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
          </View>
        )}
        <View style={[styles.iconContainer, { backgroundColor: medicine.color + '20' }]}>
          <Ionicons name="medical" size={18} color={medicine.color} />
        </View>
        <View style={styles.medicineInfo}>
          <View style={styles.medicineHeader}>
            <Text
              style={[
                styles.medicineName,
                { color: colors.text },
                !medicine.isActive && { color: colors.textMuted },
              ]}
            >
              {medicine.name}
            </Text>
            {!medicine.isActive && (
              <View style={[styles.pausedBadge, { backgroundColor: colors.warning + '20' }]}>
                <Text style={[styles.pausedText, { color: colors.warning }]}>
                  {language === 'tr' ? 'Duraklatıldı' : 'Paused'}
                </Text>
              </View>
            )}
            {getExpiryBadge()}
          </View>
          <Text style={[styles.medicineDetails, { color: colors.textMuted }]}>
            {medicine.dosage} • {t('medicines_times_per_day', { count: medicine.frequency })}
            {medicine.instructions && ` • ${getInstructionText(medicine.instructions, language)}`}
          </Text>
          <View style={styles.timesContainer}>
            {times.map((time, index) => (
              <View
                key={index}
                style={[
                  styles.timeChip,
                  {
                    backgroundColor: medicine.isActive
                      ? medicine.color + '15'
                      : colors.inputBackground,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.timeChipText,
                    { color: medicine.isActive ? medicine.color : colors.textMuted },
                  ]}
                >
                  {formatTimeDisplay(time)}
                </Text>
              </View>
            ))}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
};

export default function MedicinesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const { canAddMedicine } = useSubscription();

  const { medicines, getReminderTimesForMedicine, toggleMedicineActive, deleteMedicine } =
    useMedicineStore();

  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const activeMedicines = medicines.filter(m => m.isActive);
  const inactiveMedicines = medicines.filter(m => !m.isActive);

  // Toggle selection for a medicine
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Enter selection mode with first item selected
  const enterSelectionMode = useCallback((firstId: string) => {
    setIsSelectionMode(true);
    setSelectedIds(new Set([firstId]));
  }, []);

  // Exit selection mode
  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  // Select all medicines
  const selectAll = useCallback(() => {
    const allIds = medicines.map(m => m.id);
    setSelectedIds(new Set(allIds));
  }, [medicines]);

  // Delete selected medicines
  const deleteSelected = useCallback(() => {
    const count = selectedIds.size;
    Alert.alert(
      language === 'tr' ? 'Toplu Silme' : 'Bulk Delete',
      language === 'tr'
        ? `${count} ilacı silmek istediğinize emin misiniz?`
        : `Are you sure you want to delete ${count} medicine(s)?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => {
            selectedIds.forEach(id => deleteMedicine(id));
            exitSelectionMode();
          },
        },
      ]
    );
  }, [selectedIds, language, t, deleteMedicine, exitSelectionMode]);

  const handleAddMedicine = () => {
    const { allowed, reason } = canAddMedicine(medicines.length);

    if (!allowed) {
      Alert.alert(language === 'tr' ? 'İlaç Limiti' : 'Medicine Limit', reason, [
        { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
        {
          text: language === 'tr' ? "Premium'a Geç" : 'Go Premium',
          onPress: () => navigation.navigate('Premium'),
        },
      ]);
      return;
    }

    navigation.navigate('AddMedicine', {});
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      {/* Selection Mode Header */}
      {isSelectionMode && (
        <View
          style={[
            styles.selectionHeader,
            { backgroundColor: colors.card, borderBottomColor: colors.divider },
          ]}
        >
          <TouchableOpacity onPress={exitSelectionMode} style={styles.selectionHeaderButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.selectionHeaderText, { color: colors.text }]}>
            {selectedIds.size} {language === 'tr' ? 'seçildi' : 'selected'}
          </Text>
          <View style={styles.selectionHeaderActions}>
            <TouchableOpacity onPress={selectAll} style={styles.selectionHeaderButton}>
              <Text style={[styles.selectAllText, { color: colors.primary }]}>
                {language === 'tr' ? 'Tümü' : 'All'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {medicines.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Section
              icon="💊"
              title={language === 'tr' ? 'İLAÇLARIM' : 'MY MEDICINES'}
              colors={colors}
              isDark={isDark}
            >
              <View style={styles.emptyState}>
                <View
                  style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '15' }]}
                >
                  <Text style={styles.emptyIconLarge}>💊</Text>
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {t('medicines_empty')}
                </Text>
                <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
                  {t('medicines_add_first')}
                </Text>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                  onPress={handleAddMedicine}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.addButtonText}>{t('home_add_medicine')}</Text>
                </TouchableOpacity>
              </View>
            </Section>

            <Section
              icon="❓"
              title={language === 'tr' ? 'NASIL BAŞLARIM' : 'HOW TO START'}
              colors={colors}
              isDark={isDark}
            >
              <View style={styles.tipRow}>
                <View style={[styles.tipBullet, { backgroundColor: colors.primary }]}>
                  <Text style={styles.tipBulletText}>1</Text>
                </View>
                <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                  {language === 'tr' ? 'Yukarıdaki butona tıklayın' : 'Tap the button above'}
                </Text>
              </View>
              <View
                style={[
                  styles.tipRow,
                  { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
                ]}
              >
                <View style={[styles.tipBullet, { backgroundColor: colors.primary }]}>
                  <Text style={styles.tipBulletText}>2</Text>
                </View>
                <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                  {language === 'tr'
                    ? 'İlaç bilgilerini girin veya barkod tarayın'
                    : 'Enter medicine info or scan barcode'}
                </Text>
              </View>
              <View
                style={[
                  styles.tipRow,
                  { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
                ]}
              >
                <View style={[styles.tipBullet, { backgroundColor: colors.primary }]}>
                  <Text style={styles.tipBulletText}>3</Text>
                </View>
                <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                  {language === 'tr' ? 'Hatırlatma saatlerini ayarlayın' : 'Set reminder times'}
                </Text>
              </View>
            </Section>
          </View>
        ) : (
          <>
            {activeMedicines.length > 0 && (
              <Section
                icon="💚"
                title={language === 'tr' ? 'AKTİF İLAÇLAR' : 'ACTIVE MEDICINES'}
                count={activeMedicines.length}
                colors={colors}
                isDark={isDark}
              >
                {activeMedicines.map((medicine, index) => {
                  const times = getReminderTimesForMedicine(medicine.id).map(rt => rt.time);
                  return (
                    <MedicineRow
                      key={medicine.id}
                      medicine={medicine}
                      times={times}
                      onPress={() =>
                        navigation.navigate('AddMedicine', { medicineId: medicine.id })
                      }
                      onToggleActive={() => toggleMedicineActive(medicine.id)}
                      onDelete={() => deleteMedicine(medicine.id)}
                      colors={colors}
                      t={t}
                      language={language}
                      isFirst={index === 0}
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedIds.has(medicine.id)}
                      onSelect={() => toggleSelection(medicine.id)}
                      onLongPressSelect={
                        !isSelectionMode ? () => enterSelectionMode(medicine.id) : undefined
                      }
                    />
                  );
                })}
              </Section>
            )}

            {inactiveMedicines.length > 0 && (
              <Section
                icon="⏸️"
                title={language === 'tr' ? 'DURAKLATILAN İLAÇLAR' : 'PAUSED MEDICINES'}
                count={inactiveMedicines.length}
                colors={colors}
                isDark={isDark}
              >
                {inactiveMedicines.map((medicine, index) => {
                  const times = getReminderTimesForMedicine(medicine.id).map(rt => rt.time);
                  return (
                    <MedicineRow
                      key={medicine.id}
                      medicine={medicine}
                      times={times}
                      onPress={() =>
                        navigation.navigate('AddMedicine', { medicineId: medicine.id })
                      }
                      onToggleActive={() => toggleMedicineActive(medicine.id)}
                      onDelete={() => deleteMedicine(medicine.id)}
                      colors={colors}
                      t={t}
                      language={language}
                      isFirst={index === 0}
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedIds.has(medicine.id)}
                      onSelect={() => toggleSelection(medicine.id)}
                      onLongPressSelect={
                        !isSelectionMode ? () => enterSelectionMode(medicine.id) : undefined
                      }
                    />
                  );
                })}
              </Section>
            )}

            <Section
              icon="💡"
              title={language === 'tr' ? 'İPUCU' : 'TIP'}
              colors={colors}
              isDark={isDark}
            >
              <View style={styles.tipRow}>
                <View style={[styles.tipIconContainer, { backgroundColor: '#DBEAFE' }]}>
                  <Text style={styles.tipIconEmoji}>👆</Text>
                </View>
                <Text style={[styles.tipText, { color: colors.textSecondary, flex: 1 }]}>
                  {language === 'tr'
                    ? 'Düzenlemek için ilaca dokunun, silmek veya duraklatmak için basılı tutun'
                    : 'Tap to edit, long press to delete or pause'}
                </Text>
              </View>
            </Section>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Selection Mode Action Bar */}
      {isSelectionMode && selectedIds.size > 0 && (
        <View
          style={[
            styles.selectionActionBar,
            { backgroundColor: colors.card, borderTopColor: colors.divider },
          ]}
        >
          <TouchableOpacity
            style={[styles.deleteSelectedButton, { backgroundColor: colors.error }]}
            onPress={deleteSelected}
          >
            <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
            <Text style={styles.deleteSelectedText}>
              {language === 'tr' ? `${selectedIds.size} İlacı Sil` : `Delete ${selectedIds.size}`}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  // Selection Mode Header
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  selectionHeaderButton: {
    padding: 8,
  },
  selectionHeaderText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  selectionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Checkbox
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Selection Action Bar
  selectionActionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  deleteSelectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  deleteSelectedText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    gap: 8,
  },
  sectionIcon: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  medicineRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  pausedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pausedText: {
    fontSize: 10,
    fontWeight: '600',
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  expiryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  medicineDetails: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  timesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  timeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  timeChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyStateContainer: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIconLarge: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tipBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tipBulletText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tipIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tipIconEmoji: {
    fontSize: 18,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
