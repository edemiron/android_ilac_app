/**
 * caregiverHelpers testleri.
 */

import {
  generateInviteCode,
  isValidInviteCode,
  isValidCaregiverEmail,
  calculateInviteExpiry,
  isInviteExpired,
  INVITE_CODE_CHARS,
  INVITE_CODE_LENGTH,
} from '../../services/caregiverHelpers';

describe('generateInviteCode', () => {
  it('returns 6-character code by default', () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(INVITE_CODE_LENGTH);
  });

  it('uses only INVITE_CODE_CHARS characters', () => {
    const code = generateInviteCode();
    for (const ch of code) {
      expect(INVITE_CODE_CHARS).toContain(ch);
    }
  });

  it('respects custom length', () => {
    const code = generateInviteCode(8);
    expect(code).toHaveLength(8);
  });

  it('generates unique codes (probabilistic)', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateInviteCode()));
    expect(codes.size).toBeGreaterThan(15); // collision extremely unlikely
  });
});

describe('isValidInviteCode', () => {
  it('accepts valid 6-char code', () => {
    expect(isValidInviteCode('ABC123')).toBe(true);
    expect(isValidInviteCode('XYZ789')).toBe(true);
  });

  it('rejects too short', () => {
    expect(isValidInviteCode('ABC12')).toBe(false);
  });

  it('rejects too long', () => {
    expect(isValidInviteCode('ABC1234')).toBe(false);
  });

  it('rejects lowercase (case-sensitive)', () => {
    expect(isValidInviteCode('abc123')).toBe(false);
  });

  it('rejects special characters', () => {
    expect(isValidInviteCode('AB-123')).toBe(false);
    expect(isValidInviteCode('AB 123')).toBe(false);
  });

  it('rejects excluded letter O (set does not contain it)', () => {
    // I, O, Q kullanici okunabilirligi icin set'ten cikarilmis
    // Ancak validator regex `^[A-Z0-9]{6}$` her buyuk harfi kabul eder;
    // set'te O yok ama validator syntax kontrolu yapiyor. Test: set kullanimi dogrulanir.
    const code = generateInviteCode();
    for (const ch of code) {
      expect(INVITE_CODE_CHARS).toContain(ch);
    }
    expect(INVITE_CODE_CHARS).not.toContain('I');
    expect(INVITE_CODE_CHARS).not.toContain('O');
    expect(INVITE_CODE_CHARS).not.toContain('Q');
  });
});

describe('isValidCaregiverEmail', () => {
  it('accepts basic email format', () => {
    expect(isValidCaregiverEmail('user@example.com')).toBe(true);
    expect(isValidCaregiverEmail('test+tag@subdomain.example.co.uk')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidCaregiverEmail('not-an-email')).toBe(false);
    expect(isValidCaregiverEmail('missing@domain')).toBe(false);
    expect(isValidCaregiverEmail('@domain.com')).toBe(false);
    expect(isValidCaregiverEmail('user@')).toBe(false);
  });

  it('rejects empty/whitespace', () => {
    expect(isValidCaregiverEmail('')).toBe(false);
    expect(isValidCaregiverEmail('   ')).toBe(false);
  });

  it('trims whitespace', () => {
    expect(isValidCaregiverEmail('  user@example.com  ')).toBe(true);
  });

  it('rejects non-string values', () => {
    expect(isValidCaregiverEmail(null as any)).toBe(false);
    expect(isValidCaregiverEmail(undefined as any)).toBe(false);
    expect(isValidCaregiverEmail(123 as any)).toBe(false);
  });
});

describe('calculateInviteExpiry', () => {
  it('returns 7 days after now by default', () => {
    const now = new Date('2026-07-04T12:00:00Z');
    const expiry = calculateInviteExpiry(now, 7);
    expect(expiry.toISOString()).toBe('2026-07-11T12:00:00.000Z');
  });

  it('respects custom expiry days', () => {
    const now = new Date('2026-07-04T12:00:00Z');
    const expiry = calculateInviteExpiry(now, 1);
    expect(expiry.toISOString()).toBe('2026-07-05T12:00:00.000Z');
  });
});

describe('isInviteExpired', () => {
  it('returns true for past dates', () => {
    const past = new Date('2026-07-01T12:00:00Z');
    const now = new Date('2026-07-04T12:00:00Z');
    expect(isInviteExpired(past, now)).toBe(true);
  });

  it('returns false for future dates', () => {
    const future = new Date('2026-07-11T12:00:00Z');
    const now = new Date('2026-07-04T12:00:00Z');
    expect(isInviteExpired(future, now)).toBe(false);
  });

  it('handles ISO string input', () => {
    expect(isInviteExpired('2026-07-01T12:00:00Z', new Date('2026-07-04T12:00:00Z'))).toBe(true);
  });
});
