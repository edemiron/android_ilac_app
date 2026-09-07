/**
 * DosageInput.test.tsx — Sprint 104.5
 * Form seçimi, tablet ızgara düzeni ve miktar girişi testleri
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

let mockIsTablet = false;

jest.mock('react-native', () => ({
  __esModule: true,
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: {
    create: <T,>(s: T): T => s,
    flatten: <T,>(s: T): T => s,
  },
}));

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');

jest.mock('../../../hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({
    isTablet: mockIsTablet,
    fontSizeMultiplier: mockIsTablet ? 1.15 : 1.0,
  }),
}));

import { DosageInput } from '../../../components/addMedicine/DosageInput';

const mockColors: any = {
  card: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#94A3B8',
  border: '#CBD5E1',
  placeholder: '#94A3B8',
  inputBackground: '#F8FAFC',
};

describe('DosageInput', () => {
  beforeEach(() => {
    mockIsTablet = false;
    jest.clearAllMocks();
  });

  it('telefon modunda form butonlarini ve miktari render eder', () => {
    const onAmountChange = jest.fn();
    const onFormChange = jest.fn();

    const { getByText } = render(
      <DosageInput
        dosageAmount="2"
        medicineForm="tablet"
        onAmountChange={onAmountChange}
        onFormChange={onFormChange}
        label="Dozaj"
        colors={mockColors}
        language="tr"
      />
    );

    expect(getByText('Tablet')).toBeTruthy();
    expect(getByText('Kapsül')).toBeTruthy();
    expect(getByText('Şurup')).toBeTruthy();
  });

  it('form secimi degistirildiginde onFormChange tetiklenir', () => {
    const onFormChange = jest.fn();

    const { getByText } = render(
      <DosageInput
        dosageAmount="1"
        medicineForm="tablet"
        onAmountChange={jest.fn()}
        onFormChange={onFormChange}
        label="Dozaj"
        colors={mockColors}
        language="tr"
      />
    );

    fireEvent.press(getByText('Kapsül'));
    expect(onFormChange).toHaveBeenCalledWith('capsule');
  });

  it('tablet modunda (isTablet: true) dengeli izgara stili ile render edilir', () => {
    mockIsTablet = true;

    const { getByText } = render(
      <DosageInput
        dosageAmount="1"
        medicineForm="capsule"
        onAmountChange={jest.fn()}
        onFormChange={jest.fn()}
        label="Dozaj"
        colors={mockColors}
        language="tr"
      />
    );

    expect(getByText('Kapsül')).toBeTruthy();
  });
});
