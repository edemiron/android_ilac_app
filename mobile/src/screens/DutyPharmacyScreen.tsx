/**
 * DutyPharmacyScreen — Nöbetçi Eczaneler Ekranı
 *
 * Design Pattern: Presenter Pattern / Declarative View
 * GPS konum tespiti, şehir ve ilçe bazlı eczane sorgulama, telefon ve harita
 * servis entegrasyonu `useDutyPharmacyController` Presenter Hook'una aktarılmıştır.
 * Bu dosya yalnızca UI düzenini koordine eder.
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

// Presenter Hook
import { useDutyPharmacyController } from './DutyPharmacyScreen/hooks/useDutyPharmacyController';

export default function DutyPharmacyScreen() {
  const {
    navigation,
    colors,
    isDark,
    isTr,
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
  } = useDutyPharmacyController();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {/* 1. Üst Başlık & GPS Butonu */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? '#F1F5F9' : '#0F766E'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#2DD4BF' : '#0F766E' }]}>
          {isTr ? 'Nöbetçi Eczaneler' : 'Duty Pharmacies'}
        </Text>
        <TouchableOpacity
          onPress={handleLocationRefresh}
          style={styles.gpsBtn}
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
      </View>

      {/* 2. GPS Durum Banner'ı */}
      <GpsStatusBanner
        userLocation={userLocation}
        detectedLocationName={detectedLocationName}
        onRefreshLocation={handleLocationRefresh}
        isDark={isDark}
        isTr={isTr}
      />

      {/* 3. Arama Çubuğu */}
      <PharmacySearchBar
        searchQuery={searchQuery}
        onChangeSearchQuery={setSearchQuery}
        colors={colors}
        isDark={isDark}
        isTr={isTr}
      />

      {/* 4. Şehir Seçici Çipleri */}
      <CitySelectorBar
        selectedCity={selectedCity}
        onSelectCity={setSelectedCity}
        cities={popularCities}
        colors={colors}
        isDark={isDark}
      />

      {/* 5. Eczane Listesi & Boş Durum */}
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
  gpsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
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
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
