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
  const [actionMenuCallbacks, setActionMenuCallbacks] = useState<{
    onToggle: () => void;
    onDelete: () => void;
  } | null>(null);

  // Single medicine delete confirmation state
  const [singleDeleteVisible, setSingleDeleteVisible] = useState(false);

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
    selectedIds.forEach(id => deleteMedicine(id));
    setDeleteModalVisible(false);
    exitSelectionMode();
  }, [selectedIds, deleteMedicine, exitSelectionMode]);

  const cancelDelete = useCallback(() => {
    setDeleteModalVisible(false);
  }, []);

  // Tekil ilaç eylem menüsü
  const showActionMenu = useCallback(
    (medicine: Medicine, onToggle: () => void, onDel: () => void) => {
      setActionMenuMedicine(medicine);
      setActionMenuCallbacks({ onToggle, onDelete: onDel });
      setActionMenuVisible(true);
    },
    []
  );

  const handleActionMenuToggle = useCallback(() => {
    if (actionMenuCallbacks?.onToggle) {
      actionMenuCallbacks.onToggle();
    }
    setActionMenuVisible(false);
  }, [actionMenuCallbacks]);

  const handleActionMenuDelete = useCallback(() => {
    setActionMenuVisible(false);
    setSingleDeleteVisible(true);
  }, []);

  const confirmSingleDelete = useCallback(() => {
    if (actionMenuCallbacks?.onDelete) {
      actionMenuCallbacks.onDelete();
    }
    setSingleDeleteVisible(false);
    setActionMenuMedicine(null);
    setActionMenuCallbacks(null);
  }, [actionMenuCallbacks]);

  const cancelSingleDelete = useCallback(() => {
    setSingleDeleteVisible(false);
  }, []);

  const closeActionMenu = useCallback(() => {
    setActionMenuVisible(false);
    setActionMenuMedicine(null);
    setActionMenuCallbacks(null);
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
    handleActionMenuToggle,
    handleActionMenuDelete,
    singleDeleteVisible,
    confirmSingleDelete,
    cancelSingleDelete,
    closeActionMenu,
    handleAddMedicine,
  };
}
