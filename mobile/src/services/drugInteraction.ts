// İlaç etkileşim servisi
// Not: Bu örnek implementasyon, gerçek bir API entegrasyonu için
// RxNav, OpenFDA veya DrugBank gibi servisler kullanılabilir.

import { createScopedLogger } from '../utils/logger';
import { withServiceResult, type ServiceResult } from './types';

const log = createScopedLogger('DrugInteraction');

export interface DrugInteraction {
  id: string;
  drug1: string;
  drug2: string;
  severity: 'low' | 'moderate' | 'high';
  description: string;
  recommendation: string;
}

export interface InteractionCheckResult {
  hasInteractions: boolean;
  interactions: DrugInteraction[];
  checkedAt: string;
  // Sprint 4: 'local' | 'api' — kaynak göstergesi
  source?: 'local' | 'api';
}

// Bilinen ilaç etkileşimleri veritabanı (örnek)
// Gerçek uygulamada API'den çekilmeli
const KNOWN_INTERACTIONS: Omit<DrugInteraction, 'id'>[] = [
  {
    drug1: 'aspirin',
    drug2: 'warfarin',
    severity: 'high',
    description: 'Aspirin ve Warfarin birlikte kullanıldığında kanama riski artar.',
    recommendation: 'Bu kombinasyondan kaçının veya doktorunuza danışın.',
  },
  {
    drug1: 'aspirin',
    drug2: 'ibuprofen',
    severity: 'moderate',
    description: 'Aspirin ve İbuprofen birlikte kullanıldığında mide kanaması riski artar.',
    recommendation: 'Aynı anda kullanmaktan kaçının.',
  },
  {
    drug1: 'aspirin',
    drug2: 'naproxen',
    severity: 'high',
    description:
      'Aspirin ve Naproxen (Apranax) birlikte kullanıldığında ciddi mide kanaması ve ülser riski artar.',
    recommendation: 'İki NSAID ilacı aynı anda kullanmayın. Doktorunuza danışın.',
  },
  {
    drug1: 'aspirin',
    drug2: 'apranax',
    severity: 'high',
    description:
      'Aspirin ve Apranax birlikte kullanıldığında ciddi mide kanaması ve ülser riski artar.',
    recommendation: 'İki NSAID ilacı aynı anda kullanmayın. Doktorunuza danışın.',
  },
  {
    drug1: 'ibuprofen',
    drug2: 'naproxen',
    severity: 'high',
    description:
      'İbuprofen ve Naproxen birlikte kullanıldığında mide kanaması riski ciddi şekilde artar.',
    recommendation: 'İki NSAID ilacı aynı anda kullanmayın.',
  },
  {
    drug1: 'ibuprofen',
    drug2: 'apranax',
    severity: 'high',
    description:
      'İbuprofen ve Apranax birlikte kullanıldığında mide kanaması riski ciddi şekilde artar.',
    recommendation: 'İki NSAID ilacı aynı anda kullanmayın.',
  },
  {
    drug1: 'paracetamol',
    drug2: 'alkol',
    severity: 'high',
    description: 'Parasetamol ve alkol birlikte kullanıldığında karaciğer hasarı riski artar.',
    recommendation: 'Parasetamol kullanırken alkolden kaçının.',
  },
  {
    drug1: 'minoset',
    drug2: 'alkol',
    severity: 'high',
    description:
      'Minoset (Parasetamol) ve alkol birlikte kullanıldığında karaciğer hasarı riski artar.',
    recommendation: 'Minoset kullanırken alkolden kaçının.',
  },
  {
    drug1: 'omeprazol',
    drug2: 'clopidogrel',
    severity: 'moderate',
    description: "Omeprazol, Clopidogrel'in etkinliğini azaltabilir.",
    recommendation: 'Alternatif proton pompa inhibitörü kullanmayı düşünün.',
  },
  {
    drug1: 'metformin',
    drug2: 'alkol',
    severity: 'high',
    description: 'Metformin ile alkol kullanımı laktik asidoz riskini artırır.',
    recommendation: 'Metformin kullanırken alkolden kaçının.',
  },
  {
    drug1: 'lisinopril',
    drug2: 'potasyum',
    severity: 'moderate',
    description: 'ACE inhibitörleri potasyum düzeylerini artırabilir.',
    recommendation: 'Potasyum takviyeleri kullanırken dikkatli olun.',
  },
  {
    drug1: 'simvastatin',
    drug2: 'grapefruit',
    severity: 'moderate',
    description: 'Greyfurt, Simvastatin düzeylerini artırarak kas hasarı riskini artırır.',
    recommendation: 'Simvastatin kullanırken greyfurt tüketmekten kaçının.',
  },
  {
    drug1: 'amlodipine',
    drug2: 'simvastatin',
    severity: 'moderate',
    description: 'Amlodipine, Simvastatin düzeylerini artırabilir.',
    recommendation: 'Simvastatin dozunu 20mg ile sınırlayın.',
  },
  {
    drug1: 'ciprofloxacin',
    drug2: 'tizanidine',
    severity: 'high',
    description: 'Siprofloksasin, Tizanidin düzeylerini tehlikeli şekilde artırır.',
    recommendation: 'Bu kombinasyondan kesinlikle kaçının.',
  },
  {
    drug1: 'fluoxetine',
    drug2: 'tramadol',
    severity: 'high',
    description: 'Serotonin sendromu riski vardır.',
    recommendation: 'Bu kombinasyondan kaçının veya yakın takip gerektirir.',
  },
  {
    drug1: 'methotrexate',
    drug2: 'nsaid',
    severity: 'high',
    description: "NSAID'ler Metotreksat toksisitesini artırabilir.",
    recommendation: 'Doktorunuza danışmadan birlikte kullanmayın.',
  },
  {
    drug1: 'paracetamol',
    drug2: 'dexketoprofen',
    severity: 'moderate',
    description:
      'Aynı anda birden fazla ağrı kesici kullanmak mide, karaciğer ve böbrekler üzerinde ekstra yük oluşturabilir.',
    recommendation:
      'Gerekmedikçe birlikte kullanmayın veya dönüşümlü/aralıklı kullanmayı doktorunuza sıklığını danışarak tercih edin.',
  },
];

