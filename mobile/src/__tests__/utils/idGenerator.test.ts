import { generateId, isValidUUID } from '../../utils/idGenerator';

describe('idGenerator utils', () => {
  describe('generateId', () => {
    it('returns a non-empty string', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('returns a valid UUID format', () => {
      const id = generateId();
      expect(isValidUUID(id)).toBe(true);
    });

    it('returns unique IDs on subsequent calls', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100); // Tumu farkli
    });

    it('UUID v7 format: 8-4-4-4-12 hex chars with version 7 in 3rd group', () => {
      const id = generateId();
      const uuidV7Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidV7Pattern);
    });
  });

  describe('isValidUUID', () => {
    it('accepts UUID v4', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('accepts UUID v7', () => {
      expect(isValidUUID('01890a5d-ac95-7e83-9e2c-123456789abc')).toBe(true);
    });

    it('rejects non-UUID strings', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('123')).toBe(false);
      expect(isValidUUID('')).toBe(false);
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false); // eksik
    });

    it('rejects UUID with wrong version digit', () => {
      // Versiyon 7 olmali; 9 yanlis
      expect(isValidUUID('550e8400-e29b-91d4-a716-446655440000')).toBe(false);
    });
  });
});
