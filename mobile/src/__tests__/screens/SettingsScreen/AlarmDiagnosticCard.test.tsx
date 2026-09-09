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
  TouchableOpacity: 'TouchableOpacity',
  ActivityIndicator: 'ActivityIndicator',
  Platform: { OS: 'android' },
  NativeModules: {},
  AppState: {
    addEventListener: () => ({ remove: () => undefined }),
  },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

const mockColors = {
  card: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#64748B',
  primary: '#0D9488',
  border: '#E2E8F0',
};

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: mockColors,
    isDark: false,
  }),
}));

const mockShowInfo = jest.fn();
const mockShowError = jest.fn();

jest.mock('../../../contexts/AlertContext', () => ({
  useAlert: () => ({
    showInfo: mockShowInfo,
    showError: mockShowError,
  }),
}));

// İzin durumu artık paylaşımlı useOemShieldStatus hook'undan okunuyor.
// Rozetler bu mock'un döndürdüğü gerçek değerlere bağlı.
const mockShieldStatus = {
  oem: 'generic' as const,
  manufacturer: 'generic',
  brand: 'generic',
  model: 'Test Device',
  sdkVersion: 34,
  notifications: true,
  exactAlarm: true,
  batteryOptimizationIgnored: true,
  fullScreenIntent: true,
  hasCustomOEMShield: false,
};

let mockShieldState: {
  phase: 'unknown' | 'loading' | 'resolved';
  status: typeof mockShieldStatus | null;
} = { phase: 'resolved', status: mockShieldStatus };

const mockShieldRefresh = jest.fn().mockResolvedValue(undefined);
const mockNotifySettingsOpened = jest.fn();

jest.mock('../../../hooks/useOemShieldStatus', () => ({
  useOemShieldStatus: () => ({
    phase: mockShieldState.phase,
    status: mockShieldState.status,
    isRefreshing: false,
    lastCheckedAt: mockShieldState.phase === 'resolved' ? 1 : null,
    hasError: false,
    isResolved: mockShieldState.phase === 'resolved' && mockShieldState.status !== null,
    refresh: mockShieldRefresh,
    notifySettingsOpened: mockNotifySettingsOpened,
  }),
}));

const mockMeds = [
  {
    id: 'med-parol',
    name: 'PAROL PLUS',
    dosage: '1 tablet',
    instructions: 'after_meal',
    color: '#3B82F6',
    isActive: true,
    frequency: 'daily' as const,
    durationDays: 14,
    times: ['09:00'],
    createdAt: '2026-08-31T10:00:00Z',
    updatedAt: '2026-08-31T10:00:00Z',
  },
];

const mockTimes = [
  {
    id: 'rt-1',
    medicineId: 'med-parol',
    time: '23:59',
    isEnabled: true,
  },
];

jest.mock('../../../stores/medicineStore', () => ({
  useMedicineStore: () => ({
    medicines: mockMeds,
    reminderTimes: mockTimes,
  }),
}));

// Test alarmi tek kaynaktan (utils/notifications/testAlarm) yonetiliyor;
// component yalnizca useLockScreenAlarmTest hook'unu kullanir.
jest.mock('../../../utils/notifications/testAlarm', () => ({
  TEST_ALARM_DURATIONS: [5, 10, 30],
}));

const mockRunTest = jest.fn();
const mockCancelTest = jest.fn();

let mockTestState: {
  isRunning: boolean;
  isArmed: boolean;
  seconds: number | null;
  firesAt: string | null;
  lastResult: null | {
    ok: boolean;
    reason?: string;
    steps: Array<{ id: string; status: string; title: string; detail?: string }>;
  };
} = { isRunning: false, isArmed: false, seconds: null, firesAt: null, lastResult: null };

jest.mock('../../../hooks/useLockScreenAlarmTest', () => ({
  useLockScreenAlarmTest: () => ({
    ...mockTestState,
    isBusy: mockTestState.isRunning || mockTestState.isArmed,
    run: (seconds: number) => mockRunTest(seconds),
    cancel: mockCancelTest,
  }),
}));

import { AlarmDiagnosticCard } from '../../../screens/SettingsScreen/components/AlarmDiagnosticCard';
import type { ThemeColors } from '../../../contexts/ThemeContext';
import type { Medicine, ReminderTime } from '../../../types';

