import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  TextInput: 'TextInput',
  ScrollView: 'ScrollView',
  Modal: ({ children, visible }: any) => (visible ? children : null),
  Animated: {
    Value: jest.fn(() => ({ setValue: jest.fn() })),
    View: 'Animated.View',
    timing: jest.fn(() => ({ start: jest.fn((cb: any) => cb && cb()) })),
    sequence: jest.fn(() => ({ start: jest.fn((cb: any) => cb && cb()) })),
    loop: jest.fn(() => ({ start: jest.fn() })),
  },
  StyleSheet: { create: <T,>(s: T): T => s, flatten: <T,>(s: T): T => s, hairlineWidth: 1 },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

import { VoiceAddMedicineModal } from '../../../components/addMedicine/VoiceAddMedicineModal';
import type { ThemeColors } from '../../../contexts/ThemeContext';

const mockColors = {
  background: '#ffffff',
  surface: '#f8f9fa',
  text: '#1a1a1a',
  textSecondary: '#6c757d',
  primary: '#10b981',
  border: '#e9ecef',
  card: '#ffffff',
  placeholder: '#9ca3af',
} as unknown as ThemeColors;

describe('VoiceAddMedicineModal', () => {
  it('renders modal and allows selecting quick phrase and applying to form', () => {
    const onApply = jest.fn();
    const onClose = jest.fn();

    const { getByText } = render(
      <VoiceAddMedicineModal
        visible={true}
        onApplyParsedMedicine={onApply}
        onClose={onClose}
        colors={mockColors}
        language="tr"
      />
    );

    // v1.7.4 (Faz 0.6): başlık "🎙️ Sesli Reçete Asistanı" → "Cümleyle İlaç Ekle".
    // Uygulamada konuşma tanıma YOKTU; modalın tek girişi her zaman metindi.
    // Bu test eski, yanıltıcı başlığı pinliyordu.
    expect(getByText('Cümleyle İlaç Ekle')).toBeTruthy();

    // Örnek cümleye tıkla
    const sampleBtn = getByText('Günde 2 kez tok karnına Parol 500');
    fireEvent.press(sampleBtn);

    // Çıkarılan etiketleri kontrol et
    expect(getByText('💊 Parol')).toBeTruthy();
    expect(getByText('⏰ Günde 2x')).toBeTruthy();

    // Forma aktar butonuna bas
    const applyBtn = getByText('Forma Otomatik Aktar');
    fireEvent.press(applyBtn);

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Parol',
        dosageAmount: '500',
        frequency: 2,
        instruction: 'after_meal',
      })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('allows manual voice transcript input', () => {
    const onApply = jest.fn();
    const onClose = jest.fn();

    const { getByPlaceholderText, getByText } = render(
      <VoiceAddMedicineModal
        visible={true}
        onApplyParsedMedicine={onApply}
        onClose={onClose}
        colors={mockColors}
        language="tr"
      />
    );

    const input = getByPlaceholderText('Örn: Günde 2 kez tok karnına Parol 500');
    fireEvent.changeText(input, 'Aspirin 100 mg günde 1 defa aç karnına');

    expect(getByText('💊 Aspirin')).toBeTruthy();
    expect(getByText('⚖️ 100 mg')).toBeTruthy();

    const applyBtn = getByText('Forma Otomatik Aktar');
    fireEvent.press(applyBtn);

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Aspirin',
        dosageAmount: '100',
        frequency: 1,
        instruction: 'empty_stomach',
      })
    );
  });
});
