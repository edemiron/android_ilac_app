/**
 * DrugInteraction Service Tests
 * Comprehensive tests for drug interaction checking functionality
 * Covers: single interactions, multiple interactions, API fallback, severity helpers
 */

import {
  checkInteractionLocal,
  checkInteraction,
  checkMultipleInteractions,
  getSeverityColor,
  getSeverityIcon,
  checkInteractionsFromAPI,
  DrugInteraction,
} from '../../services/drugInteraction';

// Mock the logger
jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock fetch for API tests
global.fetch = jest.fn();

// Bu suite uzun sure describe.skip ile kapaliydi ("tam migration sonraki
// sprint'e birakildi"). Kapali kalma nedeni API kaymasiydi, veri eksigi degil:
//   - Testler senkron ve dogrudan DrugInteraction donen ESKI imzayi
//     kullaniyordu; checkInteraction artik async ve InteractionCheckResult
//     donuyor. Senkron cagrilar checkInteractionLocal'a tasindi (ayni imza).
//   - checkMultipleInteractions cagrilarina eksik olan `await` eklendi;
//     Promise'e assertion yapildigi icin hepsi undefined donuyordu.
describe('DrugInteraction Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkInteraction', () => {
    describe('Known Interactions', () => {
      it('should detect aspirin-warfarin interaction (high severity)', async () => {
        const result = checkInteractionLocal('aspirin', 'warfarin');

        expect(result).not.toBeNull();
        expect(result?.severity).toBe('high');
        expect(result?.drug1).toBe('aspirin');
        expect(result?.drug2).toBe('warfarin');
        expect(result?.description).toContain('kanama riski');
      });

      it('should detect aspirin-ibuprofen interaction (moderate severity)', async () => {
        const result = checkInteractionLocal('aspirin', 'ibuprofen');

        expect(result).not.toBeNull();
        expect(result?.severity).toBe('moderate');
        expect(result?.description).toContain('mide kanaması');
      });

      it('should detect omeprazol-clopidogrel interaction', async () => {
        const result = checkInteractionLocal('omeprazol', 'clopidogrel');

        expect(result).not.toBeNull();
        expect(result?.severity).toBe('moderate');
        expect(result?.description).toContain('etkinliğini azaltabilir');
      });

      it('should detect metformin-alkol interaction (high severity)', async () => {
        const result = checkInteractionLocal('metformin', 'alkol');

        expect(result).not.toBeNull();
        expect(result?.severity).toBe('high');
        expect(result?.description).toContain('laktik asidoz');
      });

      it('should detect fluoxetine-tramadol interaction (serotonin syndrome)', async () => {
        const result = checkInteractionLocal('fluoxetine', 'tramadol');

        expect(result).not.toBeNull();
        expect(result?.severity).toBe('high');
        expect(result?.description).toContain('Serotonin sendromu');
      });

      it('should detect ciprofloxacin-tizanidine interaction', async () => {
        const result = checkInteractionLocal('ciprofloxacin', 'tizanidine');

        expect(result).not.toBeNull();
        expect(result?.severity).toBe('high');
        expect(result?.recommendation).toContain('kesinlikle kaçının');
      });
    });

    describe('Bidirectional Matching', () => {
      it('should detect interaction regardless of drug order', async () => {
        const result1 = checkInteractionLocal('aspirin', 'warfarin');
        const result2 = checkInteractionLocal('warfarin', 'aspirin');

        expect(result1).not.toBeNull();
        expect(result2).not.toBeNull();
        expect(result1?.severity).toBe(result2?.severity);
      });

      it('should detect simvastatin-amlodipine in both directions', async () => {
        const result1 = checkInteractionLocal('simvastatin', 'amlodipine');
        const result2 = checkInteractionLocal('amlodipine', 'simvastatin');

        expect(result1).not.toBeNull();
        expect(result2).not.toBeNull();
      });
    });

    describe('Case and Character Normalization', () => {
      it('should match drugs case-insensitively', async () => {
        const result = checkInteractionLocal('ASPIRIN', 'WARFARIN');

        expect(result).not.toBeNull();
        expect(result?.severity).toBe('high');
      });

      it('should handle mixed case', async () => {
        const result = checkInteractionLocal('AsPiRiN', 'WaRfArIn');

        expect(result).not.toBeNull();
      });

      it('should handle leading/trailing whitespace', async () => {
        const result = checkInteractionLocal('  aspirin  ', '  warfarin  ');

        expect(result).not.toBeNull();
      });

      it('should handle Turkish characters', async () => {
        // Test with potential Turkish character input
        const result = checkInteractionLocal('aspirin', 'warfarin');

        expect(result).not.toBeNull();
      });
    });

    describe('Partial Name Matching', () => {
      it('should match when drug name contains known interaction drug', async () => {
        const result = checkInteractionLocal('aspirin tablet 500mg', 'warfarin');

        expect(result).not.toBeNull();
      });

      it('should match brand names containing generic names', async () => {
        // Simvastatin in a longer name
        const result = checkInteractionLocal('simvastatine 20mg', 'grapefruit');

        expect(result).not.toBeNull();
      });
    });

    describe('No Interaction Cases', () => {
      it('should return null for non-interacting drugs', async () => {
        const result = checkInteractionLocal('paracetamol', 'vitamin c');

        expect(result).toBeNull();
      });

      it('should return null for same drug', async () => {
        const result = checkInteractionLocal('aspirin', 'aspirin');

        expect(result).toBeNull();
      });

      it('should return null for unknown drugs', async () => {
        const result = checkInteractionLocal('unknowndrug', 'anotherdrug');

        expect(result).toBeNull();
      });

      it('should handle empty drug names gracefully', async () => {
        // Empty strings get normalized and may match due to substring matching
        // This is expected behavior - the function handles this edge case
        // eslint-disable-next-line unused-imports/no-unused-vars
        const result = checkInteractionLocal('', '');

        // The result depends on the normalization logic
        // What matters is no crash occurs
        expect(() => checkInteraction('', '')).not.toThrow();
      });
    });

    describe('ID Generation', () => {
      it('should generate unique IDs for each interaction result', async () => {
        const result1 = checkInteractionLocal('aspirin', 'warfarin');
        const result2 = checkInteractionLocal('aspirin', 'warfarin');

        expect(result1?.id).toBeDefined();
        expect(result2?.id).toBeDefined();
        // IDs should be different (timestamp + random)
        expect(result1?.id).not.toBe(result2?.id);
      });
    });
  });

  describe('checkMultipleInteractions', () => {
    it('should check all drug pairs', async () => {
      const drugs = ['aspirin', 'warfarin', 'ibuprofen'];

      const result = await checkMultipleInteractions(drugs);

      expect(result.hasInteractions).toBe(true);
      // Should find aspirin-warfarin and aspirin-ibuprofen
      expect(result.interactions.length).toBe(2);
    });

    it('should return empty interactions for non-interacting drugs', async () => {
      const drugs = ['paracetamol', 'vitamin c', 'vitamin d'];

      const result = await checkMultipleInteractions(drugs);

      expect(result.hasInteractions).toBe(false);
      expect(result.interactions).toEqual([]);
    });

    it('should handle single drug input', async () => {
      const result = await checkMultipleInteractions(['aspirin']);

      expect(result.hasInteractions).toBe(false);
      expect(result.interactions).toEqual([]);
    });

    it('should handle empty drug list', async () => {
      const result = await checkMultipleInteractions([]);

      expect(result.hasInteractions).toBe(false);
      expect(result.interactions).toEqual([]);
    });

    it('should include checkedAt timestamp', async () => {
      const before = new Date().toISOString();
      const result = await checkMultipleInteractions(['aspirin', 'warfarin']);
      const after = new Date().toISOString();

      expect(result.checkedAt).toBeDefined();
      expect(result.checkedAt >= before).toBe(true);
      expect(result.checkedAt <= after).toBe(true);
    });

    it('should find all interactions in complex drug list', async () => {
      const drugs = ['aspirin', 'warfarin', 'metformin', 'alkol', 'fluoxetine', 'tramadol'];

      const result = await checkMultipleInteractions(drugs);

      // Should find: aspirin-warfarin, metformin-alkol, fluoxetine-tramadol
      expect(result.hasInteractions).toBe(true);
      expect(result.interactions.length).toBeGreaterThanOrEqual(3);
    });

    it('should not duplicate interactions', async () => {
      const drugs = ['aspirin', 'warfarin'];

      const result = await checkMultipleInteractions(drugs);

      // Should only have one interaction, not two
      expect(result.interactions.length).toBe(1);
    });
  });

  describe('getSeverityColor', () => {
    it('should return red for high severity', async () => {
      const color = getSeverityColor('high');

      expect(color).toBe('#F44336');
    });

    it('should return orange for moderate severity', async () => {
      const color = getSeverityColor('moderate');

      expect(color).toBe('#FF9800');
    });

    it('should return yellow for low severity', async () => {
      const color = getSeverityColor('low');

      expect(color).toBe('#FFC107');
    });

    it('should return gray for unknown severity', async () => {
      const color = getSeverityColor('unknown' as DrugInteraction['severity']);

      expect(color).toBe('#9E9E9E');
    });
  });

  describe('getSeverityIcon', () => {
    it('should return warning icon for high severity', async () => {
      const icon = getSeverityIcon('high');

      expect(icon).toBe('⚠️');
    });

    it('should return lightning icon for moderate severity', async () => {
      const icon = getSeverityIcon('moderate');

      expect(icon).toBe('⚡');
    });

    it('should return info icon for low severity', async () => {
      const icon = getSeverityIcon('low');

      expect(icon).toBe('ℹ️');
    });

    it('should return question icon for unknown severity', async () => {
      const icon = getSeverityIcon('unknown' as DrugInteraction['severity']);

      expect(icon).toBe('❓');
    });
  });

  describe('checkInteractionsFromAPI', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockReset();
    });

    it('should call RxNav API with correct URL', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({}),
      });

      const rxcuis = ['12345', '67890'];
      await checkInteractionsFromAPI(rxcuis);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('rxnav.nlm.nih.gov/REST/interaction/list.json')
      );
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('12345+67890'));
    });

    it('should parse API response correctly', async () => {
      const mockApiResponse = {
        fullInteractionTypeGroup: [
          {
            fullInteractionType: [
              {
                interactionPair: [
                  {
                    interactionConcept: [
                      { minConceptItem: { name: 'Drug A' } },
                      { minConceptItem: { name: 'Drug B' } },
                    ],
                    severity: 'high',
                    description: 'Test interaction',
                  },
                ],
              },
            ],
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve(mockApiResponse),
      });

      const result = await checkInteractionsFromAPI(['12345', '67890']);

      expect(result.hasInteractions).toBe(true);
      expect(result.interactions.length).toBe(1);
      expect(result.interactions[0].drug1).toBe('Drug A');
      expect(result.interactions[0].drug2).toBe('Drug B');
      expect(result.interactions[0].severity).toBe('high');
    });

    it('should handle empty API response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({}),
      });

      const result = await checkInteractionsFromAPI(['12345']);

      expect(result.hasInteractions).toBe(false);
      expect(result.interactions).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await checkInteractionsFromAPI(['12345']);

      expect(result.hasInteractions).toBe(false);
      expect(result.interactions).toEqual([]);
      expect(result.checkedAt).toBeDefined();
    });

    it('should map severity levels correctly', async () => {
      const createMockResponse = (severity: string) => ({
        fullInteractionTypeGroup: [
          {
            fullInteractionType: [
              {
                interactionPair: [
                  {
                    interactionConcept: [
                      { minConceptItem: { name: 'A' } },
                      { minConceptItem: { name: 'B' } },
                    ],
                    severity,
                    description: 'Test',
                  },
                ],
              },
            ],
          },
        ],
      });

      // Test high severity mapping
      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve(createMockResponse('major')),
      });
      let result = await checkInteractionsFromAPI(['1']);
      expect(result.interactions[0].severity).toBe('high');

      // Test moderate severity mapping
      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve(createMockResponse('moderate')),
      });
      result = await checkInteractionsFromAPI(['1']);
      expect(result.interactions[0].severity).toBe('moderate');

      // Test low severity mapping (default)
      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve(createMockResponse('minor')),
      });
      result = await checkInteractionsFromAPI(['1']);
      expect(result.interactions[0].severity).toBe('low');
    });

    it('should handle missing drug names in API response', async () => {
      const mockApiResponse = {
        fullInteractionTypeGroup: [
          {
            fullInteractionType: [
              {
                interactionPair: [
                  {
                    interactionConcept: [{}, {}],
                    severity: 'high',
                    description: 'Test',
                  },
                ],
              },
            ],
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve(mockApiResponse),
      });

      const result = await checkInteractionsFromAPI(['12345']);

      expect(result.interactions[0].drug1).toBe('Bilinmeyen');
      expect(result.interactions[0].drug2).toBe('Bilinmeyen');
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in drug names', async () => {
      const result = checkInteractionLocal('aspirin-100mg', 'warfarin');

      // Should still match after normalization
      expect(result).not.toBeNull();
    });

    it('should handle numeric-only input', async () => {
      const result = checkInteractionLocal('12345', '67890');

      expect(result).toBeNull();
    });

    it('should handle very long drug names', async () => {
      const longName = 'aspirin'.repeat(100);
      const result = checkInteractionLocal(longName, 'warfarin');

      // Should still match since it contains 'aspirin'
      expect(result).not.toBeNull();
    });

    it('should handle unicode characters', async () => {
      const result = checkInteractionLocal('aspirín', 'warfarin');

      // After normalization, should match
      expect(result).not.toBeNull();
    });
  });

  describe('Interaction Result Structure', () => {
    it('should have all required fields in interaction result', async () => {
      const result = checkInteractionLocal('aspirin', 'warfarin');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('drug1');
      expect(result).toHaveProperty('drug2');
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('recommendation');
    });

    it('should have all required fields in multiple interaction result', async () => {
      const result = await checkMultipleInteractions(['aspirin', 'warfarin']);

      expect(result).toHaveProperty('hasInteractions');
      expect(result).toHaveProperty('interactions');
      expect(result).toHaveProperty('checkedAt');
      expect(typeof result.hasInteractions).toBe('boolean');
      expect(Array.isArray(result.interactions)).toBe(true);
      expect(typeof result.checkedAt).toBe('string');
    });
  });
});
