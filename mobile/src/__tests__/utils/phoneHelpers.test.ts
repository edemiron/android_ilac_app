import {
  cleanPhoneNumber,
  formatPhoneNumber,
  isValidPhoneNumber,
  getTelUri,
} from '../../utils/phoneHelpers';

describe('phoneHelpers', () => {
  describe('cleanPhoneNumber', () => {
    it('should return empty string for falsy/empty values', () => {
      expect(cleanPhoneNumber('')).toBe('');
      expect(cleanPhoneNumber(null as any)).toBe('');
      expect(cleanPhoneNumber(undefined as any)).toBe('');
    });

    it('should strip non-digits for standard numbers', () => {
      expect(cleanPhoneNumber('0 (555) 123-45-67')).toBe('05551234567');
      expect(cleanPhoneNumber('0555 123 45 67')).toBe('05551234567');
    });

    it('should preserve leading plus for international numbers', () => {
      expect(cleanPhoneNumber('+90 (555) 123 45 67')).toBe('+905551234567');
      expect(cleanPhoneNumber('  +1 (555) 000-1122  ')).toBe('+15550001122');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should return empty string for empty input', () => {
      expect(formatPhoneNumber('')).toBe('');
    });

    it('should format 10-digit Turkish number without leading 0', () => {
      expect(formatPhoneNumber('5551234567')).toBe('+90 555 123 45 67');
    });

    it('should format 11-digit Turkish number with leading 0', () => {
      expect(formatPhoneNumber('05551234567')).toBe('+90 555 123 45 67');
      expect(formatPhoneNumber('02121234567')).toBe('+90 212 123 45 67');
    });

    it('should format +90 prefixed Turkish number', () => {
      expect(formatPhoneNumber('+905551234567')).toBe('+90 555 123 45 67');
      expect(formatPhoneNumber('00905551234567')).toBe('+90 555 123 45 67');
    });

    it('should return non-turkish international format cleanly', () => {
      expect(formatPhoneNumber('+447911123456')).toBe('+447911123456');
    });
  });

  describe('isValidPhoneNumber', () => {
    it('should return false for invalid or empty inputs', () => {
      expect(isValidPhoneNumber('')).toBe(false);
      expect(isValidPhoneNumber('123')).toBe(false);
      expect(isValidPhoneNumber('abc')).toBe(false);
    });

    it('should return true for valid Turkish mobile numbers', () => {
      expect(isValidPhoneNumber('05551234567')).toBe(true);
      expect(isValidPhoneNumber('5551234567')).toBe(true);
      expect(isValidPhoneNumber('+905551234567')).toBe(true);
    });

    it('should return true for valid international numbers (10-15 digits)', () => {
      expect(isValidPhoneNumber('+14155552671')).toBe(true);
      expect(isValidPhoneNumber('+447911123456')).toBe(true);
    });
  });

  describe('getTelUri', () => {
    it('should return tel: for empty input', () => {
      expect(getTelUri('')).toBe('tel:');
    });

    it('should format 10-digit Turkish number to international tel URI', () => {
      expect(getTelUri('5551234567')).toBe('tel:+905551234567');
    });

    it('should format 11-digit Turkish number starting with 05 to international tel URI', () => {
      expect(getTelUri('05551234567')).toBe('tel:+905551234567');
    });

    it('should retain + for already formatted numbers', () => {
      expect(getTelUri('+90 (555) 123 45 67')).toBe('tel:+905551234567');
      expect(getTelUri('+1 415 555 2671')).toBe('tel:+14155552671');
    });
  });
});
