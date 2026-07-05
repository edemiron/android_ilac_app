/**
 * security/pinCrypto testleri.
 *
 * Pure crypto helper'lar (constantTimeEqual, isValidPin) Async olmadan
 * direkt test edilir; generateSalt + hashPinWithSalt mock'lu Crypto
 * ile test edilir.
 */

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  CryptoEncoding: { HEX: 'hex' },
  getRandomBytesAsync: jest.fn(),
  digestStringAsync: jest.fn(),
}));

import * as Crypto from 'expo-crypto';
import {
  constantTimeEqual,
  isValidPin,
  generateSalt,
  hashPinWithSalt,
  generatePinHash,
} from '../../utils/security/pinCrypto';

describe('isValidPin', () => {
  it('accepts 4-6 digit numeric pin', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('12345')).toBe(true);
    expect(isValidPin('123456')).toBe(true);
  });

  it('rejects too short pins', () => {
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('')).toBe(false);
  });

  it('rejects too long pins', () => {
    expect(isValidPin('1234567')).toBe(false);
  });

  it('rejects non-numeric pins', () => {
    expect(isValidPin('abcd')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
    expect(isValidPin('12-4')).toBe(false);
  });

  it('rejects non-string values', () => {
    // @ts-expect-error test fixture
    expect(isValidPin(1234)).toBe(false);
    // @ts-expect-error test fixture
    expect(isValidPin(null)).toBe(false);
    // @ts-expect-error test fixture
    expect(isValidPin(undefined)).toBe(false);
  });
});

describe('constantTimeEqual', () => {
  it('returns true for identical strings', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('', '')).toBe(true);
    expect(constantTimeEqual('a'.repeat(64), 'a'.repeat(64))).toBe(true);
  });

  it('returns false for different strings of same length', () => {
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('a'.repeat(63) + 'b', 'a'.repeat(63) + 'c')).toBe(false);
  });

  it('returns false for different length strings', () => {
    expect(constantTimeEqual('abc', 'abcd')).toBe(false);
    expect(constantTimeEqual('a', 'aa')).toBe(false);
  });
});

describe('generateSalt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates 64-char hex string (32 bytes hex)', async () => {
    (Crypto.getRandomBytesAsync as jest.Mock).mockResolvedValueOnce(new Uint8Array(32).fill(0xff));
    const salt = await generateSalt();
    expect(salt).toHaveLength(64);
    expect(salt).toBe('ff'.repeat(32));
  });

  it('pads single hex chars with leading zero', async () => {
    (Crypto.getRandomBytesAsync as jest.Mock).mockResolvedValueOnce(
      new Uint8Array([0x0a, 0xff, 0x01])
    );
    const salt = await generateSalt();
    expect(salt).toBe('0aff01');
  });
});

describe('hashPinWithSalt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('produces deterministic hash for same input (mock SHA-256)', async () => {
    (Crypto.digestStringAsync as jest.Mock).mockImplementation(
      async (_algo, input) => `mock-hash:${input}`
    );
    const hash1 = await hashPinWithSalt('1234', 'salt-a');
    const hash2 = await hashPinWithSalt('1234', 'salt-a');
    expect(hash1).toBe(hash2);
  });

  it('produces different hash for different salt', async () => {
    (Crypto.digestStringAsync as jest.Mock).mockImplementation(
      async (_algo, input) => `mock-hash:${input}`
    );
    const hash1 = await hashPinWithSalt('1234', 'salt-a');
    const hash2 = await hashPinWithSalt('1234', 'salt-b');
    expect(hash1).not.toBe(hash2);
  });

  it('throws if Crypto fails', async () => {
    (Crypto.digestStringAsync as jest.Mock).mockRejectedValueOnce(new Error('crypto fail'));
    await expect(hashPinWithSalt('1234', 'salt')).rejects.toThrow(/PIN hash failed/);
  });
});

describe('generatePinHash', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns hash + salt pair', async () => {
    (Crypto.getRandomBytesAsync as jest.Mock).mockResolvedValueOnce(new Uint8Array(32).fill(0xab));
    (Crypto.digestStringAsync as jest.Mock).mockImplementation(
      async (_algo, input) => `mock-hash:${input}`
    );
    const result = await generatePinHash('1234');
    expect(result.salt).toHaveLength(64);
    expect(result.hash).toContain('mock-hash:');
  });
});
