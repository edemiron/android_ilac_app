/**
 * Turkish Medicine Service
 *
 * Hibrit ilaç arama servisi:
 * 1. Open Food Facts API - Ücretsiz, açık kaynak barkod veritabanı
 * 2. TİTCK Excel cache - Türkiye resmi ilaç listesi (offline)
 * 3. İlacabak.com web scraping (ilaç adı araması için)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlobalMedicine, MedicineForm } from '../types';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('TurkishMedicineService');

// ============ OPEN FOOD FACTS API ============

interface OpenFoodFactsProduct {
  code: string;
  product_name?: string;
  product_name_tr?: string;
  brands?: string;
  categories?: string;
  ingredients_text?: string;
  quantity?: string;
  image_url?: string;
  countries?: string;
}

interface OpenFoodFactsResponse {
  status: number;
  status_verbose: string;
  code: string;
  product?: OpenFoodFactsProduct;
}

/**
 * Open Food Facts API ile barkod ara
 * Not: Ağırlıklı olarak gıda ürünleri için, ilaçlar sınırlı olabilir
 */
export async function searchOpenFoodFacts(
  barcode: string
): Promise<Partial<GlobalMedicine> | null> {
  try {
    log.debug('OpenFoodFacts aranıyor', { barcode });

    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
      method: 'GET',
      headers: {
        'User-Agent': 'IlacHatirlatici/1.0 (Android)',
      },
    });

    if (!response.ok) {
      log.debug('OpenFoodFacts API hatası', { status: response.status });
      return null;
    }

    const data: OpenFoodFactsResponse = await response.json();

    if (data.status !== 1 || !data.product) {
      log.debug('OpenFoodFacts ürün bulunamadı');
      return null;
    }

    const product = data.product;
    log.debug('OpenFoodFacts bulundu', { name: product.product_name || product.product_name_tr });

    // İlaç olup olmadığını kontrol et
    const categories = (product.categories || '').toLowerCase();
    const isMedicine =
      categories.includes('medicine') ||
      categories.includes('pharmaceutical') ||
      categories.includes('ilaç') ||
      categories.includes('drug');

    const rawName = product.product_name_tr || product.product_name || 'Bilinmeyen Ürün';
    return {
      barcode: barcode,
      name: fixTurkishCharacters(rawName),
      manufacturer: product.brands || 'Bilinmiyor',
      dosage: fixTurkishCharacters(product.quantity || ''),
      form: detectMedicineForm(rawName),
      country: detectCountry(product.countries),
      imageUrl: product.image_url,
    };
  } catch (error) {
    log.error('OpenFoodFacts hata', error);
    return null;
  }
}

// ============ TİTCK EXCEL CACHE ============

const TITCK_CACHE_KEY = '@titck_medicine_cache';
const TITCK_CACHE_TIMESTAMP_KEY = '@titck_cache_timestamp';
const CACHE_EXPIRY_DAYS = 7;

interface TITCKMedicine {
  barcode: string;
  name: string;
  manufacturer: string;
  price: number;
  atcCode?: string;
  dosage?: string;
}

/**
 * TİTCK cache'den barkod ara
 */
export async function searchTITCKCache(barcode: string): Promise<Partial<GlobalMedicine> | null> {
  try {
    log.debug('TITCK Cache aranıyor', { barcode });

    const cacheData = await AsyncStorage.getItem(TITCK_CACHE_KEY);
    if (!cacheData) {
      log.debug('TITCK Cache boş');
      return null;
    }

    const medicines: TITCKMedicine[] = JSON.parse(cacheData);
    const found = medicines.find(m => m.barcode === barcode);

    if (!found) {
      log.debug('TITCK Cache bulunamadı');
      return null;
    }

    log.debug('TITCK Cache bulundu', { name: found.name });

    const fixedName = fixTurkishCharacters(found.name);
    return {
      barcode: found.barcode,
      name: fixedName,
      manufacturer: found.manufacturer,
      dosage: fixTurkishCharacters(found.dosage || extractDosageFromName(found.name)),
      form: detectMedicineForm(found.name),
      country: 'TR',
    };
  } catch (error) {
    log.error('TITCK Cache hata', error);
    return null;
  }
}

/**
 * TİTCK verilerini cache'e kaydet
 * Not: Bu fonksiyon admin panelinden veya manuel olarak çağrılabilir
 */
