/**
 * PrimaryButton.test.tsx — Sprint 102.7
 * CC spec gradient CTA: render, onPress, disabled, variant, size, loading
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  __esModule: true,
  View: 'View',
  Text: 'Text',
  StyleSheet: {
    create: <T,>(s: T): T => s,
    flatten: <T,>(s: T): T => s,
  },
  Alert: { alert: jest.fn() },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('../../../components/common/MotiPressable', () => {
  const ReactLocal = require('react');
  return {
    MotiPressable: (props: { children?: React.ReactNode; [k: string]: unknown }) =>
      ReactLocal.createElement('MotiPressable', props, props.children),
  };
});

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#14B8A6',
      gradientStart: '#0D9488',
      gradientEnd: '#0891B2',
    },
    isDark: false,
  }),
}));

import { PrimaryButton } from '../../../components/common/PrimaryButton';

describe('PrimaryButton', () => {
  it('renders label', () => {
    const { getByText } = render(<PrimaryButton label="Kaydet" onPress={() => {}} />);
    expect(getByText('Kaydet')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { UNSAFE_root } = render(<PrimaryButton label="Test" onPress={onPress} />);
    const btn = UNSAFE_root.findByType('MotiPressable');
    fireEvent.press(btn);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders "..." when loading', () => {
    const { queryByText, getByText } = render(
      <PrimaryButton label="Kaydet" onPress={() => {}} loading />
    );
    expect(queryByText('Kaydet')).toBeNull();
    expect(getByText('...')).toBeTruthy();
  });

  it('solid variant: gradient yerine solid bg kullanır', () => {
    const { UNSAFE_root } = render(
      <PrimaryButton label="Test" onPress={() => {}} variant="solid" />
    );
    expect(UNSAFE_root.findAllByType('LinearGradient')).toHaveLength(0);
  });

  it('gradient variant (default): LinearGradient kullanır', () => {
    const { UNSAFE_root } = render(<PrimaryButton label="Test" onPress={() => {}} />);
    expect(UNSAFE_root.findAllByType('LinearGradient').length).toBeGreaterThanOrEqual(1);
  });

  it('accessibilityRole ve accessibilityLabel aktarılır', () => {
    const { UNSAFE_root } = render(<PrimaryButton label="İlacı Kaydet" onPress={() => {}} />);
    const btn = UNSAFE_root.findByType('MotiPressable');
    expect(btn.props.accessibilityRole).toBe('button');
    expect(btn.props.accessibilityLabel).toBe('İlacı Kaydet');
  });
});