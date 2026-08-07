/**
 * StatsGrid tests — Sprint 98 Karol-inspired redesign.
 *
 * 2x2 metrik grid:
 * - 4 hücre: Bugün / Alınan / Bekleyen / Stok Uyarısı
 * - lowStockCount === 0 iken 4. hücre disabled (em-dash) + tıklanamaz
 * - lowStockCount > 0 iken 4. hücre navigation.navigate('Medicines') çağırır
 * - accessibilityRole="summary" + accessibilityLabel
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: {
    create: <T,>(s: T): T => s,
    flatten: <T,>(s: T): T => s,
  },
}));

jest.mock('../../../components/common/MotiPressable', () => {
  const ReactLocal = require('react');
  // Press davranisi: onPress haptic'i devre disi birak, dogrudan cagrilsin (testin
  // kullanacagi sekliyle). Mock Pressable gibi host element gibi davranir.
  return {
    MotiPressable: (props: { children?: React.ReactNode; [k: string]: unknown }) =>
      ReactLocal.createElement('MotiPressable', props, props.children),
  };
});

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'tr', setLanguage: jest.fn() }),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#4ECDC4',
      text: '#1A1A2E',
      textMuted: '#666666',
      border: '#E0E0E0',
      surface: '#F8F9FA',
      surfaceContainerLow: '#FFFFFF',
    },
    isDark: false,
  }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

import { StatsGrid } from '../../../screens/HomeScreen/components/StatsGrid';

describe('StatsGrid', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders all four cell testIDs with correct values', () => {
    const { queryByText } = render(
      <StatsGrid totalCount={7} completedCount={3} remainingCount={4} lowStockCount={2} />
    );
    // 4 cell kendi value text'ini render eder
    expect(queryByText('7')).toBeTruthy();
    expect(queryByText('3')).toBeTruthy();
    expect(queryByText('4')).toBeTruthy();
    expect(queryByText('2')).toBeTruthy();
  });

  it('shows all metric values in cell labels (tr)', () => {
    const { getByText } = render(
      <StatsGrid totalCount={7} completedCount={3} remainingCount={4} lowStockCount={2} />
    );
    expect(getByText('Bugün')).toBeTruthy();
    expect(getByText('Alınan')).toBeTruthy();
    expect(getByText('Bekleyen')).toBeTruthy();
    expect(getByText('Stok Uyarısı')).toBeTruthy();
  });

  it('displays em-dash and disables lowstock cell when lowStockCount is 0', () => {
    const { getByTestId } = render(
      <StatsGrid totalCount={5} completedCount={2} remainingCount={3} lowStockCount={0} />
    );
    const cell = getByTestId('stats-lowstock');
    // Cell press should NOT navigate
    fireEvent.press(cell);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to Medicines when lowstock cell is pressed (count > 0)', () => {
    const { getByTestId } = render(
      <StatsGrid totalCount={5} completedCount={2} remainingCount={3} lowStockCount={2} />
    );
    fireEvent.press(getByTestId('stats-lowstock'));
    expect(mockNavigate).toHaveBeenCalledWith('Medicines');
  });

  it('sets accessibilityRole="summary" with localized label', () => {
    const { UNSAFE_root } = render(
      <StatsGrid totalCount={7} completedCount={3} remainingCount={4} lowStockCount={2} />
    );
    const summary = UNSAFE_root.findByProps({ accessibilityRole: 'summary' });
    expect(summary.props.accessibilityLabel).toContain('Bugün 7 doz');
    expect(summary.props.accessibilityLabel).toContain('3 alınan');
    expect(summary.props.accessibilityLabel).toContain('4 bekleyen');
    expect(summary.props.accessibilityLabel).toContain('2 stok uyarısı');
  });

  it('renders 4 cells with correct values', () => {
    const { getByText } = render(
      <StatsGrid totalCount={7} completedCount={3} remainingCount={4} lowStockCount={0} />
    );
    expect(getByText('7')).toBeTruthy(); // today
    expect(getByText('3')).toBeTruthy(); // taken
    expect(getByText('4')).toBeTruthy(); // pending
    expect(getByText('—')).toBeTruthy(); // lowstock em-dash
  });
});
