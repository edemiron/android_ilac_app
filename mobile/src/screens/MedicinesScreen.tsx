import React, { useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMedicineStore } from '../stores/medicineStore';
import { RootStackParamList, Medicine } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAlert } from '../contexts/AlertContext';

// Sprint 5.1: MedicinesScreen.tsx (1317 -> 989 satir) modularizasyonu.
// Component'ler ve helpers screens/MedicinesScreen/* altinda.
import { Section } from './MedicinesScreen/components/Section';
import { MedicineRow } from './MedicinesScreen/components/MedicineRow';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

  // Tip dismissed state — Sprint 20.4: Dead code kaldirildi (sadece set ediliyor, read edilmiyor)

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

  // Sprint 68: search + filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'inactive' | 'lowStock'>('all');

  // Sprint 68: filtered + searched medicines list
  const filteredMedicines = useMemo(() => {
    let result = medicines;
    // Filter by mode
    if (filterMode === 'active') {
      result = result.filter(m => m.isActive);
    } else if (filterMode === 'inactive') {
      result = result.filter(m => !m.isActive);
    } else if (filterMode === 'lowStock') {
      // Low stock: stockEnabled && (stockCount ?? 0) <= (stockThreshold ?? 0)
      result = result.filter(m => m.stockEnabled && (m.stockCount ?? 0) <= (m.stockThreshold ?? 0));
    }
    // Filter by search query (case-insensitive name match)
    const q = searchQuery.trim().toLowerCase();
    if (q.length > 0) {
      result = result.filter(m => m.name.toLowerCase().includes(q));
    }
    return result;
  }, [medicines, filterMode, searchQuery]);

  // Sprint 20.4: loadTipState useEffect kaldirildi (tipDismissed dead code)
  void AsyncStorage; // import referansi korunur

  // Sprint 20.4: dismissTip state/callback kaldirildi (dead code)

  // Sprint 68: search + filter mode uygulanmış listeler
  const activeMedicines = useMemo(() => {
    let list = medicines.filter(m => m.isActive);
    if (filterMode === 'inactive') list = []; // aktif moddayken inactive gizle
    if (filterMode === 'lowStock') {
      list = list.filter(m => m.stockEnabled && (m.stockCount ?? 0) <= (m.stockThreshold ?? 0));
    }
    const q = searchQuery.trim().toLowerCase();
    if (q.length > 0) list = list.filter(m => m.name.toLowerCase().includes(q));
    return list;
  }, [medicines, filterMode, searchQuery]);

  const inactiveMedicines = useMemo(() => {
    let list = medicines.filter(m => !m.isActive);
    if (filterMode === 'active' || filterMode === 'lowStock') list = []; // diğer modlarda inactive gizle
    const q = searchQuery.trim().toLowerCase();
    if (q.length > 0) list = list.filter(m => m.name.toLowerCase().includes(q));
    return list;
  }, [medicines, filterMode, searchQuery]);

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

      {/* Sprint 68: search bar + filter chips */}
      <View
        style={[
          styles.searchBarContainer,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Ionicons
          name="search-outline"
          size={18}
          color={colors.textMuted}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={language === 'tr' ? 'İlaç ara...' : 'Search medicines...'}
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel={language === 'tr' ? 'İlaç arama' : 'Search medicines'}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            accessibilityRole="button"
            accessibilityLabel={language === 'tr' ? 'Aramayı temizle' : 'Clear search'}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Sprint 68: filter chips */}
      <View style={styles.filterChipRow}>
        {(['all', 'active', 'inactive', 'lowStock'] as const).map(mode => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.filterChip,
              {
                backgroundColor: filterMode === mode ? colors.primary : colors.surfaceContainerLow,
                borderColor: filterMode === mode ? colors.primary : colors.border,
              },
            ]}
            onPress={() => {
              setFilterMode(mode);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: filterMode === mode }}
            accessibilityLabel={
              mode === 'all'
                ? language === 'tr'
                  ? 'Tümü'
                  : 'All'
                : mode === 'active'
                  ? language === 'tr'
                    ? 'Aktif'
                    : 'Active'
                  : mode === 'inactive'
                    ? language === 'tr'
                      ? 'Pasif'
                      : 'Inactive'
                    : language === 'tr'
                      ? 'Stok Az'
                      : 'Low Stock'
            }
          >
            <Text
              style={[
                styles.filterChipText,
                { color: filterMode === mode ? '#FFFFFF' : colors.text },
              ]}
            >
              {mode === 'all'
                ? language === 'tr'
                  ? 'Tümü'
                  : 'All'
                : mode === 'active'
                  ? language === 'tr'
                    ? 'Aktif'
                    : 'Active'
                  : mode === 'inactive'
                    ? language === 'tr'
                      ? 'Pasif'
                      : 'Inactive'
                    : language === 'tr'
                      ? 'Stok Az'
                      : 'Low Stock'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {medicines.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Section
              icon="💊"
              title={language === 'tr' ? 'İLAÇLARIM' : 'MY MEDICINES'}
              colors={colors}
              isDark={isDark}
            >
              {/* Sprint 73C: PillboxIllustration + "İlk ilacını ekle" CTA */}
              <View style={styles.emptyState}>
                <View
                  style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '15' }]}
                >
                  <Ionicons name="medkit" size={48} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {language === 'tr' ? 'İlk ilacını ekle' : 'Add your first medicine'}
                </Text>
                <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
                  {language === 'tr'
                    ? 'İlacını ekle, hatırlatma planla, sağlığını takip et'
                    : 'Add medicine, schedule reminders, track health'}
                </Text>
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                  onPress={handleAddMedicine}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.addButtonText}>
                    {language === 'tr' ? 'İlaç Ekle' : 'Add Medicine'}
                  </Text>
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
  // Sprint 68: search + filter styles
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  filterChipRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
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
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  timeChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  moreTimesText: {
    fontSize: 12,
    fontWeight: '500',
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
