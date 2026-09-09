/**
 * testAlarm — kilit ekranı alarm testi tek kaynağı.
 *
 * Kapsam: ayarların store'dan okunması, izin ön kontrolünün somut sebep
 * döndürmesi, aynı anda tek test, "armed" durumu ve zamanlayıcı yönetimi.
 */

const mockAppStateRemove = jest.fn();
const mockAppStateAdd = jest.fn(() => ({ remove: mockAppStateRemove }));

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: (...args: unknown[]) => mockAppStateAdd(...(args as [])),
  },
  Platform: { OS: 'android' },
}));

const mockScheduleTestAlarmNotification = jest.fn();
jest.mock('../../utils/notifications/schedule', () => ({
  scheduleTestAlarmNotification: (...args: unknown[]) => mockScheduleTestAlarmNotification(...args),
}));

const mockCancelNotification = jest.fn().mockResolvedValue(undefined);
jest.mock('../../utils/notifications/cancel', () => ({
  cancelNotification: (...args: unknown[]) => mockCancelNotification(...args),
}));

const mockDetectOEMShieldStatus = jest.fn();
jest.mock('../../utils/oemShieldEngine', () => ({
  detectOEMShieldStatus: () => mockDetectOEMShieldStatus(),
}));

const mockStoreSettings = {
  fullScreenAlarmEnabled: true,
  alarmSound: 'crystal_bell',
  alarmVolume: 55,
  quietHoursEnabled: true,
  vibrationEnabled: false,
};

jest.mock('../../stores/medicineStore', () => ({
  useMedicineStore: {
    getState: () => ({ settings: mockStoreSettings }),
  },
}));

jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import {
  runLockScreenAlarmTest,
  cancelLockScreenAlarmTest,
  getTestAlarmRunState,
  subscribeTestAlarmRunState,
  __resetTestAlarmStateForTests,
  TEST_ALARM_NOTIFICATION_ID,
  TEST_ALARM_DURATIONS,
} from '../../utils/notifications/testAlarm';

// Bildirim id'si tire ile bölünerek çözümlenemediği için kimlikler AÇIKÇA
// geçirilmeli (bkz. parseAlarmNotificationId).
const TEST_TARGET = { medicineId: 'test-medicine', reminderTimeId: 'test-reminder' };

const ALL_GRANTED = {
  oem: 'xiaomi',
  manufacturer: 'xiaomi',
  brand: 'xiaomi',
  model: 'Test',
  sdkVersion: 36,
  notifications: true,
  exactAlarm: true,
  batteryOptimizationIgnored: true,
  fullScreenIntent: true,
  hasCustomOEMShield: true,
};

describe('testAlarm — tek kaynak kilit ekranı testi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    __resetTestAlarmStateForTests();
    mockDetectOEMShieldStatus.mockResolvedValue({ ...ALL_GRANTED });
    mockScheduleTestAlarmNotification.mockResolvedValue(TEST_ALARM_NOTIFICATION_ID);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('ayarları store’dan okur, partial ayar üretmez', async () => {
    const result = await runLockScreenAlarmTest({ seconds: 5 });

    expect(result.ok).toBe(true);
    expect(mockScheduleTestAlarmNotification).toHaveBeenCalledTimes(1);
    const [minutes, language, settings] = mockScheduleTestAlarmNotification.mock.calls[0];
    expect(minutes).toBeCloseTo(5 / 60);
    expect(language).toBe('tr');
    // Kullanıcının gerçek ayarları — hardcoded `fullScreenAlarmEnabled: true` değil
    expect(settings).toBe(mockStoreSettings);
    expect(settings.quietHoursEnabled).toBe(true);
    expect(settings.alarmVolume).toBe(55);
  });

  it('bildirim izni yoksa somut sebep döner ve alarm KURMAZ', async () => {
    mockDetectOEMShieldStatus.mockResolvedValue({ ...ALL_GRANTED, notifications: false });

    const onResult = jest.fn();
    const result = await runLockScreenAlarmTest({ seconds: 5, onResult });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('notifications-denied');
    expect(mockScheduleTestAlarmNotification).not.toHaveBeenCalled();
    expect(onResult).toHaveBeenCalledWith(result);
    expect(result.steps.find(s => s.id === 'notifications')?.status).toBe('fail');
  });

  it('kesin alarm izni yoksa somut sebep döner ve alarm KURMAZ', async () => {
    mockDetectOEMShieldStatus.mockResolvedValue({ ...ALL_GRANTED, exactAlarm: false });

    const result = await runLockScreenAlarmTest({ seconds: 5 });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('exact-alarm-denied');
    expect(mockScheduleTestAlarmNotification).not.toHaveBeenCalled();
  });

  it('FSI izni yoksa testi KURAR ama uyarı adımı bırakır', async () => {
    mockDetectOEMShieldStatus.mockResolvedValue({ ...ALL_GRANTED, fullScreenIntent: false });

    const result = await runLockScreenAlarmTest({ seconds: 5 });

    expect(result.ok).toBe(true);
    expect(mockScheduleTestAlarmNotification).toHaveBeenCalledTimes(1);
    expect(result.steps.find(s => s.id === 'full-screen-intent')?.status).toBe('warn');
  });

  it('armed durumunu yönetir ve süre sonunda kendi kendine sıfırlar', async () => {
    const seen: boolean[] = [];
    const unsubscribe = subscribeTestAlarmRunState(state => seen.push(state.isArmed));

    await runLockScreenAlarmTest({ seconds: 5 });
    expect(getTestAlarmRunState().isArmed).toBe(true);
    expect(getTestAlarmRunState().seconds).toBe(5);

    jest.advanceTimersByTime(5 * 1000 + 3000 + 10);
    expect(getTestAlarmRunState().isArmed).toBe(false);

    expect(seen).toContain(true);
    unsubscribe();
  });

  it('yeni çağrı öncekini iptal eder (aynı anda tek test)', async () => {
    await runLockScreenAlarmTest({ seconds: 5 });
    mockCancelNotification.mockClear();

    await runLockScreenAlarmTest({ seconds: 10 });

    expect(mockCancelNotification).toHaveBeenCalledWith(TEST_ALARM_NOTIFICATION_ID, TEST_TARGET);
    expect(getTestAlarmRunState().seconds).toBe(10);
  });

  it('iptal edildiğinde armed durumu ve bildirim temizlenir', async () => {
    await runLockScreenAlarmTest({ seconds: 5 });
    expect(getTestAlarmRunState().isArmed).toBe(true);

    await cancelLockScreenAlarmTest();

    expect(getTestAlarmRunState().isArmed).toBe(false);
    expect(mockCancelNotification).toHaveBeenCalledWith(TEST_ALARM_NOTIFICATION_ID, TEST_TARGET);
  });

  it('yalnızca test kimliklerine dokunur (gerçek alarm kuyruğuna değil)', async () => {
    await runLockScreenAlarmTest({ seconds: 5 });

    for (const call of mockCancelNotification.mock.calls) {
      expect(call[0]).toBe(TEST_ALARM_NOTIFICATION_ID);
      // Native iptal DOĞRU kimliklerle çağrılmalı — eskiden 'test' /
      // 'medicine-test-reminder' olarak bozuluyordu.
      expect(call[1]).toEqual(TEST_TARGET);
    }
    expect(TEST_ALARM_NOTIFICATION_ID).toBe('alarm-test-medicine-test-reminder');
  });

  it('süre seçenekleri 5/10/30 saniyedir', () => {
    expect([...TEST_ALARM_DURATIONS]).toEqual([5, 10, 30]);
  });
});
