import { AISearchResult } from '../types';
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

// ============ AI ERISIMI ============
//
// TUM AI cagrilari `aiGenerate` callable Cloud Function'i uzerinden gider.
//
// Onceki surumde bu dosya `config/ai` Firestore dokumanindan geminiApiKey ve
// openaiApiKey alanlarini okuyup generativelanguage.googleapis.com ile
// api.openai.com adreslerine DOGRUDAN istek atiyordu. Kural
// `allow read: if isAuthenticated()` oldugu icin bu, kaydolan her kullanicinin
// ham API anahtarlarini cekebilmesi demekti. Dogrudan cagri yollari ve config
// okumasi tamamen kaldirildi; anahtarlar artik yalnizca sunucuda (Secret
// Manager) bulunuyor.
//
// Prompt uretimi ve yanit ayristirma istemcide kalir; sunucu yalnizca modeli
// gizli anahtarla cagirir.

let functions: ReturnType<typeof getFunctions> | null = null;

function getFunctionsInstance() {
  if (!functions) {
    functions = getFunctions();
  }
  return functions;
}

interface AiGenerateRequest {
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}

interface AiGenerateResponse {
  text?: string;
  provider?: string;
}

interface AiGenerateOptions {
  temperature?: number;
  maxOutputTokens?: number;
}

interface AiGenerateOutcome {
  text: string;
  provider: string;
}

/**
 * `aiGenerate` callable'ini cagirir.
 *
 * Basarisizlikta null doner — cagiran taraf kullaniciya gosterilecek mesaji
 * kendi baglamina gore uretir. Sunucudan gelen HttpsError mesajlari
 * (kimlik dogrulama, kota asimi) kullaniciya gosterilebilir niteliktedir.
 */
async function callAiGenerate(
  prompt: string,
  options: AiGenerateOptions = {}
): Promise<{ outcome: AiGenerateOutcome | null; error?: string }> {
  try {
    const fn = httpsCallable<AiGenerateRequest, AiGenerateResponse>(
      getFunctionsInstance(),
      'aiGenerate'
    );

    const result = await fn({
      prompt,
      temperature: options.temperature,
      maxOutputTokens: options.maxOutputTokens,
    });

    const text = result.data?.text?.trim();

    if (!text) {
      log.warn('aiGenerate bos yanit dondu');
      return { outcome: null, error: 'AI yanit vermedi.' };
    }

    return { outcome: { text, provider: result.data?.provider || 'AI' } };
  } catch (error: unknown) {
    log.error('aiGenerate cagrisi basarisiz', error);
    const message = error instanceof Error ? error.message : 'AI servisi su anda kullanilamiyor.';
    return { outcome: null, error: message };
  }
}

function failure(error: string): AISearchResult {
  return { success: false, confidence: 0, error };
}

// ============ BARKOD İLE İLAÇ ARAMA ============

/**
 * Barkod ile ilaç bilgilerini AI'dan çıkar.
 */
export async function searchMedicineByBarcodeAI(barcode: string): Promise<AISearchResult> {
  const { outcome, error } = await callAiGenerate(createSearchPrompt(barcode), {
    temperature: 0.1,
    maxOutputTokens: 2048,
  });

  if (!outcome) {
    return failure(error || 'AI araması başarısız oldu.');
  }

  return parseAIResponse(outcome.text, barcode, outcome.provider);
}

// ============ İSİM İLE İLAÇ ARAMA ============

/**
 * İlaç adı ile arama yap
 */
export async function searchMedicineByNameAI(name: string): Promise<AISearchResult> {
  const { outcome, error } = await callAiGenerate(createNameSearchPrompt(name), {
    temperature: 0.1,
    maxOutputTokens: 2048,
  });

  if (!outcome) {
    return failure(error || 'AI isim araması başarısız oldu.');
  }

  return parseNameSearchResponse(outcome.text, outcome.provider);
}

// ============ İLAÇ HAKKINDA BİLGİ GETIR ============

/**
 * İlaç adına göre detaylı bilgi getir (prospektüs)
 */
export async function getMedicineInfoAI(
  medicineName: string,
  dosage?: string
): Promise<AISearchResult> {
  const { outcome, error } = await callAiGenerate(createInfoPrompt(medicineName, dosage), {
    temperature: 0.2,
    maxOutputTokens: 4096,
  });

  if (!outcome) {
    return failure(error || 'Bilgi getirme başarısız.');
  }

  return parseProspectusResponse(outcome.text, outcome.provider);
}

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
