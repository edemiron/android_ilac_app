/**
 * StatisticsScreen — Section bileşeni.
 *
 * Sprint 6.1: StatisticsScreen.tsx (910 satir) modularizasyonu.
 * Istatistik ekrani icin gruplanmis section wrapper.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemeColors } from '../../../contexts/ThemeContext';

interface SectionProps {
  icon: string;
  title: string;
  children: React.ReactNode;
  colors: ThemeColors;
  isDark: boolean;
}

export const Section: React.FC<SectionProps> = ({ icon, title, children, colors, isDark }) => (
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
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>{title}</Text>
    </View>
    {children}
  </View>
);

const styles = StyleSheet.create({
  section: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
});
