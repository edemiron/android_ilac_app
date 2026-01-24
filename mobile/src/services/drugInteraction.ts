// İlaç etkileşim servisi
// Not: Bu örnek implementasyon, gerçek bir API entegrasyonu için 
// RxNav, OpenFDA veya DrugBank gibi servisler kullanılabilir.

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
    drug1: 'omeprazol',
    drug2: 'clopidogrel',
    severity: 'moderate',
    description: 'Omeprazol, Clopidogrel\'in etkinliğini azaltabilir.',
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
    description: 'NSAID\'ler Metotreksat toksisitesini artırabilir.',
    recommendation: 'Doktorunuza danışmadan birlikte kullanmayın.',
  },
];

// İlaç adını normalize et
function normalizeDrugName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Türkçe karakterleri kaldır
    .replace(/[^a-z0-9]/g, ''); // Sadece harf ve rakam
}

// İlaç adının eşleşip eşleşmediğini kontrol et
function drugMatches(drugName: string, interactionDrug: string): boolean {
  const normalizedName = normalizeDrugName(drugName);
  const normalizedInteraction = normalizeDrugName(interactionDrug);
  
  // Tam eşleşme veya içerme kontrolü
  return normalizedName.includes(normalizedInteraction) || 
         normalizedInteraction.includes(normalizedName) ||
         normalizedName === normalizedInteraction;
}

// İki ilaç arasındaki etkileşimi kontrol et
export function checkInteraction(drug1: string, drug2: string): DrugInteraction | null {
  for (const interaction of KNOWN_INTERACTIONS) {
    if (
      (drugMatches(drug1, interaction.drug1) && drugMatches(drug2, interaction.drug2)) ||
      (drugMatches(drug1, interaction.drug2) && drugMatches(drug2, interaction.drug1))
    ) {
      return {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...interaction,
        drug1,
        drug2,
      };
    }
  }
  return null;
}

// Birden fazla ilaç için etkileşim kontrolü
export function checkMultipleInteractions(drugNames: string[]): InteractionCheckResult {
  const interactions: DrugInteraction[] = [];
  
  // Her ilaç çiftini kontrol et
  for (let i = 0; i < drugNames.length; i++) {
    for (let j = i + 1; j < drugNames.length; j++) {
      const interaction = checkInteraction(drugNames[i], drugNames[j]);
      if (interaction) {
        interactions.push(interaction);
      }
    }
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

// RxNav API entegrasyonu (opsiyonel, gerçek API için)
export async function checkInteractionsFromAPI(rxcuis: string[]): Promise<InteractionCheckResult> {
  try {
    // RxNav Interaction API
    // https://rxnav.nlm.nih.gov/InteractionAPIs.html
    const url = `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${rxcuis.join('+')}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    const interactions: DrugInteraction[] = [];
    
    if (data.fullInteractionTypeGroup) {
      for (const group of data.fullInteractionTypeGroup) {
        for (const type of group.fullInteractionType || []) {
          for (const pair of type.interactionPair || []) {
            interactions.push({
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              drug1: pair.interactionConcept[0]?.minConceptItem?.name || 'Bilinmeyen',
              drug2: pair.interactionConcept[1]?.minConceptItem?.name || 'Bilinmeyen',
              severity: mapSeverity(pair.severity),
              description: pair.description || '',
              recommendation: 'Doktorunuza danışın.',
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
    console.error('API etkileşim kontrolü hatası:', error);
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
