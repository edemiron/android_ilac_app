/**
 * clinicalSafetyEngine.ts — Klinik Farmakoloji & Güvenlik Motoru (Sprint 104)
 *
 * Dünya ve Türkiye standartlarında:
 * 1. Gıda - İlaç Etkileşim Tespiti (Süt, Greyfurt, Alkol, Güneş, Kafein, Kesin Aç)
 * 2. Kaçırılan Doz Akıllı Karar Ağacı & Telafi Rehberi (Missed Dose Protocol)
 * 3. Mükerrer Tedavi (Duplicate Active Ingredient) Kalkanı
 * 4. TİTCK Resmi KÜB/KT (Kullanma Talimatı) URL Üreticisi
 */

import { FoodInteractionType, Medicine } from '../types';

export interface MissedDoseEvaluation {
  action: 'TAKE_NOW' | 'SKIP_DOSE' | 'CONSULT_DOCTOR';
  titleTr: string;
  titleEn: string;
  descriptionTr: string;
  descriptionEn: string;
  safetyTipTr: string;
  safetyTipEn: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface DuplicateTherapyWarning {
  duplicateIngredient: string;
  conflictingMedicines: string[];
  warningMessageTr: string;
  warningMessageEn: string;
  riskLevel: 'critical' | 'warning';
}

export const FOOD_INTERACTION_DETAILS: Record<
  FoodInteractionType,
  {
    icon: string;
    titleTr: string;
    titleEn: string;
    warningTr: string;
    warningEn: string;
    severity: 'critical' | 'moderate' | 'info';
  }
> = {
  dairy: {
    icon: '🥛',
    titleTr: 'Süt ve Kalsiyum Engeli',
    titleEn: 'Dairy & Calcium Interaction',
    warningTr:
      'Süt, yoğurt ve peynir gibi kalsiyum zengini gıdalar bu ilacın emilimini engeller. İlacı almadan 2 saat önce ve 2 saat sonra süt ürünleri tüketmeyiniz.',
    warningEn:
      'Calcium-rich foods inhibit absorption. Avoid dairy 2 hours before and after taking this medication.',
    severity: 'critical',
  },
  grapefruit: {
    icon: '🍊',
    titleTr: 'Greyfurt & Narenciye Uyarısı',
    titleEn: 'Grapefruit & Citrus Warning',
    warningTr:
      'Greyfurt ve greyfurt suyu karaciğer enzimlerini bloke ederek kandaki ilaç seviyesini tehlikeli derecede yükseltebilir. Tedavi süresince greyfurttan kaçınınız.',
    warningEn:
      'Grapefruit blocks CYP3A4 enzymes, causing toxic drug accumulation. Avoid grapefruit during treatment.',
    severity: 'critical',
  },
  alcohol: {
    icon: '🍷',
    titleTr: 'Alkol ile Alınamaz',
    titleEn: 'Strictly No Alcohol',
    warningTr:
      'Alkol ile birlikte tüketildiğinde karaciğer toksisitesi, şiddetli tansiyon düşüşü veya aşırı sersemlik yapabilir.',
    warningEn:
      'Do not consume alcohol. Risk of severe liver toxicity, sedation, or extreme blood pressure drops.',
    severity: 'critical',
  },
  sunlight: {
    icon: '☀️',
    titleTr: 'Güneş Işığı Duyarlılığı',
    titleEn: 'Photosensitivity / Sunlight',
    warningTr:
      'Bu ilaç cildinizi UV ışınlarına karşı aşırı hassaslaştırır. Güneşe çıkarken yüksek koruma faktörlü krem ve şapka kullanınız.',
    warningEn:
      'This drug causes UV photosensitivity. Use high SPF sunscreen and avoid direct sun exposure.',
    severity: 'moderate',
  },
  caffeine: {
    icon: '☕',
    titleTr: 'Kafein Kısıtlaması',
    titleEn: 'Caffeine Restriction',
    warningTr:
      'Kahve, çay ve enerji içecekleri ilacın etkisini bozabilir veya çarpıntı/huzursuzluğu artırabilir.',
    warningEn:
      'Limit coffee/tea. Caffeine can cause tachycardia or interfere with drug metabolism.',
    severity: 'moderate',
  },
  empty_stomach_strict: {
    icon: '⏱️',
    titleTr: 'Tam Aç Karnına Alınmalı',
    titleEn: 'Strict Empty Stomach',
    warningTr:
      'Sabah kahvaltıdan en az 30-60 dakika önce sadece 1 bardak su ile alınmalıdır. Çay, kahve veya gıda ile emilimi sıfırlanır.',
    warningEn:
      'Take with a full glass of water 30-60 minutes before breakfast. Food/coffee completely blocks absorption.',
    severity: 'critical',
  },
};

// Yaygın Etken Madde & İlaç Eşleme Tablosu
const INGREDIENT_FOOD_RULES: Array<{
  keywords: string[];
  interactions: FoodInteractionType[];
  canonicalIngredient: string;
}> = [
  // Tiroid
  {
    keywords: ['euthyrox', 'levotiron', 'levotiroksin', 'tefor', 'levothyroxine'],
    interactions: ['empty_stomach_strict', 'dairy', 'caffeine'],
    canonicalIngredient: 'Levotiroksin',
  },
  // Statinler / Kolesterol
  {
    keywords: [
      'lipitor',
      'ator',
      'atorvastatin',
      'crestor',
      'rosuvastatin',
      'zocor',
      'simvastatin',
      'kolestor',
    ],
    interactions: ['grapefruit', 'alcohol'],
    canonicalIngredient: 'Statin (Kolesterol Düşürücü)',
  },
  // Kalsiyum Kanal Blokerleri / Tansiyon
  {
    keywords: [
      'norvasc',
      'amlodipin',
      'amlodipine',
      'nidicard',
      'adilat',
      'diltizem',
      'isoptin',
      'plendil',
      'lercanidipine',
      'vazkor',
    ],
    interactions: ['grapefruit', 'alcohol'],
    canonicalIngredient: 'Kalsiyum Kanal Blokeri',
  },
  // Antibiyotikler - Kinolonlar & Tetrasiklinler
  {
    keywords: [
      'cipro',
      'ciprasid',
      'siprofloksasin',
      'ciprofloxacin',
      'tavanic',
      'levofloksasin',
      'monodoks',
      'tetradox',
      'doksisiklin',
      'doxycycline',
      'klacid',
      'klaritromisin',
    ],
    interactions: ['dairy', 'sunlight'],
    canonicalIngredient: 'Kinolon / Tetrasiklin Antibiyotik',
  },
  // Demir İlaçları
  {
    keywords: [
      'ferro',
      'ferrum',
      'ferplex',
      'gyno-ferro',
      'tardyferon',
      'maltofer',
      'demir',
      'iron sulfate',
    ],
    interactions: ['dairy', 'caffeine', 'empty_stomach_strict'],
    canonicalIngredient: 'Demir Takviyesi',
  },
  // Parasetamol İçerenler
  {
    keywords: [
      'parol',
      'parasetamol',
      'paracetamol',
      'calpol',
      'minoset',
      'tylol',
      'tylolhot',
      'gripin',
      'theraflu',
      'a-ferin',
      'kataparin',
      'panadol',
    ],
    interactions: ['alcohol'],
    canonicalIngredient: 'Parasetamol',
  },
  // NSAİİ (İbuprofen, Naproksen, vb.)
  {
    keywords: [
      'apranax',
      'naprosyn',
      'naproksen',
      'advil',
      'nurofen',
      'ibuprofen',
      'dolorex',
      'dikloron',
      'voltaren',
      'diklofenak',
      'arveles',
      'dexketoprofen',
      'majezik',
      'flurbiprofen',
    ],
    interactions: ['alcohol', 'sunlight'],
    canonicalIngredient: 'NSAİİ (Non-Steroid Antienflamatuar)',
  },
  // Asetilsalisilik Asit (Aspirin)
  {
    keywords: ['aspirin', 'coraspin', 'ecopirin', 'asetilsalisilik', 'asa', 'dispril'],
    interactions: ['alcohol'],
    canonicalIngredient: 'Asetilsalisilik Asit (Aspirin)',
  },
  // Osteoporoz / Bisfosfonatlar
  {
    keywords: ['fosamax', 'alendronat', 'actonel', 'risedronat', 'bonviva', 'ibandronat'],
    interactions: ['empty_stomach_strict', 'dairy'],
    canonicalIngredient: 'Bisfosfonat',
  },
  // Metformin / Şeker
  {
    keywords: ['glifor', 'matofin', 'diaformin', 'glucophage', 'metformin'],
    interactions: ['alcohol'],
    canonicalIngredient: 'Metformin',
  },
];

/**
 * İlaç adı, etken maddeleri veya kategorisine göre gıda etkileşimlerini tespit eder.
 */
export function detectFoodInteractions(
  name: string,
  activeIngredients?: string[],
  category?: string
): FoodInteractionType[] {
  const interactions = new Set<FoodInteractionType>();
  const normalizedName = (name || '').toLowerCase().trim();
  const normalizedIngredients = (activeIngredients || []).map(i => i.toLowerCase().trim());

  for (const rule of INGREDIENT_FOOD_RULES) {
    const nameMatch = rule.keywords.some(kw => normalizedName.includes(kw));
    const ingredientMatch = normalizedIngredients.some(ing =>
      rule.keywords.some(kw => ing.includes(kw))
    );

    if (nameMatch || ingredientMatch) {
      rule.interactions.forEach(inter => interactions.add(inter));
    }
  }

  // Kategori bazlı genel kurallar
  if (category === 'heart' && !interactions.has('alcohol')) {
    interactions.add('alcohol');
  } else if (category === 'antibiotic' && !interactions.has('dairy')) {
    interactions.add('dairy');
  }

  return Array.from(interactions);
}

/**
 * İlaç için kanonik etken maddeyi bulur.
 */
export function resolveCanonicalIngredient(
  name: string,
  activeIngredients?: string[]
): string | null {
  const normalizedName = (name || '').toLowerCase().trim();
  const normalizedIngredients = (activeIngredients || []).map(i => i.toLowerCase().trim());

  for (const rule of INGREDIENT_FOOD_RULES) {
    if (
      rule.keywords.some(kw => normalizedName.includes(kw)) ||
      normalizedIngredients.some(ing => rule.keywords.some(kw => ing.includes(kw)))
    ) {
      return rule.canonicalIngredient;
    }
  }
  return null;
}

/**
 * Mükerrer Tedavi (Duplicate Therapy) Kalkanı
 * Kullanıcı yeni bir ilaç eklediğinde veya mevcut ilaç listesinde aynı etken maddeyi içeren başka ilaç var mı denetler.
 */
export function checkDuplicateTherapy(
  existingMedicines: Medicine[],
  newMedicineName: string,
  newActiveIngredients?: string[]
): DuplicateTherapyWarning | null {
  const newIngredient = resolveCanonicalIngredient(newMedicineName, newActiveIngredients);
  if (!newIngredient) return null;

  const conflictingNames: string[] = [];

  for (const med of existingMedicines) {
    if (!med.isActive) continue;
    if (med.name.toLowerCase().trim() === newMedicineName.toLowerCase().trim()) continue;

    const medIngredient = resolveCanonicalIngredient(med.name, med.activeIngredients);
    if (medIngredient && medIngredient === newIngredient) {
      conflictingNames.push(med.name);
    }
  }

  if (conflictingNames.length === 0) return null;

  return {
    duplicateIngredient: newIngredient,
    conflictingMedicines: conflictingNames,
    warningMessageTr: `⚠️ DİKKAT: "${newMedicineName}", mevcut "${conflictingNames.join(', ')}" ilacınızla aynı etken maddeyi (${newIngredient}) içeriyor! Aynı anda kullanmak aşırı doz ve karaciğer/böbrek zehirlenmesi riski oluşturabilir. Lütfen doktorunuza danışınız.`,
    warningMessageEn: `⚠️ WARNING: "${newMedicineName}" contains the same active ingredient (${newIngredient}) as "${conflictingNames.join(', ')}". Taking both together may cause accidental overdose. Please consult your physician.`,
    riskLevel: 'critical',
  };
}

/**
 * Kaçırılan Doz Akıllı Karar Ağacı (Missed Dose Protocol)
 * Planlanan saatten bu yana geçen süre ve bir sonraki doza kalan süreye göre klinik rehberlik sağlar.
 */
export function evaluateMissedDoseAction(options: {
  scheduledMinutesOfDay: number; // 0..1439 (Örn: 09:00 = 540)
  currentMinutesOfDay: number; // 0..1439 (Örn: 12:30 = 750)
  frequencyPerDay: number; // 1, 2, 3, 4
  medicineName?: string;
}): MissedDoseEvaluation {
  const {
    scheduledMinutesOfDay,
    currentMinutesOfDay,
    frequencyPerDay,
    medicineName = 'İlacınız',
  } = options;

  // İki doz arası teorik aralık (dakika)
  const intervalMinutes = Math.floor(1440 / Math.max(frequencyPerDay, 1));
  const halfIntervalMinutes = Math.floor(intervalMinutes / 2);

  // Kaç dakika gecikildi?
  let diffMinutes = currentMinutesOfDay - scheduledMinutesOfDay;
  if (diffMinutes < 0) diffMinutes += 1440; // Gece yarısı geçişi

  const nextDoseRemaining = Math.max(0, intervalMinutes - diffMinutes);

  // Karar Kuralı:
  // Eğer geçen süre doz aralığının yarısından (< %50) az ise -> ŞİMDİ AL
  // Eğer geçen süre doz aralığının yarısını geçtiyse (>= %50) veya bir sonraki doza 2 saatten az kaldıysa -> BU DOZU ATLA
  if (diffMinutes <= halfIntervalMinutes && nextDoseRemaining > 120) {
    return {
      action: 'TAKE_NOW',
      titleTr: 'Hemen Şimdi Alabilirsiniz',
      titleEn: 'Take It Now',
      descriptionTr: `${medicineName} için planlanan saatten ${Math.floor(diffMinutes / 60)} sa ${diffMinutes % 60} dk geçti. Bir sonraki doza yeterli süre olduğu için bu dozu hemen alabilirsiniz.`,
      descriptionEn: `${diffMinutes} mins have passed. Since sufficient time remains before the next dose, take this dose now.`,
      safetyTipTr: 'Bir sonraki dozunuzu normal planlanan saatinde alınız.',
      safetyTipEn: 'Take your next dose at its regular scheduled time.',
      urgency: 'low',
    };
  } else {
    return {
      action: 'SKIP_DOSE',
      titleTr: 'Bu Dozu Atlayınız!',
      titleEn: 'Skip This Dose!',
      descriptionTr: `Gecikme süresi çok fazla (${Math.floor(diffMinutes / 60)} saat). Bir sonraki doza çok yaklaştınız. Bu dozu ATLAYIN ve bir sonraki planlanan doz saatini bekleyin.`,
      descriptionEn: `Too much time has elapsed (${Math.floor(diffMinutes / 60)}h). You are too close to the next dose. SKIP this dose and wait for the next one.`,
      safetyTipTr:
        '🚨 KESİNLİKLE ÇİFT DOZ ALMAYINIZ! Çift doz almak toksik zehirlenmeye yol açabilir.',
      safetyTipEn: '🚨 NEVER DOUBLE UP DOSES! Taking a double dose can lead to toxic overdose.',
      urgency: 'high',
    };
  }
}

/**
 * TİTCK Resmi Kullanma Talimatı (KÜB/KT) ve Prospektüs Bağlantısı Üretir.
 *
 * T.C. Sağlık Bakanlığı Türkiye İlaç ve Tıbbi Cihaz Kurumu Resmi KÜB/KT Portalı
 */
export function getTitckKubKtUrl(_name?: string, _barcode?: string): string {
  return 'https://www.titck.gov.tr/kubkt';
}
