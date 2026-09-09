/**
 * foodDrugInteractions — İlaç - Gıda, Alkol ve Klinik Yaşam Tarzı Etkileşim Servisi
 *
 * 2026 Klinik Güvenlik Standardı:
 * - Greyfurt, Süt/Kalsiyum, Alkol, Kafein, Yüksek Potasyum, K Vitamini ve Güneş Işığı etkileşimlerini analiz eder.
 * - Türkiye'de yaygın kullanılan ticari ilaçları ve etken maddeleri destekler.
 */

import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('FoodDrugInteractions');

export type FoodCategory =
  | 'grapefruit'
  | 'dairy_calcium'
  | 'alcohol'
  | 'caffeine'
  | 'potassium_rich'
  | 'vitamin_k'
  | 'sun_exposure'
  | 'timing_food';

export interface FoodInteractionRule {
  id: string;
  drugKeywords: string[]; // Eşleşecek ticari adlar veya etken maddeler (küçük harf)
  category: FoodCategory;
  categoryTitleTr: string;
  categoryTitleEn: string;
  icon: string;
  severity: 'high' | 'moderate' | 'low';
  effectTr: string;
  effectEn: string;
  recommendationTr: string;
  recommendationEn: string;
  timingRuleTr?: string;
  timingRuleEn?: string;
}

export interface MatchedFoodInteraction {
  id: string;
  medicineName: string;
  category: FoodCategory;
  categoryTitle: string;
  icon: string;
  severity: 'high' | 'moderate' | 'low';
  effect: string;
  recommendation: string;
  timingRule?: string;
}

