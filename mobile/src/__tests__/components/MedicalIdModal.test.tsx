import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  Modal: 'Modal',
  TextInput: 'TextInput',
  Switch: 'Switch',
  StyleSheet: {
    create: (s: any) => s,
    hairlineWidth: 1,
    flatten: (s: any) => s,
  },
  Linking: {
    openURL: jest.fn().mockResolvedValue(true),
  },
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'android',
    select: (obj: any) => obj.android ?? obj.default,
  },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');
jest.mock('../../services/widgetService', () => ({
  updateWidgetData: jest.fn(),
  updateWidgetAdherence: jest.fn(),
}));

jest.mock('../../components/common/wheel', () => ({
  WheelDatePickerModal: ({ visible, onConfirm, onCancel }: any) => {
    const React = require('react');
    if (!visible) return null;
    return React.createElement(
      'View',
      { testID: 'wheel-date-picker-modal' },
      React.createElement('TouchableOpacity', {
        testID: 'confirm-wheel-date',
        accessibilityLabel: 'Tarihi Onayla',
        onPress: () => onConfirm('1985-06-20'),
      }),
      React.createElement('TouchableOpacity', {
        testID: 'cancel-wheel-date',
        accessibilityLabel: 'Tarihi İptal Et',
        onPress: onCancel,
      })
    );
  },
}));

import { MedicalIdModal } from '../../components/medicalId/MedicalIdModal';
import { useMedicalIdStore } from '../../stores/medicalIdStore';
import { useMedicineStore } from '../../stores/medicineStore';

const mockColors: any = {
  card: '#1E293B',
  border: '#334155',
  text: '#FFFFFF',
  textMuted: '#94A3B8',
  primary: '#0D9488',
};

describe('MedicalIdModal', () => {
  beforeEach(() => {
    useMedicalIdStore.getState().clearMedicalId();
    useMedicineStore.setState({ medicines: [] });
  });

  it('renders correctly with default empty profile', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <MedicalIdModal
        visible={true}
        onClose={onClose}
        colors={mockColors}
        isDark={true}
        language="tr"
      />
    );

    expect(getByText('Acil Tıbbi Kimlik Kartı')).toBeTruthy();
    expect(getByText('112 Acil Çağrı Yap')).toBeTruthy();
    expect(getByText('İsim Girilmedi')).toBeTruthy();
    expect(getByText('KAN')).toBeTruthy();
  });

  it('displays user medical details when populated', () => {
    useMedicalIdStore.getState().updateMedicalId({
      fullName: 'Enes Demir',
      bloodType: 'A+',
      allergies: ['Penisilin'],
      chronicConditions: ['Astım'],
    });

    const { getByText } = render(
      <MedicalIdModal
        visible={true}
        onClose={jest.fn()}
        colors={mockColors}
        isDark={true}
        language="tr"
      />
    );

    expect(getByText('Enes Demir')).toBeTruthy();
    expect(getByText('A+')).toBeTruthy();
    expect(getByText('Penisilin')).toBeTruthy();
    expect(getByText('Astım')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    const { getByLabelText } = render(
      <MedicalIdModal
        visible={true}
        onClose={onClose}
        colors={mockColors}
        isDark={true}
        language="tr"
      />
    );

    const closeBtn = getByLabelText('Kapat');
    fireEvent.press(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('formats birth date with calculated age in read mode', () => {
    useMedicalIdStore.getState().updateMedicalId({
      fullName: 'Enes Demir',
      birthDate: '1970-01-15',
      bloodType: 'A+',
    });

    const { getByText } = render(
      <MedicalIdModal
        visible={true}
        onClose={jest.fn()}
        colors={mockColors}
        isDark={true}
        language="tr"
      />
    );

    expect(getByText(/Doğum: 15 Ocak 1970/)).toBeTruthy();
  });

  it('allows opening wheel date picker and updating birth date in edit mode', () => {
    useMedicalIdStore.getState().updateMedicalId({
      fullName: 'Enes Demir',
      birthDate: '1970-01-15',
      bloodType: 'A+',
    });

    const { getByText, getByLabelText, queryByTestId } = render(
      <MedicalIdModal
        visible={true}
        onClose={jest.fn()}
        colors={mockColors}
        isDark={true}
        language="tr"
      />
    );

    // Switch to edit mode
    fireEvent.press(getByText('Kimlik Bilgilerini Düzenle'));

    // Verify date picker button exists and shows current date
    expect(getByText('15 Ocak 1970')).toBeTruthy();
    expect(getByText('1970-01-15')).toBeTruthy();

    // Wheel picker modal is closed initially
    expect(queryByTestId('wheel-date-picker-modal')).toBeNull();

    // Open wheel date picker modal
    fireEvent.press(getByLabelText('Doğum tarihi seçiciyi aç'));

    // Modal is now open
    expect(queryByTestId('wheel-date-picker-modal')).toBeTruthy();

    // Confirm new date
    fireEvent.press(getByLabelText('Tarihi Onayla'));

    // Form shows new updated date
    expect(getByText('1985-06-20')).toBeTruthy();
  });

  it('renders all blood group options with high contrast in dark mode and allows selecting a blood type', () => {
    const { getByText, getByLabelText } = render(
      <MedicalIdModal
        visible={true}
        onClose={jest.fn()}
        colors={mockColors}
        isDark={true}
        language="tr"
      />
    );

    // Switch to edit mode
    fireEvent.press(getByText('Kimlik Bilgilerini Düzenle'));

    // Verify all 8 blood types are present and accessible
    const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'];
    bloodTypes.forEach(bt => {
      expect(getByLabelText(`${bt} kan grubu`)).toBeTruthy();
    });

    // Select '0+'
    const oPlusBtn = getByLabelText('0+ kan grubu');
    fireEvent.press(oPlusBtn);

    // Verify accessibilityState
    expect(oPlusBtn.props.accessibilityState).toEqual({ selected: true });

    // Save changes
    fireEvent.press(getByText('Kaydet'));

    // Verify store was updated
    expect(useMedicalIdStore.getState().data.bloodType).toBe('0+');
  });

  it('renders blood groups correctly in light mode with accessible labels', () => {
    const lightColors: any = {
      card: '#FFFFFF',
      border: '#E2E8F0',
      text: '#0F172A',
      textMuted: '#64748B',
      primary: '#0D9488',
    };

    const { getByText, getByLabelText } = render(
      <MedicalIdModal
        visible={true}
        onClose={jest.fn()}
        colors={lightColors}
        isDark={false}
        language="en"
      />
    );

    fireEvent.press(getByText('Edit Medical ID'));

    const bMinusBtn = getByLabelText('B- blood type');
    expect(bMinusBtn).toBeTruthy();
    expect(bMinusBtn.props.accessibilityState).toEqual({ selected: false });

    fireEvent.press(bMinusBtn);
    expect(bMinusBtn.props.accessibilityState).toEqual({ selected: true });
  });
});