export async function updateTITCKCache(medicines: TITCKMedicine[]): Promise<void> {
  try {
    await AsyncStorage.setItem(TITCK_CACHE_KEY, JSON.stringify(medicines));
    await AsyncStorage.setItem(TITCK_CACHE_TIMESTAMP_KEY, Date.now().toString());
    log.debug('TITCK Cache güncellendi', { count: medicines.length });
  } catch (error) {
    log.error('TITCK Cache güncelleme hatası', error);
    throw error;
  }
}

/**
 * Cache'in güncel olup olmadığını kontrol et
 */
export async function isTITCKCacheValid(): Promise<boolean> {
  try {
    const timestamp = await AsyncStorage.getItem(TITCK_CACHE_TIMESTAMP_KEY);
    if (!timestamp) return false;

    const cacheAge = Date.now() - parseInt(timestamp);
    const maxAge = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    return cacheAge < maxAge;
  } catch {
    return false;
  }
}

/**
 * Cache'deki ilaç sayısını getir
 */
export async function getTITCKCacheCount(): Promise<number> {
  try {
    const cacheData = await AsyncStorage.getItem(TITCK_CACHE_KEY);
    if (!cacheData) return 0;

    const medicines: TITCKMedicine[] = JSON.parse(cacheData);
    return medicines.length;
  } catch {
    return 0;
  }
}

// ============ İLACABAK.COM ARAMA (İsim ile) ============

/**
 * ilacabak.com'dan ilaç adı ile ara (web scraping)
 * Not: Bu fonksiyon rate-limiting'e dikkat ederek kullanılmalı
 */