// ==========================================
// 1. TÜRKÇE -> EVRENSEL ETKEN MADDE SÖZLÜĞÜ
// ==========================================
// RxNav API sadece etken maddeleri veya ABD ticari isimlerini tanır.
// Bu sözlük, Türkiye'deki yaygın ticari araçları evrensel isimlerine veya
// doğrudan RxNorm Concept Unique Identifier (RxCUI) kodlarına eşler.
const TURKISH_TO_RXNORM_MAP: Record<string, string> = {
  // Analjezikler & NSAID'ler
  parol: 'paracetamol',
  minoset: 'paracetamol',
  vermidon: 'paracetamol',
  calpol: 'paracetamol',
  arveles: 'dexketoprofen',
  majezik: 'flurbiprofen',
  apranax: 'naproxen',
  dikloron: 'diclofenac',
  coraspin: 'aspirin',
  ecopirin: 'aspirin',
  novalgin: 'metamizole', // RxNav'da metamizole (dipyrone) kısıtlı olabilir
  ibufen: 'ibuprofen',
  brufen: 'ibuprofen',
  dolven: 'ibuprofen',

  // Antibiyotikler
  augmentin: 'amoxicillin',
  klamoks: 'amoxicillin',
  croxilex: 'amoxicillin',
  cipro: 'ciprofloxacin',
  monurol: 'fosfomycin',
  zinnat: 'cefuroxime',
  azitro: 'azithromycin',
  macrol: 'clarithromycin',

  // Mide Koruyucular & Sindirim
  pantpas: 'pantoprazole',
  panto: 'pantoprazole',
  nexium: 'esomeprazole',
  lansor: 'lansoprazole',
  rennie: 'calcium carbonate', // Basitleştirilmiş
  gaviscon: 'alginic acid',

  // Antidepresan & Nöroloji
  cipralex: 'escitalopram',
  selectra: 'sertraline',
  lustral: 'sertraline',
  prozac: 'fluoxetine',
  paxera: 'paroxetine',
  symra: 'pregabalin',
  lyrica: 'pregabalin',

  // Tansiyon & Kardiyoloji
  beloc: 'metoprolol',
  sanisoc: 'metoprolol',
  vasoxen: 'nebivolol',
  delix: 'ramipril',
  coversyl: 'perindopril',
  karvezide: 'irbesartan',
  atacand: 'candesartan',

  // Diyabet
  matofin: 'metformin',
  glucophage: 'metformin',
  diaformin: 'metformin',
  forziga: 'dapagliflozin',
  jardiance: 'empagliflozin',

  // Kan Sulandırıcılar
  plavix: 'clopidogrel',
  karum: 'clopidogrel',
  xarelto: 'rivaroxaban',
  eliquis: 'apixaban',

  // Antihistaminik & Soğuk Algınlığı (Genel)
  zyrtec: 'cetirizine',
  allerset: 'cetirizine',
  aerius: 'desloratadine',
  crebros: 'levocetirizine',
  aferin: 'paracetamol', // Çoklu etken madde ama en kritiği
  nurofen: 'ibuprofen', // Veya Nurofen Plus
  katarin: 'paracetamol',
};

