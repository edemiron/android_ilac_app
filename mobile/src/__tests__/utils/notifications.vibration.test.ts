/**
 * notifications/vibration tests — Sprint 3 devamı
 */

jest.mock('react-native', () => ({
  Vibration: { cancel: jest.fn() },
  Platform: { OS: 'android' },
}));

jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { Vibration } from 'react-native';
import { stopAlarmVibration, getVibrationPattern } from '../../utils/notifications/vibration';

describe('notifications/vibration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('stopAlarmVibration', () => {
    it('calls Vibration.cancel', () => {
      stopAlarmVibration();
      expect(Vibration.cancel).toHaveBeenCalled();
    });

    it('does not throw when Vibration.cancel throws', () => {
      (Vibration.cancel as jest.Mock).mockImplementation(() => {
        throw new Error('Native bridge unavailable');
      });
      expect(() => stopAlarmVibration()).not.toThrow();
    });
  });

  describe('getVibrationPattern', () => {
    it('returns heartbeat pattern', () => {
      const pattern = getVibrationPattern('heartbeat');
      expect(pattern).toEqual([300, 150, 300, 1000, 300, 150, 300, 1000]);
    });

    it('returns urgent pattern', () => {
      const pattern = getVibrationPattern('urgent');
      expect(pattern[0]).toBe(150);
    });

    it('returns soft pattern', () => {
      const pattern = getVibrationPattern('soft');
      expect(pattern).toEqual([1000, 2000, 1000, 2000]);
    });

    it('returns default pattern for undefined', () => {
      const pattern = getVibrationPattern();
      expect(pattern).toEqual([500, 1000, 500, 1000, 500, 1000]);
    });

    it('returns default pattern for unknown input', () => {
      const pattern = getVibrationPattern('unknown' as never);
      expect(pattern).toEqual([500, 1000, 500, 1000, 500, 1000]);
    });
  });
});
