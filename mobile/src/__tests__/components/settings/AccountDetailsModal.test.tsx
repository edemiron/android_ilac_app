import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockToastShow = jest.fn();

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
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  ActivityIndicator: 'ActivityIndicator',
  Image: 'Image',
  TextInput: 'TextInput',
  ToastAndroid: {
    show: (...args: unknown[]) => mockToastShow(...args),
    SHORT: 0,
  },
  Share: {
    share: jest.fn().mockResolvedValue({ action: 'sharedAction' }),
  },
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'android',
    select: (objs: any) => objs.android || objs.default,
  },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

// Mock caregiverService
jest.mock('../../../services/caregiverService', () => ({
  getUserPhoneNumber: jest.fn().mockResolvedValue('+905551234567'),
  updateUserPhoneNumber: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock AuthContext
const mockUpdateDisplayName = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    updateDisplayName: mockUpdateDisplayName,
  }),
}));

import { AccountDetailsModal } from '../../../screens/SettingsScreen/components/AccountDetailsModal';

describe('AccountDetailsModal Component', () => {
  const mockColors = {
    background: '#0F172A',
    surface: '#1E293B',
    surfaceVariant: '#334155',
    text: '#FFFFFF',
    textSecondary: '#94A3B8',
    primary: '#0D9488',
    primaryDark: '#0F766E',
    border: '#334155',
    error: '#EF4444',
  } as any;

  const mockUser = {
    uid: 'test-uid-12345',
    email: 'enes@example.com',
    displayName: 'Enes Demir',
    photoURL: null,
  };

  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    user: mockUser,
    isSyncing: false,
    lastSyncAt: '2026-08-29T00:00:00Z',
    onSync: jest.fn(),
    onLogout: jest.fn(),
    onUpdateDisplayName: jest.fn().mockResolvedValue(undefined),
    colors: mockColors,
    isDark: true,
    language: 'tr',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders user details correctly', () => {
    const { getByText } = render(<AccountDetailsModal {...defaultProps} />);

    expect(getByText('Hesap Bilgileri')).toBeTruthy();
    expect(getByText('Enes Demir')).toBeTruthy();
    expect(getByText('enes@example.com')).toBeTruthy();
    expect(getByText('Doğrulanmış Hesap')).toBeTruthy();
  });

  it('opens name editing input when pencil icon is pressed', () => {
    const { getByText, getByPlaceholderText, getByLabelText } = render(
      <AccountDetailsModal {...defaultProps} />
    );

    const editButton = getByLabelText('Adı Düzenle');
    fireEvent.press(editButton);

    expect(getByText('Adınızı Değiştirin')).toBeTruthy();
    const input = getByPlaceholderText('Örn: Enes Demir');
    expect(input.props.value).toBe('Enes Demir');
  });

  it('shows error when saving empty name', async () => {
    const { getByText, getByPlaceholderText, getByLabelText } = render(
      <AccountDetailsModal {...defaultProps} />
    );

    fireEvent.press(getByLabelText('Adı Düzenle'));
    const input = getByPlaceholderText('Örn: Enes Demir');

    fireEvent.changeText(input, '   ');
    fireEvent.press(getByText('Kaydet'));

    await waitFor(() => {
      expect(getByText('Lütfen adınızı giriniz')).toBeTruthy();
    });
    expect(defaultProps.onUpdateDisplayName).not.toHaveBeenCalled();
  });

  it('shows error when saving name with less than 2 characters', async () => {
    const { getByText, getByPlaceholderText, getByLabelText } = render(
      <AccountDetailsModal {...defaultProps} />
    );

    fireEvent.press(getByLabelText('Adı Düzenle'));
    const input = getByPlaceholderText('Örn: Enes Demir');

    fireEvent.changeText(input, 'E');
    fireEvent.press(getByText('Kaydet'));

    await waitFor(() => {
      expect(getByText('Adınız en az 2 karakter olmalıdır')).toBeTruthy();
    });
    expect(defaultProps.onUpdateDisplayName).not.toHaveBeenCalled();
  });

  it('updates display name successfully when valid name is entered', async () => {
    const onUpdateDisplayName = jest.fn().mockResolvedValue(undefined);
    const { getByText, getByPlaceholderText, getByLabelText } = render(
      <AccountDetailsModal {...defaultProps} onUpdateDisplayName={onUpdateDisplayName} />
    );

    fireEvent.press(getByLabelText('Adı Düzenle'));
    const input = getByPlaceholderText('Örn: Enes Demir');

    fireEvent.changeText(input, 'Enes Demir (Yeni)');
    fireEvent.press(getByText('Kaydet'));

    await waitFor(() => {
      expect(onUpdateDisplayName).toHaveBeenCalledWith('Enes Demir (Yeni)');
    });
  });

  it('cancels name editing when Vazgeç is pressed', () => {
    const { getByText, queryByText, getByLabelText } = render(
      <AccountDetailsModal {...defaultProps} />
    );

    fireEvent.press(getByLabelText('Adı Düzenle'));
    expect(getByText('Adınızı Değiştirin')).toBeTruthy();

    fireEvent.press(getByText('Vazgeç'));
    expect(queryByText('Adınızı Değiştirin')).toBeNull();
    expect(getByText('Enes Demir')).toBeTruthy();
  });
});
