/**
 * ereceteParser.ts — Türkiye E-Reçete & SGK Karekod Ayrıştırıcı Motoru (Sprint 104)
 *
 * Sağlık Bakanlığı, SGK ve Hastane e-Reçete SMS/QR/Metin formatlarını
 * anında ayrıştırarak otomatik ilaç listesi ve zamanlama planı oluşturur.
 */

import { EReceteData, EReceteItem, MedicineInstruction } from '../types';
import { detectFoodInteractions } from './clinicalSafetyEngine';

/**
 * Tıbbi kullanım talimatı metninden (örn: "2x1 Tok", "1x1 Aç", "Günde 1x1.0", "Günde 3 defa")
 * sıklık (frequency) ve talimat (instructions) çıkarır.
 */
export function parseDosageInstruction(text: string): {
  frequency: number;
  instructions: MedicineInstruction;
  dosageText: string;
} {
  const normalized = (text || '').toLowerCase().trim();

  // 1. Sıklık tespiti (NxM veya NxM.0 formatı veya günde X kez)
  //
  // v1.7.1 KRİTİK ONARIM — koşul sırası düzeltildi. Eskiden
  // `sabah && akşam` kontrolü, `sabah && öğle && akşam` kontrolünden ÖNCE
  // geliyordu. Türkiye'de en yaygın reçete talimatı olan "sabah öğle akşam"
  // ilk dala takılıyor ve günde **2** olarak ayrıştırılıyordu → hasta günde 3
  // yerine 2 alarm alıyor, HER GÜN BİR DOZ KAÇIRIYORDU. ESLint bunu
  // `no-dupe-else-if` ("bu dal asla çalışamaz") olarak işaretliyordu.
  // Kural: daha ÖZEL koşul önce gelir.
  let frequency = 1;
  const nxmMatch = normalized.match(/(\d+)\s*[xX*]\s*(\d+(?:\.\d+)?)/);
  if (nxmMatch) {
    const timesPerDay = parseInt(nxmMatch[1], 10);
    if (!isNaN(timesPerDay) && timesPerDay >= 1 && timesPerDay <= 6) {
      frequency = timesPerDay;
    }
  } else if (
    normalized.includes('sabah') &&
    normalized.includes('öğle') &&
    normalized.includes('akşam')
  ) {
    frequency = 3;
  } else if (
    (normalized.includes('sabah') && normalized.includes('akşam')) ||
    (normalized.includes('sabah') && normalized.includes('öğle')) ||
    (normalized.includes('öğle') && normalized.includes('akşam'))
  ) {
    frequency = 2;
  } else if (
    normalized.includes('günde 2') ||
    normalized.includes('2 kez') ||
    normalized.includes('2 defa')
  ) {
    frequency = 2;
  } else if (
    normalized.includes('günde 3') ||
    normalized.includes('3 kez') ||
    normalized.includes('3 defa')
  ) {
    frequency = 3;
  } else if (
    normalized.includes('günde 4') ||
    normalized.includes('4 kez') ||
    normalized.includes('4 defa')
  ) {
    frequency = 4;
  }

  // 2. Talimat tespiti (Yatmadan / Aç / Tok / Yemekle)
  let instructions: MedicineInstruction = 'after_meal'; // Varsayılan tok
  if (
    normalized.includes('yatmadan') ||
    normalized.includes('gece') ||
    normalized.includes('uyumadan')
  ) {
    instructions = 'before_sleep';
  } else if (
    normalized.includes('aç karnına') ||
    normalized.includes(' aç') ||
    normalized.startsWith('aç')
  ) {
    instructions = 'empty_stomach';
  } else if (normalized.includes('yemekten önce') || normalized.includes('önce')) {
    instructions = 'before_meal';
  } else if (normalized.includes('yemekle') || normalized.includes('birlikte')) {
    instructions = 'with_meal';
  } else if (normalized.includes('tok') || normalized.includes('yemekten sonra')) {
    instructions = 'after_meal';
  }

  return {
    frequency,
    instructions,
    dosageText: `${frequency}x1 ${
      instructions === 'empty_stomach'
        ? 'Aç'
        : instructions === 'before_meal'
          ? 'Yemekten Önce'
          : instructions === 'before_sleep'
            ? 'Yatmadan Önce'
            : 'Tok'
    }`,
  };
}

/**
 * Kullanıcının yapıştırdığı E-Reçete SMS metnini, reçete kodunu veya QR çıktısını ayrıştırır.
 */
