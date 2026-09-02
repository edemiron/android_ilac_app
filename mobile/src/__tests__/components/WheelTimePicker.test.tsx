import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WheelTimePicker } from '../../components/common/WheelTimePicker';
import { WheelTimePickerModal } from '../../components/common/WheelTimePickerModal';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Modal: ({ children, visible }: { children: React.ReactNode; visible: boolean }) =>
    visible ? children : null,
  TouchableOpacity: 'TouchableOpacity',
  TouchableWithoutFeedback: ({ children }: { children: React.ReactNode }) => children,
  FlatList: ({
    data,
    renderItem,
  }: {
    data: Array<number | string>;
    renderItem: (info: { item: number | string; index: number }) => React.ReactNode;
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
  },
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      text: '#0f172a',
      primary: '#4ecdc4',
    },
    isDark: false,
  }),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'tr',
    t: (key: string) => key,
  }),
}));

describe('WheelTimePicker & WheelTimePickerModal', () => {
  it('renders wheel columns for hours and minutes', () => {
    const mockOnChange = jest.fn();
    const { getAllByText, getByText } = render(
      <WheelTimePicker value="11:58" onChange={mockOnChange} />
    );

    // Initial selected values rendered
    expect(getAllByText('11').length).toBeGreaterThanOrEqual(1);
    expect(getByText('58')).toBeTruthy();
  });

  it('renders modal with confirm and cancel buttons', () => {
    const mockOnConfirm = jest.fn();
    const mockOnCancel = jest.fn();

    const { getByText } = render(
      <WheelTimePickerModal
        visible={true}
        initialTime="11:58"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(getByText('İptal')).toBeTruthy();
    expect(getByText('Tamam')).toBeTruthy();
    expect(getByText('Saat Seçin')).toBeTruthy();

    fireEvent.press(getByText('Tamam'));
    expect(mockOnConfirm).toHaveBeenCalledWith('11:58', 11, 58);
  });

  it('updates time when quick minute pills are pressed', () => {
    const mockOnConfirm = jest.fn();
    const mockOnCancel = jest.fn();

    const { getByText } = render(
      <WheelTimePickerModal
        visible={true}
        initialTime="11:58"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(getByText(':00')).toBeTruthy();
    expect(getByText(':15')).toBeTruthy();
    expect(getByText(':30')).toBeTruthy();
    expect(getByText(':45')).toBeTruthy();

    fireEvent.press(getByText(':30'));
    fireEvent.press(getByText('Tamam'));
    expect(mockOnConfirm).toHaveBeenCalledWith('11:30', 11, 30);
  });
});