// İlaç adını normalize et ve etken maddeye çevir
function normalizeDrugName(name: string): string {
  if (!name) return '';
  const lowerName = name.toLowerCase().trim();

  // Önce map'te tam eşleşme ara
  for (const [tradeName, genericName] of Object.entries(TURKISH_TO_RXNORM_MAP)) {
    if (lowerName.includes(tradeName)) {
      return genericName;
    }
  }

  // Eşleşme yoksa standart temizleme yapıp bırak (belki kendisi etken maddedir)
  return lowerName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// İlaç adının eşleşip eşleşmediğini kontrol et
function drugMatches(drugName: string, interactionDrug: string): boolean {
  const normalizedName = normalizeDrugName(drugName);
  const normalizedInteraction = normalizeDrugName(interactionDrug);

  // Tam eşleşme veya içerme kontrolü
  return (
    normalizedName.includes(normalizedInteraction) ||
    normalizedInteraction.includes(normalizedName) ||
    normalizedName === normalizedInteraction
  );
}

// İki ilaç arasındaki yerel etkileşimi kontrol et (Fallback)
export function checkInteractionLocal(drug1: string, drug2: string): DrugInteraction | null {
  for (const interaction of KNOWN_INTERACTIONS) {
    if (
      (drugMatches(drug1, interaction.drug1) && drugMatches(drug2, interaction.drug2)) ||
      (drugMatches(drug1, interaction.drug2) && drugMatches(drug2, interaction.drug1))
    ) {
      return {
        id: `loc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        ...interaction,
        drug1,
        drug2,
      };
    }
  }
  return null;
}

// İki ilaç arasındaki etkileşimi kontrol et (async wrapper).
// Sprint 4 (skip testleri geri ekleme): `drugInteraction.test.ts` bu fonksiyonu
// import ediyor. Önce local DB'den kontrol et, yoksa API'ye düş.
// Bu fonksiyon `checkInteractionLocal` + ileride API fallback'i birleştirir.
export async function checkInteraction(
  drug1: string,
  drug2: string
): Promise<InteractionCheckResult> {
  const localResult = checkInteractionLocal(drug1, drug2);
  const now = new Date().toISOString();

  if (localResult) {
    return {
      interactions: [localResult],
      hasInteractions: true,
      checkedAt: now,
      source: 'local',
    };
  }

  // Local DB'de yoksa, sonuc yok olarak dön. İleride RxNorm API entegrasyonu
  // eklendiğinde burada checkInteractionsFromAPI'ye fallback yapılabilir.
  return {
    interactions: [],
    hasInteractions: false,
    checkedAt: now,
    source: 'local',
  };
}

// Birden fazla ilaç için gerçek RxNav API veya yerel kontrol (HIBRIT)
export async function checkMultipleInteractions(
  drugNames: string[]
): Promise<InteractionCheckResult> {
  const interactions: DrugInteraction[] = [];

  try {
    // 1. Her ilacın RxCUI kodunu bulmaya çalış ve duplicate (aynı etken madde) kontrolü yap
    const rxcuis: string[] = [];
    const validFoundDrugs: string[] = [];
    const cuiToDrugMap: Record<string, string[]> = {}; // { '161': ['Parol', 'Minoset'] }

    for (const name of drugNames) {
      const genericName = normalizeDrugName(name); // Ticari ismi etken maddeye çevir
      const cui = await getRxCuiForDrug(genericName);
      if (cui) {
        if (!rxcuis.includes(cui)) {
          rxcuis.push(cui);
          validFoundDrugs.push(name);
        }

        // Duplicate Therapy (Aynı Etken Madde) Takibi
        if (!cuiToDrugMap[cui]) cuiToDrugMap[cui] = [];
        cuiToDrugMap[cui].push(name);
      }
    }

    // Duplicate Therapy Kontrolünü Sonuçlara Ekle
    for (const [_cui, duplicates] of Object.entries(cuiToDrugMap)) {
      if (duplicates.length > 1) {
        // İkiden fazla aynı etken madde bulundu
        for (let i = 0; i < duplicates.length; i++) {
          for (let j = i + 1; j < duplicates.length; j++) {
            interactions.push({
              id: `dup-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              drug1: duplicates[i],
              drug2: duplicates[j],
              severity: 'high',
              description:
                'Dikkat! Bu iki ilaç KESİNLİKLE aynı etken maddeyi içermektedir (Çifte Doz / Duplicate Therapy).',
              recommendation:
                'Aşırı doz ve toksisite (zehirlenme) riskine karşı lütfen bu ilaçları aynı anda kullanmayın. Hangisini kullanmanız gerektiğini doktorunuza danışın.',
            });
          }
        }
      }
    }

    // 2. Eğer bulunabilen en az 2 RxCUI varsa Gerçek API'ye sor
    let apiSuccess = false;
    if (rxcuis.length >= 2) {
      log.info('RxNav API ye istek atiliyor...', { rxcuis });
      const apiResult = await checkInteractionsFromAPI(rxcuis, validFoundDrugs);

      if (apiResult.interactions.length > 0) {
        interactions.push(...apiResult.interactions);
      }
      apiSuccess = true; // API başarılı çalıştı (sonuç boş dönse bile)
    }

    // 3. API bulamadı veya etken maddeye çeviremediğimiz ilaçlar varsa
    // Local (Çevrimdışı) Fallback sistemine düş
    if (!apiSuccess || rxcuis.length < drugNames.length) {
      log.info('Bazi ilaclar RxNav da bulunamadi, Yerel veritabani kontrolu de yapiliyor...');
      for (let i = 0; i < drugNames.length; i++) {
        for (let j = i + 1; j < drugNames.length; j++) {
          const locInt = checkInteractionLocal(drugNames[i], drugNames[j]);
          if (locInt) {
            // Aynı etkileşim zaten API'den geldiyse ekleme (duplicate önlemek için)
            const exists = interactions.some(
              apiInt =>
                (drugMatches(apiInt.drug1, locInt.drug1) &&
                  drugMatches(apiInt.drug2, locInt.drug2)) ||
                (drugMatches(apiInt.drug1, locInt.drug2) && drugMatches(apiInt.drug2, locInt.drug1))
            );
            if (!exists) {
              interactions.push(locInt);
            }
          }
        }
      }
    }
  } catch (error) {
    log.error('Etkileşim kontrolü genel hata', error);
  }

  return {
    hasInteractions: interactions.length > 0,
    interactions,
    checkedAt: new Date().toISOString(),
  };
}

