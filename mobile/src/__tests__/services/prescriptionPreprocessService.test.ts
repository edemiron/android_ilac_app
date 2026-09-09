import {
  maskPII,
  calculateOptimalDimensions,
  validateImageForScan,
} from '../../services/prescriptionPreprocessService';

describe('prescriptionPreprocessService', () => {
  describe('maskPII (KVKK / HIPAA Data Masking)', () => {
    it('masks 11-digit Turkish Republic ID numbers (TCKN)', () => {
      const input = 'Hasta TCKN: 12345678901 reçetesi PAROL 500 MG';
      const result = maskPII(input);
      expect(result.hasTCKN).toBe(true);
      expect(result.maskedText).not.toContain('12345678901');
      expect(result.maskedText).toContain('[TCKN_MASKELENDİ]');
      expect(result.maskedText).toContain('PAROL 500 MG');
    });

    it('masks Turkish mobile phone numbers', () => {
      const input = 'İletişim: 0532 123 45 67 veya 05441112233 nolu telefondan arayınız.';
      const result = maskPII(input);
      expect(result.hasPhone).toBe(true);
      expect(result.maskedText).not.toContain('0532');
      expect(result.maskedText).not.toContain('05441112233');
      expect(result.maskedText).toContain('[TELEFON_MASKELENDİ]');
    });

    it('masks patient name with prefix (Sn. / Sayın)', () => {
      const input = 'Sn. AHMET YILMAZ, 28.08.2026 tarihli 9AB87C nolu e-receteniz: PAROL 500 MG';
      const result = maskPII(input);
      expect(result.hasPatientName).toBe(true);
      expect(result.maskedText).not.toContain('AHMET YILMAZ');
      expect(result.maskedText).toContain('Sn. [HASTA_MASKELENDİ]');
      expect(result.maskedText).toContain('9AB87C');
      expect(result.maskedText).toContain('PAROL 500 MG');
    });

    it('masks doctor name with prefix (Dr. / Uzm. Dr. / Prof. Dr.)', () => {
      const input = 'Reçeteyi Yazan: Uzm. Dr. MEHMET KAYA - Kaşe/İmza';
      const result = maskPII(input);
      expect(result.hasDoctorName).toBe(true);
      expect(result.maskedText).not.toContain('MEHMET KAYA');
      expect(result.maskedText).toContain('Dr. [DOKTOR_MASKELENDİ]');
    });

    it('handles empty or non-string input gracefully', () => {
      expect(maskPII(null as any).maskedText).toBe('');
      expect(maskPII(undefined as any).maskedText).toBe('');
      expect(maskPII('').maskedText).toBe('');
    });
  });

  describe('calculateOptimalDimensions (Image Resizing for AI)', () => {
    it('scales down oversized 4K images to max 1920px while preserving aspect ratio', () => {
      const result = calculateOptimalDimensions(3840, 2160, 1920);
      expect(result.needsResize).toBe(true);
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
    });

    it('keeps images within bounds unchanged', () => {
      const result = calculateOptimalDimensions(1280, 720, 1920);
      expect(result.needsResize).toBe(false);
      expect(result.width).toBe(1280);
      expect(result.height).toBe(720);
    });

    it('handles portrait orientation correctly', () => {
      const result = calculateOptimalDimensions(2160, 3840, 1920);
      expect(result.needsResize).toBe(true);
      expect(result.width).toBe(1080);
      expect(result.height).toBe(1920);
    });
  });

  describe('validateImageForScan', () => {
    it('rejects empty or missing image uri', () => {
      const result = validateImageForScan(null);
      expect(result.isValid).toBe(false);
    });

    it('rejects oversized images (>10MB)', () => {
      const result = validateImageForScan('file:///path/huge.jpg', 15 * 1024 * 1024);
      expect(result.isValid).toBe(false);
      expect(result.warning).toBeDefined();
    });

    it('accepts valid images', () => {
      const result = validateImageForScan('file:///path/prescription.jpg', 2 * 1024 * 1024);
      expect(result.isValid).toBe(true);
    });
  });
});