// Kapsamlı Klinik İlaç-Gıda Kural Kütüphanesi
export const FOOD_DRUG_RULES: FoodInteractionRule[] = [
  // ================= GREYFURT & TURUNÇGİLLER (CYP3A4 İnhibisyonu) =================
  {
    id: 'grapefruit-statins',
    drugKeywords: [
      'simvastatin',
      'atorvastatin',
      'lovastatin',
      'lipitor',
      'ator',
      'zocor',
      'crestor',
      'kolestor',
      'tarden',
    ],
    category: 'grapefruit',
    categoryTitleTr: 'Greyfurt & Turunçgil Etkileşimi',
    categoryTitleEn: 'Grapefruit Interaction',
    icon: '🍊',
    severity: 'high',
    effectTr:
      'Greyfurt, bu ilacın karaciğerdeki metabolizmasını (CYP3A4 enzimini) bloke ederek kandaki ilaç seviyesini tehlikeli boyutta artırır ve kas yıkımı (rabdomiyoliz) ile böbrek hasarı riskini tetikler.',
    effectEn:
      'Grapefruit blocks the CYP3A4 enzyme, drastically increasing drug concentration in blood, leading to severe muscle damage (rhabdomyolysis) and kidney risks.',
    recommendationTr:
      'Bu ilacı kullandığınız süre boyunca greyfurt suyu veya taze greyfurt tüketmekten KESİNLİKLE kaçınınız.',
    recommendationEn:
      'Strictly avoid consuming grapefruit or grapefruit juice while taking this medication.',
    timingRuleTr: 'Tedavi süresince greyfurt tüketmeyiniz.',
    timingRuleEn: 'Avoid grapefruit throughout the entire treatment course.',
  },
  {
    id: 'grapefruit-ccb',
    drugKeywords: [
      'amlodipine',
      'norvasc',
      'vasoxen',
      'felodipine',
      'nifedipine',
      'adalat',
      'nidilat',
      'lerkanidipin',
      'lacidipin',
    ],
    category: 'grapefruit',
    categoryTitleTr: 'Greyfurt & Tansiyon Düşüklüğü',
    categoryTitleEn: 'Grapefruit & Blood Pressure',
    icon: '🍊',
    severity: 'moderate',
    effectTr:
      'Greyfurt, tansiyon ilacının emilimini aşırı artırarak ani ve şiddetli tansiyon düşüklüğü, baş dönmesi ve bayılma hissine yol açabilir.',
    effectEn:
      'Grapefruit excessively increases absorption, potentially causing severe hypotension, dizziness, and fainting.',
    recommendationTr: 'İlacınızı alırken ve gün içinde greyfurt tüketmemeniz önerilir.',
    recommendationEn: 'Avoid grapefruit during the course of medication.',
    timingRuleTr: 'Tansiyon ilacıyla birlikte greyfurt tüketmeyiniz.',
    timingRuleEn: 'Do not consume grapefruit with blood pressure drugs.',
  },

  // ================= SÜT & KALSİYUM & ŞELASYON =================
  {
    id: 'dairy-fluoroquinolones',
    drugKeywords: [
      'cipro',
      'ciprofloxacin',
      'cpro',
      'avelox',
      'moxifloxacin',
      'tavanic',
      'levofloxacin',
      'ciflosin',
    ],
    category: 'dairy_calcium',
    categoryTitleTr: 'Süt & Kalsiyum Şelasyonu',
    categoryTitleEn: 'Dairy & Calcium Chelation',
    icon: '🥛',
    severity: 'high',
    effectTr:
      'Süt, yoğurt, peynir veya kalsiyumlu besinlerdeki kalsiyum, antibiyotiğe bağlanarak (şelasyon) bağırsaktan emilmesini %50-70 oranında engeller ve tedavinin etkisiz kalmasına yol açar.',
    effectEn:
      'Calcium in dairy binds to the antibiotic, preventing 50-70% of gastrointestinal absorption and causing treatment failure.',
    recommendationTr:
      'İlacınızı bol su ile alınız. Süt ve süt ürünlerini ilacı almadan en az 2 saat önce veya aldıktan en az 4 saat sonra tüketiniz.',
    recommendationEn:
      'Take with plenty of water. Consume dairy products at least 2 hours before or 4 hours after taking this drug.',
    timingRuleTr: 'İlaç saatinden 2 saat önce ve 4 saat sonraya kadar süt ürünü almayınız.',
    timingRuleEn: 'Avoid dairy 2 hours before and 4 hours after medication.',
  },
  {
    id: 'dairy-tetracyclines',
    drugKeywords: ['tetradox', 'doxycycline', 'doksisiklin', 'monodox', 'tetrasiklin'],
    category: 'dairy_calcium',
    categoryTitleTr: 'Süt & Demir/Kalsiyum Emilim Engeli',
    categoryTitleEn: 'Dairy & Mineral Interaction',
    icon: '🥛',
    severity: 'high',
    effectTr:
      'Süt ürünleri ve kalsiyum/demir takviyeleri ilacın antibakteriyel gücünü tamamen sıfırlayabilir.',
    effectEn:
      'Dairy and calcium/iron supplements can severely neutralize the antibacterial efficacy.',
    recommendationTr:
      'İlacı dik oturur pozisyonda bol su ile alınız. Süt ürünleriyle arasında en az 2-3 saat mesafe bırakınız.',
    recommendationEn:
      'Take with a full glass of water while upright. Keep at least 2-3 hours distance from dairy.',
    timingRuleTr: 'Süt ürünlerinden en az 2 saat ayrı saatte alınız.',
    timingRuleEn: 'Keep at least 2 hours apart from dairy products.',
  },
  {
    id: 'dairy-levothyroxine',
    drugKeywords: ['euthyrox', 'levotiron', 'tefor', 'levothyroxine'],
    category: 'dairy_calcium',
    categoryTitleTr: 'Tiroid Hormonu & Kahvaltı/Süt Kuralı',
    categoryTitleEn: 'Thyroid Hormone & Breakfast Rule',
    icon: '🥛',
    severity: 'high',
    effectTr:
      'Kahve, süt, kalsiyum, demir ve lifli gıdalar tiroid hormonunun emilimini dramatik olarak düşürür.',
    effectEn:
      'Coffee, milk, calcium, iron, and fiber drastically impair thyroid hormone absorption.',
    recommendationTr:
      'Sabah uyanır uyanmaz, aç karnına sadece su ile alınız ve kahvaltı/kahve için en az 30-60 dakika bekleyiniz.',
    recommendationEn:
      'Take immediately upon waking on an empty stomach with plain water. Wait at least 30-60 minutes before coffee/breakfast.',
    timingRuleTr: 'Sabah aç karna tek başına alınmalı, kahvaltıdan 45 dk önce.',
    timingRuleEn: 'Take on empty stomach 45 mins before breakfast.',
  },

  // ================= ALKOL (Hepatotoksisite & MSS Depresyonu) =================
  {
    id: 'alcohol-paracetamol',
    drugKeywords: [
      'parol',
      'minoset',
      'vermidon',
      'calpol',
      'paracetamol',
      'aferin',
      'tylol',
      'katarin',
      'panadol',
    ],
    category: 'alcohol',
    categoryTitleTr: 'Alkol & Karaciğer Toksisitesi',
    categoryTitleEn: 'Alcohol & Liver Toxicity',
    icon: '🍷',
    severity: 'high',
    effectTr:
      'Parasetamol ile alkol birlikte alındığında karaciğerde zehirli bir metabolit (NAPQI) birikerek akut karaciğer yetmezliği ve kalıcı organ hasarına neden olabilir.',
    effectEn:
      'Combining paracetamol with alcohol accumulates toxic NAPQI metabolite, risking acute liver failure and permanent toxicity.',
    recommendationTr:
      'Bu ilacı kullanırken kesinlikle alkol almayınız. Alkol kullandıktan sonra baş ağrısı için parasetamol yerine bol su içiniz.',
    recommendationEn:
      'Do not consume alcohol while taking paracetamol. Hydrate with water instead of pain relievers after alcohol.',
    timingRuleTr: 'İlaç kullanımı süresince alkol tüketmeyiniz.',
    timingRuleEn: 'Avoid alcohol during medication.',
  },
  {
    id: 'alcohol-metformin',
    drugKeywords: ['metformin', 'glucophage', 'matofin', 'diaformin', 'glifor'],
    category: 'alcohol',
    categoryTitleTr: 'Alkol & Laktik Asidoz Riski',
    categoryTitleEn: 'Alcohol & Lactic Acidosis',
    icon: '🍷',
    severity: 'high',
    effectTr:
      'Metformin kullanırken alkol tüketmek ölümcül olabilen laktik asidoz tablosunu ve tehlikeli kan şekeri düşüşlerini (hipoglisemi) tetikleyebilir.',
    effectEn:
      'Drinking alcohol while on Metformin can trigger potentially fatal lactic acidosis and dangerous hypoglycemia.',
    recommendationTr: 'Diyabet tedaviniz süresince alkol tüketiminden kaçınınız.',
    recommendationEn: 'Avoid alcohol throughout your diabetes therapy.',
    timingRuleTr: 'Alkol kesinlikle tavsiye edilmez.',
    timingRuleEn: 'Alcohol strictly not recommended.',
  },
  {
    id: 'alcohol-nsaids',
    drugKeywords: [
      'aspirin',
      'coraspin',
      'ecopirin',
      'apranax',
      'naproxen',
      'arveles',
      'dexketoprofen',
      'majezik',
      'dikloron',
      'voltaren',
      'ibuprofen',
      'brufen',
      'dolven',
    ],
    category: 'alcohol',
    categoryTitleTr: 'Alkol & Ağır Mide Kanaması',
    categoryTitleEn: 'Alcohol & GI Bleeding',
    icon: '🍷',
    severity: 'high',
    effectTr:
      'NSAID ağrı kesiciler ile alkolün birleşmesi mide mukozasını tahrip ederek ani mide kanaması ve delinmesi (perforasyon) riskini katlar.',
    effectEn:
      'Combining NSAIDs with alcohol degrades gastric mucosa, exponentially increasing the risk of acute stomach ulcers and bleeding.',
    recommendationTr: 'Ağrı kesici kullanırken alkol almayınız.',
    recommendationEn: 'Do not consume alcohol while taking NSAID painkillers.',
  },
  {
    id: 'alcohol-sedatives-antidepressants',
    drugKeywords: [
      'cipralex',
      'selectra',
      'lustral',
      'prozac',
      'paxera',
      'symra',
      'lyrica',
      'xanax',
      'rivotril',
      'ativan',
      'diazepam',
      'stilnox',
    ],
    category: 'alcohol',
    categoryTitleTr: 'Alkol & Solunum Baskılanması / Sedasyon',
    categoryTitleEn: 'Alcohol & Central Nervous Depression',
    icon: '🍷',
    severity: 'high',
    effectTr:
      'Merkezi sinir sistemini aşırı baskılar; şiddetli uyku hali, hafıza kaybı, refleks kaybı ve komaya kadar varabilen solunum durması riskine yol açar.',
    effectEn:
      'Causes severe CNS depression, extreme drowsiness, motor impairment, and potentially fatal respiratory arrest.',
    recommendationTr:
      'Psikiyatrik veya nörolojik ilaçlarla birlikte kesinlikle alkol almayınız. Araç veya makine kullanmayınız.',
    recommendationEn:
      'Never consume alcohol with psychiatric or neurological drugs. Do not drive or operate machinery.',
  },
  {
    id: 'alcohol-metronidazole',
    drugKeywords: ['flagyl', 'metronidazol', 'biteral', 'ornidazol'],
    category: 'alcohol',
    categoryTitleTr: 'Alkol & Disülfiram Reaksiyonu',
    categoryTitleEn: 'Alcohol & Disulfiram Reaction',
    icon: '🍷',
    severity: 'high',
    effectTr:
      'Vücutta asetaldehit birikmesine yol açarak şiddetli kusma, yüz kızarması, taşikardi, göğüs ağrısı ve nefes darlığı oluşturur.',
    effectEn:
      'Triggers acetaldehyde accumulation resulting in violent vomiting, facial flushing, palpitations, and shortness of breath.',
    recommendationTr: 'İlaç bittikten sonraki 48 saat boyunca da alkol almayınız.',
    recommendationEn: 'Do not drink alcohol for at least 48 hours after finishing the medication.',
  },

  // ================= KAFEİN (CYP1A2 & Çarpıntı) =================
  {
    id: 'caffeine-fluoroquinolones',
    drugKeywords: ['cipro', 'ciprofloxacin', 'cpro', 'ciflosin'],
    category: 'caffeine',
    categoryTitleTr: 'Kafein & Çarpıntı / Anksiyete',
    categoryTitleEn: 'Caffeine & Tachycardia',
    icon: '☕',
    severity: 'moderate',
    effectTr:
      'Siprofloksasin, kafeinin vücuttan atılmasını %50 oranında yavaşlatır. Kahve veya çay içtiğinizde aşırı çarpıntı, titreme, uykusuzluk ve anksiyete gelişebilir.',
    effectEn:
      'Ciprofloxacin inhibits caffeine clearance by up to 50%, causing excessive palpitations, tremors, and insomnia.',
    recommendationTr:
      'Tedavi süresince kahve, kola, enerji içeceği ve koyu çay tüketimini minimuma indiriniz.',
    recommendationEn:
      'Minimize coffee, cola, energy drinks, and strong black tea during treatment.',
    timingRuleTr: 'Kafein tüketimini sınırlandırınız.',
    timingRuleEn: 'Limit caffeine intake.',
  },

  // ================= YÜKSEK POTASYUMLU GIDALAR =================
  {
    id: 'potassium-ace-arb',
    drugKeywords: [
      'delix',
      'ramipril',
      'coversyl',
      'perindopril',
      'karvezide',
      'irbesartan',
      'atacand',
      'candesartan',
      'losartan',
      'cozaar',
      'aldactone',
      'spironolactone',
    ],
    category: 'potassium_rich',
    categoryTitleTr: 'Potasyum & Kalp Ritmi Riski',
    categoryTitleEn: 'Potassium & Heart Rhythm Risk',
    icon: '🍌',
    severity: 'moderate',
    effectTr:
      'Bu tansiyon ve kalp ilaçları vücutta potasyum tutulmasını artırır. Aşırı muz, ıspanak, portakal suyu veya potasyumlu diyet tuzları tüketimi tehlikeli potasyum yüksekliğine (hiperkalemi) ve ritim bozukluğuna neden olabilir.',
    effectEn:
      'These drugs retain potassium in the body. Excessive bananas, spinach, or potassium salt substitutes can cause dangerous hyperkalemia and arrhythmias.',
    recommendationTr:
      'Diyetinizde potasyum takviyeleri veya potasyumlu tuz ikameleri kullanmadan önce doktorunuza danışınız.',
    recommendationEn:
      'Consult your doctor before taking potassium supplements or potassium-based salt substitutes.',
  },

  // ================= K VİTAMİNİ & KAN SULANDIRICI =================
  {
    id: 'vitamin-k-warfarin',
    drugKeywords: ['coumadin', 'warfarin'],
    category: 'vitamin_k',
    categoryTitleTr: 'K Vitamini & Pıhtılaşma Dengesi',
    categoryTitleEn: 'Vitamin K & Blood Clotting',
    icon: '🥗',
    severity: 'high',
    effectTr:
      'Ispanak, lahana, brokoli, marul ve maydanoz gibi K vitamini zengini yeşillikler ilacın kan sulandırıcı etkisini azaltarak pıhtı oluşma riskini artırır.',
    effectEn:
      'Vitamin K rich green vegetables directly counteract warfarin, increasing the risk of blood clot formation.',
    recommendationTr:
      'Yeşil yapraklı sebze tüketiminizi haftalık olarak dengeli ve sabit tutunuz; ani diyet değişikliklerinden kaçınınız ve INR takibinizi yaptırınız.',
    recommendationEn:
      'Maintain consistent weekly intake of leafy greens. Avoid abrupt dietary changes and monitor your INR levels regularly.',
  },

  // ================= GÜNEŞ IŞIĞI / FOTOSENSİTİVİTE =================
  {
    id: 'sun-photosensitivity',
    drugKeywords: [
      'tetradox',
      'doxycycline',
      'cipro',
      'ciprofloxacin',
      'roaccutane',
      'zoretanin',
      'isotretinoin',
      'hydrochlorothiazide',
    ],
    category: 'sun_exposure',
    categoryTitleTr: 'Güneş Işığı & Cilt Hassasiyeti (Fotosensitivite)',
    categoryTitleEn: 'Sunlight & Photosensitivity',
    icon: '☀️',
    severity: 'moderate',
    effectTr:
      'Bu ilaç cildin UV ışınlarına karşı hassasiyetini ciddi oranda artırarak kısa sürede ağır güneş yanığı, lekelenme ve döküntülere yol açabilir.',
    effectEn:
      'This drug significantly increases skin sensitivity to UV rays, causing severe sunburns, hyperpigmentation, and rashes.',
    recommendationTr:
      'Gündüz dışarı çıkarken yüksek faktörlü (SPF 50+) güneş kremi sürünüz ve doğrudan güneş altında uzun süre kalmaktan kaçınınız.',
    recommendationEn:
      'Apply high-SPF (50+) sunscreen when outdoors and avoid prolonged direct sun exposure.',
  },
];

