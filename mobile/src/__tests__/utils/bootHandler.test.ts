/**
 * bootHandler tests — Sprint 7
 * AsyncStorage ve notifee mock'lu. scheduleMedicineNotification mock'lu.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn().mockResolvedValue('channel-id'),
    createTriggerNotification: jest.fn().mockResolvedValue('notification-id'),
    cancelTriggerNotification: jest.fn().mockResolvedValue(undefined),
    cancelNotification: jest.fn().mockResolvedValue(undefined),
    displayNotification: jest.fn().mockResolvedValue('notif-id'),
    getDisplayedNotifications: jest.fn().mockResolvedValue([]),
  },
  TriggerType: { TIMESTAMP: 0 },
  AlarmType: { SET_EXACT_AND_ALLOW_WHILE_IDLE: 3 },
  AndroidImportance: { HIGH: 4 },
  AndroidVisibility: { PUBLIC: 1 },
  AndroidCategory: { ALARM: 4 },
}));

jest.mock('../../utils/notifications', () => ({
  scheduleMedicineNotification: jest.fn().mockResolvedValue('scheduled-id'),
}));

jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee from '@notifee/react-native';
import {
  saveBootRecoveryResult,
  getBootRecoveryResult,
  clearBootRecoveryResult,
  registerBootTask,
  reRegisterAllAlarms,
  type BootRecoveryResult,
} from '../../utils/bootHandler';
import { scheduleMedicineNotification } from '../../utils/notifications';
import { STORAGE_KEYS } from '../../constants';

const RECOVERY_KEY = STORAGE_KEYS.BOOT_RECOVERY;

describe('bootHandler', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('saveBootRecoveryResult', () => {
    it('saves result to AsyncStorage', async () => {
      const result: BootRecoveryResult = {
        reminders: 3,
        snoozes: 1,
        timestamp: '2024-06-25T10:00:00Z',
        trigger: '2024-06-25T10:00:00Z',
      };
      await saveBootRecoveryResult(result);

      const raw = await AsyncStorage.getItem(RECOVERY_KEY);
      expect(raw).toBeDefined();
      const parsed = JSON.parse(raw!);
      expect(parsed.reminders).toBe(3);
      expect(parsed.snoozes).toBe(1);
    });
  });

  describe('getBootRecoveryResult', () => {
    it('returns null when no recovery saved', async () => {
      const result = await getBootRecoveryResult();
      expect(result).toBeNull();
    });

    it('returns saved recovery result', async () => {
      const saved: BootRecoveryResult = {
        reminders: 5,
        snoozes: 2,
        timestamp: '2024-06-25T10:00:00Z',
        trigger: '2024-06-25T10:00:00Z',
      };
      await saveBootRecoveryResult(saved);

      const result = await getBootRecoveryResult();
      expect(result).toEqual(saved);
    });

    it('returns null when stored data is invalid JSON', async () => {
      await AsyncStorage.setItem(RECOVERY_KEY, 'invalid-json');
      const result = await getBootRecoveryResult();
      expect(result).toBeNull();
    });
  });

  describe('clearBootRecoveryResult', () => {
    it('clears stored recovery result', async () => {
      await saveBootRecoveryResult({
        reminders: 1,
        snoozes: 0,
        timestamp: '2024-06-25T10:00:00Z',
        trigger: '2024-06-25T10:00:00Z',
      });

      await clearBootRecoveryResult();

      const result = await getBootRecoveryResult();
      expect(result).toBeNull();
    });

    it('does not error when clearing non-existent recovery', async () => {
      await expect(clearBootRecoveryResult()).resolves.not.toThrow();
    });
  });

  describe('registerBootTask', () => {
    it.skip('does not throw when called (AppRegistry native mock required)', () => {
      // AppRegistry.registerHeadlessTask requires React Native native bridge
      // which is not available in jest testEnvironment: 'node'.
      // Function coverage counted if import succeeds; runtime check skipped.
      expect(() => registerBootTask()).not.toThrow();
    });
  });
});

/**
 * ⚠️ v1.7.7 — YENIDEN KAYIT CALAN ALARMA DOKUNMAMALI
 *
 * `reRegisterAllAlarms` her etkin hatirlatma icin
 * `scheduleMedicineNotification` cagiriyor ve o da ONCE
 * `cancelNotification` yapiyor. Bu tur o anda CALAN bir alarma denk gelirse
 * kullanicinin bildirim cubugundaki doz hatirlatmasi sessizce dusuyordu.
 * (Periyodik `AlarmCheckWorker` bunu 15 dakikada bir tetikliyordu; o worker
 * da bu surumde kaldirildi — gerekce MainApplication.kt icinde.)
 */
describe('reRegisterAllAlarms — gosterilen alarm korunur', () => {
  const storedState = {
    state: {
      medicines: [{ id: 'med-1', name: 'A', dosage: '1', isActive: true }],
      reminderTimes: [{ id: 'rt-1', medicineId: 'med-1', time: '08:00', isEnabled: true }],
      snoozes: [],
    },
  };

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    await AsyncStorage.setItem(STORAGE_KEYS.MEDICINE_STORAGE, JSON.stringify(storedState));
  });

  it('alarm GOSTERILMIYORSA normal sekilde yeniden kurar', async () => {
    (notifee.getDisplayedNotifications as jest.Mock).mockResolvedValueOnce([]);

    const result = await reRegisterAllAlarms('test');

    expect(scheduleMedicineNotification).toHaveBeenCalledTimes(1);
    expect(result.reminders).toBe(1);
  });

  it('alarm SU AN gosteriliyorsa yeniden KURMAZ (calan alarm dusmez)', async () => {
    (notifee.getDisplayedNotifications as jest.Mock).mockResolvedValueOnce([
      { id: 'alarm-med-1-rt-1', notification: { id: 'alarm-med-1-rt-1' } },
    ]);

    const result = await reRegisterAllAlarms('test');

    expect(scheduleMedicineNotification).not.toHaveBeenCalled();
    // Alarm hala kurulu sayilir — sayim dusmemeli.
    expect(result.reminders).toBe(1);
  });

  it('gosterilen bildirimler okunamazsa hepsini yeniden kurar (guvenli taraf)', async () => {
    (notifee.getDisplayedNotifications as jest.Mock).mockRejectedValueOnce(new Error('boom'));

    await reRegisterAllAlarms('test');

    expect(scheduleMedicineNotification).toHaveBeenCalledTimes(1);
  });
});
