/**
 * notifications/wake tests — Sprint 3 devamı
 */

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
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
import { wakeAndOpenApp, wakeScreenOnly } from '../../utils/notifications/wake';

describe('notifications/wake', () => {
  beforeEach(() => {
    NativeModules.AlarmModule = undefined;
  });

  describe('wakeAndOpenApp', () => {
    it('returns false when AlarmModule unavailable', async () => {
      const result = await wakeAndOpenApp();
      expect(result).toBe(false);
    });

    it('returns true on successful AlarmModule call', async () => {
      const wakeAndOpenAppMock = jest.fn().mockResolvedValue(undefined);
      NativeModules.AlarmModule = { wakeAndOpenApp: wakeAndOpenAppMock };
      const result = await wakeAndOpenApp();
      expect(result).toBe(true);
      expect(wakeAndOpenAppMock).toHaveBeenCalled();
    });

    it('returns false when AlarmModule throws', async () => {
      NativeModules.AlarmModule = {
        wakeAndOpenApp: jest.fn().mockRejectedValue(new Error('Native failed')),
      };
      const result = await wakeAndOpenApp();
      expect(result).toBe(false);
    });
  });

  describe('wakeScreenOnly', () => {
    it('returns false when AlarmModule unavailable', async () => {
      const result = await wakeScreenOnly();
      expect(result).toBe(false);
    });

    it('returns true on successful AlarmModule call', async () => {
      const wakeScreenOnlyMock = jest.fn().mockResolvedValue(undefined);
      NativeModules.AlarmModule = { wakeScreenOnly: wakeScreenOnlyMock };
      const result = await wakeScreenOnly();
      expect(result).toBe(true);
      expect(wakeScreenOnlyMock).toHaveBeenCalled();
    });
  });
});
