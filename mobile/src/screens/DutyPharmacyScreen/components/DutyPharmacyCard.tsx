/**
 * DutyPharmacyCard — Eczane kartı, mesafe rozeti, nöbetçi durumu, ara & yol tarifi
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { formatDistance, type DutyPharmacy } from '../../../services/pharmacyService';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface DutyPharmacyCardProps {
  item: DutyPharmacy;
  onCall: (phone: string) => void;
  onOpenMap: (pharmacy: DutyPharmacy) => void;
  colors: ThemeColors;
  isDark: boolean;
  isTr: boolean;
}

export function DutyPharmacyCard({
  item,
  onCall,
  onOpenMap,
  colors,
  isDark,
  isTr,
}: DutyPharmacyCardProps) {
  const formattedDist = formatDistance(item.distanceKm);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isDark ? '#334155' : '#E2E8F0',
        },
      ]}
    >
      {/* Card Header: Pharmacy Name & Duty Badge */}
      <View style={styles.cardHeader}>
        <View style={styles.nameContainer}>
          <Text style={[styles.pharmacyName, { color: colors.text }]}>{item.name}</Text>
          <View style={styles.districtRow}>
            <Text style={[styles.districtBadge, { color: isDark ? '#38BDF8' : '#0284C7' }]}>
              📍 {item.district}, {item.city}
            </Text>
            {formattedDist ? (
              <View
                style={[
                  styles.distanceBadge,
                  {
                    backgroundColor: isDark ? 'rgba(45, 212, 191, 0.15)' : '#CCFBF1',
                  },
                ]}
              >
                <Ionicons
                  name="navigate"
                  size={11}
                  color={isDark ? '#2DD4BF' : '#0F766E'}
                  style={{ marginRight: 3 }}
                />
                <Text style={[styles.distanceBadgeText, { color: isDark ? '#2DD4BF' : '#0F766E' }]}>
                  {formattedDist} {isTr ? 'uzakta' : 'away'}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View
          style={[
            styles.dutyBadge,
            {
              backgroundColor: isDark ? '#064E3B' : '#DCFCE7',
            },
          ]}
        >
          <Text style={[styles.dutyBadgeText, { color: isDark ? '#34D399' : '#15803D' }]}>
            {isTr ? '🟢 NÖBETÇİ' : '🟢 ON DUTY'}
          </Text>
        </View>
      </View>

      {/* Address */}
      <Text style={[styles.addressText, { color: colors.textSecondary }]}>{item.address}</Text>

      {/* Working Hours */}
      <View style={styles.hoursRow}>
        <Ionicons name="time-outline" size={14} color={colors.textMuted} />
        <Text style={[styles.hoursText, { color: colors.textMuted }]}>{item.dutyHours}</Text>
      </View>

      {/* Action Buttons: Hemen Ara & Yol Tarifi */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
          onPress={() => onCall(item.phone)}
          activeOpacity={0.8}
        >
          <Ionicons name="call" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.actionBtnText}>{isTr ? 'Hemen Ara' : 'Call'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#0F766E' }]}
          onPress={() => onOpenMap(item)}
          activeOpacity={0.8}
        >
          <Ionicons name="navigate" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.actionBtnText}>{isTr ? 'Yol Tarifi' : 'Directions'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  nameContainer: {
    flex: 1,
  },
  pharmacyName: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  districtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  districtBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  distanceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dutyBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 8,
  },
  dutyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  addressText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 8,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 14,
  },
  hoursText: {
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 14,
    elevation: 1,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
