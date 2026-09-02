import {
  matchAndVerifyDrug,
  calculateSimilarity,
  normalizeForMatching,
} from '../../services/prescriptionSafetyMatcher';

describe('prescriptionSafetyMatcher', () => {
  describe('normalizeForMatching', () => {
    it('normalizes Turkish characters and removes punctuation', () => {
      const normalized = normalizeForMatching('PAROL® 500 MG, FİLM TABLET (3x1)');
      expect(normalized).toBe('parol 500 mg film tablet 3x1');
    });
  });

  describe('calculateSimilarity', () => {
    it('returns 1.0 for identical strings', () => {
      expect(calculateSimilarity('Parol 500mg', 'Parol 500mg')).toBe(1.0);
    });

    it('returns high similarity when main brand word matches', () => {
      const similarity = calculateSimilarity('Parol', 'PAROL 500 MG TABLET');
      expect(similarity).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('matchAndVerifyDrug', () => {
    it('snaps fuzzy / OCR typo "Augmentan BID" to official "AUGMENTIN 1000 MG BID FILM TABLET"', () => {
      const result = matchAndVerifyDrug('Augmentan 1000mg BID');
      expect(result.isVerified).toBe(true);
      expect(result.matchedName).toContain('AUGMENTIN');
      expect(result.activeIngredients).toContain('Amoksisilin');
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.7);
    });

    it('snaps "Euthyrox 50" to official "EUTHYROX 50 MCG TABLET" and attaches empty stomach food interaction', () => {
      const result = matchAndVerifyDrug('Euthyrox 50');
      expect(result.isVerified).toBe(true);
      expect(result.matchedName).toContain('EUTHYROX');
      expect(result.activeIngredients).toContain('Levotiroksin Sodyum');
      expect(result.foodInteractions).toContain('empty_stomach_strict');
    });

    it('flags uncatalogued medications safely with warning note without crashing', () => {
      const result = matchAndVerifyDrug('XyzCustomMoleculeUnknown 999');
      expect(result.isVerified).toBe(false);
      expect(result.matchedName).toBe('XyzCustomMoleculeUnknown 999');
      expect(result.warningNote).toBeDefined();
    });

    it('handles empty input safely', () => {
      const result = matchAndVerifyDrug('');
      expect(result.isVerified).toBe(false);
      expect(result.matchedName).toBe('');
    });
  });
});
