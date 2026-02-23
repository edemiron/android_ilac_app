/**
 * Security Service Tests
 * Tests for PIN hashing, verification, and brute-force protection
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import {
  verifyPin,
  savePin,
  clearPin,
  isValidPin,
  isPinSet,
  getRemainingLockoutTime,
} from '../../utils/security';

describe('Security Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('verifyPin', () => {
    const testHash = 'valid-hash-1234';
    const testSalt = 'test-salt';

    beforeEach(() => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === '@security_pin_hash') return Promise.resolve(testHash);
        if (key === '@security_pin_salt') return Promise.resolve(testSalt);
        if (key === '@security_failed_attempts') return Promise.resolve(null);
        if (key === '@security_lockout_until') return Promise.resolve(null);
        return Promise.resolve(null);
      });
    });

    it('should return success for correct PIN', async () => {
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(testHash);

      const result = await verifyPin('1234');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return failure for incorrect PIN', async () => {
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue('wrong-hash');

      const result = await verifyPin('9999');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.remainingAttempts).toBeDefined();
    });

    it('should return failure when no PIN is set', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await verifyPin('1234');

      expect(result.success).toBe(false);
      expect(result.error).toContain('PIN ayarlı değil');
    });

    it('should track failed attempts', async () => {
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue('wrong-hash');

      const result1 = await verifyPin('9999');
      expect(result1.remainingAttempts).toBe(4); // 5 - 1 = 4

      // Verify attempts were incremented
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@security_failed_attempts',
        '1'
      );
    });

    it('should lock out after max failed attempts', async () => {
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue('wrong-hash');
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === '@security_failed_attempts') return Promise.resolve('4'); // Already 4 failed attempts
        if (key === '@security_pin_hash') return Promise.resolve(testHash);
        if (key === '@security_pin_salt') return Promise.resolve(testSalt);
        if (key === '@security_lockout_until') return Promise.resolve(null);
        return Promise.resolve(null);
      });

      const result = await verifyPin('9999');

      expect(result.success).toBe(false);
      expect(result.error).toContain('5 dakika');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@security_lockout_until',
        expect.any(String)
      );
    });

    it('should return lockout message when locked out', async () => {
      const lockoutTime = Date.now() + 120000; // 2 minutes from now
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === '@security_lockout_until') return Promise.resolve(lockoutTime.toString());
        if (key === '@security_pin_hash') return Promise.resolve(testHash);
        if (key === '@security_pin_salt') return Promise.resolve(testSalt);
        return Promise.resolve(null);
      });

      const result = await verifyPin('1234');

      expect(result.success).toBe(false);
      expect(result.error).toContain('2 dakika');
    });

    it('should reset failed attempts on successful verification', async () => {
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue(testHash);

      await verifyPin('1234');

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@security_failed_attempts');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@security_lockout_until');
    });
  });

  describe('getRemainingLockoutTime', () => {
    it('should return remaining minutes when locked out', async () => {
      const lockoutTime = Date.now() + 180000; // 3 minutes from now
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(lockoutTime.toString());

      const remaining = await getRemainingLockoutTime();

      expect(remaining).toBe(3);
    });

    it('should return 0 when not locked out', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const remaining = await getRemainingLockoutTime();

      expect(remaining).toBe(0);
    });

    it('should return 0 when lockout has expired', async () => {
      const pastTime = Date.now() - 60000; // 1 minute ago
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(pastTime.toString());

      const remaining = await getRemainingLockoutTime();

      expect(remaining).toBe(0);
    });
  });

  describe('savePin', () => {
    it('should save hash and salt for valid PIN', async () => {
      (Crypto.getRandomBytesAsync as jest.Mock).mockResolvedValue(
        new Uint8Array([1, 2, 3, 4])
      );
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue('test-hash');

      const result = await savePin('5829'); // Strong PIN

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@security_pin_hash',
        'test-hash'
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@security_pin_salt',
        expect.any(String)
      );
    });

    it('should reject weak PINs', async () => {
      const weakPins = ['1234', '1111', '0000', '1212'];

      for (const pin of weakPins) {
        const result = await savePin(pin);
        expect(result).toBe(false);
      }
    });

    it('should reject invalid format', async () => {
      const result = await savePin('abc');
      expect(result).toBe(false);
    });

    it('should accept strong PINs', async () => {
      (Crypto.getRandomBytesAsync as jest.Mock).mockResolvedValue(
        new Uint8Array([1, 2, 3, 4])
      );
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue('test-hash');

      const strongPins = ['5829', '736419', '2847'];

      for (const pin of strongPins) {
        const result = await savePin(pin);
        expect(result).toBe(true);
      }
    });
  });

  describe('clearPin', () => {
    it('should remove hash, salt, and failed attempts', async () => {
      const result = await clearPin();

      expect(result).toBe(true);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@security_pin_hash');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@security_pin_salt');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@security_failed_attempts');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@security_lockout_until');
    });
  });

  describe('isValidPin', () => {
    it('should accept 4-6 digit PINs', () => {
      expect(isValidPin('1234')).toBe(true);
      expect(isValidPin('12345')).toBe(true);
      expect(isValidPin('123456')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidPin('123')).toBe(false);
      expect(isValidPin('1234567')).toBe(false);
      expect(isValidPin('abcd')).toBe(false);
      expect(isValidPin('12a4')).toBe(false);
      expect(isValidPin('')).toBe(false);
    });
  });

  describe('isPinSet', () => {
    it('should return true when PIN hash exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('some-hash');

      const result = await isPinSet();

      expect(result).toBe(true);
    });

    it('should return false when PIN hash does not exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await isPinSet();

      expect(result).toBe(false);
    });
  });
});
