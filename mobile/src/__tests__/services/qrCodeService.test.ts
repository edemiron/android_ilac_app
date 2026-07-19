/**
 * qrCodeService tests — Sprint 8
 */

import {
  createInviteDeepLink,
  createQRCodeData,
  extractInviteCodeFromUrl,
  validateInviteCodeForQR,
  getDefaultQRTheme,
} from '../../services/qrCodeService';

describe('qrCodeService', () => {
  describe('createInviteDeepLink', () => {
    it('includes invite code in URL', () => {
      const link = createInviteDeepLink('ABC123');
      expect(link).toContain('ABC123');
    });

    it('uses ilachatirlatici:// scheme', () => {
      const link = createInviteDeepLink('XYZ789');
      expect(link.startsWith('ilachatirlatici://')).toBe(true);
    });
  });

  describe('createQRCodeData', () => {
    it('returns non-empty string', () => {
      const data = createQRCodeData('ABC123');
      expect(typeof data).toBe('string');
      expect(data.length).toBeGreaterThan(0);
    });

    it('contains invite code', () => {
      const data = createQRCodeData('TEST99');
      expect(data).toContain('TEST99');
    });
  });

  describe('extractInviteCodeFromUrl', () => {
    it('returns string or null for various URLs', () => {
      const urls = [
        'ilacabak://invite?code=ABC123',
        'https://example.com/invite?code=XYZ789',
        'invalid',
        '',
      ];
      urls.forEach(url => {
        const code = extractInviteCodeFromUrl(url);
        expect(code === null || typeof code === 'string').toBe(true);
      });
    });
  });

  describe('validateInviteCodeForQR', () => {
    it('accepts valid 6-char alphanumeric', () => {
      const result = validateInviteCodeForQR('ABC123');
      expect(result.valid).toBe(true);
    });

    it('rejects empty code', () => {
      const result = validateInviteCodeForQR('');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects code with wrong length', () => {
      const result = validateInviteCodeForQR('AB');
      expect(result.valid).toBe(false);
    });

    it('rejects lowercase code', () => {
      const result = validateInviteCodeForQR('abc123');
      expect(result.valid).toBe(false);
    });
  });

  describe('getDefaultQRTheme', () => {
    it('returns light theme when isDark=false', () => {
      const theme = getDefaultQRTheme(false);
      expect(theme).toBeDefined();
    });

    it('returns dark theme when isDark=true', () => {
      const theme = getDefaultQRTheme(true);
      expect(theme).toBeDefined();
    });

    it('light and dark themes differ', () => {
      const light = getDefaultQRTheme(false);
      const dark = getDefaultQRTheme(true);
      expect(JSON.stringify(light)).not.toBe(JSON.stringify(dark));
    });
  });
});
