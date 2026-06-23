import { isValidEmailFormat, normalizeEmail } from '../../utils/authValidation';

describe('authValidation utils', () => {
  describe('normalizeEmail', () => {
    it('trims whitespace and lowercases the address', () => {
      expect(normalizeEmail('  User@Example.COM  ')).toBe('user@example.com');
    });

    it('returns empty string when input is empty or whitespace-only', () => {
      expect(normalizeEmail('')).toBe('');
      expect(normalizeEmail('   ')).toBe('');
    });
  });

  describe('isValidEmailFormat', () => {
    it('accepts well-formed addresses', () => {
      expect(isValidEmailFormat('user@example.com')).toBe(true);
      expect(isValidEmailFormat('user+tag@example.co.uk')).toBe(true);
      expect(isValidEmailFormat('first.last@sub.example.com')).toBe(true);
    });

    it('rejects malformed addresses', () => {
      expect(isValidEmailFormat('not-an-email')).toBe(false);
      expect(isValidEmailFormat('missing@tld')).toBe(false);
      expect(isValidEmailFormat('@example.com')).toBe(false);
      expect(isValidEmailFormat('user@')).toBe(false);
      expect(isValidEmailFormat('user @example.com')).toBe(false);
      expect(isValidEmailFormat('user@@example.com')).toBe(false);
    });

    it('is case-insensitive and trims input', () => {
      expect(isValidEmailFormat('  USER@EXAMPLE.COM  ')).toBe(true);
    });

    it('rejects empty string', () => {
      expect(isValidEmailFormat('')).toBe(false);
    });
  });
});
