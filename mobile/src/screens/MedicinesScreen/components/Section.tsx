/**
 * MedicinesScreen — Section bileşeni.
 *
 * Sprint 5.1: MedicinesScreen.tsx (1317 satir) modularizasyonu.
 * Sprint 107.2: ListSection primitive'i (variant=list) kullanır — iOS grouped list pattern.
 * Ilac listesi icin gruplanmis section wrapper'i (icon + title + count + children).
 */

import React from 'react';
import { Text } from 'react-native';
import { ListSection } from '../../../components/common/ListSection';
import { ThemeColors } from '../../../contexts/ThemeContext';

interface SectionProps {
  icon: string;
  title: string;
  count?: number;
  children: React.ReactNode;
  /**
   * Sprint 107.2: ListSection tema'yı kendi yönetir — eski API uyumluluğu için
   * opsiyonel prop olarak bırakıldı (kullanılmıyor).
   */
  colors?: ThemeColors;
  isDark?: boolean;
}

export const Section: React.FC<SectionProps> = ({
  icon,
  title,
  count,
  children,
}) => (
  <ListSection
    variant="list"
    icon={<Text style={{ fontSize: 18 }}>{icon}</Text>}
    title={count !== undefined ? `${title} (${count})` : title}
  >
    {children}
  </ListSection>
);