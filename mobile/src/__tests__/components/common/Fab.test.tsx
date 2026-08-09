/**
 * Fab.test.tsx — Sprint 102.7
 * CC spec gradient FAB: render, onPress, position, disabled, accessibility
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

import { Fab } from '../../../components/common/Fab';

describe('Fab', () => {
  it('renders icon', () => {
    const { UNSAFE_root } = render(
      <Fab icon={<></>} onPress={() => {}} />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('calls onPress', () => {
    const onPress = jest.fn();
    const { UNSAFE_root } = render(<Fab icon={<></>} onPress={onPress} />);
    fireEvent.press(UNSAFE_root.findByType('MotiPressable'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('LinearGradient kullanır (gradient FAB)', () => {
    const { UNSAFE_root } = render(<Fab icon={<></>} onPress={() => {}} />);
    expect(UNSAFE_root.findAllByType('LinearGradient').length).toBeGreaterThanOrEqual(1);
  });

  it('default bottom=88, right=16', () => {
    const { UNSAFE_root } = render(<Fab icon={<></>} onPress={() => {}} />);
    const wrap = UNSAFE_root.findByType('MotiPressable');
    // Style birleştirilmiş array, bottom ve right içeriyor mu kontrol
    const flatStyle = Array.isArray(wrap.props.style) ? Object.assign({}, ...wrap.props.style.filter(Boolean)) : wrap.props.style;
    expect(flatStyle.bottom).toBe(88);
    expect(flatStyle.right).toBe(16);
  });

  it('custom bottom ve right override edilir', () => {
    const { UNSAFE_root } = render(
      <Fab icon={<></>} onPress={() => {}} bottom={120} right={32} />
    );
    const wrap = UNSAFE_root.findByType('MotiPressable');
    const flatStyle = Array.isArray(wrap.props.style) ? Object.assign({}, ...wrap.props.style.filter(Boolean)) : wrap.props.style;
    expect(flatStyle.bottom).toBe(120);
    expect(flatStyle.right).toBe(32);
  });

  it('accessibilityRole "button"', () => {
    const { UNSAFE_root } = render(<Fab icon={<></>} onPress={() => {}} />);
    const btn = UNSAFE_root.findByType('MotiPressable');
    expect(btn.props.accessibilityRole).toBe('button');
  });
});