/**
 * Kullanıcının mevcut ilaçlarını analiz ederek eşleşen gıda/alkol/yaşam tarzı uyarılarını listeler.
 */
export function checkFoodAndLifestyleInteractions(
  medicineNames: string[],
  language: 'tr' | 'en' = 'tr'
): MatchedFoodInteraction[] {
  const results: MatchedFoodInteraction[] = [];
  const addedKeys = new Set<string>();

  for (const rawName of medicineNames) {
    if (!rawName || rawName.trim().length === 0) continue;
    const cleanName = rawName.toLowerCase().trim();

    for (const rule of FOOD_DRUG_RULES) {
      const isMatch = rule.drugKeywords.some(keyword => cleanName.includes(keyword.toLowerCase()));

      if (isMatch) {
        const uniqueKey = `${cleanName}-${rule.category}`;
        if (!addedKeys.has(uniqueKey)) {
          addedKeys.add(uniqueKey);
          results.push({
            id: `food-${rule.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            medicineName: rawName.trim(),
            category: rule.category,
            categoryTitle: language === 'tr' ? rule.categoryTitleTr : rule.categoryTitleEn,
            icon: rule.icon,
            severity: rule.severity,
            effect: language === 'tr' ? rule.effectTr : rule.effectEn,
            recommendation: language === 'tr' ? rule.recommendationTr : rule.recommendationEn,
            timingRule: language === 'tr' ? rule.timingRuleTr : rule.timingRuleEn,
          });
        }
      }
    }
  }

  log.debug('İlaç-Gıda etkileşim kontrolü tamamlandı', {
    medicineCount: medicineNames.length,
    foundInteractions: results.length,
  });

  return results;
}
