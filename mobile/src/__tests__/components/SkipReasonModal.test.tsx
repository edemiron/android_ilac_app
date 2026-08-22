import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SkipReasonModal } from '../../components/common/SkipReasonModal';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  TextInput: 'TextInput',
  ScrollView: 'ScrollView',
  Modal: 'Modal',
  StyleSheet: { create: <T,>(s: T): T => s, flatten: <T,>(s: T): T => s, hairlineWidth: 1 },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

// Mock contexts
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      card: '#ffffff',
      border: '#e2e8f0',
      text: '#0f172a',
      textSecondary: '#64748b',
      primary: '#4ecdc4',
      inputBackground: '#f8fafc',
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

describe('SkipReasonModal', () => {
  it('renders correctly when visible', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    const { getByText } = render(
      <SkipReasonModal
        visible={true}
        medicineName="Parol 500mg"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(getByText('İlacı Atlama Nedeni')).toBeTruthy();
    expect(getByText('Parol 500mg')).toBeTruthy();
    expect(getByText('Yan etki yaptı / Rahatsız etti')).toBeTruthy();
  });

  it('calls onConfirm with selected reason', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    const { getByText } = render(
      <SkipReasonModal
        visible={true}
        medicineName="Parol 500mg"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    // Click "İlacım bitti / Yanımda yok"
    fireEvent.press(getByText('İlacım bitti / Yanımda yok'));

    // Click confirm
    fireEvent.press(getByText('Atla ve Kaydet'));

    expect(onConfirm).toHaveBeenCalledWith('out_of_stock', undefined);
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    const { getByText } = render(
      <SkipReasonModal
        visible={true}
        medicineName="Parol 500mg"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    fireEvent.press(getByText('Vazgeç'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
