import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Modal: ({ children, visible }: { children: React.ReactNode; visible: boolean }) =>
    visible ? children : null,
  TouchableOpacity: ({ children, onPress, testID, accessibilityLabel, ...props }: any) => {
    const React = require('react');
    return React.createElement(
      'TouchableOpacity',
      { onPress, testID, accessibilityLabel, ...props },
      children
    );
  },
  Pressable: ({ children, onPress }: any) => {
    const React = require('react');
    return React.createElement('Pressable', { onPress }, children);
  },
  FlatList: ({
    data,
    renderItem,
  }: {
    data: Array<string>;
    renderItem: (info: { item: string; index: number }) => React.ReactNode;
  }) => {
    const React = require('react');
    return React.createElement(
      'View',
      null,
      data
        ? data.map((item, index) =>
            React.createElement('View', { key: item.toString() }, renderItem({ item, index }))
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
    absoluteFillObject: {},
  },
  AccessibilityInfo: {
    isScreenReaderEnabled: jest.fn().mockResolvedValue(false),
    addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  },
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#14B8A6',
      background: '#0F172A',
      card: '#1E293B',
      text: '#F8FAFC',
      textSecondary: '#94A3B8',
      textMuted: '#64748B',
      border: '#334155',
      borderFocused: '#38BDF8',
      overlay: 'rgba(0,0,0,0.7)',
    },
    isDark: true,
  }),
}));

jest.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'tr', setLanguage: jest.fn(), t: (k: string) => k }),
}));

jest.mock('../../../hooks/useHaptics', () => ({
  useHaptics: () => ({
    selection: jest.fn(),
    light: jest.fn(),
    trigger: jest.fn(),
  }),
}));

import { WheelDatePickerModal } from '../../../components/common/wheel/WheelDatePickerModal';
import { WheelDatePicker } from '../../../components/common/wheel/WheelDatePicker';

describe('WheelDatePicker & WheelDatePickerModal', () => {
  const dummyColors = {
    primary: '#14B8A6',
    background: '#0F172A',
    card: '#1E293B',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    border: '#334155',
    borderFocused: '#38BDF8',
    overlay: 'rgba(0,0,0,0.7)',
  } as any;

  describe('WheelDatePicker presentational', () => {
    it('renders with given ISO date without errors', () => {
      const onChange = jest.fn();
      const { toJSON } = render(
        <WheelDatePicker
          value="1980-05-15"
          onChange={onChange}
          colors={dummyColors}
          isDark={true}
          isTr={true}
        />
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('WheelDatePickerModal', () => {
    it('renders modal dialog when visible=true', () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      const { getByText, getByLabelText } = render(
        <WheelDatePickerModal
          visible={true}
          value="1970-03-15"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );

      expect(getByText('Doğum Tarihi Seçin')).toBeTruthy();
      expect(getByLabelText('İptal')).toBeTruthy();
      expect(getByLabelText('Tamam')).toBeTruthy();
    });

    it('calls onCancel when Cancel button is pressed', () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      const { getByLabelText } = render(
        <WheelDatePickerModal
          visible={true}
          value="1970-03-15"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );

      fireEvent.press(getByLabelText('İptal'));
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('calls onConfirm with draft ISO when OK button is pressed', () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      const { getByLabelText } = render(
        <WheelDatePickerModal
          visible={true}
          value="1970-03-15"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );

      fireEvent.press(getByLabelText('Tamam'));
      expect(onConfirm).toHaveBeenCalledWith('1970-03-15');
      expect(onCancel).not.toHaveBeenCalled();
    });
  });
});