describe('AlarmDiagnosticCard — Live Diagnostic Self-Check', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShieldState = { phase: 'resolved', status: mockShieldStatus };
    mockTestState = {
      isRunning: false,
      isArmed: false,
      seconds: null,
      firesAt: null,
      lastResult: null,
    };
    mockRunTest.mockResolvedValue({ ok: true, steps: [] });
  });

  const testColors = mockColors as unknown as ThemeColors;
  // NOT: rollingHorizonScheduler.ts, gerçek `Medicine` tipinde olmayan
  // durationDays/times/frequency:string alanlarını okuyor. Mock o şekle uyuyor.
  const testMeds = mockMeds as unknown as Medicine[];
  const testTimes = mockTimes as unknown as ReminderTime[];

  it('renders diagnostic headers, badges and 14-day projection summary', () => {
    const { getByText } = render(
      <AlarmDiagnosticCard
        language="tr"
        isDark={false}
        colors={testColors}
        medicines={testMeds}
        reminderTimes={testTimes}
      />
    );

    expect(getByText('Canlı Alarm & Sistem Teşhisi')).toBeTruthy();
    expect(getByText('USE_EXACT_ALARM: Aktif')).toBeTruthy();
    expect(getByText('14 Günlük Planlanan Doz')).toBeTruthy();
    expect(getByText('🧪 5 Saniye Sonra Test Alarmı Çal')).toBeTruthy();
  });

  it('triggers the test through the single-source engine with the default delay', async () => {
    const { getByText } = render(
      <AlarmDiagnosticCard
        language="tr"
        isDark={false}
        colors={testColors}
        medicines={testMeds}
        reminderTimes={testTimes}
      />
    );

    fireEvent.press(getByText('🧪 5 Saniye Sonra Test Alarmı Çal'));

    await waitFor(() => {
      expect(mockRunTest).toHaveBeenCalledWith(5);
      expect(mockShowInfo).toHaveBeenCalledWith(
        '⏰ Test Alarmı Kuruldu',
        expect.stringContaining('5 saniye sonra çalacak')
      );
    });
  });

  it('runs the test with the delay chosen in the duration picker', async () => {
    const { getByText } = render(
      <AlarmDiagnosticCard
        language="tr"
        isDark={false}
        colors={testColors}
        medicines={testMeds}
        reminderTimes={testTimes}
      />
    );

    fireEvent.press(getByText('30 sn'));
    fireEvent.press(getByText('🧪 30 Saniye Sonra Test Alarmı Çal'));

    await waitFor(() => {
      expect(mockRunTest).toHaveBeenCalledWith(30);
    });
  });

  it('surfaces a concrete reason instead of failing silently', async () => {
    mockRunTest.mockResolvedValue({
      ok: false,
      reason: 'notifications-denied',
      steps: [{ id: 'notifications', status: 'fail', title: 'Bildirim izni' }],
    });

    const { getByText } = render(
      <AlarmDiagnosticCard
        language="tr"
        isDark={false}
        colors={testColors}
        medicines={testMeds}
        reminderTimes={testTimes}
      />
    );

    fireEvent.press(getByText('🧪 5 Saniye Sonra Test Alarmı Çal'));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(
        'Test Başlatılamadı',
        expect.stringContaining('Bildirim izni kapalı')
      );
      expect(mockShowInfo).not.toHaveBeenCalled();
    });
  });

  it('renders the step-by-step result output', () => {
    mockTestState = {
      isRunning: false,
      isArmed: false,
      seconds: null,
      firesAt: null,
      lastResult: {
        ok: true,
        steps: [
          { id: 'notifications', status: 'ok', title: 'Bildirim izni' },
          {
            id: 'full-screen-intent',
            status: 'warn',
            title: 'Tam ekran bildirim izni',
            detail: 'Kapalı — alarm kilit ekranını açamaz.',
          },
        ],
      },
    };

    const { getByText } = render(
      <AlarmDiagnosticCard
        language="tr"
        isDark={false}
        colors={testColors}
        medicines={testMeds}
        reminderTimes={testTimes}
      />
    );

    expect(getByText('Bildirim izni')).toBeTruthy();
    expect(getByText('Tam ekran bildirim izni')).toBeTruthy();
    expect(getByText('Kapalı — alarm kilit ekranını açamaz.')).toBeTruthy();
  });

  it('shows a neutral checking state and no permission warning before status resolves', () => {
    mockShieldState = { phase: 'loading', status: null };

    const { getByText, queryByText } = render(
      <AlarmDiagnosticCard
        language="tr"
        isDark={false}
        colors={testColors}
        medicines={testMeds}
        reminderTimes={testTimes}
      />
    );

    // Nötr "kontrol ediliyor" metni
    expect(getByText('Kesin Alarm: Kontrol ediliyor…')).toBeTruthy();
    expect(getByText('Pil Muafiyeti: Kontrol ediliyor…')).toBeTruthy();

    // Veri hazır olmadan "izin yok" uyarısı FLASH ETMEMELİ
    expect(queryByText('🔒 Kilit Ekranında Gösterme İznini Aç (Dokunun)')).toBeNull();
    expect(queryByText('Kesin Alarm İzni: Kapalı')).toBeNull();
  });

  it('reflects a revoked full-screen-intent permission from the shared hook', () => {
    mockShieldState = {
      phase: 'resolved',
      status: { ...mockShieldStatus, fullScreenIntent: false, exactAlarm: false },
    };

    const { getByText } = render(
      <AlarmDiagnosticCard
        language="tr"
        isDark={false}
        colors={testColors}
        medicines={testMeds}
        reminderTimes={testTimes}
      />
    );

    expect(getByText('Kesin Alarm İzni: Kapalı')).toBeTruthy();
    expect(getByText('🔒 Kilit Ekranında Gösterme İznini Aç (Dokunun)')).toBeTruthy();
  });
});