export async function searchIlacabakByName(
  medicineName: string
): Promise<Partial<GlobalMedicine>[] | null> {
  try {
    log.debug('İlacabak isim ile aranıyor', { medicineName });

    const encodedName = encodeURIComponent(medicineName);
    const response = await fetch(`https://ilacabak.com/canliArama.php?sorgu=${encodedName}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36',
        Accept: 'text/html',
      },
    });

    if (!response.ok) {
      log.debug('İlacabak API hatası', { status: response.status });
      return null;
    }

    const html = await response.text();

    // HTML'den ilaç bilgilerini parse et
    const results = parseIlacabakResults(html);

    if (results.length === 0) {
      log.debug('İlacabak sonuç bulunamadı');
      return null;
    }

    log.debug('Ilacabak bulundu', { count: results.length });
    return results;
  } catch (error) {
    log.error('Ilacabak hata', error);
    return null;
  }
}

/**
 * ilacabak.com HTML sonuçlarını parse et
 */
function parseIlacabakResults(html: string): Partial<GlobalMedicine>[] {
  const results: Partial<GlobalMedicine>[] = [];

  try {
    // <li> elementlerini bul
    const liRegex =
      /<li[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*title="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<\/li>/gi;
    let match;

    while ((match = liRegex.exec(html)) !== null) {
      const [, url, title, name] = match;

      // URL'den barkod çıkar (varsa)
      const barcodeMatch = url.match(/-(\d{13})$/);
      const barcode = barcodeMatch ? barcodeMatch[1] : undefined;

      const fixedName = fixTurkishCharacters(name.trim());
      results.push({
        barcode,
        name: fixedName,
        dosage: extractDosageFromName(name),
        form: detectMedicineForm(name),
        country: 'TR',
      });
    }
  } catch (error) {
    log.error('İlacabak parse hatası', error);
  }

  return results;
}

// ============ YARDIMCI FONKSİYONLAR ============

/**
 * Türkçe karakter düzeltme - API'lerden gelen ASCII metinleri düzelt
 * Yaygın ilaç terimlerindeki eksik Türkçe karakterleri ekler
 */
const TURKISH_CORRECTIONS: Record<string, string> = {
  // Büyük harf düzeltmeleri
  GOZ: 'GÖZ',
  SURUP: 'ŞURUP',
  KAPSUL: 'KAPSÜL',
  SUSPANSIYON: 'SÜSPANSİYON',
  EMULSIYON: 'EMÜLSİYON',
  FITIL: 'FİTİL',
  SASE: 'SAŞE',
  GRANUL: 'GRANÜL',
  COZUCU: 'ÇÖZÜCÜ',
  COZELTI: 'ÇÖZELTİ',
  ENJEKSIYON: 'ENJEKSİYON',
  LOSYON: 'LOSYON',
  MERHEM: 'MERHEM',
  KREM: 'KREM',
  JEL: 'JEL',
  SPREY: 'SPREY',
  INHALER: 'İNHALER',
  ILAC: 'İLAÇ',
  OZEL: 'ÖZEL',
  URUN: 'ÜRÜN',
  ICIN: 'İÇİN',
  AGIZ: 'AĞIZ',
  ORAL: 'ORAL',
  TOPIKAL: 'TOPİKAL',
  OFTALMIK: 'OFTALMİK',
  // Küçük harf düzeltmeleri
  goz: 'göz',
  surup: 'şurup',
  kapsul: 'kapsül',
  suspansiyon: 'süspansiyon',
  emulsiyon: 'emülsiyon',
  fitil: 'fitil',
  sase: 'saşe',
  granul: 'granül',
  cozucu: 'çözücü',
  cozelti: 'çözelti',
  enjeksiyon: 'enjeksiyon',
  ilac: 'ilaç',
  ozel: 'özel',
  urun: 'ürün',
  icin: 'için',
  agiz: 'ağız',
};

function fixTurkishCharacters(text: string): string {
  if (!text) return text;

  let result = text;

  // Her kelimeyi kontrol et ve düzelt
  for (const [wrong, correct] of Object.entries(TURKISH_CORRECTIONS)) {
    // Kelime sınırlarını dikkate alarak değiştir
    const regex = new RegExp(`\\b${wrong}\\b`, 'g');
    result = result.replace(regex, correct);
  }

  return result;
}

/**
 * İlaç adından doz bilgisi çıkar
 */
function extractDosageFromName(name: string): string {
  // Yaygın doz pattern'leri
  const patterns = [
    /(\d+(?:[.,]\d+)?\s*(?:mg|g|ml|mcg|iu|µg))/i,
    /(\d+(?:[.,]\d+)?\s*(?:MG|G|ML|MCG|IU|µG))/i,
    /%\s*(\d+(?:[.,]\d+)?)/i,
  ];

  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      return match[1].toUpperCase();
    }
  }

  return '';
}

/**
 * İlaç adından form tipini tespit et
 */
function detectMedicineForm(name: string): MedicineForm {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('tablet') || nameLower.includes('tb') || nameLower.includes('film')) {
    return 'tablet';
  }
  if (nameLower.includes('kapsül') || nameLower.includes('kapsul') || nameLower.includes('caps')) {
    return 'capsule';
  }
  if (
    nameLower.includes('şurup') ||
    nameLower.includes('surup') ||
    nameLower.includes('syrup') ||
    nameLower.includes('suspansiyon')
  ) {
    return 'syrup';
  }
  if (
    nameLower.includes('enjeksiyon') ||
    nameLower.includes('ampul') ||
    nameLower.includes('flakon') ||
    nameLower.includes('iv') ||
    nameLower.includes('im')
  ) {
    return 'injection';
  }
  if (
    nameLower.includes('krem') ||
    nameLower.includes('cream') ||
    nameLower.includes('merhem') ||
    nameLower.includes('pomad') ||
    nameLower.includes('jel')
  ) {
    return 'cream';
  }
  if (nameLower.includes('damla') || nameLower.includes('drop') || nameLower.includes('göz')) {
    return 'drops';
  }
  if (nameLower.includes('sprey') || nameLower.includes('spray') || nameLower.includes('inhaler')) {
    return 'spray';
  }
  if (nameLower.includes('patch') || nameLower.includes('bant') || nameLower.includes('flaster')) {
    return 'patch';
  }
  if (
    nameLower.includes('supozituvar') ||
    nameLower.includes('suppository') ||
    nameLower.includes('fitil')
  ) {
    return 'suppository';
  }
  if (
    nameLower.includes('toz') ||
    nameLower.includes('powder') ||
    nameLower.includes('saşe') ||
    nameLower.includes('granül')
  ) {
    return 'powder';
  }

  return 'other';
}

/**
 * Ülke bilgisini tespit et
 */
function detectCountry(countries?: string): string {
  if (!countries) return 'TR';

  const countriesLower = countries.toLowerCase();

  if (
    countriesLower.includes('turkey') ||
    countriesLower.includes('türkiye') ||
    countriesLower.includes('turkiye')
  ) {
    return 'TR';
  }
  if (countriesLower.includes('germany') || countriesLower.includes('almanya')) {
    return 'DE';
  }
  if (countriesLower.includes('usa') || countriesLower.includes('united states')) {
    return 'US';
  }
  if (countriesLower.includes('france') || countriesLower.includes('fransa')) {
    return 'FR';
  }

  return 'TR'; // Varsayılan
}

// ============ EXPORT ============

export default {
  searchOpenFoodFacts,
  searchTITCKCache,
  updateTITCKCache,
  isTITCKCacheValid,
  getTITCKCacheCount,
  searchIlacabakByName,
  extractDosageFromName,
  detectMedicineForm,
};
