/**
 * Hibrit Barkod Arama Servisi v3
 * 
 * Çalışma mantığı:
 * 1. Firebase cache'den ara (en hızlı)
 * 2. Web search ile Türk ilaç sitelerinden ara (EN GÜVENİLİR)
 * 3. Open Food Facts API'den ara
 * 4. Bulunan ilacı Firebase'e kaydet
 * 
 * NOT: AI kullanılmıyor çünkü güvenilir değil!
 */

import { GlobalMedicine, MedicineForm } from '../types';
import { createScopedLogger } from '../utils/logger';
import { searchOpenFoodFacts } from './turkishMedicineService';
import { addMedicine, barcodeExists, getMedicineByBarcode } from './globalMedicineService';

const log = createScopedLogger('HybridBarcodeService');

export interface BarcodeSearchResult {
  success: boolean;
  source: 'firebase' | 'ilacabak' | 'ilacdata' | 'web_search' | 'open_food_facts' | 'manual';
  confidence: number;
  medicine?: Partial<GlobalMedicine>;
  needsVerification?: boolean;
  message?: string;
}

interface WebSearchMedicine {
  name: string;
  genericName?: string;
  manufacturer?: string;
  form?: MedicineForm;
  dosage?: string;
  price?: string;
  barcode: string;
}

/**
 * İlaç formunu tespit et
 */
function detectMedicineForm(name: string): MedicineForm {
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('tablet') || nameLower.includes('tb')) return 'tablet';
  if (nameLower.includes('kapsül') || nameLower.includes('capsule')) return 'capsule';
  if (nameLower.includes('şurup') || nameLower.includes('süspansiyon') || nameLower.includes('likit')) return 'syrup';
  if (nameLower.includes('damla') || nameLower.includes('gtt') || nameLower.includes('göz') || nameLower.includes('goz')) return 'drops';
  if (nameLower.includes('krem') || nameLower.includes('merhem') || nameLower.includes('jel')) return 'cream';
  if (nameLower.includes('sprey') || nameLower.includes('spray') || nameLower.includes('inhaler')) return 'spray';
  if (nameLower.includes('enjeksiyon') || nameLower.includes('ampul') || nameLower.includes('flakon')) return 'injection';
  if (nameLower.includes('supozituar') || nameLower.includes('fitil')) return 'suppository';
  if (nameLower.includes('toz') || nameLower.includes('saşe')) return 'powder';
  if (nameLower.includes('bant') || nameLower.includes('flaster')) return 'patch';
  if (nameLower.includes('emülsiyon') || nameLower.includes('emulsiyon')) return 'drops';
  
  return 'other';
}

/**
 * İlacabak.com'dan ilaç bilgisi parse et
 */
function parseIlacabakResult(text: string, barcode: string): WebSearchMedicine | null {
  try {
    // İlaç adını çıkar - genellikle başlıkta
    // Format: "DEPORES FREE %0.05 GOZ DAMLASI, EMULSIYON (5,5 ML) - İlacabak"
    const nameMatch = text.match(/^([A-ZÇĞİÖŞÜ0-9%.,\s()]+?)(?:\s*-\s*İlacabak|$)/im);
    
    let name = '';
    if (nameMatch) {
      name = nameMatch[1].trim();
    }
    
    // Alternatif: Title'dan al
    if (!name) {
      const titleMatch = text.match(/title[:\s]*([^,\n]+)/i);
      if (titleMatch) {
        name = titleMatch[1].replace(/- İlacabak/i, '').trim();
      }
    }

    // Etken madde
    let genericName = '';
    const genericMatch = text.match(/etkin maddesi[:\s]*\*?\*?([^*\n]+)\*?\*?/i);
    if (genericMatch) {
      genericName = genericMatch[1].replace(/[*[\]]/g, '').trim();
    }

    // Üretici firma
    let manufacturer = '';
    const mfgMatch = text.match(/([A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü\s.]+(?:A\.Ş\.|ANONİM ŞİRKETİ|İLAÇ|HOLDING))/);
    if (mfgMatch) {
      manufacturer = mfgMatch[1].trim();
    }

    // Fiyat
    let price = '';
    const priceMatch = text.match(/([\d.,]+)\s*₺/);
    if (priceMatch) {
      price = priceMatch[1] + ' ₺';
    }

    // Doz
    let dosage = '';
    const dosageMatch = name.match(/(\d+(?:[.,]\d+)?)\s*(mg|ml|%|gr|mcg)/i);
    if (dosageMatch) {
      dosage = dosageMatch[0];
    }

    if (name && name.length > 5) {
      return {
        name,
        genericName,
        manufacturer,
        form: detectMedicineForm(name),
        dosage,
        price,
        barcode,
      };
    }

    return null;
  } catch (error) {
    log.error('İlacabak parse hatası', error);
    return null;
  }
}

