/**
 * MotiPressable tests — Sprint 97.1.
 *
 * Davranis testleri (animation degerleri Reanimated worklet'lerde
 * hesaplandigi icin olculmez, sadece callback + haptic tetiklenmesi
 * dogrulanir).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MotiPressable } from '../../../components/common/MotiPressable';

jest.mock('react-native', () => {
  const ReactLocal = require('react');
  // Pressable'i host component gibi mock'la ki findByType('Pressable') calissin.
  // testID ve accessibility props root element uzerinden erisilebilir.
  const MockPressable = (props: any) =>
    ReactLocal.createElement('Pressable', props, props.children);
  return {
    View: 'View',
    Text: 'Text',
    Pressable: MockPressable,
    StyleSheet: {
      create: <T,>(s: T): T => s,
      flatten: <T,>(s: T): T => s,
    },
  };
});

jest.mock('../../../hooks/useHaptics', () => {
  const mockHaptics = {
    trigger: jest.fn(),
    light: jest.fn(),
    medium: jest.fn(),
    heavy: jest.fn(),
    selection: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  };
  return {
    __esModule: true,
    useHaptics: () => mockHaptics,
  };
});

import { useHaptics } from '../../../hooks/useHaptics';

describe('MotiPressable', () => {
  let triggerMock: jest.Mock;

  beforeEach(() => {
    triggerMock = (useHaptics() as any).trigger as jest.Mock;
    triggerMock.mockClear();
  });

  it('renders without crashing', () => {
    const { UNSAFE_root } = render(
      <MotiPressable onPress={() => {}} testID="mp">
        <>{null}</>
      </MotiPressable>
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { UNSAFE_root } = render(
      <MotiPressable onPress={onPress} testID="mp">
        <>{null}</>
      </MotiPressable>
    );
    const pressable = UNSAFE_root.findByType('Pressable');
    fireEvent(pressable, 'press');
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('triggers default light haptic on press', () => {
    const onPress = jest.fn();
    const { UNSAFE_root } = render(
      <MotiPressable onPress={onPress} testID="mp">
        <>{null}</>
      </MotiPressable>
    );
    const pressable = UNSAFE_root.findByType('Pressable');
    fireEvent(pressable, 'press');
    expect(triggerMock).toHaveBeenCalledWith('light');
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not trigger haptic when onPressHaptic is false', () => {
    const onPress = jest.fn();
    const { UNSAFE_root } = render(
      <MotiPressable onPress={onPress} onPressHaptic={false} testID="mp">
        <>{null}</>
      </MotiPressable>
    );
    const pressable = UNSAFE_root.findByType('Pressable');
    fireEvent(pressable, 'press');
    expect(triggerMock).not.toHaveBeenCalled();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('triggers custom haptic type when onPressHaptic is specified', () => {
    const onPress = jest.fn();
    const { UNSAFE_root } = render(
      <MotiPressable onPress={onPress} onPressHaptic="success" testID="mp">
        <>{null}</>
      </MotiPressable>
    );
    const pressable = UNSAFE_root.findByType('Pressable');
    fireEvent(pressable, 'press');
    expect(triggerMock).toHaveBeenCalledWith('success');
  });

  it('does not call onPress or haptic when disabled', () => {
    const onPress = jest.fn();
    const { UNSAFE_root } = render(
      <MotiPressable onPress={onPress} disabled testID="mp">
        <>{null}</>
      </MotiPressable>
    );
    const pressable = UNSAFE_root.findByType('Pressable');
    fireEvent(pressable, 'press');
    expect(onPress).not.toHaveBeenCalled();
    expect(triggerMock).not.toHaveBeenCalled();
  });

  it('forwards accessibilityRole to Pressable', () => {
    const { UNSAFE_root } = render(
      <MotiPressable onPress={() => {}} accessibilityRole="button" accessibilityLabel="Kaydet" testID="mp">
        <>{null}</>
      </MotiPressable>
    );
    const pressable = UNSAFE_root.findByType('Pressable');
    expect(pressable.props.accessibilityRole).toBe('button');
    expect(pressable.props.accessibilityLabel).toBe('Kaydet');
  });

  it('forwards onLongPress to Pressable', () => {
    const onLongPress = jest.fn();
    const { UNSAFE_root } = render(
      <MotiPressable onPress={() => {}} onLongPress={onLongPress} testID="mp">
        <>{null}</>
      </MotiPressable>
    );
    const pressable = UNSAFE_root.findByType('Pressable');
    fireEvent(pressable, 'longPress');
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('forwards style prop to MotiView wrapper (root View)', () => {
    const style = { padding: 8, backgroundColor: 'red' };
    const { UNSAFE_root } = render(
      <MotiPressable onPress={() => {}} style={style} testID="mp">
        <>{null}</>
      </MotiPressable>
    );
    // MotiView mock'unda View'a aktarilir; root icindeki ilk View MotiView.
    const view = UNSAFE_root.findByType('View');
    expect(view.props.style).toEqual(style);
  });

  it('does not crash when scaleTo is 1 (no-op pressable)', () => {
    const { UNSAFE_root } = render(
      <MotiPressable onPress={() => {}} scaleTo={1} testID="mp">
        <>{null}</>
      </MotiPressable>
    );
    const pressable = UNSAFE_root.findByType('Pressable');
    fireEvent(pressable, 'pressIn');
    expect(UNSAFE_root).toBeTruthy();
  });
});
