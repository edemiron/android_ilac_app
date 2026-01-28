import React, { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMedicineStore } from '../stores/medicineStore';
import { RootStackParamList, Medicine } from '../types';
import { formatTimeDisplay, getInstructionText } from '../utils/timeCalculator';
import { differenceInDays, parseISO, startOfDay, format } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage, TranslationKey } from '../contexts/LanguageContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAlert } from '../contexts/AlertContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Son kullanma tarihi durumu hesaplama
type ExpiryStatus =
  | { type: 'expired' }
  | { type: 'expires_today' }
  | { type: 'expires_soon'; daysLeft: number }
  | { type: 'ok' }
  | null;

function getExpiryStatus(expiryDate: string | undefined, reminderDays?: number): ExpiryStatus {
  if (!expiryDate) return null;

  try {
    const today = startOfDay(new Date());
    const expiry = startOfDay(parseISO(expiryDate));
    const daysLeft = differenceInDays(expiry, today);

    // Kullanıcının seçtiği hatırlatma süresi (varsayılan: 30 gün)
    const threshold = reminderDays || 30;

    if (daysLeft < 0) return { type: 'expired' };
    if (daysLeft === 0) return { type: 'expires_today' };
    if (daysLeft <= threshold) return { type: 'expires_soon', daysLeft };
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

const MedicineRow: React.FC<MedicineRowProps> = ({
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

  // Son kullanma tarihi durumunu hesapla (kullanıcının seçtiği hatırlatma süresini kullan)
  const expiryStatus = getExpiryStatus(medicine.expiryDate, medicine.expiryReminderDays);

  // Son kullanma tarihini formatla
  const formatExpiryDate = (dateStr: string): string => {
    try {
      const date = parseISO(dateStr);
      const locale = language === 'tr' ? tr : enUS;
      // "SKT: 31 Oca 2027" veya "EXP: Jan 31, 2027"
      if (language === 'tr') {
        return `SKT: ${format(date, 'd MMM yyyy', { locale })}`;
      }
      return `EXP: ${format(date, 'MMM d, yyyy', { locale })}`;
    } catch {
      return '';
    }
  };

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
      case 'ok':
        // 30 gunden fazla var - tarihi goster
        if (medicine.expiryDate) {
          return (
            <View style={[styles.expiryBadge, { backgroundColor: colors.textMuted + '15' }]}>
              <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
              <Text style={[styles.expiryBadgeText, { color: colors.textMuted }]}>
                {formatExpiryDate(medicine.expiryDate)}
              </Text>
            </View>
          );
        }
        return null;
      default:
        return null;
    }
  };

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
              numberOfLines={2}
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
  const { showAlert } = useAlert();

  const { medicines, getReminderTimesForMedicine, toggleMedicineActive, deleteMedicine } =
    useMedicineStore();

  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Tip dismissed state
  const [tipDismissed, setTipDismissed] = useState(true); // Default true to hide while loading

  // Delete confirmation modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // Action menu state (for single medicine)
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [actionMenuMedicine, setActionMenuMedicine] = useState<Medicine | null>(null);
  const [actionMenuCallbacks, setActionMenuCallbacks] = useState<{
    onToggle: () => void;
    onDelete: () => void;
  } | null>(null);

  // Single medicine delete confirmation state
  const [singleDeleteVisible, setSingleDeleteVisible] = useState(false);

  // Load tip dismissed state from AsyncStorage
  useEffect(() => {
    const loadTipState = async () => {
      try {
        const dismissed = await AsyncStorage.getItem('medicines_tip_dismissed');
        setTipDismissed(dismissed === 'true');
      } catch {
        setTipDismissed(false);
      }
    };
    loadTipState();
  }, []);

  // Dismiss tip handler
  const dismissTip = useCallback(async () => {
    setTipDismissed(true);
    try {
      await AsyncStorage.setItem('medicines_tip_dismissed', 'true');
    } catch {
      // Ignore storage errors
    }
  }, []);

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

  // Show delete confirmation modal
  const showDeleteModal = useCallback(() => {
    setDeleteModalVisible(true);
  }, []);

  // Confirm delete selected medicines
  const confirmDeleteSelected = useCallback(() => {
    selectedIds.forEach(id => deleteMedicine(id));
    setDeleteModalVisible(false);
    exitSelectionMode();
  }, [selectedIds, deleteMedicine, exitSelectionMode]);

  // Cancel delete
  const cancelDelete = useCallback(() => {
    setDeleteModalVisible(false);
  }, []);

  // Show action menu for single medicine
  const showActionMenu = useCallback(
    (medicine: Medicine, onToggle: () => void, onDel: () => void) => {
      setActionMenuMedicine(medicine);
      setActionMenuCallbacks({ onToggle, onDelete: onDel });
      setActionMenuVisible(true);
    },
    []
  );

  // Handle action menu toggle
  const handleActionMenuToggle = useCallback(() => {
    if (actionMenuCallbacks?.onToggle) {
      actionMenuCallbacks.onToggle();
    }
    setActionMenuVisible(false);
  }, [actionMenuCallbacks]);

  // Show single delete confirmation
  const handleActionMenuDelete = useCallback(() => {
    setActionMenuVisible(false);
    setSingleDeleteVisible(true);
  }, []);

  // Confirm single delete
  const confirmSingleDelete = useCallback(() => {
    if (actionMenuCallbacks?.onDelete) {
      actionMenuCallbacks.onDelete();
    }
    setSingleDeleteVisible(false);
    setActionMenuMedicine(null);
    setActionMenuCallbacks(null);
  }, [actionMenuCallbacks]);

  // Cancel single delete
  const cancelSingleDelete = useCallback(() => {
    setSingleDeleteVisible(false);
  }, []);

  // Close action menu
  const closeActionMenu = useCallback(() => {
    setActionMenuVisible(false);
    setActionMenuMedicine(null);
    setActionMenuCallbacks(null);
  }, []);

  const handleAddMedicine = () => {
    const { allowed, reason } = canAddMedicine(medicines.length);

    if (!allowed) {
      showAlert({
        type: 'warning',
        title: language === 'tr' ? 'İlaç Limiti' : 'Medicine Limit',
        message: reason,
        buttons: [
          { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
          {
            text: language === 'tr' ? "Premium'a Geç" : 'Go Premium',
            onPress: () => navigation.navigate('Premium'),
          },
        ],
      });
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
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderStandalone}>
                  <Text style={styles.sectionIcon}>💚</Text>
                  <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                    {language === 'tr' ? 'AKTİF İLAÇLAR' : 'ACTIVE MEDICINES'} (
                    {activeMedicines.length})
                  </Text>
                </View>
                {activeMedicines.map(medicine => {
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
                      onShowActionMenu={showActionMenu}
                      colors={colors}
                      isDark={isDark}
                      t={t}
                      language={language}
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedIds.has(medicine.id)}
                      onSelect={() => toggleSelection(medicine.id)}
                      onLongPressSelect={
                        !isSelectionMode ? () => enterSelectionMode(medicine.id) : undefined
                      }
                    />
                  );
                })}
              </View>
            )}

            {inactiveMedicines.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderStandalone}>
                  <Text style={styles.sectionIcon}>⏸️</Text>
                  <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                    {language === 'tr' ? 'DURAKLATILAN İLAÇLAR' : 'PAUSED MEDICINES'} (
                    {inactiveMedicines.length})
                  </Text>
                </View>
                {inactiveMedicines.map(medicine => {
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
                      onShowActionMenu={showActionMenu}
                      colors={colors}
                      isDark={isDark}
                      t={t}
                      language={language}
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedIds.has(medicine.id)}
                      onSelect={() => toggleSelection(medicine.id)}
                      onLongPressSelect={
                        !isSelectionMode ? () => enterSelectionMode(medicine.id) : undefined
                      }
                    />
                  );
                })}
              </View>
            )}

            {!tipDismissed && (
              <View style={[styles.tipCard, { backgroundColor: colors.primary + '15' }]}>
                <View style={styles.tipContent}>
                  <Ionicons name="bulb" size={18} color={colors.primary} />
                  <Text style={[styles.tipText, { color: colors.text }]}>
                    {language === 'tr'
                      ? 'Düzenlemek için dokunun, silmek için basılı tutun'
                      : 'Tap to edit, long press to delete'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={dismissTip}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}
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
            onPress={showDeleteModal}
          >
            <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
            <Text style={styles.deleteSelectedText}>
              {language === 'tr' ? `${selectedIds.size} İlacı Sil` : `Delete ${selectedIds.size}`}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconContainer, { backgroundColor: colors.error + '20' }]}>
                <Ionicons name="trash" size={28} color={colors.error} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {language === 'tr' ? 'Toplu Silme' : 'Bulk Delete'}
              </Text>
            </View>

            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              {language === 'tr'
                ? `${selectedIds.size} ilacı silmek istediğinize emin misiniz?`
                : `Are you sure you want to delete ${selectedIds.size} medicine(s)?`}
            </Text>

            <View style={styles.modalMedicineList}>
              {Array.from(selectedIds)
                .slice(0, 3)
                .map(id => {
                  const medicine = medicines.find(m => m.id === id);
                  if (!medicine) return null;
                  return (
                    <View key={id} style={styles.modalMedicineItem}>
                      <View
                        style={[
                          styles.modalMedicineIcon,
                          { backgroundColor: medicine.color + '20' },
                        ]}
                      >
                        <Ionicons name="medical" size={16} color={medicine.color} />
                      </View>
                      <Text
                        style={[styles.modalMedicineName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {medicine.name}
                      </Text>
                    </View>
                  );
                })}
              {selectedIds.size > 3 && (
                <Text style={[styles.modalMoreText, { color: colors.textMuted }]}>
                  {language === 'tr'
                    ? `+${selectedIds.size - 3} ilaç daha`
                    : `+${selectedIds.size - 3} more`}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.error }]}
              onPress={confirmDeleteSelected}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
              <Text style={styles.modalButtonText}>{language === 'tr' ? 'Sil' : 'Delete'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalCancelButton, { borderColor: colors.border }]}
              onPress={cancelDelete}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>
                {t('cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Action Menu Modal (Single Medicine) */}
      <Modal
        visible={actionMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeActionMenu}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <View
                style={[
                  styles.modalIconContainer,
                  { backgroundColor: (actionMenuMedicine?.color || colors.primary) + '20' },
                ]}
              >
                <Ionicons
                  name="medical"
                  size={24}
                  color={actionMenuMedicine?.color || colors.primary}
                />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={2}>
                {actionMenuMedicine?.name}
              </Text>
            </View>

            <View style={styles.actionMenuButtons}>
              <TouchableOpacity
                style={[styles.actionMenuButton, { backgroundColor: colors.primary + '15' }]}
                onPress={handleActionMenuToggle}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={actionMenuMedicine?.isActive ? 'pause-circle' : 'play-circle'}
                  size={22}
                  color={colors.primary}
                />
                <Text style={[styles.actionMenuButtonText, { color: colors.primary }]}>
                  {actionMenuMedicine?.isActive
                    ? language === 'tr'
                      ? 'Durakla'
                      : 'Pause'
                    : language === 'tr'
                      ? 'Devam Et'
                      : 'Resume'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionMenuButton, { backgroundColor: colors.error + '15' }]}
                onPress={handleActionMenuDelete}
                activeOpacity={0.7}
              >
                <Ionicons name="trash" size={22} color={colors.error} />
                <Text style={[styles.actionMenuButtonText, { color: colors.error }]}>
                  {language === 'tr' ? 'Sil' : 'Delete'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.modalCancelButton, { borderColor: colors.border }]}
              onPress={closeActionMenu}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>
                {t('cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Single Delete Confirmation Modal */}
      <Modal
        visible={singleDeleteVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelSingleDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconContainer, { backgroundColor: colors.error + '20' }]}>
                <Ionicons name="trash" size={28} color={colors.error} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {language === 'tr' ? 'İlacı Sil' : 'Delete Medicine'}
              </Text>
            </View>

            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              {language === 'tr'
                ? `"${actionMenuMedicine?.name}" ilacını silmek istediğinize emin misiniz?`
                : `Are you sure you want to delete "${actionMenuMedicine?.name}"?`}
            </Text>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.error }]}
              onPress={confirmSingleDelete}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
              <Text style={styles.modalButtonText}>{language === 'tr' ? 'Sil' : 'Delete'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalCancelButton, { borderColor: colors.border }]}
              onPress={cancelSingleDelete}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>
                {t('cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  medicineCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  sectionContainer: {
    marginTop: 16,
  },
  sectionHeaderStandalone: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 8,
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
    flex: 1,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
    flexShrink: 0,
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
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  tipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
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
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  modalDescription: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalMedicineList: {
    width: '100%',
    marginBottom: 20,
    gap: 8,
  },
  modalMedicineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalMedicineIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalMedicineName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  modalMoreText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
    paddingLeft: 42,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginBottom: 10,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCancelButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '500',
  },
  // Action Menu Styles
  actionMenuButtons: {
    width: '100%',
    gap: 10,
    marginBottom: 16,
  },
  actionMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 10,
  },
  actionMenuButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
