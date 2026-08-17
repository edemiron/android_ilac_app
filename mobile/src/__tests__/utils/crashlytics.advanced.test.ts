/**
 * crashlytics advanced tests — Sprint 8
 * crashlyticsService class methods (init, recordError, log, crash)
 */

jest.mock('@react-native-firebase/crashlytics', () => {
  const mockInstance = {
    setUserId: jest.fn(() => Promise.resolve()),
    setAttribute: jest.fn(() => Promise.resolve()),
    setAttributes: jest.fn(() => Promise.resolve()),
    recordError: jest.fn(),
    log: jest.fn(),
    crash: jest.fn(),
  };
  return {
    __esModule: true,
    default: () => mockInstance,
  };
});

jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(() => Promise.resolve('mock-hash')),
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  CryptoEncoding: { HEX: 'hex' },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'android', Version: 33 },
}));

import crashlytics from '@react-native-firebase/crashlytics';
import { crashlyticsService, hashUserIdForCrashlytics } from '../../utils/crashlytics';

const crashlyticsMock = crashlytics() as unknown as {
  setUserId: jest.Mock;
  setAttributes: jest.Mock;
  recordError: jest.Mock;
  log: jest.Mock;
  crash: jest.Mock;
};

describe('crashlyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('init', () => {
    it('skips initialization in development (__DEV__ is true)', async () => {
      // @ts-expect-error test fixture
      global.__DEV__ = true;
      await crashlyticsService.init();
      expect(crashlyticsMock.setUserId).not.toHaveBeenCalled();
    });
  });

  describe('hashUserIdForCrashlytics', () => {
    it('returns 16-char max hash', async () => {
      const hash = await hashUserIdForCrashlytics('user@test.com');
      expect(hash.length).toBeLessThanOrEqual(16);
    });

    // Bu test "mock zinciri karmasik" gerekcesiyle kapaliydi, ama expo-crypto
    // zaten jest.fn() ile mock'lu — tek gereken cagriyi reddettirmek.
    // Fallback onemli: hash uretilemezse Crashlytics'e DUZ userId gitmemeli
    // (KVKK). Bu yuzden fallback'in cikti bicimi de dogrulaniyor.
    it('returns fallback on crypto error', async () => {
      const crypto = jest.requireMock('expo-crypto') as {
        digestStringAsync: jest.Mock;
      };
      crypto.digestStringAsync.mockRejectedValueOnce(new Error('digest failed'));

      const hash = await hashUserIdForCrashlytics('user-test-12345');

      expect(hash).toBe('fallback-user-tes');
      // Duz userId sizmamali: yalnizca ilk 8 karakter kullanilir.
      expect(hash).not.toContain('12345');
    });

    it('handles short user IDs', async () => {
      const hash = await hashUserIdForCrashlytics('a');
      expect(hash.length).toBeLessThanOrEqual(16);
    });
  });
});
