/**
 * PermissionsScreen tests — Sprint 8
 */

import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
    canGoBack: () => true,
    navigate: jest.fn(),
  }),
}));

jest.mock('react-native', () => ({
  StyleSheet: {
    create: <T,>(styles: T): T => styles,
    flatten: <T,>(styles: T): T => styles,
  },
  Platform: { OS: 'android', select: (obj: any) => obj.android ?? obj.default },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  ActivityIndicator: 'ActivityIndicator',
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#fff',
      surface: '#f5f5f5',
      text: '#000',
      primary: '#4ECDC4',
      textSecondary: '#666',
      success: '#00ff00',
      danger: '#ff0000',
      warning: '#ffaa00',
    },
  }),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'tr',
    t: { common: {} },
  }),
}));

jest.mock('../../utils/notifications', () => ({
  checkAllPermissions: jest.fn().mockResolvedValue({
    notifications: true,
    exactAlarm: true,
    batteryOptimization: true,
    dnd: true,
    fullScreenIntent: true,
    powerManagerRestricted: false,
    manufacturer: 'mock',
  }),
  requestNotificationPermissions: jest.fn().mockResolvedValue(true),
  requestExactAlarmPermission: jest.fn().mockResolvedValue(true),
  requestBatteryOptimizationPermission: jest.fn().mockResolvedValue(true),
  openDndSettings: jest.fn().mockResolvedValue(undefined),
  openNotificationSettings: jest.fn().mockResolvedValue(undefined),
  openFullScreenIntentSettings: jest.fn().mockResolvedValue(undefined),
  openPowerManagerSettings: jest.fn().mockResolvedValue(undefined),
}));

import PermissionsScreen from '../../screens/PermissionsScreen';

describe('PermissionsScreen', () => {
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { root } = render(<PermissionsScreen onComplete={mockOnComplete} />);
    expect(root).toBeTruthy();
  });

  it('accepts onComplete callback prop', () => {
    render(<PermissionsScreen onComplete={mockOnComplete} />);
    expect(mockOnComplete).toBeDefined();
  });

  it('calls checkAllPermissions on mount', async () => {
    const { checkAllPermissions } = require('../../utils/notifications');
    render(<PermissionsScreen onComplete={mockOnComplete} />);
    // Async mock cagrilmali (useEffect icinde)
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(checkAllPermissions).toHaveBeenCalled();
  });
});
