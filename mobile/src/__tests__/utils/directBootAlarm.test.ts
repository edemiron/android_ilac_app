/**
 * DirectBoot & Volume Shield Bridge Tests (v1.9.3)
 */

jest.mock('react-native', () => ({
  NativeModules: {},
}));

jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { NativeModules } from 'react-native';
import {
  getDirectBootAlarmCount,
  getAlarmStreamVolume,
  ensureSafeAlarmVolume,
  restoreAlarmVolume,
} from '../../utils/notifications/nativeAlarm';

describe('DirectBoot and Volume Shield Bridge', () => {
  beforeEach(() => {
    NativeModules.AlarmModule = undefined;
    jest.clearAllMocks();
  });

  describe('getDirectBootAlarmCount', () => {
    it('returns 0 when AlarmModule is unavailable', async () => {
      const count = await getDirectBootAlarmCount();
      expect(count).toBe(0);
    });

    it('returns stored alarm count from native module', async () => {
      NativeModules.AlarmModule = {
        getDirectBootAlarmCount: jest.fn().mockResolvedValue(5),
      };
      const count = await getDirectBootAlarmCount();
      expect(count).toBe(5);
    });

    it('handles native exception gracefully and returns 0', async () => {
      NativeModules.AlarmModule = {
        getDirectBootAlarmCount: jest.fn().mockRejectedValue(new Error('DE storage error')),
      };
      const count = await getDirectBootAlarmCount();
      expect(count).toBe(0);
    });
  });

  describe('getAlarmStreamVolume', () => {
    it('returns null when AlarmModule is unavailable', async () => {
      const vol = await getAlarmStreamVolume();
      expect(vol).toBeNull();
    });

    it('returns volume info when native module succeeds', async () => {
      const mockInfo = {
        currentVolume: 7,
        maxVolume: 10,
        volumePercent: 70,
        isMuted: false,
      };
      NativeModules.AlarmModule = {
        getAlarmStreamVolume: jest.fn().mockResolvedValue(mockInfo),
      };
      const vol = await getAlarmStreamVolume();
      expect(vol).toEqual(mockInfo);
    });

    it('returns null on native error', async () => {
      NativeModules.AlarmModule = {
        getAlarmStreamVolume: jest.fn().mockRejectedValue(new Error('Audio service failure')),
      };
      const vol = await getAlarmStreamVolume();
      expect(vol).toBeNull();
    });
  });

  describe('ensureSafeAlarmVolume', () => {
    it('returns null when AlarmModule is unavailable', async () => {
      const result = await ensureSafeAlarmVolume(0.7);
      expect(result).toBeNull();
    });

    it('adjusts volume when current volume is too low', async () => {
      const mockResult = {
        previousVolume: 0,
        currentVolume: 7,
        maxVolume: 10,
        wasAdjusted: true,
      };
      const mockEnsure = jest.fn().mockResolvedValue(mockResult);
      NativeModules.AlarmModule = {
        ensureSafeAlarmVolume: mockEnsure,
      };

      const result = await ensureSafeAlarmVolume(0.7);
      expect(result).toEqual(mockResult);
      expect(mockEnsure).toHaveBeenCalledWith(0.7);
    });

    it('does not adjust when volume is already safe', async () => {
      const mockResult = {
        previousVolume: 8,
        currentVolume: 8,
        maxVolume: 10,
        wasAdjusted: false,
      };
      NativeModules.AlarmModule = {
        ensureSafeAlarmVolume: jest.fn().mockResolvedValue(mockResult),
      };

      const result = await ensureSafeAlarmVolume(0.7);
      expect(result).toEqual(mockResult);
      expect(result?.wasAdjusted).toBe(false);
    });
  });

  describe('restoreAlarmVolume', () => {
    it('returns false when AlarmModule is unavailable', async () => {
      const result = await restoreAlarmVolume();
      expect(result).toBe(false);
    });

    it('returns true when native module successfully restores volume', async () => {
      NativeModules.AlarmModule = {
        restoreAlarmVolume: jest.fn().mockResolvedValue(true),
      };
      const result = await restoreAlarmVolume();
      expect(result).toBe(true);
    });

    it('handles native exception gracefully and returns false', async () => {
      NativeModules.AlarmModule = {
        restoreAlarmVolume: jest.fn().mockRejectedValue(new Error('Audio service failure')),
      };
      const result = await restoreAlarmVolume();
      expect(result).toBe(false);
    });
  });
});

