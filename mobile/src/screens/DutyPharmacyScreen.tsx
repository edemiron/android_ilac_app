/**
 * DutyPharmacyScreen — Nöbetçi Eczaneler & Reçete Takip Ekranı
 *
 * Design Pattern: Presenter Pattern / Declarative View
 * - 🏥 GPS Konum Bazlı En Yakından Uzağa Sıralı Nöbetçi Eczaneler
 * - 📞 Tek Dokunuşla Doğrudan Telefon Araması
 * - 🗺️ Google Maps & Apple Maps Canlı Turn-by-Turn Rota Navigasyonu
 * - 📋 Reçete & E-Reçete Takibi, Bitiş Hatırlatmaları ve Eczane Köprüsü
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Alt Bileşenler (Modular UI)
import { DutyPharmacyCard } from './DutyPharmacyScreen/components/DutyPharmacyCard';
import { GpsStatusBanner } from './DutyPharmacyScreen/components/GpsStatusBanner';
import { CitySelectorBar } from './DutyPharmacyScreen/components/CitySelectorBar';
import { PharmacySearchBar } from './DutyPharmacyScreen/components/PharmacySearchBar';
import { PrescriptionCard } from './DutyPharmacyScreen/components/PrescriptionCard';
import { AddPrescriptionModal } from './DutyPharmacyScreen/components/AddPrescriptionModal';

// Presenter Hook
import { useDutyPharmacyController } from './DutyPharmacyScreen/hooks/useDutyPharmacyController';

export default function DutyPharmacyScreen() {
  const {
    navigation,
    colors,
    isDark,
    isTr,
    activeTab,
    setActiveTab,
    selectedCity,
    setSelectedCity,
    searchQuery,
    setSearchQuery,
    pharmacies,
    userLocation,
    loading,
    locating,
    detectedLocationName,
    handleLocationRefresh,
    handleCallPharmacy,
    handleOpenMap,
    popularCities,
    // Reçete Alanları
    prescriptions,
    allMedicines,
    isPrescriptionModalVisible,
    setIsPrescriptionModalVisible,
    editingPrescription,
    handleOpenNewPrescription,
    handleOpenEditPrescription,
    handleSavePrescription,
    handleDeletePrescription,
    handlePrescriptionFindPharmacy,
  } = useDutyPharmacyController();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {/* 1. Üst Başlık & GPS / Ekle Butonu */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? '#F1F5F9' : '#0F766E'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#2DD4BF' : '#0F766E' }]}>
          {activeTab === 'pharmacies'
            ? isTr
              ? 'Nöbetçi Eczaneler'
              : 'Duty Pharmacies'
            : isTr
              ? 'Reçetelerim & Yenileme'
              : 'My Prescriptions'}
        </Text>

        {activeTab === 'pharmacies' ? (
          <TouchableOpacity
            onPress={handleLocationRefresh}
            style={styles.headerActionBtn}
            activeOpacity={0.7}
            disabled={locating}
          >
            {locating ? (
              <ActivityIndicator size="small" color="#0F766E" />
            ) : (
              <Ionicons
                name={userLocation ? 'locate' : 'location-outline'}
                size={22}
                color={userLocation ? '#10B981' : isDark ? '#94A3B8' : '#64748B'}
              />
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleOpenNewPrescription}
            style={[
              styles.headerActionBtn,
              { backgroundColor: isDark ? 'rgba(45, 212, 191, 0.2)' : '#CCFBF1' },
            ]}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* 2. 2-Sekmeli Görünüm Seçici (Eczaneler / Reçetelerim) */}
      <View style={styles.tabSwitcherWrapper}>
        <View
          style={[
            styles.tabSwitcher,
            {
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#F1F5F9',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => setActiveTab('pharmacies')}
            style={[
              styles.tabButton,
              activeTab === 'pharmacies' && {
                backgroundColor: colors.primary,
                ...styles.activeTabShadow,
              },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'pharmacies' }}
          >
            <Ionicons
              name="location"
              size={16}
              color={activeTab === 'pharmacies' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabButtonText,
                {
                  fontWeight: activeTab === 'pharmacies' ? '700' : '600',
                  color: activeTab === 'pharmacies' ? '#FFFFFF' : colors.textSecondary,
                },
              ]}
            >
              {isTr ? 'Nöbetçi Eczaneler' : 'Duty Pharmacies'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('prescriptions')}
            style={[
              styles.tabButton,
              activeTab === 'prescriptions' && {
                backgroundColor: colors.primary,
                ...styles.activeTabShadow,
              },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'prescriptions' }}
          >
            <Ionicons
              name="receipt"
              size={16}
              color={activeTab === 'prescriptions' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabButtonText,
                {
                  fontWeight: activeTab === 'prescriptions' ? '700' : '600',
                  color: activeTab === 'prescriptions' ? '#FFFFFF' : colors.textSecondary,
                },
              ]}
            >
              {isTr ? 'Reçetelerim' : 'Prescriptions'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* TAB 1: NÖBETÇİ ECZANELER */}
      {activeTab === 'pharmacies' ? (
        <>
          {/* GPS Durum Banner'ı */}
          <GpsStatusBanner
            userLocation={userLocation}
            detectedLocationName={detectedLocationName}
            onRefreshLocation={handleLocationRefresh}
            isDark={isDark}
            isTr={isTr}
          />

          {/* Arama Çubuğu */}
          <PharmacySearchBar
            searchQuery={searchQuery}
            onChangeSearchQuery={setSearchQuery}
            colors={colors}
            isDark={isDark}
            isTr={isTr}
          />

          {/* Şehir Seçici Çipleri */}
          <CitySelectorBar
            selectedCity={selectedCity}
            onSelectCity={setSelectedCity}
            cities={popularCities}
            colors={colors}
            isDark={isDark}
          />

          {/* Eczane Listesi & Boş Durum */}
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator color="#0F766E" size="large" />
            </View>
          ) : (
            <FlatList
              data={pharmacies}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <DutyPharmacyCard
                  item={item}
                  onCall={handleCallPharmacy}
                  onOpenMap={handleOpenMap}
                  colors={colors}
                  isDark={isDark}
                  isTr={isTr}
                />
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.centerContainer}>
                  <Text style={styles.emptyIcon}>🏥</Text>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    {isTr
                      ? 'Aradığınız kriterlere uygun nöbetçi eczane bulunamadı.'
                      : 'No duty pharmacies found matching criteria.'}
                  </Text>
                </View>
              }
            />
          )}
        </>
      ) : (
        /* TAB 2: REÇETELERİM & İLAÇ YENİLEME */
        <View style={{ flex: 1 }}>
          <FlatList
            data={prescriptions}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <PrescriptionCard
                item={item}
                allMedicines={allMedicines}
                onFindPharmacy={() => handlePrescriptionFindPharmacy(item)}
                onEdit={handleOpenEditPrescription}
                onDelete={handleDeletePrescription}
                colors={colors}
                isDark={isDark}
                isTr={isTr}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View
                style={[
                  styles.prescriptionIntroBanner,
                  {
                    backgroundColor: isDark ? 'rgba(15, 118, 110, 0.15)' : '#F0FDFA',
                    borderColor: isDark ? 'rgba(45, 212, 191, 0.2)' : '#CCFBF1',
                  },
                ]}
              >
                <Ionicons name="information-circle" size={20} color={colors.primary} />
                <Text style={[styles.prescriptionIntroText, { color: colors.text }]}>
                  {isTr
                    ? 'Reçetelerinizi kaydedin, bitiş tarihinden önce bildirim alın ve tek tıkla en yakın nöbetçi eczaneden temin edin.'
                    : 'Track your prescriptions, get refill reminders before expiry, and easily find duty pharmacies.'}
                </Text>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {isTr ? 'Henüz Kayıtlı Reçete Yok' : 'No Prescriptions Yet'}
                </Text>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  {isTr
                    ? 'E-Reçete kodunuzu veya doktor raporunuzu ekleyerek bitiş tarihini takip edebilirsiniz.'
                    : 'Add your prescription code or medical report to track refill dates.'}
                </Text>
                <TouchableOpacity
                  style={[styles.addFirstBtn, { backgroundColor: colors.primary }]}
                  onPress={handleOpenNewPrescription}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="add-circle"
                    size={18}
                    color="#FFFFFF"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.addFirstBtnText}>
                    {isTr ? 'İlk Reçeteni Ekle' : 'Add First Prescription'}
                  </Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      )}

      {/* 3. Reçete Ekleme / Düzenleme Modalı */}
      <AddPrescriptionModal
        visible={isPrescriptionModalVisible}
        onClose={() => setIsPrescriptionModalVisible(false)}
        onSave={handleSavePrescription}
        editingPrescription={editingPrescription}
        allMedicines={allMedicines}
        colors={colors}
        isDark={isDark}
        isTr={isTr}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18.5,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  tabSwitcherWrapper: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  tabSwitcher: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  activeTabShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 14,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  prescriptionIntroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginBottom: 14,
  },
  prescriptionIntroText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17,
  },
  addFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  addFirstBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
