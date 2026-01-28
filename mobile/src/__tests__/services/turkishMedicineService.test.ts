/**
 * Turkish Medicine Service Tests
 * Tests for hybrid medicine search (Open Food Facts, TITCK cache, ilacabak.com)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock logger
jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

// Import after mocks
import {
  searchOpenFoodFacts,
  searchTITCKCache,
  updateTITCKCache,
  isTITCKCacheValid,
  getTITCKCacheCount,
  searchIlacabakByName,
} from '../../services/turkishMedicineService';
import turkishMedicineService from '../../services/turkishMedicineService';

describe('TurkishMedicineService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Clear AsyncStorage before each test
    await AsyncStorage.clear();
  });

  describe('searchOpenFoodFacts', () => {
    const validBarcode = '8699546050017';

    it('should return medicine data for valid barcode', async () => {
      const mockResponse = {
        status: 1,
        status_verbose: 'product found',
        code: validBarcode,
        product: {
          code: validBarcode,
          product_name: 'Test Medicine',
          product_name_tr: 'Test Ilac',
          brands: 'Test Brand',
          quantity: '500mg',
          categories: 'medicine',
          countries: 'Turkey',
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await searchOpenFoodFacts(validBarcode);

      expect(result).not.toBeNull();
      expect(result?.barcode).toBe(validBarcode);
      expect(result?.name).toBe('Test Ilac');
      expect(result?.manufacturer).toBe('Test Brand');
      expect(result?.dosage).toBe('500mg');
    });

    it('should use English name if Turkish name not available', async () => {
      const mockResponse = {
        status: 1,
        product: {
          code: validBarcode,
          product_name: 'English Name',
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await searchOpenFoodFacts(validBarcode);

      expect(result?.name).toBe('English Name');
    });

    it('should return null for product not found', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 0 }),
      });

      const result = await searchOpenFoodFacts('0000000000000');

      expect(result).toBeNull();
    });

    it('should return null on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await searchOpenFoodFacts(validBarcode);

      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await searchOpenFoodFacts(validBarcode);

      expect(result).toBeNull();
    });

    it('should detect country from response', async () => {
      const mockResponse = {
        status: 1,
        product: {
          code: validBarcode,
          product_name: 'Test',
          countries: 'Germany',
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await searchOpenFoodFacts(validBarcode);

      expect(result?.country).toBe('DE');
    });

    it('should default to unknown product name', async () => {
      const mockResponse = {
        status: 1,
        product: {
          code: validBarcode,
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await searchOpenFoodFacts(validBarcode);

      expect(result?.name).toBe('Bilinmeyen Ürün');
    });
  });

  describe('searchTITCKCache', () => {
    const mockMedicines = [
      {
        barcode: '8699546050017',
        name: 'ASPIRIN 500 MG TABLET',
        manufacturer: 'BAYER',
        price: 25.5,
        dosage: '500mg',
      },
      {
        barcode: '8699546050024',
        name: 'PAROL 500 MG TABLET',
        manufacturer: 'ATABAY',
        price: 15.0,
      },
    ];

    it('should find medicine in cache', async () => {
      await AsyncStorage.setItem('@titck_medicine_cache', JSON.stringify(mockMedicines));

      const result = await searchTITCKCache('8699546050017');

      expect(result).not.toBeNull();
      expect(result?.name).toBe('ASPIRIN 500 MG TABLET');
      expect(result?.manufacturer).toBe('BAYER');
      expect(result?.country).toBe('TR');
    });

    it('should return null when cache is empty', async () => {
      const result = await searchTITCKCache('8699546050017');

      expect(result).toBeNull();
    });

    it('should return null for barcode not in cache', async () => {
      await AsyncStorage.setItem('@titck_medicine_cache', JSON.stringify(mockMedicines));

      const result = await searchTITCKCache('0000000000000');

      expect(result).toBeNull();
    });

    it('should extract dosage from name if not provided', async () => {
      const medicinesWithoutDosage = [
        {
          barcode: '8699546050017',
          name: 'PAROL 500 MG TABLET',
          manufacturer: 'ATABAY',
          price: 15.0,
        },
      ];
      await AsyncStorage.setItem('@titck_medicine_cache', JSON.stringify(medicinesWithoutDosage));

      const result = await searchTITCKCache('8699546050017');

      expect(result?.dosage).toBe('500 MG');
    });

    it('should handle corrupt cache data', async () => {
      await AsyncStorage.setItem('@titck_medicine_cache', 'invalid json');

      const result = await searchTITCKCache('8699546050017');

      expect(result).toBeNull();
    });
  });

  describe('updateTITCKCache', () => {
    const mockMedicines = [
      { barcode: '123', name: 'Test', manufacturer: 'Test', price: 10 },
    ];

    it('should save medicines to cache', async () => {
      await updateTITCKCache(mockMedicines);

      const cached = await AsyncStorage.getItem('@titck_medicine_cache');
      expect(JSON.parse(cached!)).toEqual(mockMedicines);
    });

    it('should save timestamp', async () => {
      const before = Date.now();
      await updateTITCKCache(mockMedicines);
      const after = Date.now();

      const timestamp = await AsyncStorage.getItem('@titck_cache_timestamp');
      const savedTime = parseInt(timestamp!);

      expect(savedTime).toBeGreaterThanOrEqual(before);
      expect(savedTime).toBeLessThanOrEqual(after);
    });
  });

  describe('isTITCKCacheValid', () => {
    it('should return false when no cache exists', async () => {
      const result = await isTITCKCacheValid();

      expect(result).toBe(false);
    });

    it('should return true for recent cache', async () => {
      await AsyncStorage.setItem('@titck_cache_timestamp', Date.now().toString());

      const result = await isTITCKCacheValid();

      expect(result).toBe(true);
    });

    it('should return false for old cache', async () => {
      const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
      await AsyncStorage.setItem('@titck_cache_timestamp', eightDaysAgo.toString());

      const result = await isTITCKCacheValid();

      expect(result).toBe(false);
    });
  });

  describe('getTITCKCacheCount', () => {
    it('should return 0 for empty cache', async () => {
      const count = await getTITCKCacheCount();

      expect(count).toBe(0);
    });

    it('should return correct count', async () => {
      const medicines = [
        { barcode: '1', name: 'A', manufacturer: 'X', price: 1 },
        { barcode: '2', name: 'B', manufacturer: 'Y', price: 2 },
        { barcode: '3', name: 'C', manufacturer: 'Z', price: 3 },
      ];
      await AsyncStorage.setItem('@titck_medicine_cache', JSON.stringify(medicines));

      const count = await getTITCKCacheCount();

      expect(count).toBe(3);
    });

    it('should return 0 for corrupt data', async () => {
      await AsyncStorage.setItem('@titck_medicine_cache', 'not json');

      const count = await getTITCKCacheCount();

      expect(count).toBe(0);
    });
  });

  describe('searchIlacabakByName', () => {
    it('should return medicines from ilacabak search', async () => {
      const mockHtml = `
        <ul>
          <li><a href="/ilac/aspirin-500mg-8699546050017" title="Aspirin">ASPIRIN 500 MG</a></li>
          <li><a href="/ilac/parol-500mg-8699546050024" title="Parol">PAROL 500 MG</a></li>
        </ul>
      `;

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      const results = await searchIlacabakByName('aspirin');

      expect(results).not.toBeNull();
      expect(results!.length).toBeGreaterThan(0);
    });

    it('should return null for no results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<ul></ul>'),
      });

      const results = await searchIlacabakByName('nonexistent');

      expect(results).toBeNull();
    });

    it('should return null on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const results = await searchIlacabakByName('aspirin');

      expect(results).toBeNull();
    });

    it('should return null on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const results = await searchIlacabakByName('aspirin');

      expect(results).toBeNull();
    });

    it('should encode medicine name for URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<ul></ul>'),
      });

      await searchIlacabakByName('aspirin 500');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('aspirin%20500'),
        expect.any(Object)
      );
    });
  });

  describe('Helper Functions (via default export)', () => {
    describe('extractDosageFromName', () => {
      it('should extract mg dosage', () => {
        expect(turkishMedicineService.extractDosageFromName('ASPIRIN 500 MG TABLET')).toBe('500 MG');
      });

      it('should extract ml dosage', () => {
        expect(turkishMedicineService.extractDosageFromName('PAROL SURUP 120 ML')).toBe('120 ML');
      });

      it('should extract mcg dosage', () => {
        expect(turkishMedicineService.extractDosageFromName('VITAMIN D 1000 MCG')).toBe('1000 MCG');
      });

      it('should return empty string for no dosage', () => {
        expect(turkishMedicineService.extractDosageFromName('VITAMIN C')).toBe('');
      });

      it('should handle decimal dosages', () => {
        expect(turkishMedicineService.extractDosageFromName('DRUG 2.5 MG')).toBe('2.5 MG');
      });
    });

    describe('detectMedicineForm', () => {
      it('should detect tablet form', () => {
        expect(turkishMedicineService.detectMedicineForm('ASPIRIN 500 MG TABLET')).toBe('tablet');
      });

      it('should detect capsule form', () => {
        expect(turkishMedicineService.detectMedicineForm('OMEGA 3 KAPSUL')).toBe('capsule');
      });

      it('should detect syrup form', () => {
        expect(turkishMedicineService.detectMedicineForm('PAROL SURUP')).toBe('syrup');
      });

      it('should detect injection form', () => {
        expect(turkishMedicineService.detectMedicineForm('VITAMIN B12 AMPUL')).toBe('injection');
      });

      it('should detect cream form', () => {
        expect(turkishMedicineService.detectMedicineForm('FUCICORT KREM')).toBe('cream');
      });

      it('should detect drops form', () => {
        expect(turkishMedicineService.detectMedicineForm('GOZ DAMLASI')).toBe('drops');
      });

      it('should detect spray form', () => {
        expect(turkishMedicineService.detectMedicineForm('FLIXONASE SPREY')).toBe('spray');
      });

      it('should detect patch form', () => {
        expect(turkishMedicineService.detectMedicineForm('NICOTINE PATCH')).toBe('patch');
      });

      it('should detect suppository form', () => {
        expect(turkishMedicineService.detectMedicineForm('PAROL FITIL')).toBe('suppository');
      });

      it('should detect powder form', () => {
        expect(turkishMedicineService.detectMedicineForm('C VITAMINI TOZ')).toBe('powder');
      });

      it('should return other for unknown forms', () => {
        expect(turkishMedicineService.detectMedicineForm('UNKNOWN MEDICINE')).toBe('other');
      });
    });
  });
});