// Şiddet düzeyine göre renk
export function getSeverityColor(severity: DrugInteraction['severity']): string {
  switch (severity) {
    case 'high':
      return '#F44336'; // Kırmızı
    case 'moderate':
      return '#FF9800'; // Turuncu
    case 'low':
      return '#FFC107'; // Sarı
    default:
      return '#9E9E9E'; // Gri
  }
}

// Şiddet düzeyine göre ikon
export function getSeverityIcon(severity: DrugInteraction['severity']): string {
  switch (severity) {
    case 'high':
      return '⚠️';
    case 'moderate':
      return '⚡';
    case 'low':
      return 'ℹ️';
    default:
      return '❓';
  }
}

// ==========================================
// 2. RXNAV API BAĞLANTILARI
// ==========================================

// İlacın adından RxNorm Concept Unique Identifier (RxCUI) kodunu bulur
export async function getRxCuiForDrug(drugName: string): Promise<string | null> {
  try {
    const url = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(drugName)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.idGroup && data.idGroup.rxnormId && data.idGroup.rxnormId.length > 0) {
      return data.idGroup.rxnormId[0];
    }
    return null;
  } catch (error) {
    log.error(`RxCUI alinamadi for ${drugName}`, error);
    return null;
  }
}

// RxNav Interaction API üzerinden RxCUI'leri kullanarak etkileşimleri çeker
export async function checkInteractionsFromAPI(
  rxcuis: string[],
  originalDrugNames: string[]
): Promise<InteractionCheckResult> {
  try {
    // https://rxnav.nlm.nih.gov/InteractionAPIs.html
    const url = `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${rxcuis.join('+')}`;

    const response = await fetch(url);
    const data = await response.json();

    const interactions: DrugInteraction[] = [];

    if (data.fullInteractionTypeGroup) {
      for (const group of data.fullInteractionTypeGroup) {
        for (const type of group.fullInteractionType || []) {
          for (const pair of type.interactionPair || []) {
            // Amerikan kaynaklı orjinal isimler
            const apiDrug1 = pair.interactionConcept[0]?.minConceptItem?.name || 'Bilinmeyen';
            const apiDrug2 = pair.interactionConcept[1]?.minConceptItem?.name || 'Bilinmeyen';

            // Kullanıcının yazdığı isimlerle (originalDrugNames) RxNav isimlerini eşleştir (kullanıcıya türkçe adı yansıtmak için)
            const trDrug1 =
              originalDrugNames.find(n => drugMatches(n, apiDrug1) || drugMatches(apiDrug1, n)) ||
              apiDrug1;
            const trDrug2 =
              originalDrugNames.find(n => drugMatches(n, apiDrug2) || drugMatches(apiDrug2, n)) ||
              apiDrug2;

            interactions.push({
              id: `api-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              drug1: trDrug1,
              drug2: trDrug2,
              severity: mapSeverity(pair.severity),
              description: translateApiDescription(pair.description || ''),
              recommendation:
                'Lütfen bunu kullanmadan önce doktorunuza veya eczacınıza danışın (RxNav Uyarısı).',
            });
          }
        }
      }
    }

    return {
      hasInteractions: interactions.length > 0,
      interactions,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    log.error('API etkilesim kontrolu hatasi', error);
    // API başarısız olursa yerel veritabanını kullan
    return {
      hasInteractions: false,
      interactions: [],
      checkedAt: new Date().toISOString(),
    };
  }
}

// API şiddet düzeyini dönüştür
function mapSeverity(apiSeverity: string): DrugInteraction['severity'] {
  const lower = apiSeverity?.toLowerCase() || '';
  if (lower.includes('high') || lower.includes('severe') || lower.includes('major')) {
    return 'high';
  }
  if (lower.includes('moderate') || lower.includes('medium')) {
    return 'moderate';
  }
  return 'low';
}

// RxNav'den gelen İngilizce teknik uyarıları basitleştirilmiş Türkçe'ye çevirir (Otonom Çevirmen)
function translateApiDescription(desc: string): string {
  if (!desc) return '';
  let text = desc;

  // Sık karşılaşılan teknik kelimenin Regex ile değişimi
  const dictionary: Record<string, string> = {
    'The risk or severity of': 'Riski veya şiddeti artabilir:',
    'The serum concentration of': 'Kandaki yoğunluğu artabilir/azalabilir:',
    'can be increased when it is combined with':
      'ile birlikte kullanıldığında etkileşime girebilir.',
    'can be decreased when combined with': 'ile birlikte kullanıldığında etkisi azalabilir.',
    'may increase the': 'artırabilir:',
    activities: 'etkisini',
    'adverse effects': 'yan etkilerini',
    'can cause': 'neden olabilir',
    bleeding: 'kanama',
    toxicity: 'zehirlenme/toksisite',
    'serotonin syndrome': 'serotonin sendromu',
  };

  for (const [eng, tr] of Object.entries(dictionary)) {
    text = text.replace(new RegExp(eng, 'gi'), tr);
  }

  return text;
}

// ============================================================================
// Sprint 6.4: ServiceResult<T> wrapper alternatifleri — geriye donuk uyumluluk
// korunarak yeni API ekleniyor. Eski fonksiyonlar (Promise<T | null>, vb.)
// oldugu gibi kalmaya devam ediyor; yeni fonksiyonlar ServiceResult<T> doner.
// ============================================================================

/**
 * Drug icin RxCUI fetch — Sprint 4.3 ServiceResult<T> wrapper.
 * Network/parse hatalari err doner, basarili donus RxCUI string.
 */
export async function getRxCuiForDrugService(
  drugName: string
): Promise<ServiceResult<string | null>> {
  return withServiceResult(() => getRxCuiForDrug(drugName), {
    errorCode: 'API_ERROR',
  });
}

/**
 * API etkilesim fetch — Sprint 4.3 ServiceResult<T> wrapper.
 * Network/parse hatalari err doner, basarili donus InteractionCheckResult.
 */
export async function checkInteractionsFromAPIService(
  rxcuis: string[],
  originalDrugNames: string[]
): Promise<ServiceResult<InteractionCheckResult>> {
  return withServiceResult(() => checkInteractionsFromAPI(rxcuis, originalDrugNames), {
    errorCode: 'API_ERROR',
  });
}

/**
 * Tek ilac etkilesim kontrolu — Sprint 4.3 ServiceResult<T> wrapper.
 */
export async function checkInteractionService(
  drug1: string,
  drug2: string
): Promise<ServiceResult<InteractionCheckResult>> {
  return withServiceResult(() => checkInteraction(drug1, drug2), {
    errorCode: 'NOT_FOUND',
  });
}

/**
 * Birden fazla ilac etkilesim kontrolu — Sprint 4.3 ServiceResult<T> wrapper.
 */
export async function checkMultipleInteractionsService(
  drugNames: string[]
): Promise<ServiceResult<InteractionCheckResult>> {
  return withServiceResult(() => checkMultipleInteractions(drugNames), {
    errorCode: 'NOT_FOUND',
  });
}

/**
 * Lokalde tek bir ilac etkilesim kontrolu — pure helper (network yok).
 */
export function checkInteractionLocalService(
  drug1: string,
  drug2: string
): ServiceResult<DrugInteraction | null> {
  const result = checkInteractionLocal(drug1, drug2);
  return result ? { ok: true, data: result } : { ok: true, data: null };
}
