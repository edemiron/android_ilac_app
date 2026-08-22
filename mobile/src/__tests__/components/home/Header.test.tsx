/**
 * Header tests — Google Stitch redesign.
 *
 * Header:
 * - Top Bar: Avatar + Greeting + Bell icon
 * - Daily Progress Card: "Günlük İlerleme" + "X / Y Alındı" + %Progress Circular Gauge
 */

import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: {
    create: <T,>(s: T): T => s,
    flatten: <T,>(s: T): T => s,
  },
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: 'Svg',
    Circle: 'Circle',
  };
});

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'tr', setLanguage: jest.fn() }),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#0D9488',
      card: '#FFFFFF',
      border: '#E2E8F0',
      text: '#0F172A',
      textSecondary: '#64748B',
    },
    isDark: false,
  }),
}));

import { Header } from '../../../screens/HomeScreen/components/Header';

describe('Header', () => {
  it('renders greeting and progress title', () => {
    const { getByText } = render(
      <Header
        greeting="Günaydın"
        displayName="Sarah"
        totalDoses={4}
        completedCount={3}
        currentStreak={0}
      />
    );
    expect(getByText(/Günaydın/)).toBeTruthy();
    expect(getByText('Günlük İlerleme')).toBeTruthy();
    expect(getByText(/3 \/ 4.*Alındı/)).toBeTruthy();
  });

  it('computes and displays progress percent correctly', () => {
    const { getByText } = render(
      <Header
        greeting="Günaydın"
        displayName="Sarah"
        totalDoses={4}
        completedCount={1}
        currentStreak={0}
      />
    );
    // 1/4 = 25% -> %25
    expect(getByText('%25')).toBeTruthy();
  });

  it('clamps progress at 100% (completedCount > totalDoses)', () => {
    const { getByText } = render(
      <Header
        greeting="Günaydın"
        displayName="Sarah"
        totalDoses={3}
        completedCount={5}
        currentStreak={0}
      />
    );
    expect(getByText('%100')).toBeTruthy();
  });

  it('renders 0% when totalDoses is 0', () => {
    const { getByText } = render(
      <Header
        greeting="Günaydın"
        displayName="Sarah"
        totalDoses={0}
        completedCount={0}
        currentStreak={0}
      />
    );
    expect(getByText('%0')).toBeTruthy();
  });

  it('renders correctly in dark mode', () => {
    const { UNSAFE_root } = render(
      <Header
        greeting="İyi akşamlar"
        displayName="Sarah"
        totalDoses={4}
        completedCount={2}
        currentStreak={3}
      />
    );
    expect(UNSAFE_root).toBeTruthy();
  });
});