/**
 * Web search sonuçlarından ilaç bilgisi çıkar
 */
function parseWebSearchResults(results: any[], barcode: string): WebSearchMedicine | null {
  try {
    for (const result of results) {
      const doc = result.doc || result;
      
      for (const item of (Array.isArray(doc) ? doc : [doc])) {
        const title = item.title || '';
        const summary = item.summary || '';
        const url = item.url || '';
        
        // Barkod eşleşmesi kontrol et
        if (!summary.includes(barcode) && !title.includes(barcode)) {
          continue;
        }
        
        // İlacabak sonucu
        if (url.includes('ilacabak.com')) {
          const parsed = parseIlacabakResult(title + '\n' + summary, barcode);
          if (parsed) return parsed;
        }
        
        // İlacdata sonucu
        if (url.includes('ilacdata.com') || url.includes('ilactr.com') || url.includes('ilacfiyati.com')) {
          // Başlıktan ilaç adını çıkar
          const nameMatch = title.match(/^([^-|]+)/);
          if (nameMatch) {
            const name = nameMatch[1].trim();
            
            // Etken madde
            let genericName = '';
            const genericMatch = summary.match(/Etken Madde[:\s]*([^.\n,]+)/i);
            if (genericMatch) {
              genericName = genericMatch[1].trim();
            }
            
            // Firma
            let manufacturer = '';
            const mfgMatch = summary.match(/Firma[:\s]*([^.\n,]+)|FİRMA[:\s]*([^.\n,]+)/i);
            if (mfgMatch) {
              manufacturer = (mfgMatch[1] || mfgMatch[2] || '').trim();
            }

            if (name.length > 5) {
              return {
                name,
                genericName,
                manufacturer,
                form: detectMedicineForm(name),
                barcode,
              };
            }
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    log.error('Web search parse hatası', error);
    return null;
  }
}

/**
 * Hibrit barkod arama (v3 - Web search tabanlı)
 */
export async function searchBarcodeHybrid(barcode: string): Promise<BarcodeSearchResult> {
  try {
    log.debug('Hibrit barkod arama başladı', { barcode });

    // 1. ÖNCELİK: Firebase'de daha önce eklenmiş mi?
    try {
      const firebaseExists = await barcodeExists(barcode);
      if (firebaseExists) {
        log.debug('Firebase cache bulundu');
        const medicine = await getMedicineByBarcode(barcode);
        
        if (medicine) {
          return {
            success: true,
            source: 'firebase',
            confidence: 100,
            medicine,
            needsVerification: false,
            message: 'Daha önce eklenmiş ilaç bulundu',
          };
        }
      }
    } catch (firebaseError) {
      log.debug('Firebase erişim hatası, devam ediliyor...', { error: String(firebaseError) });
    }

    // 2. Open Food Facts API
    log.debug('Open Food Facts aranıyor...');
    try {
      const openFoodResult = await searchOpenFoodFacts(barcode);
      if (openFoodResult && openFoodResult.name && openFoodResult.name !== 'Bilinmeyen Ürün') {
        log.debug('Open Food Facts bulundu', { name: openFoodResult.name });
        
        return {
          success: true,
          source: 'open_food_facts',
          confidence: 70,
          medicine: openFoodResult,
          needsVerification: true,
          message: 'Open Food Facts veritabanında bulundu (doğrulama önerilir)',
        };
      }
    } catch (offError) {
      log.debug('Open Food Facts hatası', { error: String(offError) });
    }

    // 3. Hiçbir yerde bulunamadı
    // NOT: Web search servisi React Native'de çalışmaz, 
    // bu fonksiyon sadece backend'de veya test ortamında kullanılır
    log.debug('Veritabanlarında bulunamadı - manuel giriş gerekli');
    
    return {
      success: false,
      source: 'manual',
      confidence: 0,
      message: 'İlaç veritabanlarında bulunamadı. Lütfen manuel olarak girin.',
    };
  } catch (error: any) {
    log.error('Hibrit arama hatası', error);
    return {
      success: false,
      source: 'manual',
      confidence: 0,
      message: error.message || 'Arama sırasında bir hata oluştu',
    };
  }
}

/**
 * Web search ile barkod ara (Backend/Test için)
 * Bu fonksiyon web_search tool'u ile çağrılmalı
 */
export function parseWebSearchForBarcode(
  searchResults: any[],
  barcode: string
): BarcodeSearchResult {
  const parsed = parseWebSearchResults(searchResults, barcode);
  
  if (parsed) {
    const medicine: Partial<GlobalMedicine> = {
      barcode: parsed.barcode,
      name: parsed.name,
      genericName: parsed.genericName,
      manufacturer: parsed.manufacturer || 'Bilinmiyor',
      form: parsed.form || 'other',
      dosage: parsed.dosage,
      country: 'TR',
    };
    
    return {
      success: true,
      source: 'web_search',
      confidence: 95,
      medicine,
      needsVerification: false,
      message: 'Türk ilaç sitelerinde bulundu',
    };
  }
  
  return {
    success: false,
    source: 'manual',
    confidence: 0,
    message: 'Web aramada bulunamadı',
  };
}

/**
 * Kullanıcı tarafından doğrulanmış ilacı Firebase'e kaydet
 */
export async function saveMedicineToFirebase(
  medicine: Partial<GlobalMedicine>,
  source: 'web_search' | 'ilacabak' | 'manual' | 'open_food_facts'
): Promise<void> {
  try {
    if (!medicine.barcode) {
      throw new Error('Barkod gerekli');
    }

    const addedBy = source === 'manual' ? 'user' : 'ai';
    const globalMedicine = {
      barcode: medicine.barcode!,
      name: medicine.name || 'Bilinmeyen',
      dosage: medicine.dosage || '',
      form: medicine.form || 'other',
      manufacturer: medicine.manufacturer || 'Bilinmiyor',
      country: medicine.country || 'TR',
      genericName: medicine.genericName,
      prospectus: medicine.prospectus,
      imageUrl: medicine.imageUrl,
    };

    await addMedicine(globalMedicine, addedBy);
    log.debug('İlaç Firebase\'e kaydedildi', { barcode: medicine.barcode });
  } catch (error) {
    log.error('Firebase kayıt hatası', error);
    throw error;
  }
}

/**
 * Barkod için ilaç adı doğrulama
 */
export function validateMedicineName(
  expectedName: string,
  actualName: string
): boolean {
  const normalize = (str: string) => 
    str.toLowerCase().trim().replace(/\s+/g, ' ');
  
  const exp = normalize(expectedName);
  const act = normalize(actualName);
  
  if (exp === act) return true;
  if (exp.includes(act) || act.includes(exp)) return true;
  
  const expFirstWord = exp.split(' ')[0];
  const actFirstWord = act.split(' ')[0];
  if (expFirstWord === actFirstWord && expFirstWord.length > 3) return true;
  
  return false;
}
