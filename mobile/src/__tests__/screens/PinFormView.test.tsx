import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  StyleSheet: {
    create: <T,>(styles: T): T => styles,
    flatten: <T,>(styles: T): T => styles,
  },
  Platform: { OS: 'android', select: (obj: any) => obj.android ?? obj.default },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  TextInput: 'TextInput',
  ScrollView: 'ScrollView',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

import { PinFormView } from '../../screens/SecurityScreen/components/PinFormView';

describe('PinFormView', () => {
  const mockColors = {
    background: '#0F172A',
    card: '#1E293B',
    text: '#FFFFFF',
    textSecondary: '#94A3B8',
    inputBackground: '#334155',
    primary: '#14B8A6',
    error: '#EF4444',
    success: '#10B981',
  } as any;

  const defaultProps = {
    pinMode: 'create' as const,
    onBack: jest.fn(),
    pin: '',
    onChangePin: jest.fn(),
    confirmPin: '',
    onChangeConfirmPin: jest.fn(),
    oldPin: '',
    onChangeOldPin: jest.fn(),
    showPin: false,
    onToggleShowPin: jest.fn(),
    hasPin: false,
    onSave: jest.fn(),
    onRemovePin: jest.fn(),
    colors: mockColors,
    language: 'tr',
  };

  it('renders create mode correctly', () => {
    const { getByText } = render(<PinFormView {...defaultProps} />);
    expect(getByText('6 Haneli PIN Belirleyin')).toBeTruthy();
    expect(getByText('Güvenlik PIN’i')).toBeTruthy();
    expect(getByText('PIN Tekrar (Doğrulama)')).toBeTruthy();
  });

  it('renders change mode with current PIN field', () => {
    const { getByText } = render(<PinFormView {...defaultProps} pinMode="change" hasPin={true} />);
    expect(getByText('PIN Kodunu Değiştirin')).toBeTruthy();
    expect(getByText('Mevcut PIN')).toBeTruthy();
    expect(getByText('PIN Korumasını Kaldır')).toBeTruthy();
  });

  it('toggles show/hide PIN when button is pressed', () => {
    const onToggleShowPin = jest.fn();
    const { getByText } = render(
      <PinFormView {...defaultProps} onToggleShowPin={onToggleShowPin} />
    );
    const toggleBtn = getByText('Göster');
    fireEvent.press(toggleBtn);
    expect(onToggleShowPin).toHaveBeenCalledTimes(1);
  });

  it('calls onBack when back button is pressed', () => {
    const onBack = jest.fn();
    const { getByLabelText } = render(<PinFormView {...defaultProps} onBack={onBack} />);
    const backBtn = getByLabelText('Geri Dön');
    fireEvent.press(backBtn);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
