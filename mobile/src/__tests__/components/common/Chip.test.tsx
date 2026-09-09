/**
 * Chip.test.tsx — Sprint 102.7
 * CC spec days/week pattern: render, onPress, selected, size
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
      surface: '#FFFFFF',
      outlineVariant: '#E2E8F0',
      text: '#0F172A',
      textOnPrimary: '#FFFFFF',
    },
    isDark: false,
  }),
}));

import { Chip } from '../../../components/common/Chip';

describe('Chip', () => {
  it('renders label', () => {
    const { getByText } = render(<Chip label="Pzt" selected={false} onPress={() => {}} />);
    expect(getByText('Pzt')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { UNSAFE_root } = render(<Chip label="Sal" selected={false} onPress={onPress} />);
    fireEvent.press(UNSAFE_root.findByType('MotiPressable'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('accessibilityState.selected = true (selected prop ile)', () => {
    const { UNSAFE_root } = render(<Chip label="Per" selected onPress={() => {}} />);
    const btn = UNSAFE_root.findByType('MotiPressable');
    expect(btn.props.accessibilityState).toEqual({ selected: true, disabled: false });
  });

  it('accessibilityState.selected = false (unselected)', () => {
    const { UNSAFE_root } = render(<Chip label="Cum" selected={false} onPress={() => {}} />);
    const btn = UNSAFE_root.findByType('MotiPressable');
    expect(btn.props.accessibilityState.selected).toBe(false);
  });

  it('accessibilityRole "button"', () => {
    const { UNSAFE_root } = render(<Chip label="Cmt" selected={false} onPress={() => {}} />);
    const btn = UNSAFE_root.findByType('MotiPressable');
    expect(btn.props.accessibilityRole).toBe('button');
  });
});