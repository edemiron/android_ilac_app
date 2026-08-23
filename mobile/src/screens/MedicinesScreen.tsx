/**
 * MedicinesScreen — İlaçlarım Ekranı
 *
 * Design Pattern: Presenter Pattern / Declarative View
 * Tüm arama, filtreleme, çoklu seçim ve silme eylem mantıkları `useMedicinesController`
 * Presenter Hook'una devredilmiştir. Bu dosya yalnızca UI düzeni ve sekme organizasyonunu koordine eder.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { ActionSheetMenu, type ActionSheetMenuAction } from '../components/common/ActionSheetMenu';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { ClinicalSearchBar } from '../components/common/ClinicalSearchBar';

// Alt Bileşenler (Modular UI)
import { MedicineRow } from './MedicinesScreen/components/MedicineRow';
import { FilterChipRow } from './MedicinesScreen/components/FilterChipRow';
import { MedicineSummaryCard } from './MedicinesScreen/components/MedicineSummaryCard';
import { MedicineEmptyState } from './MedicinesScreen/components/MedicineEmptyState';
import { SelectionActionBar } from './MedicinesScreen/components/SelectionActionBar';

// Presenter Hook
import { useMedicinesController } from './MedicinesScreen/hooks/useMedicinesController';

export default function MedicinesScreen() {
  const {
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
    filterCounts,
    nextUpcomingTime,
  } = useMedicinesController();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {/* 1. Başlık: Çoklu Seçim Modu veya Standart Başlık */}
      {isSelectionMode ? (
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
      ) : (
        <ScreenHeader
          title={language === 'tr' ? 'İlaçlarım' : 'My Medicines'}
          subtitle={
            language === 'tr'
              ? `${medicines.length} kayıtlı ilaç`
              : `${medicines.length} registered medicines`
          }
          rightAction={
            <TouchableOpacity
              onPress={handleAddMedicine}
              style={[styles.headerAddBtn, { backgroundColor: colors.primary }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          }
        />
      )}

      {/* 2. Klinik Arama Çubuğu */}
      <View style={styles.searchWrapper}>
        <ClinicalSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={language === 'tr' ? 'İlaç veya etken madde ara...' : 'Search medicines...'}
          onClear={() => setSearchQuery('')}
        />
      </View>

      {/* 3. Filtre Çipleri (Tümü, Aktif, Pasif, Stok Az) */}
      <FilterChipRow
        filterMode={filterMode}
        onSelectFilter={setFilterMode}
        colors={colors}
        language={language}
        isDark={isDark}
        counts={filterCounts}
      />

      {/* 4. İlaç Listesi ve Boş Durum */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 4A. Hero Sağlık & İlaç Özeti Kartı */}
        {medicines.length > 0 && !isSelectionMode && !searchQuery.trim() && (
          <MedicineSummaryCard
            totalCount={filterCounts.all}
            activeCount={filterCounts.active}
            lowStockCount={filterCounts.lowStock}
            nextUpcomingTime={nextUpcomingTime}
            onAddMedicine={handleAddMedicine}
            colors={colors}
            isDark={isDark}
            language={language}
          />
        )}

        {medicines.length === 0 ? (
          <MedicineEmptyState
            onAddMedicine={handleAddMedicine}
            colors={colors}
            isDark={isDark}
            language={language}
          />
        ) : (
          <>
            {activeMedicines.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeaderStandalone}>
                  <View
                    style={[
                      styles.sectionPillBadge,
                      {
                        backgroundColor: isDark
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(16, 185, 129, 0.10)',
                        borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)',
                      },
                    ]}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={13}
                      color={colors.success || '#10B981'}
                    />
                    <Text style={[styles.sectionTitle, { color: colors.success || '#10B981' }]}>
                      {language === 'tr' ? 'AKTİF TEDAVİLER' : 'ACTIVE TREATMENTS'} (
                      {activeMedicines.length})
                    </Text>
                  </View>
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
                  <View
                    style={[
                      styles.sectionPillBadge,
                      {
                        backgroundColor: isDark
                          ? 'rgba(148, 163, 184, 0.15)'
                          : 'rgba(148, 163, 184, 0.12)',
                        borderColor: isDark
                          ? 'rgba(148, 163, 184, 0.3)'
                          : 'rgba(148, 163, 184, 0.2)',
                      },
                    ]}
                  >
                    <Ionicons name="pause-circle" size={13} color={colors.textMuted} />
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                      {language === 'tr' ? 'DURAKLATILAN İLAÇLAR' : 'PAUSED MEDICINES'} (
                      {inactiveMedicines.length})
                    </Text>
                  </View>
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

      {/* 5. Çoklu Seçim Eylem Çubuğu */}
      {isSelectionMode && (
        <SelectionActionBar
          selectedCount={selectedIds.size}
          onDeleteSelected={showDeleteModal}
          colors={colors}
          language={language}
        />
      )}

      {/* 6. Toplu Silme Onay Modalı */}
      <ConfirmDialog
        visible={deleteModalVisible}
        title={language === 'tr' ? 'Toplu Silme' : 'Bulk Delete'}
        message={
          language === 'tr'
            ? `${selectedIds.size} ilacı silmek istediğinize emin misiniz?`
            : `Are you sure you want to delete ${selectedIds.size} medicine(s)?`
        }
        confirmLabel={language === 'tr' ? 'Sil' : 'Delete'}
        cancelLabel={t('cancel')}
        destructive
        onConfirm={confirmDeleteSelected}
        onClose={cancelDelete}
      >
        <View style={styles.modalMedicineList}>
          {Array.from(selectedIds)
            .slice(0, 3)
            .map(id => {
              const medicine = medicines.find(m => m.id === id);
              if (!medicine) return null;
              return (
                <View key={id} style={styles.modalMedicineItem}>
                  <View
                    style={[styles.modalMedicineIcon, { backgroundColor: medicine.color + '20' }]}
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
      </ConfirmDialog>

      {/* 7. Tekil İlaç Eylem Menüsü */}
      <ActionSheetMenu
        visible={actionMenuVisible}
        title={actionMenuMedicine?.name}
        actions={
          [
            {
              key: 'toggle',
              label: actionMenuMedicine?.isActive
                ? language === 'tr'
                  ? 'Durakla'
                  : 'Pause'
                : language === 'tr'
                  ? 'Devam Et'
                  : 'Resume',
              icon: actionMenuMedicine?.isActive ? 'pause-circle' : 'play-circle',
              onPress: handleActionMenuToggle,
            },
            {
              key: 'delete',
              label: language === 'tr' ? 'Sil' : 'Delete',
              icon: 'trash',
              destructive: true,
              onPress: handleActionMenuDelete,
            },
          ] satisfies ActionSheetMenuAction[]
        }
        cancelLabel={t('cancel')}
        onClose={closeActionMenu}
      />

      {/* 8. Tekil İlaç Silme Onayı */}
      <ConfirmDialog
        visible={singleDeleteVisible}
        title={language === 'tr' ? 'İlacı Sil' : 'Delete Medicine'}
        message={
          language === 'tr'
            ? `"${actionMenuMedicine?.name}" ilacını silmek istediğinize emin misiniz?`
            : `Are you sure you want to delete "${actionMenuMedicine?.name}"?`
        }
        confirmLabel={language === 'tr' ? 'Sil' : 'Delete'}
        cancelLabel={t('cancel')}
        destructive
        onConfirm={confirmSingleDelete}
        onClose={cancelSingleDelete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
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
  sectionContainer: {
    marginTop: 10,
    marginBottom: 4,
  },
  sectionHeaderStandalone: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sectionPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
});
