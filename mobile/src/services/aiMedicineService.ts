import { AISearchResult } from '../types';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { createScopedLogger } from '../utils/logger';
// Sprint 7.1 + 8.1: Pure prompt + response helper'lari inline tanimlar silindi.
// Eski API adlari alias olarak kullaniliyor (backward compat).
import {
  createNameSearchPrompt,
  parseNameSearchResponse,
  createSearchPrompt,
  createInfoPrompt,
  parseProspectusResponse,
  parseAIResponse,
} from './aiMedicineHelpers';

const log = createScopedLogger('AIMedicineService');

// ============ FIREBASE FUNCTIONS CONFIG ============

// Firebase Functions kullanarak API çağrıları
// API key'ler sunucu tarafında kalır, client'a gitmez

let functions: ReturnType<typeof getFunctions> | null = null;

/**
 * ⚠️ v1.7.4 (Faz 0.3): BÖLGE ZORUNLU.
 * `getFunctions()` bölgesiz çağrıldığında varsayılan `us-central1`e gider;
 * fonksiyonlar ise `europe-west1`de deploy edili. Her çağrı NOT_FOUND ile
 * düşüyor, `catch` bloğu da "fallback" olarak APK'ya gömülü API anahtarıyla
 * doğrudan Google'a gidiyordu. Yani "anahtarlar sunucuda kalır" yorumu
 * pratikte hiçbir zaman doğru olmadı.
 */
const FUNCTIONS_REGION = 'europe-west1';

function getFunctionsInstance() {
  if (!functions) {
    functions = getFunctions(getApp(), FUNCTIONS_REGION);
  }
  return functions;
}

/**
 * Tüm AI üretim çağrılarının TEK kapısı: kimlik doğrulamalı Cloud Function.
 * İstemcide API anahtarı YOKTUR; doğrudan sağlayıcıya istek atılmaz.
 */
