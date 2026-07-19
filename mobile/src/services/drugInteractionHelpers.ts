/**
 * drugInteraction — pure helpers.
 *
 * Sprint 5.4: services/ ServiceResult migration (adim 1).
 * Pure drug-matching helper'lar ayri modulde — ServiceResult pattern'inin
 * test edilebilir temeli. Network call'ler (checkMultipleInteractions,
 * checkInteractionsFromAPI) icindeki logic bu pure helper'lara delege eder.
 */

/**
 * TR ticari ilac isimlerini RxNorm etken madde isimlerine map eder.
 * (drugInteraction.ts icindeki orijinal map'in kopyasi — DRY backlog'da.)
 */
export const TURKISH_TO_RXNORM_MAP: Record<string, string> = {
  aspirin: 'aspirin',
  aspro: 'aspirin',
  ecopirin: 'aspirin',
  coumadin: 'warfarin',
  warfarin: 'warfarin',
  ibuprofen: 'ibuprofen',
  advil: 'ibuprofen',
  nurofen: 'ibuprofen',
  naproxen: 'naproxen',
  apranax: 'naproxen',
  aleve: 'naproxen',
  paracetamol: 'paracetamol',
  parol: 'paracetamol',
  minoset: 'paracetamol',
  tylol: 'paracetamol',
  vermidon: 'paracetamol',
  calpol: 'paracetamol',
  omeprazol: 'omeprazol',
  losec: 'omeprazol',
  metformin: 'metformin',
  glukofen: 'metformin',
  glucophage: 'metformin',
  dikloron: 'diclofenac',
  cataflam: 'diclofenac',
  voltaren: 'diclofenac',
  arveles: 'dexketoprofen',
  majezik: 'dexketoprofen',
};

/**
 * Ilac adini normalize et ve etken maddeye cevir.
 * TR ticari isimleri RxNorm generic name'e map edilir.
 */
export function normalizeDrugName(name: string): string {
  if (!name) return '';
  const lowerName = name.toLowerCase().trim();

  // Once map'te tam eslesme ara
  for (const [tradeName, genericName] of Object.entries(TURKISH_TO_RXNORM_MAP)) {
    if (lowerName.includes(tradeName)) {
      return genericName;
    }
  }

  // Eslesme yoksa standart temizleme yap
  return lowerName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Iki ilac adinin normalize edilmis hallerinin eslesip eslesmedigini kontrol et.
 * Inclusion ve exact match kabul eder.
 */
export function drugMatches(drugName: string, interactionDrug: string): boolean {
  const normalizedName = normalizeDrugName(drugName);
  const normalizedInteraction = normalizeDrugName(interactionDrug);

  return (
    normalizedName.includes(normalizedInteraction) ||
    normalizedInteraction.includes(normalizedName) ||
    normalizedName === normalizedInteraction
  );
}

/**
 * Severity siralama — higher severity rank'lari daha once.
 */
export function compareSeverityRank(
  a: 'low' | 'moderate' | 'high',
  b: 'low' | 'moderate' | 'high'
): number {
  const rank = { low: 0, moderate: 1, high: 2 } as const;
  return rank[a] - rank[b];
}

/**
 * Severity rankini don.
 */
export function getSeverityRank(severity: 'low' | 'moderate' | 'high'): number {
  return { low: 0, moderate: 1, high: 2 }[severity];
}
