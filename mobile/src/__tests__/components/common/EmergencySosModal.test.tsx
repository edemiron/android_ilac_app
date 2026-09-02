import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  __esModule: true,
  View: 'View',
  Text: 'Text',
  StyleSheet: {
    create: <T,>(s: T): T => s,
    flatten: <T,>(s: T): T => s,
    hairlineWidth: 1,
  },
  Modal: 'Modal',
  TouchableOpacity: 'TouchableOpacity',
  ActivityIndicator: 'ActivityIndicator',
  Alert: {
    alert: jest.fn(),
  },
  Linking: {
    canOpenURL: jest.fn().mockResolvedValue(true),
    openURL: jest.fn().mockResolvedValue(true),
  },
  Vibration: {
    vibrate: jest.fn(),
    cancel: jest.fn(),
  },
  Platform: {
    OS: 'android',
    select: (objs: any) => objs.android || objs.default,
  },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../../../services/caregiverService', () => ({
  sendEmergencySosToCaregivers: jest.fn().mockResolvedValue({
    success: true,
    sentCount: 2,
    alertId: 'sos_123',
  }),
}));

jest.mock('../../../utils/alarmSoundManager', () => ({
  playAlarmSound: jest.fn().mockResolvedValue(undefined),
  stopAlarmSound: jest.fn().mockResolvedValue(undefined),
}));

import { EmergencySosModal } from '../../../components/common/EmergencySosModal';
import { Linking, Alert, Vibration } from 'react-native';
import { sendEmergencySosToCaregivers } from '../../../services/caregiverService';
import { playAlarmSound, stopAlarmSound } from '../../../utils/alarmSoundManager';

describe('EmergencySosModal', () => {
  const mockColors = {
    primary: '#10B981',
    background: '#0F172A',
    card: '#1E293B',
    text: '#FFFFFF',
    textSecondary: '#94A3B8',
    border: '#334155',
  } as any;

  const mockOnClose = jest.fn();
  const mockOnNavigateToPharmacy = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal with emergency action buttons', () => {
    const { getByText } = render(
      <EmergencySosModal
        visible={true}
        onClose={mockOnClose}
        userId="patient_123"
        userName="Enes"
        caregiverPhone="05551234567"
        onNavigateToPharmacy={mockOnNavigateToPharmacy}
        colors={mockColors}
        language="tr"
      />
    );

    expect(getByText('Acil Durum & SOS Merkezi')).toBeTruthy();
    expect(getByText('112 Acil Çağrı Merkezi')).toBeTruthy();
    expect(getByText('Bakıcılara Acil Alarm Gönder')).toBeTruthy();
    expect(getByText('Kayıtlı Yakınını / Bakıcıyı Ara')).toBeTruthy();
    expect(getByText('Nöbetçi Eczane')).toBeTruthy();
    expect(getByText('Sesli Siren Çal')).toBeTruthy();
  });

  it('dials 112 directly on tap', async () => {
    const { getByText } = render(
      <EmergencySosModal
        visible={true}
        onClose={mockOnClose}
        userId="patient_123"
        userName="Enes"
        caregiverPhone="05551234567"
        colors={mockColors}
        language="tr"
      />
    );

    const call112Btn = getByText('112 Acil Çağrı Merkezi');
    fireEvent.press(call112Btn);

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith('tel:112');
    });
  });

  it('calls registered caregiver directly on tap', async () => {
    const { getByText } = render(
      <EmergencySosModal
        visible={true}
        onClose={mockOnClose}
        userId="patient_123"
        userName="Enes"
        caregiverPhone="05551234567"
        colors={mockColors}
        language="tr"
      />
    );

    const callCaregiverBtn = getByText('Kayıtlı Yakınını / Bakıcıyı Ara');
    fireEvent.press(callCaregiverBtn);

    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledWith('tel:+905551234567');
    });
  });

  it('sends emergency SOS to active caregivers with haptic feedback', async () => {
    const { getByText } = render(
      <EmergencySosModal
        visible={true}
        onClose={mockOnClose}
        userId="patient_123"
        userName="Enes"
        caregiverPhone="05551234567"
        colors={mockColors}
        language="tr"
      />
    );

    const sendSosBtn = getByText('Bakıcılara Acil Alarm Gönder');
    fireEvent.press(sendSosBtn);

    await waitFor(() => {
      expect(sendEmergencySosToCaregivers).toHaveBeenCalledWith(
        'patient_123',
        'Enes',
        expect.stringContaining('Acil Durum')
      );
      expect(Vibration.vibrate).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        expect.stringContaining('SOS Bildirimi İletildi'),
        expect.stringContaining('2 bağlı bakıcınıza')
      );
    });
  });

  it('toggles panic siren with loud audio and vibration pattern', () => {
    const { getByText } = render(
      <EmergencySosModal
        visible={true}
        onClose={mockOnClose}
        userId="patient_123"
        userName="Enes"
        colors={mockColors}
        language="tr"
      />
    );

    const sirenBtn = getByText('Sesli Siren Çal');
    fireEvent.press(sirenBtn);

    expect(playAlarmSound).toHaveBeenCalledWith(100, 'urgent_alert', true);
    expect(Vibration.vibrate).toHaveBeenCalled();

    // Toggle off
    fireEvent.press(sirenBtn);
    expect(stopAlarmSound).toHaveBeenCalled();
    expect(Vibration.cancel).toHaveBeenCalled();
  });

  it('stops siren sound when modal is closed', () => {
    const { getByText } = render(
      <EmergencySosModal
        visible={true}
        onClose={mockOnClose}
        userId="patient_123"
        userName="Enes"
        colors={mockColors}
        language="tr"
      />
    );

    // Start siren
    const sirenBtn = getByText('Sesli Siren Çal');
    fireEvent.press(sirenBtn);
    expect(playAlarmSound).toHaveBeenCalledWith(100, 'urgent_alert', true);

    // Close modal
    const closeBtn = getByText('Kapat / Yanlışlıkla Bastım');
    fireEvent.press(closeBtn);

    expect(stopAlarmSound).toHaveBeenCalled();
    expect(Vibration.cancel).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });
});
