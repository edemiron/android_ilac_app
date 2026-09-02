/**
 * voiceMedicineParser — Doğal Konuşma ile İlaç & Reçete Ayrıştırıcı Motor
 *
 * Türkçe ve İngilizce serbest konuşma metinlerinden (STT) ilaç adı,
 * dozaj miktarı, ilaç formu, günlük sıklık (frekans), aç/tok talimatı
 * ve tedavi süresini (kür gün sayısı) yüksek doğrulukla ayıklar.
 */

import type { MedicineForm, MedicineInstruction } from '../types';

export interface ParsedVoiceMedicine {
  name?: string;
  dosageAmount?: string;
  dosage?: string;
  medicineForm?: MedicineForm;
  frequency?: number;
  instruction?: MedicineInstruction;
  durationDays?: number;
  rawText: string;
}

/**
 * Verilen serbest konuşma cümlesini analiz eder ve yapılandırılmış ilaç verisi üretir.
 */
export function parseVoiceMedicinePrescription(transcript: string): ParsedVoiceMedicine {
  if (!transcript || typeof transcript !== 'string') {
    return { rawText: '' };
  }

  const cleanText = transcript.trim();
  const lower = cleanText.toLowerCase();

  const result: ParsedVoiceMedicine = {
    rawText: cleanText,
  };

  // 1. Tedavi Süresi / Gün Sayısı (örn: 10 gün, 7 gün, 2 hafta)
  let cleanedForNumbers = lower;
  const daysMatch = lower.match(/(\d+)\s*(gün|gun|hafta|ay|days|weeks|months)/);
  if (daysMatch) {
    const num = parseInt(daysMatch[1], 10);
    const unit = daysMatch[2];
    if (unit.startsWith('hafta') || unit.startsWith('week')) {
      result.durationDays = num * 7;
    } else if (unit.startsWith('ay') || unit.startsWith('month')) {
      result.durationDays = num * 30;
    } else {
      result.durationDays = num;
    }
    // Süre kısmını dozaj eşlemesinden çıkar
    cleanedForNumbers = cleanedForNumbers.replace(daysMatch[0], ' ');
  }

  // 2. Frekans (Günde kaç kez / sabah akşam / günde bir vb.)
  if (
    lower.includes('günde 4') ||
    lower.includes('4 kez') ||
    lower.includes('4 defa') ||
    lower.includes('4 kere') ||
    lower.includes('four times') ||
    lower.includes('4 times')
  ) {
    result.frequency = 4;
    cleanedForNumbers = cleanedForNumbers.replace(/(günde\s*)?4\s*(kez|defa|kere|times)/g, ' ');
  } else if (
    lower.includes('günde 3') ||
    lower.includes('3 kez') ||
    lower.includes('3 defa') ||
    lower.includes('3 kere') ||
    lower.includes('sabah öğle akşam') ||
    lower.includes('sabah ogle aksam') ||
    lower.includes('three times') ||
    lower.includes('3 times')
  ) {
    result.frequency = 3;
    cleanedForNumbers = cleanedForNumbers.replace(/(günde\s*)?3\s*(kez|defa|kere|times)/g, ' ');
  } else if (
    lower.includes('günde 2') ||
    lower.includes('2 kez') ||
    lower.includes('2 defa') ||
    lower.includes('2 kere') ||
    lower.includes('sabah akşam') ||
    lower.includes('sabah aksam') ||
    lower.includes('twice') ||
    lower.includes('2 times')
  ) {
    result.frequency = 2;
    cleanedForNumbers = cleanedForNumbers.replace(/(günde\s*)?2\s*(kez|defa|kere|times)/g, ' ');
  } else if (
    lower.includes('günde 1') ||
    lower.includes('1 kez') ||
    lower.includes('1 defa') ||
    lower.includes('1 kere') ||
    lower.includes('günde bir') ||
    lower.includes('once') ||
    lower.includes('1 time')
  ) {
    result.frequency = 1;
    cleanedForNumbers = cleanedForNumbers.replace(
      /(günde\s*)?1\s*(kez|defa|kere|times|time)/g,
      ' '
    );
  } else if (lower.includes('günde 5') || lower.includes('5 kez') || lower.includes('5 defa')) {
    result.frequency = 5;
    cleanedForNumbers = cleanedForNumbers.replace(/(günde\s*)?5\s*(kez|defa|kere)/g, ' ');
  } else if (lower.includes('günde 6') || lower.includes('6 kez') || lower.includes('6 defa')) {
    result.frequency = 6;
    cleanedForNumbers = cleanedForNumbers.replace(/(günde\s*)?6\s*(kez|defa|kere)/g, ' ');
  }

  // 3. Kullanım Talimatı (Aç / Tok / Yemekle / Yatmadan)
  if (
    lower.includes('aç karnına') ||
    lower.includes('aç karna') ||
    lower.includes('ac karnina') ||
    lower.includes('ac karna') ||
    lower.includes('yemekten önce') ||
    lower.includes('yemekten once') ||
    lower.includes('before meal') ||
    lower.includes('empty stomach')
  ) {
    result.instruction =
      lower.includes('aç') || lower.includes('ac') ? 'empty_stomach' : 'before_meal';
  } else if (
    lower.includes('tok karnına') ||
    lower.includes('tok karna') ||
    lower.includes('tok karnina') ||
    lower.includes('yemekten sonra') ||
    lower.includes('after meal')
  ) {
    result.instruction = 'after_meal';
  } else if (
    lower.includes('yemekle birlikte') ||
    lower.includes('yemekle') ||
    lower.includes('with food') ||
    lower.includes('with meal')
  ) {
    result.instruction = 'with_meal';
  } else if (
    lower.includes('yatmadan önce') ||
    lower.includes('yatmadan once') ||
    lower.includes('gece yatarken') ||
    lower.includes('before sleep') ||
    lower.includes('bedtime')
  ) {
    result.instruction = 'before_sleep';
  }

  // 4. İlaç Formu (Tablet, Kapsül, Şurup, Damla, İğne)
  if (lower.includes('kapsül') || lower.includes('kapsul') || lower.includes('capsule')) {
    result.medicineForm = 'capsule';
  } else if (lower.includes('şurup') || lower.includes('surup') || lower.includes('syrup')) {
    result.medicineForm = 'syrup';
  } else if (lower.includes('damla') || lower.includes('drop')) {
    result.medicineForm = 'drops';
  } else if (lower.includes('iğne') || lower.includes('igne') || lower.includes('injection')) {
    result.medicineForm = 'injection';
  } else if (lower.includes('tablet') || lower.includes('hap') || lower.includes('pill')) {
    result.medicineForm = 'tablet';
  }

  // 5. Dozaj Miktarı (Frekans ve gün ayıklandıktan sonra kalan sayı)
  const dosageMatch = cleanedForNumbers.match(/(\d+)\s*(mg|ml|mcg|g|iu)?/);
  if (dosageMatch) {
    const rawNumber = dosageMatch[1];
    const unit =
      dosageMatch[2] ||
      (result.medicineForm === 'syrup' || result.medicineForm === 'drops' ? 'ml' : 'mg');
    result.dosageAmount = rawNumber;
    result.dosage = `${rawNumber} ${unit.toUpperCase()}`;
  }

  // 6. İlaç Adı Ayıklama
  const stopWords = [
    'günde',
    'gunde',
    'bir',
    'iki',
    'üç',
    'uc',
    'dört',
    'dort',
    'kez',
    'defa',
    'kere',
    'sabah',
    'öğle',
    'ogle',
    'akşam',
    'aksam',
    'gece',
    'tok',
    'karnına',
    'karna',
    'karnina',
    'aç',
    'ac',
    'yemekten',
    'sonra',
    'önce',
    'once',
    'birlikte',
    'yemekle',
    'yatmadan',
    'alacağım',
    'alacam',
    'al',
    'iç',
    'ic',
    'ekle',
    'kaydet',
    'yaz',
    'tablet',
    'hap',
    'kapsül',
    'kapsul',
    'şurup',
    'surup',
    'damla',
    'iğne',
    'igne',
    'mg',
    'ml',
    'mcg',
    'g',
    'iu',
    'gün',
    'gun',
    'hafta',
    'ay',
    'boyunca',
    'kür',
    'kur',
    'take',
    'pill',
    'daily',
    'times',
    'with',
    'food',
    'meal',
    'after',
    'before',
    'for',
    'days',
    'weeks',
    'once',
    'twice',
  ];

  const words = cleanText.split(/\s+/);
  const candidateWords = words.filter(w => {
    const wLower = w.toLowerCase().replace(/[^a-z0-9çğıöşü]/g, '');
    if (!wLower) return false;
    if (/^\d+$/.test(wLower)) return false; // Sadece sayı ise atla
    if (stopWords.includes(wLower)) return false;
    return true;
  });

  if (candidateWords.length > 0) {
    const extractedName = candidateWords.slice(0, 3).join(' ');
    result.name = extractedName.charAt(0).toLocaleUpperCase('tr-TR') + extractedName.slice(1);
  }

  return result;
}
