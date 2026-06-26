import {
  generateInviteCode,
  isValidInviteCode,
  isInviteExpired,
  normalizeInviteCode,
  INVITE_EXPIRY_DAYS,
} from '../../utils/caregiverInvite';

describe('caregiverInvite utils', () => {
  describe('generateInviteCode', () => {
    it('produces 8-character codes (Sprint 14)', () => {
      const code = generateInviteCode();
      expect(code).toHaveLength(8);
    });

    it('produces only valid characters', () => {
      const code = generateCodeMultiple(50);
      code.forEach(c => {
        expect(c).toMatch(/^[0-9A-Z]+$/);
      });
    });

    it('produces unique codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateInviteCode());
      }
      expect(codes.size).toBe(100);
    });

    it('respects custom length parameter', () => {
      const code = generateInviteCode(6);
      expect(code).toHaveLength(6);
    });

    function generateCodeMultiple(n: number): string[] {
      const codes: string[] = [];
      for (let i = 0; i < n; i++) codes.push(generateInviteCode());
      return codes;
    }
  });

  describe('isValidInviteCode', () => {
    it('accepts 8-character valid code', () => {
      expect(isValidInviteCode('ABC12345')).toBe(true);
      expect(isValidInviteCode('12345678')).toBe(true);
    });

    it('accepts 6-character legacy code (backward compat)', () => {
      expect(isValidInviteCode('ABC123')).toBe(true);
    });

    it('rejects empty/invalid', () => {
      expect(isValidInviteCode('')).toBe(false);
      expect(isValidInviteCode('ABC')).toBe(false); // too short
      expect(isValidInviteCode('ABCDEFGHI')).toBe(false); // too long
    });
  });

  describe('isInviteExpired', () => {
    it('returns false for fresh invite (createdAt = now)', () => {
      const invite = { code: 'ABC12345', createdAt: new Date().toISOString() };
      expect(isInviteExpired(invite)).toBe(false);
    });

    it('returns true for invite created > 7 days ago', () => {
      const oldDate = new Date(Date.now() - (INVITE_EXPIRY_DAYS + 1) * 24 * 60 * 60 * 1000);
      const invite = { code: 'ABC12345', createdAt: oldDate.toISOString() };
      expect(isInviteExpired(invite)).toBe(true);
    });

    it('respects expiresAt if provided', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(
        isInviteExpired({ code: 'A', createdAt: '', expiresAt: pastDate.toISOString() })
      ).toBe(true);
      expect(
        isInviteExpired({ code: 'A', createdAt: '', expiresAt: futureDate.toISOString() })
      ).toBe(false);
    });
  });

  describe('normalizeInviteCode', () => {
    it('uppercases and trims', () => {
      expect(normalizeInviteCode('  abc12345  ')).toBe('ABC12345');
      expect(normalizeInviteCode('xyz98765')).toBe('XYZ98765');
    });
  });
});