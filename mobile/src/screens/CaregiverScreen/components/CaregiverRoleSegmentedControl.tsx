/**
 * CaregiverRoleSegmentedControl — Aile & Bakıcı Modu Rol Değiştirici
 *
 * 2026 Modern Segmented Control:
 * - 🛡️ Koruma Çemberim (Hastayım - Beni İzleyenler)
 * - 👥 Takip Ettiğim Yakınlarım (Bakıcıyım - İzlediğim Kişiler)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { ThemeColors } from '../../../contexts/ThemeContext';

export type CaregiverTabRole = 'my_caregivers' | 'my_patients';

interface CaregiverRoleSegmentedControlProps {
  activeTab: CaregiverTabRole;
  onChangeTab: (tab: CaregiverTabRole) => void;
  caregiverCount: number;
  patientCount: number;
  colors: ThemeColors;
  isDark: boolean;
  language: string;
}

export function CaregiverRoleSegmentedControl({
  activeTab,
  onChangeTab,
  caregiverCount,
  patientCount,
  colors,
  isDark,
  language,
}: CaregiverRoleSegmentedControlProps) {
  const isTr = language === 'tr';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.card : '#F1F5F9',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
        },
      ]}
    >
      {/* 1. Sekme: Beni Takip Edenler (Hasta Modu) */}
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'my_caregivers' && [
            styles.activeTab,
            {
              backgroundColor: isDark ? colors.background : '#FFFFFF',
              shadowColor: '#000000',
            },
          ],
        ]}
        onPress={() => onChangeTab('my_caregivers')}
        activeOpacity={0.8}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'my_caregivers' }}
      >
        <Ionicons
          name={activeTab === 'my_caregivers' ? 'shield-checkmark' : 'shield-outline'}
          size={17}
          color={activeTab === 'my_caregivers' ? colors.primary : colors.textSecondary}
        />
        <Text
          style={[
            styles.tabText,
            {
              color: activeTab === 'my_caregivers' ? colors.text : colors.textSecondary,
              fontWeight: activeTab === 'my_caregivers' ? '700' : '500',
            },
          ]}
          numberOfLines={1}
        >
          {isTr ? 'Beni İzleyenler' : 'My Caregivers'}
        </Text>
        {caregiverCount > 0 && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor:
                  activeTab === 'my_caregivers' ? colors.primary : colors.inputBackground,
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                {
                  color: activeTab === 'my_caregivers' ? '#FFFFFF' : colors.textSecondary,
                },
              ]}
            >
              {caregiverCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* 2. Sekme: Takip Ettiğim Kişiler (Bakıcı Modu) */}
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'my_patients' && [
            styles.activeTab,
            {
              backgroundColor: isDark ? colors.background : '#FFFFFF',
              shadowColor: '#000000',
            },
          ],
        ]}
        onPress={() => onChangeTab('my_patients')}
        activeOpacity={0.8}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'my_patients' }}
      >
        <Ionicons
          name={activeTab === 'my_patients' ? 'people' : 'people-outline'}
          size={17}
          color={activeTab === 'my_patients' ? colors.primary : colors.textSecondary}
        />
        <Text
          style={[
            styles.tabText,
            {
              color: activeTab === 'my_patients' ? colors.text : colors.textSecondary,
              fontWeight: activeTab === 'my_patients' ? '700' : '500',
            },
          ]}
          numberOfLines={1}
        >
          {isTr ? 'Takip Ettiğim Kişiler' : 'Patients I Care For'}
        </Text>
        {patientCount > 0 && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor:
                  activeTab === 'my_patients' ? colors.primary : colors.inputBackground,
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                {
                  color: activeTab === 'my_patients' ? '#FFFFFF' : colors.textSecondary,
                },
              ]}
            >
              {patientCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 12,
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
  },
  activeTab: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    letterSpacing: -0.2,
  },
  badge: {
    paddingHorizontal: 6.5,
    paddingVertical: 1.5,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
