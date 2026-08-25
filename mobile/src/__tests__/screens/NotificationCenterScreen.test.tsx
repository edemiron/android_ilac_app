/**
 * NotificationCenterScreen tests
 *
 * Test coverage for Notification & Reminder Hub:
 * - Render without crashing
 * - Shield card, quick settings, segment control and feed rendering
 * - Test notification trigger
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    canGoBack: () => true,
    navigate: mockNavigate,
  }),
}));

jest.mock('react-native', () => ({
  StyleSheet: {
    create: <T,>(styles: T): T => styles,
    flatten: <T,>(styles: T): T => styles,
  },
  Platform: { OS: 'android', Version: 34 },
  View: 'View',
  Text: 'Text',
  Switch: 'Switch',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  ActivityIndicator: 'ActivityIndicator',
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  RefreshControl: 'RefreshControl',
  Linking: {
    sendIntent: jest.fn(),
  },
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'tr',
    t: (key: string) => key,
  }),
}));

const mockScheduleTestAlarmNotification = jest.fn().mockResolvedValue('notif-123');
jest.mock('../../utils/notifications/schedule', () => ({
  scheduleTestAlarmNotification: (...args: any[]) => mockScheduleTestAlarmNotification(...args),
}));

const mockSendTestNotification = jest.fn().mockResolvedValue(undefined);
jest.mock('../../utils/notifications/actions', () => ({
  sendTestNotification: () => mockSendTestNotification(),
  dismissNotification: jest.fn(),
  cancelAllNotifications: jest.fn(),
}));

jest.mock('../../utils/notifications/permissions', () => ({
  checkAllPermissions: jest.fn().mockResolvedValue({
    notifications: true,
    exactAlarm: true,
    batteryOptimization: true,
    dnd: true,
    fullScreenIntent: true,
    powerManagerRestricted: false,
    manufacturer: null,
    isMIUI: false,
  }),
}));

const mockMedicines = [
  {
    id: 'med-1',
    name: 'Aspirin',
    dosage: '100mg',
    instructions: 'Tok karnına',
    color: '#0D9488',
    isActive: true,
  },
];

const mockReminderTimes = [
  {
    id: 'rt-1',
    medicineId: 'med-1',
    time: '14:30',
    isActive: true,
  },
];

const mockLogs = [
  {
    id: 'log-1',
    medicineId: 'med-1',
    reminderTimeId: 'rt-1',
    scheduledTime: '2026-08-25T14:30:00.000Z',
    takenAt: '2026-08-25T14:31:00.000Z',
    status: 'taken',
  },
];

jest.mock('../../stores/medicineStore', () => ({
  useMedicineStore: (selector: any) =>
    selector({
      medicines: mockMedicines,
      reminderTimes: mockReminderTimes,
      medicineLogs: mockLogs,
      snoozes: [],
    }),
}));

import { mockUseTheme } from '../helpers/themeMock';

jest.mock('../../contexts/ThemeContext', () => {
  const actual = jest.requireActual('../../contexts/ThemeContext');
  return {
    ...actual,
    useTheme: () => mockUseTheme(),
  };
});

import { NotificationCenterScreen } from '../../screens/NotificationCenterScreen';

describe('NotificationCenterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing and displays header title', () => {
    const { getByText } = render(<NotificationCenterScreen />);
    expect(getByText('Bildirim & Hatırlatma Merkezi')).toBeTruthy();
  });

  it('displays shield card with healthy status and permission badges', () => {
    const { getByText } = render(<NotificationCenterScreen />);
    expect(getByText('Bildirim & Alarm Kalkanı Aktif')).toBeTruthy();
    expect(getByText('Bildirim İzni')).toBeTruthy();
    expect(getByText('Tam Zamanlı Alarm')).toBeTruthy();
    expect(getByText('Pil Koruması')).toBeTruthy();
  });

  it('triggers test alarm schedule when test button is pressed', async () => {
    const { getByText } = render(<NotificationCenterScreen />);
    const testButton = getByText('Canlı Test Bildirimi Gönder');
    await act(async () => {
      fireEvent.press(testButton);
    });
    expect(mockScheduleTestAlarmNotification).toHaveBeenCalledTimes(1);
  });

  it('renders quick settings navigation buttons', () => {
    const { getByText } = render(<NotificationCenterScreen />);
    expect(getByText('Sesli Bildirimler (TTS)')).toBeTruthy();
    expect(getByText('Alarm Melodisi & Ses Düzeyi')).toBeTruthy();
    expect(getByText('Detaylı İzin & Teşhis Raporu')).toBeTruthy();
  });

  it('navigates to TtsSettings when TTS quick row is pressed', () => {
    const { getByText } = render(<NotificationCenterScreen />);
    const ttsRow = getByText('Sesli Bildirimler (TTS)');
    fireEvent.press(ttsRow);
    expect(mockNavigate).toHaveBeenCalledWith('TtsSettings');
  });

  it('navigates to Permissions when permissions quick row is pressed', () => {
    const { getByText } = render(<NotificationCenterScreen />);
    const permRow = getByText('Detaylı İzin & Teşhis Raporu');
    fireEvent.press(permRow);
    expect(mockNavigate).toHaveBeenCalledWith('Permissions');
  });

  it('navigates to Main Settings when Alarm Melodisi quick row is pressed', () => {
    const { getByText } = render(<NotificationCenterScreen />);
    const soundRow = getByText('Alarm Melodisi & Ses Düzeyi');
    fireEvent.press(soundRow);
    expect(mockNavigate).toHaveBeenCalledWith('Main', { screen: 'Settings' });
  });

  it('switches between Feed and Upcoming tabs correctly', () => {
    const { getByText } = render(<NotificationCenterScreen />);
    const upcomingTab = getByText(/Sıradaki Alarmlar/);
    fireEvent.press(upcomingTab);
    expect(getByText('Aspirin')).toBeTruthy();
  });
});