async function callGeminiGenerate(params: {
  prompt: string;
  imageBase64?: string;
  imageMimeType?: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string | null> {
  try {
    const callable = httpsCallable<typeof params, { success: boolean; result: string }>(
      getFunctionsInstance(),
      'geminiGenerate'
    );
    const response = await callable(params);
    const text = response.data?.result;
    return typeof text === 'string' && text.trim().length > 0 ? text : null;
  } catch (error) {
    log.error('geminiGenerate cagrisi basarisiz', error);
    return null;
  }
}

/**
 * ⚠️ v1.7.4 (Faz 0.3) — İSTEMCİ TARAFI API ANAHTARI KATMANI KALDIRILDI.
 *
 * Burada eskiden şunlar vardı:
 *   - `DEFAULT_GEMINI_API_KEY`: APK'ya gömülü düz metin anahtar. Hermes
 *     bytecode'undan `strings` ile çıkarılabiliyordu → kota/fatura istismarı.
 *   - `config/ai` dokümanından `geminiApiKey`/`openaiApiKey` okuma. O doküman
 *     `allow read: if true` ile KİMLİK DOĞRULAMASIZ okunabiliyordu, yani
 *     anahtarlar Firestore üzerinden de sızıyordu.
 *   - `@user_custom_gemini_api_key` (AsyncStorage) ile kullanıcı anahtarı —
 *     hiçbir ekrandan yazılmıyordu (ölü yol), ama doğrudan-sağlayıcı
 *     çağrısını meşrulaştırıyordu.
 *
 * Artık TÜM AI çağrıları `callGeminiGenerate` üzerinden kimlik doğrulamalı
 * Cloud Function'a gider. İstemcide anahtar yoktur; sağlayıcıya doğrudan
 * istek atan kod bilinçli olarak SİLİNDİ (OpenAI yolu dahil — o da istemcide
 * anahtar tutmayı gerektiriyordu).
 *
 * Model seçimi de sunucuda, izinli listeyle yapılır.
 */

// ============ BARKOD İLE İLAÇ ARAMA ============

/**
 * Barkod ile AI destekli ilaç arama.
 * v1.7.4: doğrudan Gemini/OpenAI çağrıları kaldırıldı; tek yol sunucu.
 */
export async function searchMedicineByBarcodeAI(barcode: string): Promise<AISearchResult> {
  try {
    const text = await callGeminiGenerate({
      prompt: createSearchPrompt(barcode),
      temperature: 0.1,
      maxOutputTokens: 2048,
    });

    if (!text) {
      return { success: false, confidence: 0, error: 'AI servisi şu anda kullanılamıyor.' };
    }

    return parseAIResponse(text, barcode, 'Gemini');
  } catch (error: unknown) {
    log.error('AI arama hatasi', error);
    const errorMessage = error instanceof Error ? error.message : 'AI araması başarısız oldu.';
    return { success: false, confidence: 0, error: errorMessage };
  }
}

// ============ İSİM İLE İLAÇ ARAMA ============

/**
 * İlaç adı ile AI destekli arama.
 */
export async function searchMedicineByNameAI(name: string): Promise<AISearchResult> {
  try {
    const text = await callGeminiGenerate({
      prompt: createNameSearchPrompt(name),
      temperature: 0.1,
      maxOutputTokens: 2048,
    });

    if (!text) {
      return { success: false, confidence: 0, error: 'AI servisi şu anda kullanılamıyor.' };
    }

    return parseNameSearchResponse(text, 'Gemini');
  } catch (error: unknown) {
    log.error('AI isim aramasi hatasi', error);
    const errorMessage = error instanceof Error ? error.message : 'AI isim araması başarısız oldu.';
    return { success: false, confidence: 0, error: errorMessage };
  }
}

// ============ İLAÇ HAKKINDA BİLGİ GETIR ============

/**
 * İlaç adına göre detaylı bilgi getir (prospektüs).
 * v1.7.4: doğrudan sağlayıcı çağrıları kaldırıldı; tek yol sunucu.
 */
export async function getMedicineInfoAI(
  medicineName: string,
  dosage?: string
): Promise<AISearchResult> {
  try {
    const text = await callGeminiGenerate({
      prompt: createInfoPrompt(medicineName, dosage),
      temperature: 0.2,
      maxOutputTokens: 4096,
    });

    if (!text) {
      return { success: false, confidence: 0, error: 'AI servisi şu anda kullanılamıyor.' };
    }

    return parseProspectusResponse(text, medicineName);
  } catch (error: unknown) {
    log.error('Prospektus getirme hatasi', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilgi getirme başarısız.';
    return { success: false, confidence: 0, error: errorMessage };
  }
}

// ============ YANIT PARSE ============

// ============================================================================
// Sprint 10.4: ServiceResult<T> wrapper alternatifleri — geriye donuk uyumluluk
// korunarak yeni API ekleniyor. Eski fonksiyonlar (Promise<AISearchResult>)
// oldugu gibi kalmaya devam ediyor; yeni Service fonksiyonlari ServiceResult<T> doner.
// ============================================================================

import { withServiceResult, type ServiceResult } from './types';

/**
 * Barkod ile AI arama — ServiceResult<T> wrapper.
 */
export async function searchMedicineByBarcodeAIService(
  barcode: string
): Promise<ServiceResult<AISearchResult>> {
  return withServiceResult(() => searchMedicineByBarcodeAI(barcode), {
    errorCode: 'API_ERROR',
  });
}

/**
 * Isim ile AI arama — ServiceResult<T> wrapper.
 */
export async function searchMedicineByNameAIService(
  name: string
): Promise<ServiceResult<AISearchResult>> {
  return withServiceResult(() => searchMedicineByNameAI(name), {
    errorCode: 'NOT_FOUND',
  });
}

/**
 * Ilac bilgisi getir — ServiceResult<T> wrapper.
 */
export async function getMedicineInfoAIService(
  medicineName: string,
  dosage?: string
): Promise<ServiceResult<AISearchResult>> {
  return withServiceResult(() => getMedicineInfoAI(medicineName, dosage), {
    errorCode: 'API_ERROR',
  });
}

// ============ FOTOĞRAFLA / KUTU OCR İLE İLAÇ TANIMA ============

export interface MedicineBoxOcrResult {
  success: boolean;
  name?: string;
  dosage?: string;
  form?: string;
  instructions?: string;
  confidence?: number;
  error?: string;
}

/**
 * İlaç kutusu fotoğrafından (Base64) isim, dozaj ve form çıkarır (Multimodal Gemini Vision)
 */
export async function recognizeMedicineBoxPhotoAI(
  base64Image: string
): Promise<MedicineBoxOcrResult> {
  try {
    const prompt = `Sen uzman bir eczacılık ve ilaç tanıma yapay zekasısın.
Bu fotoğraftaki ilaç kutusunun üzerindeki bilgileri oku.
Sadece geçerli bir JSON çıktısı üret:
{
  "name": "İlacın adı (örn: Parol, Aspirin)",
  "dosage": "Dozaj (örn: 500mg, 100ml)",
  "form": "tablet",
  "instructions": "after_meal"
}`;

    const textResponse = await callGeminiGenerate({
      prompt,
      imageBase64: base64Image,
      imageMimeType: 'image/jpeg',
      temperature: 0.1,
      maxOutputTokens: 1024,
    });
    if (!textResponse) {
      return { success: false, error: 'Kutudan ilaç bilgisi okunamadı.' };
    }

    let cleanJson = textResponse.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson
        .replace(/^```[a-zA-Z]*\n?/, '')
        .replace(/```$/, '')
        .trim();
    }
    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleanJson);

    return {
      success: true,
      name: parsed.name,
      dosage: parsed.dosage,
      form: parsed.form,
      instructions: parsed.instructions,
      confidence: 90,
    };
  } catch (error: unknown) {
    log.error('Box OCR error', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Kutu tanıma başarısız.',
    };
  }
}

export interface BatchRecognizedMedicine {
  name: string;
  dosage: string;
  form?:
    | 'tablet'
    | 'capsule'
    | 'syrup'
    | 'injection'
    | 'drops'
    | 'cream'
    | 'spray'
    | 'inhaler'
    | 'patch'
    | 'other';
  frequency?: number;
  instructions?:
    | 'before_meal'
    | 'after_meal'
    | 'with_meal'
    | 'empty_stomach'
    | 'before_sleep'
    | 'any_time';
  isCritical?: boolean;
}

/**
 * Birden fazla ilaç kutusunu veya reçete belgesini tek fotoğraftan topluca tanır (Multimodal Batch OCR)
 */
export async function recognizeMultipleMedicineBoxesPhotoAI(
  base64Image: string
): Promise<{ success: boolean; medicines: BatchRecognizedMedicine[]; error?: string }> {
  try {
    const prompt = `Sen uzman bir eczacılık ve reçete ayrıştırma yapay zekasısın.
Bu fotoğrafta yer alan tüm ilaç kutularını, blisterleri veya reçetedeki ilaçları tek tek tanı.
Her bir ilaç için adı, dozajını, formunu ve günde kaç kez alınması gerektiğini çıkar.
Sadece geçerli bir JSON formatında liste döndür:
{
  "medicines": [
    {
      "name": "İlaç Adı (Örn: Parol)",
      "dosage": "500mg",
      "form": "tablet",
      "frequency": 2,
      "instructions": "after_meal",
      "isCritical": false
    }
  ]
}`;

    const textResponse = await callGeminiGenerate({
      prompt,
      imageBase64: base64Image,
      imageMimeType: 'image/jpeg',
      temperature: 0.1,
      maxOutputTokens: 2048,
    });
    if (!textResponse) {
      return { success: false, medicines: [], error: 'Görselden ilaç listesi okunamadı.' };
    }

    let cleanJson = textResponse.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson
        .replace(/^```[a-zA-Z]*\n?/, '')
        .replace(/```$/, '')
        .trim();
    }
    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleanJson);

    const list: BatchRecognizedMedicine[] = Array.isArray(parsed?.medicines)
      ? parsed.medicines.map((m: any) => ({
          name: String(m.name || 'İlaç').trim(),
          dosage: String(m.dosage || '1 doz').trim(),
          form: m.form || 'tablet',
          frequency: Number(m.frequency) || 1,
          instructions: m.instructions || 'any_time',
          isCritical: !!m.isCritical,
        }))
      : [];

    return {
      success: true,
      medicines: list,
    };
  } catch (error: unknown) {
    log.error('Batch Box OCR error', error);
    return {
      success: false,
      medicines: [],
      error: error instanceof Error ? error.message : 'Toplu ilaç tanıma başarısız.',
    };
  }
}

