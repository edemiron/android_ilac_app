/**
 * Medicine Search Orchestrator
 *
 * Hibrit ilaç arama sistemi koordinatörü.
 * Tüm kaynakları sırayla dener ve en iyi sonucu döndürür.
 *
 * Arama Sırası:
 * 1. Firebase globalMedicines DB (en güvenilir, doğrulanmış)
 * 2. TİTCK Excel Cache (resmi Türkiye listesi)
 * 3. Open Food Facts API (açık kaynak)
 * 4. AI Fallback (Gemini/OpenAI)
 *
 * Her aşamada bulunan ilaç Firebase'e kaydedilir (caching).
 */

import { GlobalMedicine } from '../types';
import * as globalMedicineService from './globalMedicineService';
import * as turkishMedicineService from './turkishMedicineService';
import { createScopedLogger } from '../utils/logger';
// AI kaldırıldı - güvenilir sonuç vermiyordu
// import * as aiMedicineService from './aiMedicineService';

const log = createScopedLogger('Orchestrator');

// ============ TYPES ============

export type SearchSource =
  | 'firebase' // Firebase globalMedicines (doğrulanmış)
  | 'titck_cache' // TİTCK Excel cache (resmi liste)
  | 'manual'; // Kullanıcı manuel girişi
// AI ve Open Food Facts kaldırıldı - Türk ilaçları için güvenilir değil

export interface SearchResult {
  success: boolean;
  medicine?: Partial<GlobalMedicine>;
  source: SearchSource;
  confidence: number; // 0-100
  message?: string;
  searchDuration?: number; // ms
}

export interface SearchProgress {
  currentStep: number;
  totalSteps: number;
  currentSource: SearchSource;
  message: string;
}

export type SearchProgressCallback = (progress: SearchProgress) => void;

// ============ CONFIDENCE SCORES ============

const CONFIDENCE_SCORES: Record<SearchSource, number> = {
  firebase: 95, // Doğrulanmış kaynak
  titck_cache: 90, // Resmi TİTCK listesi
  manual: 50, // Kullanıcı girişi
};

// ============ MAIN SEARCH FUNCTION ============

/**
 * Barkod ile ilaç ara - Hibrit arama
 * Tüm kaynakları sırayla dener
 */
export async function searchByBarcode(
  barcode: string,
  onProgress?: SearchProgressCallback
): Promise<SearchResult> {
  const startTime = Date.now();
  // Sadece güvenilir kaynaklar: Firebase ve TİTCK
  const sources: SearchSource[] = ['firebase', 'titck_cache'];

  log.debug('Barkod araması başladı', { barcode });

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];

    // Progress callback
    if (onProgress) {
      onProgress({
        currentStep: i + 1,
        totalSteps: sources.length,
        currentSource: source,
        message: getProgressMessage(source),
      });
    }

    try {
      const result = await searchInSource(barcode, source);

      if (result) {
        const searchDuration = Date.now() - startTime;
        log.debug('Bulundu', { source, searchDuration });

        // Firebase dışındaki kaynaklardan geldiyse, Firebase'e kaydet
        if (source !== 'firebase' && result.name) {
          await saveToFirebase(result, source, barcode);
        }

        return {
          success: true,
          medicine: result,
          source,
          confidence: CONFIDENCE_SCORES[source],
          message: `${getSourceName(source)} kaynağından bulundu`,
          searchDuration,
        };
      }
    } catch (error) {
      log.error(`${source} hatası`, error);
      // Hatayı logla ama aramaya devam et
    }
  }

  // Hiçbir kaynakta bulunamadı
  const searchDuration = Date.now() - startTime;
  log.debug('Bulunamadı', { searchDuration });

  return {
    success: false,
    source: 'manual',
    confidence: 0,
    message: 'İlaç hiçbir kaynakta bulunamadı',
    searchDuration,
  };
}

/**
 * Belirli bir kaynakta ara
 */
async function searchInSource(
  barcode: string,
  source: SearchSource
): Promise<Partial<GlobalMedicine> | null> {
  switch (source) {
    case 'firebase':
      return await globalMedicineService.searchByBarcode(barcode);

    case 'titck_cache':
      return await turkishMedicineService.searchTITCKCache(barcode);

    default:
      return null;
  }
}

/**
 * Bulunan ilacı Firebase'e kaydet (caching)
 */
async function saveToFirebase(
  medicine: Partial<GlobalMedicine>,
  source: SearchSource,
  barcode: string
): Promise<void> {
  try {
    // Sadece yeterli bilgi varsa kaydet
    if (!medicine.name || medicine.name === 'Bilinmeyen Urun') {
      log.debug('Yetersiz bilgi, Firebase kaydedilmiyor');
      return;
    }

    // AI kaldırıldığı için tüm kaynaklar 'user' olarak kaydedilir
    // firebase kaynağı zaten var, yeniden kaydetmeye gerek yok
    const addedBy = source === 'firebase' ? 'user' : 'user';

    await globalMedicineService.addMedicine(
      {
        barcode,
        name: medicine.name,
        genericName: medicine.genericName,
        dosage: medicine.dosage || '',
        form: medicine.form || 'other',
        manufacturer: medicine.manufacturer || 'Bilinmiyor',
        country: medicine.country || 'TR',
        imageUrl: medicine.imageUrl,
      },
      addedBy
    );

    log.debug('Firebase kaydedildi', { name: medicine.name });
  } catch (error) {
    log.error('Firebase kayıt hatası', error);
    // Hata olsa bile ana akışı bozma
  }
}

