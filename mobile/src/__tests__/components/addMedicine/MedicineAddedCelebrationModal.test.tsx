import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  Modal: ({ children, visible }: any) => (visible ? children : null),
  Animated: {
    Value: jest.fn(() => ({ setValue: jest.fn() })),
    View: 'Animated.View',
    timing: jest.fn(() => ({ start: jest.fn((cb: any) => cb && cb()) })),
    spring: jest.fn(() => ({ start: jest.fn((cb: any) => cb && cb()) })),
    parallel: jest.fn(() => ({ start: jest.fn((cb: any) => cb && cb()) })),
    sequence: jest.fn(() => ({ start: jest.fn((cb: any) => cb && cb()) })),
    loop: jest.fn(() => ({ start: jest.fn() })),
  },
  Easing: { out: jest.fn(), ease: jest.fn() },
  StyleSheet: { create: <T,>(s: T): T => s, flatten: <T,>(s: T): T => s, hairlineWidth: 1 },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

import { MedicineAddedCelebrationModal } from '../../../components/addMedicine/MedicineAddedCelebrationModal';
import type { ThemeColors } from '../../../contexts/ThemeContext';

const mockColors = {
  background: '#ffffff',
  surface: '#f8f9fa',
  text: '#1a1a1a',
  textSecondary: '#6c757d',
  primary: '#10b981',
  border: '#e9ecef',
  card: '#ffffff',
} as unknown as ThemeColors;

describe('MedicineAddedCelebrationModal', () => {
  it('renders correctly when visible for added medicine', () => {
    const onDismiss = jest.fn();
    const { getByText } = render(
      <MedicineAddedCelebrationModal
        data={{
          visible: true,
          medicineName: 'Parol',
          dosageAmount: '500 mg',
          firstReminderTime: '08:00',
          isEditing: false,
        }}
        onDismiss={onDismiss}
        colors={mockColors}
        language="tr"
      />
    );

    expect(getByText('İlaç Başarıyla Eklendi!')).toBeTruthy();
    expect(getByText('Parol (500 mg)')).toBeTruthy();
    expect(getByText("İlk doz bugün saat 08:00'de ⏰")).toBeTruthy();

    // Harika butonuna basınca onDismiss çağrılmalı
    const btn = getByText('Harika!');
    fireEvent.press(btn);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('renders correctly when editing medicine', () => {
    const onDismiss = jest.fn();
    const { getByText } = render(
      <MedicineAddedCelebrationModal
        data={{
          visible: true,
          medicineName: 'Aspirin',
          dosageAmount: '100 mg',
          firstReminderTime: '09:00',
          isEditing: true,
        }}
        onDismiss={onDismiss}
        colors={mockColors}
        language="tr"
      />
    );

    expect(getByText('İlaç Güncellendi!')).toBeTruthy();
    expect(getByText('Aspirin (100 mg)')).toBeTruthy();
  });

  it('does not render when visible is false', () => {
    const onDismiss = jest.fn();
    const { queryByText } = render(
      <MedicineAddedCelebrationModal
        data={{
          visible: false,
          medicineName: 'Parol',
        }}
        onDismiss={onDismiss}
        colors={mockColors}
        language="tr"
      />
    );

    expect(queryByText('İlaç Başarıyla Eklendi!')).toBeNull();
  });

  it('renders family share button and triggers sharing on press', () => {
    const onDismiss = jest.fn();
    const { getByText } = render(
      <MedicineAddedCelebrationModal
        data={{
          visible: true,
          medicineName: 'Coraspin',
          dosageAmount: '100 mg',
          firstReminderTime: '10:00',
          isEditing: false,
        }}
        onDismiss={onDismiss}
        colors={mockColors}
        language="tr"
      />
    );

    const shareBtn = getByText('Aileye / Bakıcıya Bildir');
    expect(shareBtn).toBeTruthy();
    fireEvent.press(shareBtn);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('renders English localization correctly', () => {
    const onDismiss = jest.fn();
    const { getByText } = render(
      <MedicineAddedCelebrationModal
        data={{
          visible: true,
          medicineName: 'Vitamin D',
          dosageAmount: '1000 IU',
          firstReminderTime: '09:00',
          isEditing: false,
        }}
        onDismiss={onDismiss}
        colors={mockColors}
        language="en"
      />
    );

    expect(getByText('Medicine Added!')).toBeTruthy();
    expect(getByText('Share with Family / Caregiver')).toBeTruthy();
    expect(getByText('Great!')).toBeTruthy();
  });
});
