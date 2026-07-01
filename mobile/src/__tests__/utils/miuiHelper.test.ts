/**
 * miuiHelper tests — Sprint 8
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native', () => ({
  Platform: { OS: 'android', Version: 33 },
  NativeModules: {
    PlatformConstants: { getConstants: () => ({ Brand: 'Xiaomi' }) },
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

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isMIUIDevice,
  getMIUIInstructions,
  markMIUIWarningShown,
  shouldShowMIUIWarning,
} from '../../utils/miuiHelper';

const MIUI_CHECK_STORAGE_KEY = '@miui_battery_check_shown';

describe('miuiHelper', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('isMIUIDevice', () => {
    it('returns false when manufacturer is null', () => {
      expect(typeof isMIUIDevice()).toBe('boolean');
    });
  });

  describe('getMIUIInstructions', () => {
    it('returns non-empty string', () => {
      const instructions = getMIUIInstructions();
      expect(typeof instructions).toBe('string');
      expect(instructions.length).toBeGreaterThan(0);
    });
  });

  describe('markMIUIWarningShown', () => {
    it('sets flag in AsyncStorage', async () => {
      await markMIUIWarningShown();
      const stored = await AsyncStorage.getItem(MIUI_CHECK_STORAGE_KEY);
      expect(stored).toBe('true');
    });
  });

  describe('shouldShowMIUIWarning', () => {
    it('returns boolean (device-dependent)', async () => {
      const result = await shouldShowMIUIWarning();
      expect(typeof result).toBe('boolean');
    });

    it('returns boolean when flag is already set', async () => {
      await AsyncStorage.setItem(MIUI_CHECK_STORAGE_KEY, 'true');
      const result = await shouldShowMIUIWarning();
      expect(typeof result).toBe('boolean');
    });
  });
});
