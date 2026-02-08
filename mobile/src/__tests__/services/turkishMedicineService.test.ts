/**
 * Turkish Medicine Service Tests
 * Tests for Open Food Facts, TITCK Cache, and Ilacabak integrations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  searchOpenFoodFacts,
  searchTITCKCache,
  updateTITCKCache,
  isTITCKCacheValid,
  getTITCKCacheCount,
  searchIlacabakByName,
} from '../../services/turkishMedicineService';

// Mock fetch
global.fetch = jest.fn();

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('TurkishMedicineService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchOpenFoodFacts', () => {
    it('should return medicine data for valid barcode', async () => {
      const mockResponse = {
        status: 1,
        status_verbose: 'product found',
        code: '1234567890123',
        product: {
          code: '1234567890123',
          product_name: 'Aspirin 500mg Tablet',
          brands: 'Bayer',
          quantity: '500mg',
          categories: 'Medicine,Pharmaceutical',
          countries: 'Turkey',
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await searchOpenFoodFacts('1234567890123');

      expect(result).not.toBeNull();
      expect(result?.barcode).toBe('1234567890123');
      expect(result?.name).toContain('Aspirin');
      expect(result?.manufacturer).toBe('Bayer');
    });

    it('should return null when product not found', async () => {
      const mockResponse = {
        status: 0,
        status_verbose: 'product not found',
        code: '1234567890123',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await searchOpenFoodFacts('1234567890123');

      expect(result).toBeNull();
    });

    it('should return null when API returns error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await searchOpenFoodFacts('1234567890123');

      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await searchOpenFoodFacts('1234567890123');

      expect(result).toBeNull();
    });

    it('should use User-Agent header', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 0,
          code: '123',
        }),
      });

      await searchOpenFoodFacts('1234567890123');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://world.openfoodfacts.org/api/v0/product/1234567890123.json',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('IlacHatirlatici'),
          }),
        })
      );
    });
  });

  describe('searchTITCKCache', () => {
    const mockMedicine = {
      barcode: '1234567890123',
      name: 'PARASETAMOL 500 MG TABLET',
      manufacturer: 'Abdi İbrahim',
      price: 25.5,
      atcCode: 'N02BE01',
    };

    it('should return medicine from cache', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([mockMedicine]));

      const result = await searchTITCKCache('1234567890123');

      expect(result).not.toBeNull();
      expect(result?.barcode).toBe('1234567890123');
      expect(result?.name).toBe('PARASETAMOL 500 MG TABLET');
    });

    it('should return null when cache is empty', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await searchTITCKCache('1234567890123');

      expect(result).toBeNull();
    });

    it('should return null when medicine not in cache', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([mockMedicine]));

      const result = await searchTITCKCache('9999999999999');

      expect(result).toBeNull();
    });

    it('should handle cache parse error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('invalid json');

      const result = await searchTITCKCache('1234567890123');

      expect(result).toBeNull();
    });
  });

  describe('updateTITCKCache', () => {
    const mockMedicines = [
      { barcode: '1', name: 'Med 1', manufacturer: 'Man 1', price: 10 },
      { barcode: '2', name: 'Med 2', manufacturer: 'Man 2', price: 20 },
    ];

    it('should save medicines to cache', async () => {
      await updateTITCKCache(mockMedicines);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@titck_medicine_cache',
        JSON.stringify(mockMedicines)
      );
    });

    it('should save timestamp', async () => {
      await updateTITCKCache(mockMedicines);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@titck_cache_timestamp',
        expect.any(String)
      );
    });

    it('should throw on storage error', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Storage full'));

      await expect(updateTITCKCache(mockMedicines)).rejects.toThrow('Storage full');
    });
  });

  describe('isTITCKCacheValid', () => {
    it('should return true for recent cache', async () => {
      const recentTimestamp = Date.now() - 1000 * 60 * 60 * 24; // 1 day ago
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(recentTimestamp.toString());

      const result = await isTITCKCacheValid();

      expect(result).toBe(true);
    });

    it('should return false for old cache', async () => {
      const oldTimestamp = Date.now() - 1000 * 60 * 60 * 24 * 10; // 10 days ago
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(oldTimestamp.toString());

      const result = await isTITCKCacheValid();

      expect(result).toBe(false);
    });

    it('should return false when no timestamp', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await isTITCKCacheValid();

      expect(result).toBe(false);
    });
  });

  describe('getTITCKCacheCount', () => {
    it('should return count of cached medicines', async () => {
      const mockMedicines = Array.from({ length: 150 }, (_, i) => ({
        barcode: `${i}`,
        name: `Med ${i}`,
        manufacturer: 'Man',
        price: 10,
      }));

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockMedicines));

      const result = await getTITCKCacheCount();

      expect(result).toBe(150);
    });

    it('should return 0 when cache is empty', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await getTITCKCacheCount();

      expect(result).toBe(0);
    });
  });

  describe('searchIlacabakByName', () => {
    const mockHtmlResponse = `
      <html>
        <body>
          <ul>
            <li><a href="/ilac-1234567890123" title="PARASETAMOL">PARASETAMOL 500 MG</a></li>
            <li><a href="/ilac-9876543210987" title="IBUPROFEN">IBUPROFEN 400 MG</a></li>
          </ul>
        </body>
      </html>
    `;

    it('should parse medicine results from HTML', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtmlResponse,
      });

      const result = await searchIlacabakByName('parasetamol');

      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect(result?.[0].name).toContain('PARASETAMOL');
    });

    it('should return null on API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await searchIlacabakByName('test');

      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await searchIlacabakByName('test');

      expect(result).toBeNull();
    });

    it('should return empty array for no results', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => '<html><body><ul></ul></body></html>',
      });

      const result = await searchIlacabakByName('unknownmedicine');

      expect(result).toBeNull();
    });

    it('should encode search query', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => '<html></html>',
      });

      await searchIlacabakByName('ilaç adı');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent('ilaç adı')),
        expect.any(Object)
      );
    });
  });
});
