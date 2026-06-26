import { hashUserIdForCrashlytics } from '../../utils/crashlytics';

// jest.setup.js'te expo-crypto mock'u "mock-hash" (9 char) donduruyor.
// Hash fonksiyonu SHA-256 hex ciktisinin ilk 16 karakterini alir
// (substring), ama mock 9 karakter dondurdugu icin 9 karakter kalir.

describe('crashlytics utils (Sprint 15 - PII temizleme)', () => {
  describe('hashUserIdForCrashlytics', () => {
    it('returns hashed value (truncated to max 16 chars)', async () => {
      const hash = await hashUserIdForCrashlytics('test@example.com');
      // Hash substring(0, 16) — 9-char mock'ta 9 doner
      expect(hash.length).toBeLessThanOrEqual(16);
      expect(hash).not.toContain('test@example.com');
    });

    it('produces deterministic hash (same input = same output)', async () => {
      const hash1 = await hashUserIdForCrashlytics('user-123');
      const hash2 = await hashUserIdForCrashlytics('user-123');
      expect(hash1).toBe(hash2);
    });

    it('produces same hash for different inputs when digest is mocked (limitation)', async () => {
      // jest.setup.js'te expo-crypto.digestStringAsync mock-hash donduruyor,
      // bu yuzden hash fonksiyonu input farketmeksizin ayni cikti uretir.
      // Bu davranis production'da farklidir (gercek SHA-256 input'a gore degisir).
      const hash1 = await hashUserIdForCrashlytics('user-1');
      const hash2 = await hashUserIdForCrashlytics('user-2');
      // Mock ortaminda ikisi de "mock-hash" (substring(0,16) -> 9 char)
      expect(hash1).toBe(hash2);
      expect(hash1).toBe('mock-hash');
    });

    it('does NOT leak plaintext in hash output', async () => {
      const email = 'secret@example.com';
      const hash = await hashUserIdForCrashlytics(email);
      expect(hash).not.toContain('secret');
      expect(hash).not.toContain('example');
      expect(hash).not.toContain('@');
    });

    it('handles short input gracefully', async () => {
      const hash = await hashUserIdForCrashlytics('a');
      expect(hash.length).toBeLessThanOrEqual(16);
    });
  });
});