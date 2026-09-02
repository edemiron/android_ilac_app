import React from 'react';
import { render } from '@testing-library/react-native';
import DutyPharmacyScreen from '../../screens/DutyPharmacyScreen';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 40.9872, longitude: 29.0284 },
  }),
}));

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  TouchableOpacity: 'TouchableOpacity',
  Modal: ({ children, visible }: { children: React.ReactNode; visible: boolean }) =>
    visible ? children : null,
  KeyboardAvoidingView: ({ children }: { children: React.ReactNode }) => children,
  ScrollView: ({ children }: { children: React.ReactNode }) => children,
  Alert: { alert: jest.fn() },
  Platform: { OS: 'android', select: (obj: Record<string, unknown>) => obj.android || obj.default },
  Linking: {
    openURL: jest.fn().mockResolvedValue(true),
    canOpenURL: jest.fn().mockResolvedValue(true),
  },
  NativeModules: {
    WidgetDataModule: {
      setWidgetData: jest.fn(),
    },
  },
  FlatList: ({
    data,
    renderItem,
    ListEmptyComponent,
    ListHeaderComponent,
  }: {
    data: Array<{ id?: string }>;
    renderItem: (info: { item: unknown; index: number }) => React.ReactNode;
    ListEmptyComponent?: React.ReactNode;
    ListHeaderComponent?: React.ReactNode;
  }) => {
    const React = require('react');
    if (!data || data.length === 0)
      return ListEmptyComponent ? React.createElement('View', null, ListEmptyComponent) : null;
    return React.createElement(
      'View',
      null,
      ListHeaderComponent,
      data.map((item, index) =>
        React.createElement('View', { key: item.id || index }, renderItem({ item, index }))
      )
    );
  },
  ActivityIndicator: 'ActivityIndicator',
  StyleSheet: { create: <T,>(s: T): T => s, flatten: <T,>(s: T): T => s },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#fff',
      card: '#fff',
      border: '#e2e8f0',
      text: '#0f172a',
      textSecondary: '#64748b',
      textMuted: '#94a3b8',
      primary: '#0f766e',
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

describe('DutyPharmacyScreen', () => {
  it('renders title and search bar', async () => {
    const { getAllByText, getByPlaceholderText } = render(<DutyPharmacyScreen />);

    expect(getAllByText('Nöbetçi Eczaneler').length).toBeGreaterThan(0);
    expect(getByPlaceholderText('Eczane, ilçe veya mahalle ara...')).toBeTruthy();
  });

  it('renders pharmacy cards after loading', async () => {
    const { findByText } = render(<DutyPharmacyScreen />);

    const pharmacyName = await findByText('Kadıköy Şifa Eczanesi');
    expect(pharmacyName).toBeTruthy();
  });

  it('renders prescription tab button', async () => {
    const { getByText } = render(<DutyPharmacyScreen />);

    expect(getByText('Reçetelerim')).toBeTruthy();
  });
});