export function parseEReceteInput(input: string): EReceteData | null {
  if (!input || input.trim().length === 0) return null;

  const text = input.trim();

  // 1. Durum: Sadece 5-9 haneli E-Reçete Kodu girilmişse (Örn: "AB12CD", "20W0T04" veya "9K8L7M")
  const singleCodeMatch = text.match(/^[A-Za-z0-9]{5,9}$/);
  if (singleCodeMatch) {
    return {
      recipeNo: text.toUpperCase(),
      date: new Date().toISOString().split('T')[0],
      medicines: [],
    };
  }

  // 2. Durum: Reçete Kodu Çıkarımı
  // Formatlar:
  // - "NUMARANIZ: 20W0T04"
  // - "9AB87C nolu e-receteniz"
  // - "RECETE NO: 20W0T04"
  // - "E-RECETE KODU: 20W0T04"
  let recipeNo = 'E-RECETE';

  const suffixRecipeMatch = text.match(
    /(?:numaranız|numaraniz|reçete\s*no|recete\s*no|e-reçete|e-recete|reçete|recete|reçete\s*kodu|recete\s*kodu|kod|takip\s*no)[:\s#-]+([A-Za-z0-9]{5,10})/i
  );
  const prefixRecipeMatch = text.match(
    /([A-Za-z0-9]{5,10})\s*(?:nolu|numaralı|no'lu)\s*(?:e-reçete|e-recete|reçete|recete)/i
  );

  if (suffixRecipeMatch) {
    recipeNo = suffixRecipeMatch[1].toUpperCase();
  } else if (prefixRecipeMatch) {
    recipeNo = prefixRecipeMatch[1].toUpperCase();
  }

  const medicines: EReceteItem[] = [];

  // Metni satırlara ve tire / noktalı virgül / "ILACLARINIZ:" parçalarına ayır
  // Örn: "NUMARANIZ: 20W0T04 - ILACLARINIZ: 2 ADET BETMIGA 50 MG ... - ACIL SIFALAR DILERIZ B002"
  let segments: string[] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const dashed = line.split(/\s+-\s+|\s*;\s*/);
    segments.push(...dashed);
  }

  const candidateSegments: string[] = [];
  for (const seg of segments) {
    let trimmed = seg.trim();
    if (!trimmed) continue;

    const lower = trimmed.toLowerCase();
    if (
      lower.includes('geçmiş olsun') ||
      lower.includes('gecmis olsun') ||
      lower.includes('acil şifalar') ||
      lower.includes('acil sifalar') ||
      lower.includes('dileriz') ||
      lower.includes('mersis') ||
      lower.match(/^[bB]\d{3}$/) ||
      lower.startsWith('sn.') ||
      lower.startsWith('numaranız') ||
      lower.startsWith('numaraniz')
    ) {
      continue;
    }

    // "ILACLARINIZ:" veya "İLAÇLARINIZ:" ön ekini temizle
    trimmed = trimmed.replace(/^(?:ilaclariniz|ilaçlarınız|ilaçlar|ilaclar)[:\s]+/i, '').trim();

    // Birden fazla numaralı ilaç içeren tek satır varsa (örn: "1. PAROL 2. MAJEZIK")
    const numberedMatches = trimmed.split(/(?=\b\d+[.)-]\s+[A-Za-z])/);
    for (const sub of numberedMatches) {
      if (sub.trim()) candidateSegments.push(sub.trim());
    }
  }

  for (const seg of candidateSegments) {
    let clean = seg.replace(/^\s*\d+[.)-]\s*/, '').trim();
    // "2 ADET", "1 KUTU" gibi miktarları temizle
    clean = clean.replace(/^\d+\s*(?:adet|kutu|şişe|sise|paket|flakon)\s+/i, '').trim();

    if (clean.length < 3) continue;

    // Parantez içindeki kullanım dozajını bul: BETMIGA 50 MG (Gunde 1x1.0) veya PAROL (3x1 Tok)
    const parenMatch = clean.match(/^(.*?)\s*\((.*?)\)$/);
    let medName = clean;
    let dosageDetail = '1x1 Tok';

    if (parenMatch) {
      medName = parenMatch[1].trim();
      dosageDetail = parenMatch[2].trim();
    } else {
      // "PAROL 500 MG 2x1 Tok" formatı
      const dosageMatch = clean.match(/^(.*?)\s+(\d+\s*[xX*]\s*\d+.*)$/);
      if (dosageMatch) {
        medName = dosageMatch[1].trim();
        dosageDetail = dosageMatch[2].trim();
      }
    }

    // İlaç adı temizleme
    medName = medName.replace(/^[-*•\d.)]+\s*/, '').trim();
    const lowerName = medName.toLowerCase();
    if (
      medName.length >= 3 &&
      !lowerName.includes('reçete') &&
      !lowerName.includes('recete') &&
      !lowerName.includes('numaranız') &&
      !lowerName.includes('numaraniz')
    ) {
      const parsed = parseDosageInstruction(dosageDetail);
      medicines.push({
        name: medName,
        dosage: parsed.dosageText,
        frequency: parsed.frequency,
        instructions: parsed.instructions,
        activeIngredients: detectFoodInteractions(medName).length > 0 ? [medName] : [],
      });
    }
  }

  return {
    recipeNo,
    date: new Date().toISOString().split('T')[0],
    medicines,
  };
}
