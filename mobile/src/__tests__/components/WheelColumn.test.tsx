import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  FlatList: ({
    data,
    renderItem,
    accessibilityLabel,
    onAccessibilityAction,
    testID,
  }: {
    data: Array<string>;
    renderItem: (info: { item: string; index: number }) => React.ReactNode;
    accessibilityLabel?: string;
    onAccessibilityAction?: (event: unknown) => void;
    testID?: string;
  }) => {
    const React = require('react');
    return React.createElement(
      'View',
      {
        testID,
        accessibilityLabel,
        onAccessibilityAction,
      },
      data
        ? data.map((item, index) =>
            React.createElement('View', { key: item }, renderItem({ item, index }))
          )
        : null
    );
  },
  Platform: {
    OS: 'android',
    select: (obj: Record<string, unknown>) => obj.android ?? obj.default,
  },
  StyleSheet: {
    create: <T,>(s: T): T => s,
    flatten: <T,>(s: T): T => s,
    hairlineWidth: 1,
  },
}));

jest.mock('../../hooks/useHaptics', () => ({
  useHaptics: () => ({
    selection: jest.fn(),
    notification: jest.fn(),
    impact: jest.fn(),
  }),
}));

jest.mock('../../utils/wheelSound', () => ({
  playWheelTickSound: jest.fn(),
}));

import { WheelColumn, nearestEnabledIndex } from '../../components/common/wheel/WheelColumn';
import { playWheelTickSound } from '../../utils/wheelSound';
import { darkColors } from '../../contexts/ThemeContext';

describe('WheelColumn and nearestEnabledIndex logic', () => {
  describe('nearestEnabledIndex', () => {
    it('returns 0 when count is 0', () => {
      expect(nearestEnabledIndex(5, 0, 0, 0)).toBe(0);
    });

    it('returns landed when inside enabled range', () => {
      expect(nearestEnabledIndex(5, 0, 10, 11)).toBe(5);
    });

    it('clamps to firstEnabled when landed is below firstEnabled', () => {
      expect(nearestEnabledIndex(2, 4, 10, 15)).toBe(4);
    });

    it('clamps to lastEnabled when landed is above lastEnabled', () => {
      expect(nearestEnabledIndex(12, 0, 8, 15)).toBe(8);
    });

    it('clamps to valid bounds if first > last', () => {
      expect(nearestEnabledIndex(15, 10, 5, 8)).toBe(7);
      expect(nearestEnabledIndex(-5, 10, 5, 8)).toBe(0);
    });
  });

  describe('WheelColumn component', () => {
    const defaultLabels = ['1983', '1984', '1985', '1986', '1987', '1988', '1989'];

    it('renders with accessibility attributes', () => {
      const onSelect = jest.fn();
      const { getByLabelText } = render(
        <WheelColumn
          id="year"
          labels={defaultLabels}
          firstEnabled={0}
          lastEnabled={6}
          selectedIndex={2} // 1985
          onSelect={onSelect}
          accessibilityLabel="Yıl seçici"
          accessibilityValue="1985"
          colors={darkColors}
          isDark={true}
        />
      );

      const column = getByLabelText('Yıl seçici');
      expect(column).toBeTruthy();
    });

    it('handles accessibility action increment and decrement', () => {
      const onSelect = jest.fn();
      const { getByLabelText } = render(
        <WheelColumn
          id="year"
          labels={defaultLabels}
          firstEnabled={0}
          lastEnabled={6}
          selectedIndex={2} // 1985
          onSelect={onSelect}
          accessibilityLabel="Yıl seçici"
          accessibilityValue="1985"
          colors={darkColors}
          isDark={true}
        />
      );

      const column = getByLabelText('Yıl seçici');

      // Increment: 2 -> 3 (1986)
      fireEvent(column, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
      expect(onSelect).toHaveBeenCalledWith(3);

      // Decrement: 2 -> 1 (1984)
      fireEvent(column, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
      expect(onSelect).toHaveBeenCalledWith(1);
    });

    it('does not increment beyond lastEnabled', () => {
      const onSelect = jest.fn();
      const { getByLabelText } = render(
        <WheelColumn
          id="year"
          labels={defaultLabels}
          firstEnabled={0}
          lastEnabled={6}
          selectedIndex={6} // 1989 (last enabled)
          onSelect={onSelect}
          accessibilityLabel="Yıl seçici"
          accessibilityValue="1989"
          colors={darkColors}
          isDark={true}
        />
      );

      const column = getByLabelText('Yıl seçici');
      fireEvent(column, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('does not decrement below firstEnabled', () => {
      const onSelect = jest.fn();
      const { getByLabelText } = render(
        <WheelColumn
          id="year"
          labels={defaultLabels}
          firstEnabled={0}
          lastEnabled={6}
          selectedIndex={0} // 1983 (first enabled)
          onSelect={onSelect}
          accessibilityLabel="Yıl seçici"
          accessibilityValue="1983"
          colors={darkColors}
          isDark={true}
        />
      );

      const column = getByLabelText('Yıl seçici');
      fireEvent(column, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('triggers playWheelTickSound when accessibility increment is performed', () => {
      const onSelect = jest.fn();
      const { getByLabelText } = render(
        <WheelColumn
          id="year"
          labels={defaultLabels}
          firstEnabled={0}
          lastEnabled={6}
          selectedIndex={2}
          onSelect={onSelect}
          accessibilityLabel="Yıl seçici"
          accessibilityValue="1985"
          colors={darkColors}
          isDark={true}
          soundEnabled={true}
        />
      );

      const column = getByLabelText('Yıl seçici');
      fireEvent(column, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
      expect(playWheelTickSound).toHaveBeenCalled();
    });
  });
});
