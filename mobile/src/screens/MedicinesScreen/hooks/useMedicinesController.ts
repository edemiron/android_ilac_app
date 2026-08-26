/**
 * useMedicinesController — MedicinesScreen Presenter Hook
 *
 * Design Pattern: Presenter / Controller
 * İlaç arama, 4-modlu filtreleme (Aktif/Pasif/Stok Az/Tümü), çoklu seçim ve
 * tekli/toplu silme/duraklatma işlemlerini UI bileşeninden izole eder.
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMedicineStore } from '../../../stores/medicineStore';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useSubscription } from '../../../contexts/SubscriptionContext';
import { useAlert } from '../../../contexts/AlertContext';
import type { RootStackParamList, Medicine } from '../../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export type FilterMode = 'all' | 'active' | 'inactive' | 'lowStock';

export function useMedicinesController() {
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

  // Delete confirmation modal state (bulk delete)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // Action menu state (for single medicine)
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [actionMenuMedicine, setActionMenuMedicine] = useState<Medicine | null>(null);

  // Single medicine delete confirmation state
  const [singleDeleteVisible, setSingleDeleteVisible] = useState(false);
  const [medicineToDelete, setMedicineToDelete] = useState<Medicine | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  // Search & Filter uygulanmış listeler
  const activeMedicines = useMemo(() => {
    let list = medicines.filter(m => m.isActive);
    if (filterMode === 'inactive') list = [];
    if (filterMode === 'lowStock') {
      list = list.filter(m => m.stockEnabled && (m.stockCount ?? 0) <= (m.stockThreshold ?? 0));
    }
    const q = searchQuery.trim().toLowerCase();
    if (q.length > 0) list = list.filter(m => m.name.toLowerCase().includes(q));
    return list;
  }, [medicines, filterMode, searchQuery]);

  const inactiveMedicines = useMemo(() => {
    let list = medicines.filter(m => !m.isActive);
    if (filterMode === 'active' || filterMode === 'lowStock') list = [];
    const q = searchQuery.trim().toLowerCase();
    if (q.length > 0) list = list.filter(m => m.name.toLowerCase().includes(q));
    return list;
  }, [medicines, filterMode, searchQuery]);

  // Çoklu seçim yönetimi
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

  const enterSelectionMode = useCallback((firstId: string) => {
    setIsSelectionMode(true);
    setSelectedIds(new Set([firstId]));
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const selectAll = useCallback(() => {
    const allIds = medicines.map(m => m.id);
    setSelectedIds(new Set(allIds));
  }, [medicines]);

  // Toplu silme
  const showDeleteModal = useCallback(() => {
    setDeleteModalVisible(true);
  }, []);

  const confirmDeleteSelected = useCallback(() => {
    const count = selectedIds.size;
    selectedIds.forEach(id => deleteMedicine(id));
    setDeleteModalVisible(false);
    exitSelectionMode();
    showAlert({
      type: 'success',
      title: language === 'tr' ? 'Silindi' : 'Deleted',
      message:
        language === 'tr'
          ? `${count} ilaç başarıyla silindi.`
          : `${count} medicine(s) successfully deleted.`,
    });
  }, [selectedIds, deleteMedicine, exitSelectionMode, showAlert, language]);

  const cancelDelete = useCallback(() => {
    setDeleteModalVisible(false);
  }, []);

  // Tekil ilaç eylem menüsü
  const showActionMenu = useCallback((medicine: Medicine) => {
    setActionMenuMedicine(medicine);
    setActionMenuVisible(true);
  }, []);

  const handleActionMenuEdit = useCallback(() => {
    if (!actionMenuMedicine) return;
    const medId = actionMenuMedicine.id;
    setActionMenuVisible(false);
    setActionMenuMedicine(null);
    navigation.navigate('AddMedicine', { medicineId: medId });
  }, [actionMenuMedicine, navigation]);

  const handleActionMenuToggle = useCallback(() => {
    if (!actionMenuMedicine) return;
    const med = actionMenuMedicine;
    toggleMedicineActive(med.id);
    setActionMenuVisible(false);
    setActionMenuMedicine(null);
  }, [actionMenuMedicine, toggleMedicineActive]);

  const handleActionMenuDelete = useCallback(() => {
    if (!actionMenuMedicine) return;
    const med = actionMenuMedicine;
    setActionMenuVisible(false);
    setActionMenuMedicine(null);
    // Güvenli silme modalı için ilacı ayır
    setMedicineToDelete(med);
    setSingleDeleteVisible(true);
  }, [actionMenuMedicine]);

  // Doğrudan silme diyaloğu açma (karttan veya başka yerden)
  const openDeleteDialog = useCallback((medicine: Medicine) => {
    setMedicineToDelete(medicine);
    setSingleDeleteVisible(true);
  }, []);

  const confirmSingleDelete = useCallback(() => {
    if (medicineToDelete) {
      const medName = medicineToDelete.name;
      deleteMedicine(medicineToDelete.id);
      showAlert({
        type: 'success',
        title: language === 'tr' ? 'İlaç Silindi' : 'Medicine Deleted',
        message:
          language === 'tr'
            ? `"${medName}" ilacı başarıyla silindi.`
            : `"${medName}" has been successfully deleted.`,
      });
    }
    setSingleDeleteVisible(false);
    setMedicineToDelete(null);
  }, [medicineToDelete, deleteMedicine, showAlert, language]);

  const cancelSingleDelete = useCallback(() => {
    setSingleDeleteVisible(false);
    setMedicineToDelete(null);
  }, []);

  const closeActionMenu = useCallback(() => {
    setActionMenuVisible(false);
    setActionMenuMedicine(null);
  }, []);

  // İlaç ekleme (Premium kota korumalı)
  const handleAddMedicine = useCallback(() => {
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
  }, [canAddMedicine, medicines.length, showAlert, language, navigation]);

  // Filtre sayaçları
  const filterCounts = useMemo(() => {
    const all = medicines.length;
    const active = medicines.filter(m => m.isActive).length;
    const inactive = medicines.filter(m => !m.isActive).length;
    const lowStock = medicines.filter(
      m => m.isActive && m.stockEnabled && (m.stockCount ?? 0) <= (m.stockThreshold ?? 5)
    ).length;
    return { all, active, inactive, lowStock };
  }, [medicines]);

  // Sıradaki en yakın aktif ilaç saati
  const nextUpcomingTime = useMemo(() => {
    const allActiveTimes: string[] = [];
    medicines
      .filter(m => m.isActive)
      .forEach(m => {
        const times = getReminderTimesForMedicine(m.id).map(rt => rt.time);
        allActiveTimes.push(...times);
      });
    if (allActiveTimes.length === 0) return null;
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    const sorted = [...allActiveTimes].sort();
    const future = sorted.find(t => t > currentTime);
    return future || sorted[0] || null;
  }, [medicines, getReminderTimesForMedicine]);

  return {
    navigation,
    colors,
    isDark,
    t,
    language,
    medicines,
    getReminderTimesForMedicine,
    toggleMedicineActive,
    deleteMedicine,
    searchQuery,
    setSearchQuery,
    filterMode,
    setFilterMode,
    activeMedicines,
    inactiveMedicines,
    isSelectionMode,
    selectedIds,
    toggleSelection,
    enterSelectionMode,
    exitSelectionMode,
    selectAll,
    deleteModalVisible,
    showDeleteModal,
    confirmDeleteSelected,
    cancelDelete,
    actionMenuVisible,
    actionMenuMedicine,
    showActionMenu,
    handleActionMenuEdit,
    handleActionMenuToggle,
    handleActionMenuDelete,
    openDeleteDialog,
    singleDeleteVisible,
    medicineToDelete,
    confirmSingleDelete,
    cancelSingleDelete,
    closeActionMenu,
    handleAddMedicine,
    filterCounts,
    nextUpcomingTime,
  };
}