// ============ KLİNİK & GIDA ETKİLEŞİMİ AI ANALİZİ ============

export interface ClinicalInteractionAIReport {
  success: boolean;
  overallSafetyScore: number; // 0-100 (100 = En Güvenli)
  summary: string;
  criticalAlerts: string[];
  foodDrinkWarnings: {
    food: string;
    affectedMedicine: string;
    warning: string;
    timingRule: string;
    severity: 'high' | 'moderate' | 'low';
  }[];
  lifestyleTips: string[];
  analyzedMedicines: string[];
  error?: string;
}

/**
 * Kullanıcının tüm kayıtlı ilaçlarını Gemini 3.6 Flash ile analiz ederek
 * kişiselleştirilmiş klinik güvenlik, gıda/içecek ve yaşam tarzı raporu üretir.
 */
export async function analyzeClinicalAndFoodInteractionsWithAI(
  medicines: { name: string; dosage?: string; instructions?: string; frequency?: number }[],
  language: 'tr' | 'en' = 'tr'
): Promise<ClinicalInteractionAIReport> {
  try {
    if (!medicines || medicines.length === 0) {
      return {
        success: true,
        overallSafetyScore: 100,
        summary:
          language === 'tr' ? 'Kayıtlı aktif ilaç bulunamadı.' : 'No active medicines registered.',
        criticalAlerts: [],
        foodDrinkWarnings: [],
        lifestyleTips: [],
        analyzedMedicines: [],
      };
    }

    const medListStr = medicines
      .map(
        (m, idx) =>
          `${idx + 1}. ${m.name} (Doz: ${m.dosage || 'Belirtilmemiş'}, Kullanım: ${m.instructions || 'Belirtilmemiş'}, Sıklık: Günde ${m.frequency || 1} kez)`
      )
      .join('\n');

    const prompt = `Sen uzman bir klinik farmakolog ve tıp doktoru yapay zekasısın.
Hastanın şu anda kullandığı aktif ilaç listesi aşağıdadır:
${medListStr}

Lütfen bu ilaç kombinasyonunu derinlemesine analiz et:
1. İlaçların birbiriyle olası farmakolojik veya toksik etkileşimleri (Drug-Drug).
2. İlaçların gıdalarla, içeceklerle (Greyfurt, Süt/Kalsiyum, Alkol, Kafein/Kahve, Potasyumlu besinler, K Vitamini) etkileşimleri ve saat aralığı kuralları (Drug-Food).
3. Güneş ışığı (fotosensitivite), açlık/tokluk veya böbrek/karaciğer yükü.
4. Genel Güvenlik Skoru (0-100 puan; 100 risksiz, 50 orta risk, 20 çok tehlikeli).

ÇIKTIYI SADECE AŞAĞIDAKİ GEÇERLİ JSON FORMATINDA DÖN:
{
  "overallSafetyScore": 85,
  "summary": "İlaçlarınız genel olarak uyumlu görünmektedir ancak...",
  "criticalAlerts": [
    "Aspirin ve Apranax birlikte alınırsa mide kanaması riski artar."
  ],
  "foodDrinkWarnings": [
    {
      "food": "Süt ve Yoğurt",
      "affectedMedicine": "Cipro",
      "warning": "Kalsiyum ilacın emilimini %60 düşürür.",
      "timingRule": "İlaç saatinden 2 saat önce ve 4 saat sonraya kadar süt ürünü almayınız.",
      "severity": "high"
    }
  ],
  "lifestyleTips": [
    "Bol su ile içiniz.",
    "Güneşe çıkarken koruyucu krem sürünüz."
  ]
}

Tüm metinleri ${language === 'tr' ? 'Türkçe' : 'İngilizce'} yaz. JSON dışında hiçbir metin veya markdown ekleme.`;

    // v1.7.4: kimlik doğrulamalı Cloud Function üzerinden — hasta ilaç listesi
    // artık istemciye gömülü anahtarla doğrudan Google'a gönderilmiyor.
    const textResponse = await callGeminiGenerate({
      prompt,
      temperature: 0.2,
      maxOutputTokens: 2048,
    });

    if (!textResponse) {
      return {
        success: false,
        overallSafetyScore: 80,
        summary: language === 'tr' ? 'Yanıt alınamadı.' : 'No response from AI.',
        criticalAlerts: [],
        foodDrinkWarnings: [],
        lifestyleTips: [],
        analyzedMedicines: medicines.map(m => m.name),
      };
    }

    let cleanJson = textResponse.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson
        .replace(/^```[a-zA-Z]*\n?/, '')
        .replace(/```$/, '')
        .trim();
    }
    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleanJson);

    return {
      success: true,
      overallSafetyScore:
        typeof parsed.overallSafetyScore === 'number' ? parsed.overallSafetyScore : 85,
      summary:
        parsed.summary ||
        (language === 'tr' ? 'Klinik analiz tamamlandı.' : 'Clinical analysis complete.'),
      criticalAlerts: Array.isArray(parsed.criticalAlerts) ? parsed.criticalAlerts : [],
      foodDrinkWarnings: Array.isArray(parsed.foodDrinkWarnings) ? parsed.foodDrinkWarnings : [],
      lifestyleTips: Array.isArray(parsed.lifestyleTips) ? parsed.lifestyleTips : [],
      analyzedMedicines: medicines.map(m => m.name),
    };
  } catch (error: unknown) {
    log.error('analyzeClinicalAndFoodInteractionsWithAI error', error);
    return {
      success: false,
      overallSafetyScore: 80,
      summary: language === 'tr' ? 'Analiz sırasında hata oluştu.' : 'Error during analysis.',
      criticalAlerts: [],
      foodDrinkWarnings: [],
      lifestyleTips: [],
      analyzedMedicines: medicines.map(m => m.name),
      error: error instanceof Error ? error.message : 'Bilinmeyen hata',
    };
  }
}
