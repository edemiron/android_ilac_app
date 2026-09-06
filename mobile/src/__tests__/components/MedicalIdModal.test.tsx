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
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');
jest.mock('../../services/widgetService', () => ({
  updateWidgetData: jest.fn(),
  updateWidgetAdherence: jest.fn(),
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
});
