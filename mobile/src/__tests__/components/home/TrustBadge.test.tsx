/**
 * TrustBadge tests — Sprint 98 Karol-inspired redesign.
 *
 * Floating "ANLIK · SESSİZ · GÜVENLİ" badge:
 * - 3 satır metin render edilir (tr)
 * - Press'te "Hatırlatıcı" alert gosterir
 * - accessibilityLabel ve role dogru
 * - Custom position override (bottom/right)
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// React Native Alert.alert'i spy'la. jest.mock factory icinde inline jest.fn()
// kullanmak guvenli — hoist sirasinda out-of-scope reference sorunu olmaz.
// Test'ten erismek icin RN mock'unu require edip Alert.alert'e ulasiriz.
jest.mock('react-native', () => {
  const mockAlert = jest.fn();
  return {
    __esModule: true,
    View: 'View',
    Text: 'Text',
    StyleSheet: {
      create: <T,>(s: T): T => s,
      flatten: <T,>(s: T): T => s,
    },
    Alert: { alert: mockAlert },
  };
});

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'tr', setLanguage: jest.fn() }),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#4ECDC4',
      gradientStart: '#A78BFA',
      gradientEnd: '#5EE6FF',
      primaryDark: '#6B7CDF',
    },
    isDark: false,
  }),
}));

jest.mock('../../../components/common/MotiPressable', () => {
  const ReactLocal = require('react');
  // MotiPressable'i host element gibi davranan noop mock olarak yaz.
  return {
    MotiPressable: (props: { children?: React.ReactNode; [k: string]: unknown }) =>
      ReactLocal.createElement('MotiPressable', props, props.children),
  };
});

import { TrustBadge } from '../../../screens/HomeScreen/components/TrustBadge';

// Mock'lanmis Alert.alert'a erismek icin.
const RNMock = jest.requireMock('react-native');
const alertSpy = RNMock.Alert.alert as jest.Mock;

describe('TrustBadge', () => {
  beforeEach(() => {
    alertSpy.mockClear();
  });

  it('renders without crashing', () => {
    const { UNSAFE_root } = render(<TrustBadge />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('displays all three trust messages in Turkish', () => {
    const { getByText } = render(<TrustBadge />);
    expect(getByText('ANLIK')).toBeTruthy();
    expect(getByText('SESSİZ')).toBeTruthy();
    expect(getByText('GÜVENLİ')).toBeTruthy();
  });

  it('shows Alert.alert with localized title and message when pressed', () => {
    const { UNSAFE_root } = render(<TrustBadge />);
    const pressable = UNSAFE_root.findByType('MotiPressable');
    fireEvent(pressable, 'press');
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      'Hatırlatıcı',
      expect.stringContaining('anlık bildirim')
    );
  });

  it('forwards accessibilityLabel to MotiPressable', () => {
    const { UNSAFE_root } = render(<TrustBadge />);
    const pressable = UNSAFE_root.findByType('MotiPressable');
    expect(pressable.props.accessibilityLabel).toBe(
      'Anlık, Sessiz, Güvenli. Bilgi için dokunun.'
    );
    expect(pressable.props.accessibilityRole).toBe('button');
  });

  it('respects custom bottom/right position overrides', () => {
    const { UNSAFE_root } = render(<TrustBadge bottom={50} right={20} />);
    const wrapper = UNSAFE_root.findByProps({ pointerEvents: 'box-none' });
    const styles = [].concat(wrapper.props.style ?? []).filter((s) => typeof s === 'object');
    expect(styles.some((s: { bottom?: number }) => s.bottom === 50)).toBe(true);
    expect(styles.some((s: { right?: number }) => s.right === 20)).toBe(true);
  });
});
