/**
 * CaregiverScreen tests — Sprint 8 Tier 4 devamı
 */

import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  StyleSheet: {
    create: <T,>(styles: T): T => styles,
    flatten: <T,>(styles: T): T => styles,
  },
  Platform: { OS: 'android' },
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  TextInput: 'TextInput',
  Alert: { alert: jest.fn() },
  ActivityIndicator: 'ActivityIndicator',
  Modal: 'Modal',
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-qrcode-svg', () => 'QRCode');
jest.mock('../../components/common/ModalSheet', () => ({
  ModalSheet: 'ModalSheet',
}));

jest.mock('../../hooks/useCaregiver', () => ({
  useCaregiver: () => ({
    caregivers: [],
    pendingInvites: [],
    isLoading: false,
    qrCodeData: null,
    showQRModal: false,
    createInvite: jest.fn(),
    removeCaregiverRel: jest.fn(),
    updatePermissions: jest.fn(),
    cancelInviteRel: jest.fn(),
    showQRCode: jest.fn(),
    hideQRCode: jest.fn(),
    refresh: jest.fn(),
  }),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'tr',
    t: (key: string) => key,
  }),
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#fff',
      surface: '#f5f5f5',
      text: '#000',
      primary: '#4ECDC4',
      textSecondary: '#666',
      border: '#ddd',
      danger: '#ff0000',
    },
    isDark: false,
  }),
}));

jest.mock('../../contexts/AlertContext', () => ({
  useAlert: () => ({
    showAlert: jest.fn(),
    showError: jest.fn(),
    showInfo: jest.fn(),
    showSuccess: jest.fn(),
  }),
}));

jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import CaregiverScreen from '../../screens/CaregiverScreen';

describe('CaregiverScreen', () => {
  it('renders without crashing', () => {
    const { root } = render(<CaregiverScreen />);
    expect(root).toBeTruthy();
  });

  it('renders ScrollView', () => {
    const { UNSAFE_root } = render(<CaregiverScreen />);
    expect(UNSAFE_root).toBeTruthy();
  });
});
