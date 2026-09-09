/**
 * GpsStatusBanner — GPS aktif veya konum arama durumu banner'ı
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { UserCoordinates } from '../../../services/pharmacyService';

interface GpsStatusBannerProps {
  userLocation: UserCoordinates | null;
  detectedLocationName: string | null;
  onRefreshLocation: () => void;
  isDark: boolean;
  isTr: boolean;
}

export function GpsStatusBanner({
  userLocation,
  detectedLocationName,
  onRefreshLocation,
  isDark,
  isTr,
}: GpsStatusBannerProps) {
  if (userLocation) {
    return (
      <TouchableOpacity
        style={[
          styles.gpsBanner,
          {
            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5',
            borderColor: isDark ? '#065F46' : '#A7F3D0',
          },
        ]}
        onPress={onRefreshLocation}
        activeOpacity={0.8}
      >
        <Ionicons name="navigate-circle" size={20} color="#10B981" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.gpsBannerText, { color: isDark ? '#34D399' : '#047857' }]}>
            {detectedLocationName
              ? `📍 Konum: ${detectedLocationName}`
              : isTr
                ? '📍 GPS Aktif: En yakın eczaneler listelendi'
                : '📍 GPS Active: Nearest pharmacies listed'}
          </Text>
          <Text style={[styles.gpsSubText, { color: isDark ? '#A7F3D0' : '#059669' }]}>
            {isTr
              ? 'En yakından uzağa doğru sıralandı (Yenilemek için dokunun)'
              : 'Sorted by distance (Tap to refresh)'}
          </Text>
        </View>
        <Ionicons name="refresh" size={16} color="#10B981" />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.gpsBanner,
        {
          backgroundColor: isDark ? 'rgba(2, 132, 199, 0.12)' : '#E0F2FE',
          borderColor: isDark ? '#0369A1' : '#BAE6FD',
        },
      ]}
      onPress={onRefreshLocation}
      activeOpacity={0.8}
    >
      <Ionicons name="locate" size={20} color="#0284C7" />
      <View style={{ flex: 1 }}>
        <Text style={[styles.gpsBannerText, { color: isDark ? '#38BDF8' : '#0369A1' }]}>
          {isTr
            ? '📍 Konumumu Bul ve En Yakın Eczaneleri Göster'
            : '📍 Find My Location & Show Closest Pharmacies'}
        </Text>
        <Text style={[styles.gpsSubText, { color: isDark ? '#BAE6FD' : '#0284C7' }]}>
          {isTr ? 'GPS izni vermek veya konumu açmak için dokunun' : 'Tap to enable GPS'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#0284C7" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  gpsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  gpsBannerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  gpsSubText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});
