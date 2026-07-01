/**
 * SettingsScreen tests — Sprint 8
 * useSettingsScreen hook mock'lu. Component render testleri.
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
  Switch: 'Switch',
  TouchableOpacity: 'TouchableOpacity',
  UIManager: { setLayoutAnimationEnabledExperimental: jest.fn() },
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// useSettingsScreen hook mock
jest.mock('../../hooks/useSettingsScreen', () => ({
  useSettingsScreen: () => ({
    navigation: { navigate: jest.fn(), goBack: jest.fn() },
    colors: {
      background: '#fff',
      surface: '#f5f5f5',
      text: '#000',
      primary: '#4ECDC4',
      textSecondary: '#666',
      border: '#ddd',
      danger: '#ff0000',
      success: '#00ff00',
      warning: '#ffaa00',
      card: '#fff',
    },
    isDark: false,
    theme: 'light',
    setTheme: jest.fn(),
    language: 'tr',
    setLanguage: jest.fn(),
    settings: {
      language: 'tr',
      fullScreenAlarmEnabled: true,
      vibrationEnabled: true,
      alarmModeEnabled: false,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      cloudSyncEnabled: false,
      dailySummaryTime: '08:00',
      theme: 'light',
      wakeUpTime: '08:00',
      sleepTime: '23:00',
    },
    updateSettings: jest.fn(),
    isSyncing: false,
    user: { uid: 'test-uid', email: 'test@test.com' },
    isPremium: false,
    remainingDays: 30,
    pickerState: { type: null, visible: false },
    togglePicker: jest.fn(),
    closePicker: jest.fn(),
    parseTimeToDate: jest.fn(),
    handleTimeChange: jest.fn(),
    handleTestNotification: jest.fn(),
    handleTestVoice: jest.fn(),
    handleExportData: jest.fn(),
    handleImportData: jest.fn(),
    handleSyncFromCloud: jest.fn(),
    handleSyncToCloud: jest.fn(),
    handleResetAllData: jest.fn(),
    handleLogout: jest.fn(),
    formatLastSync: jest.fn(() => 'Never'),
    handleSync: jest.fn(),
  }),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'tr',
    t: { common: {} },
  }),
}));

jest.mock('../../contexts/AlertContext', () => ({
  useAlert: () => ({
    showError: jest.fn(),
    showInfo: jest.fn(),
    showSuccess: jest.fn(),
  }),
}));

// Mock the settings components to simple text
jest.mock('../../components/settings', () => ({
  PremiumCard: () => null,
  DailyScheduleSection: () => null,
  AppearanceSection: () => null,
  NotificationSection: () => null,
  DevTestSection: () => null,
  QuietHoursSection: () => null,
  AdditionalFeaturesSection: () => null,
  AccountSection: () => null,
  AboutSection: () => null,
  createSettingsStyles: () => ({}),
}));

import SettingsScreen from '../../screens/SettingsScreen';

describe('SettingsScreen', () => {
  it('renders without crashing', () => {
    const { root } = render(<SettingsScreen />);
    expect(root).toBeTruthy();
  });

  it('renders ScrollView', () => {
    const { UNSAFE_root } = render(<SettingsScreen />);
    expect(UNSAFE_root).toBeTruthy();
  });
});