// ============ İSİM İLE ARAMA ============

/**
 * İlaç adı ile ara
 */
export async function searchByName(
  name: string,
  onProgress?: SearchProgressCallback
): Promise<SearchResult[]> {
  const startTime = Date.now();
  const results: SearchResult[] = [];

  log.debug('İsim araması başladı', { name });

  // 1. Firebase'de ara
  if (onProgress) {
    onProgress({
      currentStep: 1,
      totalSteps: 2,
      currentSource: 'firebase',
      message: 'Veritabanında aranıyor...',
    });
  }

  try {
    const firebaseResults = await globalMedicineService.autocomplete(name, 'TR', 10);
    for (const result of firebaseResults) {
      const medicine = await globalMedicineService.getMedicineById(result.id);
      if (medicine) {
        results.push({
          success: true,
          medicine,
          source: 'firebase',
          confidence: CONFIDENCE_SCORES.firebase,
        });
      }
    }
  } catch (error) {
    log.error('Firebase isim araması hatası', error);
  }

  // 2. İlacabak'ta ara (isim araması için web scraping)
  if (results.length < 5) {
    if (onProgress) {
      onProgress({
        currentStep: 2,
        totalSteps: 2,
        currentSource: 'titck_cache',
        message: 'İlaç rehberinde aranıyor...',
      });
    }

    try {
      const ilacabakResults = await turkishMedicineService.searchIlacabakByName(name);
      if (ilacabakResults) {
        for (const medicine of ilacabakResults) {
          // Zaten Firebase sonuçlarında yoksa ekle
          const exists = results.some(
            r => r.medicine?.name?.toLowerCase() === medicine.name?.toLowerCase()
          );
          if (!exists) {
            results.push({
              success: true,
              medicine,
              source: 'titck_cache', // İlacabak'ı bu kategoride sayıyoruz
              confidence: 80,
            });
          }
        }
      }
    } catch (error) {
      log.error('İlacabak isim araması hatası', error);
    }
  }
  // AI kaldırıldı - güvenilir sonuç vermiyordu

  const searchDuration = Date.now() - startTime;
  log.debug('İsim araması tamamlandı', { resultCount: results.length, searchDuration });

  // Confidence'a göre sırala
  return results.sort((a, b) => b.confidence - a.confidence);
}

// ============ UTILITY FUNCTIONS ============

/**
 * Progress mesajı getir
 */
function getProgressMessage(source: SearchSource): string {
  switch (source) {
    case 'firebase':
      return 'Veritabanında aranıyor...';
    case 'titck_cache':
      return 'TİTCK listesinde aranıyor...';
    default:
      return 'Aranıyor...';
  }
}

/**
 * Kaynak adı getir (Türkçe)
 */
function getSourceName(source: SearchSource): string {
  switch (source) {
    case 'firebase':
      return 'Veritabanı';
    case 'titck_cache':
      return 'TİTCK Resmi Liste';
    case 'manual':
      return 'Manuel Giriş';
    default:
      return 'Bilinmeyen';
  }
}

/**
 * Kaynak güvenilirlik bilgisi
 */
export function getSourceInfo(source: SearchSource): {
  name: string;
  confidence: number;
  description: string;
  color: string;
} {
  switch (source) {
    case 'firebase':
      return {
        name: 'Doğrulanmış Kaynak',
        confidence: CONFIDENCE_SCORES.firebase,
        description: 'Uygulama veritabanında doğrulanmış ilaç bilgisi',
        color: '#4CAF50', // Yeşil
      };
    case 'titck_cache':
      return {
        name: 'TİTCK Resmi Liste',
        confidence: CONFIDENCE_SCORES.titck_cache,
        description: 'Türkiye İlaç ve Tıbbi Cihaz Kurumu resmi ilaç listesi',
        color: '#2196F3', // Mavi
      };
    case 'manual':
      return {
        name: 'Manuel Giriş',
        confidence: CONFIDENCE_SCORES.manual,
        description: 'Kullanıcı tarafından manuel olarak girilmiş bilgi',
        color: '#607D8B', // Gri
      };
    default:
      return {
        name: 'Bilinmeyen',
        confidence: 0,
        description: '',
        color: '#9E9E9E',
      };
  }
}

// ============ CACHE MANAGEMENT ============

/**
 * Tüm cache'lerin durumunu getir
 */
export async function getCacheStatus(): Promise<{
  titckCacheCount: number;
  titckCacheValid: boolean;
  firebaseSyncDate?: string;
}> {
  const titckCacheCount = await turkishMedicineService.getTITCKCacheCount();
  const titckCacheValid = await turkishMedicineService.isTITCKCacheValid();

  return {
    titckCacheCount,
    titckCacheValid,
  };
}

// ============ EXPORT ============

export default {
  searchByBarcode,
  searchByName,
  getSourceInfo,
  getCacheStatus,
};
