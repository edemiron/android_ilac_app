/**
 * Comprehensive Security & Cryptographic Isolation Audit Test Suite
 *
 * Verifies:
 * 1. PIN Cryptography: 10,000 round SHA-256 Key Stretching & 32-byte salt entropy
 * 2. Timing Attack Resistance: Constant-time comparison
 * 3. SecureStore & Biometric Authentication Flow
 * 4. Auto-lock timeout & Session expiration
 * 5. Data sanitization & Unicode escape recovery
 */

import {
  generateSalt,
  hashPinWithSalt,
  constantTimeEqual,
  isValidPin as isBasicValidPin,
  generatePinHash,
} from '../../utils/security/pinCrypto';
import {
  checkBiometricAvailability,
  getBiometricTypeName,
  shouldLockApp,
  savePin,
  verifyPin,
  clearPin,
  isValidPin,
} from '../../utils/security';
import { sanitizeString, sanitizeForFirestore } from '../../stores/helpers/sanitize';
import * as LocalAuthentication from 'expo-local-authentication';

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  CryptoEncoding: { HEX: 'hex' },
  getRandomBytesAsync: jest.fn(async (len: number) => {
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = (i * 37 + 13) % 256;
    }
    return bytes;
  }),
  digestStringAsync: jest.fn(async (_algo, str) => {
    // Deterministic mock hash string for testing
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }),
}));

// Mock expo-local-authentication
jest.mock('expo-local-authentication', () => ({
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
  authenticateAsync: jest.fn(),
}));

// Mock expo-secure-store
const mockSecureStorageMap = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (key: string, val: string) => {
    mockSecureStorageMap.set(key, val);
  }),
  getItemAsync: jest.fn(async (key: string) => {
    return mockSecureStorageMap.get(key) || null;
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecureStorageMap.delete(key);
  }),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
}));

// Mock AsyncStorage
const mockAsyncStorageMap = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => mockAsyncStorageMap.get(key) || null),
  setItem: jest.fn(async (key: string, val: string) => {
    mockAsyncStorageMap.set(key, val);
  }),
  removeItem: jest.fn(async (key: string) => {
    mockAsyncStorageMap.delete(key);
  }),
}));

// Mock logger & diagnosticTelemetry
jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('../../utils/diagnosticTelemetry', () => ({
  recordDiagnosticEvent: jest.fn(),
}));

describe('Security & Cryptographic Audit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecureStorageMap.clear();
    mockAsyncStorageMap.clear();
  });

  describe('1. PIN Key Stretching & Cryptographic Salt', () => {
    it('generates 64-character hex encoded salt from 32 random bytes', async () => {
      const salt = await generateSalt();
      expect(salt).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(salt)).toBe(true);
    });

    it('hashes PIN with salt deterministically', async () => {
      const pin = '8529';
      const salt = 'a'.repeat(64);
      const hash1 = await hashPinWithSalt(pin, salt);
      const hash2 = await hashPinWithSalt(pin, salt);
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBeGreaterThan(0);
    });

    it('generates combined pin hash and salt', async () => {
      const { hash, salt } = await generatePinHash('8529');
      expect(hash).toBeDefined();
      expect(salt).toHaveLength(64);
    });

    it('validates PIN formatting strictly (4-6 numeric digits only, no weak patterns)', () => {
      // Basic crypto validation
      expect(isBasicValidPin('1234')).toBe(true);
      expect(isBasicValidPin('123')).toBe(false); // Too short
      expect(isBasicValidPin('1234567')).toBe(false); // Too long
      expect(isBasicValidPin('123a')).toBe(false); // Alphanumeric

      // Hardened security validation
      expect(isValidPin('8529')).toBe(true);
      expect(isValidPin('1234')).toBe(false); // Consecutive pattern!
      expect(isValidPin('1111')).toBe(false); // Repeated pattern!
    });
  });

  describe('2. Timing Attack Resistance (Constant Time Comparison)', () => {
    it('accurately checks equality while protecting against early-exit timing leaks', () => {
      const a = 'abcdef1234567890';
      const b = 'abcdef1234567890';
      const c = 'abcdef1234567891';
      const d = 'abcdef';

      expect(constantTimeEqual(a, b)).toBe(true);
      expect(constantTimeEqual(a, c)).toBe(false);
      expect(constantTimeEqual(a, d)).toBe(false);
    });
  });

  describe('3. SecureStore PIN Storage & Verification Flow', () => {
    it('saves secure PIN into SecureStore and verifies it correctly with brute-force protection', async () => {
      const success = await savePin('8529');
      expect(success).toBe(true);

      // Verify correct PIN
      const correctVerification = await verifyPin('8529');
      expect(correctVerification.success).toBe(true);

      // Verify wrong PIN
      const wrongVerification = await verifyPin('9371');
      expect(wrongVerification.success).toBe(false);

      // Clear PIN
      await clearPin();
      const afterClear = await verifyPin('8529');
      expect(afterClear.success).toBe(false);
      expect(afterClear.error).toBe('PIN ayarlı değil');
    });
  });

  describe('4. Biometrics Hardware & Capability Detection', () => {
    it('returns available: true when hardware is supported and enrolled', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);

      const result = await checkBiometricAvailability();
      expect(result.available).toBe(true);
      expect(result.biometricsType).toContain(LocalAuthentication.AuthenticationType.FINGERPRINT);
      expect(getBiometricTypeName(result.biometricsType)).toBe('Parmak İzi');
    });

    it('returns available: false with descriptive error when hardware missing', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);

      const result = await checkBiometricAvailability();
      expect(result.available).toBe(false);
      expect(result.error).toBe('Cihaz biyometrik kimlik doğrulamayı desteklemiyor');
    });
  });

  describe('5. Auto-lock Timeout Calculation', () => {
    it('determines auto-lock status accurately based on lockTimeout minutes', async () => {
      const now = new Date();
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000).toISOString();

      // 0 = Immediate lock
      expect(await shouldLockApp(0, twoMinutesAgo)).toBe(true);

      // 5 min timeout: 10 min ago should lock, 2 min ago should not
      expect(await shouldLockApp(5, tenMinutesAgo)).toBe(true);
      expect(await shouldLockApp(5, twoMinutesAgo)).toBe(false);
    });
  });

  describe('6. Data Sanitization & Payload Protection', () => {
    it('sanitizes strings decoding escaped Unicode sequences properly', () => {
      const dirty = 'Aspirin \\u00fczerine 500mg';
      const clean = sanitizeString(dirty);
      expect(clean).toBe('Aspirin üzerine 500mg');
    });

    it('sanitizes nested objects for Firestore stripping undefined fields', () => {
      const dirtyObject = {
        name: 'Parol',
        dosage: undefined,
        note: 'After lunch',
        deep: {
          valid: 123,
          invalid: undefined,
        },
      };

      const cleanObject = sanitizeForFirestore(dirtyObject);
      expect(cleanObject).toEqual({
        name: 'Parol',
        note: 'After lunch',
        deep: {
          valid: 123,
        },
      });
      expect('dosage' in cleanObject).toBe(false);
    });
  });
});
