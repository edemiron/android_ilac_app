/**
 * StatisticsScreen — Section bileşeni.
 *
 * Sprint 6.1: StatisticsScreen.tsx (910 satir) modularizasyonu.
 * Sprint 107.2: ListSection primitive'i (variant=stats) kullanır.
 * Istatistik ekrani icin gruplanmis section wrapper.
 */

import React from 'react';
import { Text } from 'react-native';
import { ListSection } from '../../../components/common/ListSection';
import { ThemeColors } from '../../../contexts/ThemeContext';

interface SectionProps {
  icon: string;
  title: string;
  children: React.ReactNode;
  /**
   * Sprint 107.2: ListSection tema'yı kendi yönetir — eski API uyumluluğu için
   * opsiyonel prop olarak bırakıldı (kullanılmıyor).
   */
  colors?: ThemeColors;
  isDark?: boolean;
}

export const Section: React.FC<SectionProps> = ({ icon, title, children }) => (
  <ListSection
    variant="stats"
    icon={<Text style={{ fontSize: 18 }}>{icon}</Text>}
    title={title}
  >
    {children}
  </ListSection>
);