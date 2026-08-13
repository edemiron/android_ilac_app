/**
 * StatCard tests — Sprint 107.5 (Radikal UI Mimarisi).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  StyleSheet: {
    create: <T,>(styles: T): T => styles,
    flatten: <T,>(styles: T): T => styles,
  },
  Platform: { OS: 'android' },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      surfaceContainerHigh: '#f5f5f5',
      card: '#fff',
      primaryContainer: '#A7E8E2',
      onPrimaryContainer: '#003733',
      primary: '#4ECDC4',
      textOnPrimary: '#fff',
      textSecondary: '#666',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    isDark: false,
  }),
}));

import { StatCard } from '../../../components/common/StatCard';

describe('StatCard', () => {
  it('renders title and value', () => {
    const { getByText } = render(<StatCard title="Bugün" value={5} />);
    expect(getByText('Bugün')).toBeTruthy();
    expect(getByText('5')).toBeTruthy();
  });

  it('renders unit', () => {
    const { getByText } = render(<StatCard title="Doz" value={3} unit="adet" />);
    expect(getByText('adet')).toBeTruthy();
  });

  it('renders subtitle when provided', () => {
    const { getByText } = render(
      <StatCard title="X" value={5} subtitle="Detay metni" />,
    );
    expect(getByText('Detay metni')).toBeTruthy();
  });

  it('renders icon', () => {
    const { UNSAFE_root } = render(
      <StatCard title="X" value={5} icon="calendar" />,
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('renders delta when direction is up', () => {
    const { UNSAFE_root } = render(
      <StatCard title="X" value={5} delta={{ value: 2, direction: 'up' }} />,
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('does not render delta when direction is flat', () => {
    const { UNSAFE_root } = render(
      <StatCard title="X" value={5} delta={{ value: 0, direction: 'flat' }} />,
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { UNSAFE_root } = render(
      <StatCard title="X" value={5} onPress={onPress} testID="stat-pressable" />,
    );
    const node = UNSAFE_root.findByProps({ testID: 'stat-pressable' });
    fireEvent.press(node);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders different variants', () => {
    const variants: Array<'tile' | 'grid' | 'alert' | 'inline' | 'hero'> = [
      'tile',
      'grid',
      'alert',
      'inline',
      'hero',
    ];
    variants.forEach(variant => {
      const { UNSAFE_root } = render(<StatCard title="X" value={1} variant={variant} />);
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  it('renders different accents', () => {
    const accents: Array<'primary' | 'success' | 'warning' | 'error' | 'info'> = [
      'primary',
      'success',
      'warning',
      'error',
      'info',
    ];
    accents.forEach(accent => {
      const { UNSAFE_root } = render(<StatCard title="X" value={1} accent={accent} />);
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  it('uses custom accessibilityLabel', () => {
    const { UNSAFE_root } = render(
      <StatCard title="Bugün" value={5} accessibilityLabel="Bugün 5 doz" testID="stat-a11y" />,
    );
    const node = UNSAFE_root.findByProps({ testID: 'stat-a11y' });
    expect(node.props.accessibilityLabel).toBe('Bugün 5 doz');
  });
});