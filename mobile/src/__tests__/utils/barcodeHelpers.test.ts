import { normalizeBarcode, parseGS1Karekod } from '../../utils/barcodeHelpers';

describe('barcodeHelpers', () => {
  describe('normalizeBarcode', () => {
    it('returns empty string for null/undefined/empty input', () => {
      expect(normalizeBarcode(null)).toBe('');
      expect(normalizeBarcode(undefined)).toBe('');
      expect(normalizeBarcode('')).toBe('');
    });

    it('cleans standard 13-digit EAN-13 barcode', () => {
      expect(normalizeBarcode('8699522958566')).toBe('8699522958566');
      expect(normalizeBarcode(' 8699522958566 ')).toBe('8699522958566');
      expect(normalizeBarcode('868-1801-092092')).toBe('8681801092092');
    });

    it('extracts 13-digit barcode from 14-digit GTIN with leading zero', () => {
      expect(normalizeBarcode('08699522958566')).toBe('8699522958566');
    });

    it('extracts barcode from GS1 2D DataMatrix with parentheses', () => {
      const karekod = '(01)08699522958566(21)1234567890(17)261231(10)LOT123';
      expect(normalizeBarcode(karekod)).toBe('8699522958566');
    });

    it('extracts barcode from raw İTS DataMatrix string', () => {
      const rawIts = '0108699522958566211234567890\x1D17261231\x1D10LOT123';
      expect(normalizeBarcode(rawIts)).toBe('8699522958566');
    });
  });

  describe('parseGS1Karekod', () => {
    it('parses full GS1 DataMatrix with all fields', () => {
      const karekod = '(01)08699522958566(21)SERI12345(17)261231(10)PARTI999';
      const result = parseGS1Karekod(karekod);

      expect(result.barcode).toBe('8699522958566');
      expect(result.gtin).toBe('08699522958566');
      expect(result.serialNumber).toBe('SERI12345');
      expect(result.expiryDate).toBe('2026-12-31');
      expect(result.lotNumber).toBe('PARTI999');
      expect(result.isKarekod).toBe(true);
    });

    it('handles standard barcode without GS1 tags', () => {
      const result = parseGS1Karekod('8699514013181');
      expect(result.barcode).toBe('8699514013181');
      expect(result.gtin).toBe('08699514013181');
      expect(result.isKarekod).toBe(false);
    });
  });
});
