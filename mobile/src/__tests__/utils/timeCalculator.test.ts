import { formatTimeDisplay, getInstructionText } from '../../utils/timeCalculator';

describe('timeCalculator utils', () => {
  describe('formatTimeDisplay', () => {
    it('formats HH:mm as-is', () => {
      expect(formatTimeDisplay('08:30')).toBe('08:30');
      expect(formatTimeDisplay('23:59')).toBe('23:59');
    });

    it('returns empty string for empty input', () => {
      expect(formatTimeDisplay('')).toBe('');
    });

    it('passes through whitespace as-is (no trim)', () => {
      // Mevcut davranis: trim uygulanmiyor
      expect(formatTimeDisplay(' 08:30 ')).toBe(' 08:30 ');
    });
  });

  describe('getInstructionText', () => {
    it('returns Turkish instruction for known keys', () => {
      expect(getInstructionText('before_meal', 'tr')).toContain('Yemekten');
      expect(getInstructionText('after_meal', 'tr')).toContain('sonra');
      expect(getInstructionText('with_meal', 'tr')).toContain('birlikte');
    });

    it('returns English instruction for known keys', () => {
      expect(getInstructionText('before_meal', 'en')).toContain('Before');
      expect(getInstructionText('after_meal', 'en')).toContain('After');
    });

    it('returns Turkish fallback for undefined instruction', () => {
      // Mevcut davranis: undefined icin 'Belirtilmemis' doner
      expect(getInstructionText(undefined, 'tr')).toBe('Belirtilmemiş');
    });

    it('returns undefined for unknown instruction key', () => {
      // Mevcut davranis: bilinmeyen key icin undefined doner
      expect(getInstructionText('unknown' as never, 'tr')).toBeUndefined();
    });
  });
});
