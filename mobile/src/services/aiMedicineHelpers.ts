/**
 * aiMedicineService — pure prompt + response helpers.
 *
 * Sprint 7.1: aiMedicineService.ts (650 satir) pure helper extraction.
 * Prompt builder'lar + AI response parser'lar pure modulde —
 * network/Firebase bagimliligi olmadan unit test edilebilir.
 */

import type { GlobalMedicine, MedicineForm } from '../types';
import type { AISearchResult } from './aiMedicineService';

/**
 * Prompt: barcode ile ilac arama.
 */
export function createBarcodeSearchPrompt(barcode: string): string {
  return `
Asagidaki barkod numarasina sahip ilaci bul ve bilgilerini JSON formatinda dondur.

Barkod: ${barcode}

Yaniti SADECE asagidaki JSON formatinda ver, baska hicbir sey yazma:

{
  "found": true veya false,
  "confidence": 0-100 arasi guven skoru,
  "medicine": {
    "name": "Ilac adi",
    "genericName": "Etken madde adi",
    "dosage": "Doz (orn: 500mg)",
    "form": "tablet/capsule/syrup/cream/drops/spray/injection/other",
    "manufacturer": "Uretici firma",
    "country": "Ulke kodu (TR, US, DE vb.)"
  }
}

Eger ilac bulunamazsa:
{
  "found": false,
  "confidence": 0,
  "medicine": null
}

NOT: Sadece emin oldugun bilgileri yaz. Emin degilsen "found": false dondur.
`;
}

/**
 * Prompt: ilac ismi ile arama (TR odakli).
 */
export function createNameSearchPrompt(name: string): string {
  return `
"${name}" isimli ilaci bul ve bilgilerini JSON formatinda dondur.

Yaniti SADECE asagidaki JSON formatinda ver:

{
  "found": true veya false,
  "confidence": 0-100 arasi guven skoru,
  "medicine": {
    "name": "Ilac adi (tam adi)",
    "genericName": "Etken madde adi",
    "dosage": "Yaygin doz (orn: 500mg)",
    "form": "tablet/capsule/syrup/cream/drops/spray/injection/other",
    "manufacturer": "Uretici firma (Turkiye'de satiliyorsa)",
    "country": "TR"
  }
}

NOT: Turkiye'de satilan ilaclari oncelikli olarak bul. Emin degilsen "found": false dondur.
`;
}

/**
 * Prompt: ilac bilgisi (prospektus) sorgusu.
 */
export function createMedicineInfoPrompt(medicineName: string, dosage?: string): string {
  return `
"${medicineName}${dosage ? ` ${dosage}` : ''}" ilaci hakkinda detayli bilgi ver.

Yaniti SADECE asagidaki JSON formatinda ver:

{
  "found": true,
  "prospectus": {
    "indication": "Ne icin kullanilir (1-2 cumle)",
    "contraindication": "Kimler kullanmamali (1-2 cumle)",
    "sideEffects": ["Yan etki 1", "Yan etki 2", "Yan etki 3"],
    "dosageInstructions": "Nasil kullanilir",
    "warnings": ["Uyari 1", "Uyari 2"],
    "interactions": ["Etkilesim 1", "Etkilesim 2"],
    "pregnancy": "Gebelikte kullanim bilgisi",
    "storage": "Saklama kosullari",
    "activeIngredients": [
      {"name": "Etken madde", "amount": "Miktar"}
    ]
  }
}
`;
}

/**
 * AI response'dan JSON blogunu cikar (bazen ekstra text ekler).
 */
export function extractJsonBlock(response: string): string | null {
  const match = response.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

/**
 * AI JSON yanitini parse et, hata durumunda hata result doner.
 */
export function safeParseAiJson<T = unknown>(
  response: string
): { ok: true; data: T } | { ok: false; error: string } {
  const jsonBlock = extractJsonBlock(response);
  if (!jsonBlock) {
    return { ok: false, error: 'Gecersiz AI yaniti (JSON bulunamadi)' };
  }
  try {
    return { ok: true, data: JSON.parse(jsonBlock) as T };
  } catch {
    return { ok: false, error: 'Gecersiz AI yaniti (JSON parse hatasi)' };
  }
}

/**
 * AI barcode-search yanitini parse et -> AISearchResult.
 */
export function parseBarcodeSearchResponse(
  response: string,
  barcode: string,
  source: string
): AISearchResult {
  const parsed = safeParseAiJson<{
    found?: boolean;
    confidence?: number;
    medicine?: {
      name?: string;
      genericName?: string;
      dosage?: string;
      form?: string;
      manufacturer?: string;
      country?: string;
    };
  }>(response);

  if (!parsed.ok) {
    return { success: false, confidence: 0, error: parsed.error };
  }

  const { found, confidence, medicine } = parsed.data;

  if (!found || !medicine) {
    return {
      success: false,
      confidence: confidence ?? 0,
      error: 'Ilac bulunamadi',
    };
  }

  const result: Partial<GlobalMedicine> = {
    barcode,
    name: medicine.name,
    genericName: medicine.genericName,
    dosage: medicine.dosage,
    form: (medicine.form as MedicineForm) || 'other',
    manufacturer: medicine.manufacturer || 'Bilinmiyor',
    country: medicine.country || 'TR',
  };

  return {
    success: true,
    medicine: result,
    confidence: confidence ?? 70,
    source,
  };
}

/**
 * AI name-search yanitini parse et -> AISearchResult.
 */
export function parseNameSearchResponse(response: string, source: string): AISearchResult {
  const parsed = safeParseAiJson<{
    found?: boolean;
    confidence?: number;
    medicine?: {
      name?: string;
      genericName?: string;
      dosage?: string;
      form?: string;
      manufacturer?: string;
      country?: string;
    };
  }>(response);

  if (!parsed.ok) {
    return { success: false, confidence: 0, error: parsed.error };
  }

  const { found, confidence, medicine } = parsed.data;

  if (!found || !medicine) {
    return {
      success: false,
      confidence: confidence ?? 0,
      error: 'Ilac bulunamadi',
    };
  }

  const result: Partial<GlobalMedicine> = {
    name: medicine.name,
    genericName: medicine.genericName,
    dosage: medicine.dosage,
    form: (medicine.form as MedicineForm) || 'other',
    manufacturer: medicine.manufacturer || 'Bilinmiyor',
    country: medicine.country || 'TR',
  };

  return {
    success: true,
    medicine: result,
    confidence: confidence ?? 65,
    source,
  };
}

/**
 * Sanitize: medicine isim/icerik trim.
 */
export function trimMedicineFields(medicine: Partial<GlobalMedicine>): Partial<GlobalMedicine> {
  const cleaned: Partial<GlobalMedicine> = { ...medicine };
  if (typeof cleaned.name === 'string') cleaned.name = cleaned.name.trim();
  if (typeof cleaned.genericName === 'string') cleaned.genericName = cleaned.genericName.trim();
  if (typeof cleaned.manufacturer === 'string') cleaned.manufacturer = cleaned.manufacturer.trim();
  if (typeof cleaned.dosage === 'string') cleaned.dosage = cleaned.dosage.trim();
  return cleaned;
}
