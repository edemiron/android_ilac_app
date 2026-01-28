import { AIConfig, AIProvider, AISearchResult, GlobalMedicine, MedicineForm, MedicineProspectus } from '../types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('AIMedicineService');

// ============ AI YAPILANDIRMA YÖNETİMİ ============

// Firebase'den AI yapılandırmasını al
const AI_CONFIG_DOC = 'config/ai';

interface StoredAIConfig {
  provider: AIProvider;
  geminiApiKey: string;
  openaiApiKey: string;
  geminiModel: string;
  openaiModel: string;
}

/**
 * Firebase'den AI yapılandırmasını getir
 */
export async function getAIConfig(): Promise<AIConfig | null> {
  try {
    const configRef = doc(db, 'config', 'ai');
    const snapshot = await getDoc(configRef);

    if (!snapshot.exists()) {
      log.debug('AI yapilandirmasi bulunamadi');
      return null;
    }

    const data = snapshot.data() as StoredAIConfig;
    return {
      provider: data.provider || 'gemini',
      geminiApiKey: data.geminiApiKey,
      openaiApiKey: data.openaiApiKey,
      model: data.provider === 'gemini' ? data.geminiModel : data.openaiModel,
    };
  } catch (error) {
    log.error('AI yapilandirma getirme hatasi', error);
    return null;
  }
}

// ============ BARKOD İLE İLAÇ ARAMA ============

/**
 * Barkod ile web'te arama yapıp AI ile ilaç bilgilerini çıkar
 */
export async function searchMedicineByBarcodeAI(barcode: string): Promise<AISearchResult> {
  try {
    const config = await getAIConfig();
    
    if (!config) {
      return {
        success: false,
        confidence: 0,
        error: 'AI yapılandırması bulunamadı. Admin panelinden API key girilmeli.',
      };
    }

    // Provider'a göre arama yap
    if (config.provider === 'gemini' && config.geminiApiKey) {
      return await searchWithGemini(barcode, config.geminiApiKey, config.model);
    } else if (config.provider === 'openai' && config.openaiApiKey) {
      return await searchWithOpenAI(barcode, config.openaiApiKey, config.model);
    }

    return {
      success: false,
      confidence: 0,
      error: 'Geçerli bir AI API key bulunamadı.',
    };
  } catch (error: unknown) {
    log.error('AI arama hatasi', error);
    const errorMessage = error instanceof Error ? error.message : 'AI araması başarısız oldu.';
    return {
      success: false,
      confidence: 0,
      error: errorMessage,
    };
  }
}

// ============ GEMİNİ İLE ARAMA ============

async function searchWithGemini(
  barcode: string,
  apiKey: string,
  model: string = 'gemini-2.5-flash'
): Promise<AISearchResult> {
  const prompt = createSearchPrompt(barcode);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Gemini API hatası');
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      return {
        success: false,
        confidence: 0,
        error: 'AI yanıt vermedi.',
      };
    }

    return parseAIResponse(textResponse, barcode, 'Gemini');
  } catch (error: unknown) {
    log.error('Gemini arama hatasi', error);
    const errorMessage = error instanceof Error ? error.message : 'Gemini araması başarısız.';
    return {
      success: false,
      confidence: 0,
      error: errorMessage,
    };
  }
}

// ============ OPENAİ İLE ARAMA ============

async function searchWithOpenAI(
  barcode: string,
  apiKey: string,
  model: string = 'gpt-4o-mini'
): Promise<AISearchResult> {
  const prompt = createSearchPrompt(barcode);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'Sen bir ilaç veritabanı asistanısın. Barkod numaralarına göre ilaç bilgilerini JSON formatında döndürürsün.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'OpenAI API hatası');
    }

    const data = await response.json();
    const textResponse = data.choices?.[0]?.message?.content;

    if (!textResponse) {
      return {
        success: false,
        confidence: 0,
        error: 'AI yanıt vermedi.',
      };
    }

    return parseAIResponse(textResponse, barcode, 'OpenAI');
  } catch (error: unknown) {
    log.error('OpenAI arama hatasi', error);
    const errorMessage = error instanceof Error ? error.message : 'OpenAI araması başarısız.';
    return {
      success: false,
      confidence: 0,
      error: errorMessage,
    };
  }
}

// ============ İSİM İLE İLAÇ ARAMA ============

/**
 * İlaç adı ile arama yap
 */
export async function searchMedicineByNameAI(name: string): Promise<AISearchResult> {
  try {
    const config = await getAIConfig();
    
    if (!config) {
      return {
        success: false,
        confidence: 0,
        error: 'AI yapılandırması bulunamadı.',
      };
    }

    const prompt = createNameSearchPrompt(name);

    if (config.provider === 'gemini' && config.geminiApiKey) {
      return await searchNameWithGemini(prompt, config.geminiApiKey, config.model);
    } else if (config.provider === 'openai' && config.openaiApiKey) {
      return await searchNameWithOpenAI(prompt, config.openaiApiKey, config.model);
    }

    return {
      success: false,
      confidence: 0,
      error: 'Geçerli bir AI API key bulunamadı.',
    };
  } catch (error: unknown) {
    log.error('AI isim aramasi hatasi', error);
    const errorMessage = error instanceof Error ? error.message : 'AI isim araması başarısız oldu.';
    return {
      success: false,
      confidence: 0,
      error: errorMessage,
    };
  }
}

async function searchNameWithGemini(
  prompt: string,
  apiKey: string,
  model: string = 'gemini-2.5-flash'
): Promise<AISearchResult> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
        }),
      }
    );

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return parseNameSearchResponse(textResponse, 'Gemini');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Arama hatasi';
    return { success: false, confidence: 0, error: errorMessage };
  }
}

async function searchNameWithOpenAI(
  prompt: string,
  apiKey: string,
  model: string = 'gpt-4o-mini'
): Promise<AISearchResult> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Sen bir ilaç bilgi asistanısın. İlaç adlarına göre doğru bilgileri sağlarsın.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 2048,
      }),
    });

    const data = await response.json();
    const textResponse = data.choices?.[0]?.message?.content;
    return parseNameSearchResponse(textResponse, 'OpenAI');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Arama hatasi';
    return { success: false, confidence: 0, error: errorMessage };
  }
}

function createNameSearchPrompt(name: string): string {
  return `
"${name}" isimli ilacı bul ve bilgilerini JSON formatında döndür.

Yanıtı SADECE aşağıdaki JSON formatında ver:

{
  "found": true veya false,
  "confidence": 0-100 arası güven skoru,
  "medicine": {
    "name": "İlaç adı (tam adı)",
    "genericName": "Etken madde adı",
    "dosage": "Yaygın doz (örn: 500mg)",
    "form": "tablet/capsule/syrup/cream/drops/spray/injection/other",
    "manufacturer": "Üretici firma (Türkiye'de satılıyorsa)",
    "country": "TR"
  }
}

NOT: Türkiye'de satılan ilaçları öncelikli olarak bul. Emin değilsen "found": false döndür.
`;
}

function parseNameSearchResponse(response: string, source: string): AISearchResult {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, confidence: 0, error: 'Geçersiz AI yanıtı' };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.found || !parsed.medicine) {
      return {
        success: false,
        confidence: parsed.confidence || 0,
        error: 'İlaç bulunamadı',
      };
    }

    const medicine: Partial<GlobalMedicine> = {
      name: parsed.medicine.name,
      genericName: parsed.medicine.genericName,
      dosage: parsed.medicine.dosage,
      form: (parsed.medicine.form as MedicineForm) || 'other',
      manufacturer: parsed.medicine.manufacturer || 'Bilinmiyor',
      country: parsed.medicine.country || 'TR',
    };

    return {
      success: true,
      medicine,
      confidence: parsed.confidence || 65,
      source,
    };
  } catch (error) {
    log.error('AI isim aramasi parse hatasi', error);
    return { success: false, confidence: 0, error: 'AI yanıtı işlenemedi' };
  }
}

// ============ İLAÇ HAKKINDA BİLGİ GETIR ============

/**
 * İlaç adına göre detaylı bilgi getir (prospektüs)
 */
export async function getMedicineInfoAI(
  medicineName: string,
  dosage?: string
): Promise<AISearchResult> {
  try {
    const config = await getAIConfig();
    
    if (!config) {
      return {
        success: false,
        confidence: 0,
        error: 'AI yapılandırması bulunamadı.',
      };
    }

    const prompt = createInfoPrompt(medicineName, dosage);

    if (config.provider === 'gemini' && config.geminiApiKey) {
      return await getInfoWithGemini(prompt, config.geminiApiKey, config.model);
    } else if (config.provider === 'openai' && config.openaiApiKey) {
      return await getInfoWithOpenAI(prompt, config.openaiApiKey, config.model);
    }

    return {
      success: false,
      confidence: 0,
      error: 'Geçerli bir AI API key bulunamadı.',
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Bilgi getirme başarısız.';
    return {
      success: false,
      confidence: 0,
      error: errorMessage,
    };
  }
}

async function getInfoWithGemini(
  prompt: string,
  apiKey: string,
  model: string = 'gemini-2.5-flash'
): Promise<AISearchResult> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
        }),
      }
    );

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return parseProspectusResponse(textResponse);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Bilgi getirme hatasi';
    return { success: false, confidence: 0, error: errorMessage };
  }
}

async function getInfoWithOpenAI(
  prompt: string,
  apiKey: string,
  model: string = 'gpt-4o-mini'
): Promise<AISearchResult> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Sen bir ilaç bilgi asistanısın. Detaylı ve doğru ilaç bilgileri sağlarsın.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 4096,
      }),
    });

    const data = await response.json();
    const textResponse = data.choices?.[0]?.message?.content;
    return parseProspectusResponse(textResponse);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Bilgi getirme hatasi';
    return { success: false, confidence: 0, error: errorMessage };
  }
}

// ============ PROMPT OLUŞTURMA ============

function createSearchPrompt(barcode: string): string {
  return `
Aşağıdaki barkod numarasına sahip ilacı bul ve bilgilerini JSON formatında döndür.

Barkod: ${barcode}

Yanıtı SADECE aşağıdaki JSON formatında ver, başka hiçbir şey yazma:

{
  "found": true veya false,
  "confidence": 0-100 arası güven skoru,
  "medicine": {
    "name": "İlaç adı",
    "genericName": "Etken madde adı",
    "dosage": "Doz (örn: 500mg)",
    "form": "tablet/capsule/syrup/cream/drops/spray/injection/other",
    "manufacturer": "Üretici firma",
    "country": "Ülke kodu (TR, US, DE vb.)"
  }
}

Eğer ilaç bulunamazsa:
{
  "found": false,
  "confidence": 0,
  "medicine": null
}

NOT: Sadece emin olduğun bilgileri yaz. Emin değilsen "found": false döndür.
`;
}

function createInfoPrompt(medicineName: string, dosage?: string): string {
  return `
"${medicineName}${dosage ? ` ${dosage}` : ''}" ilacı hakkında detaylı bilgi ver.

Yanıtı SADECE aşağıdaki JSON formatında ver:

{
  "found": true,
  "prospectus": {
    "indication": "Ne için kullanılır (1-2 cümle)",
    "contraindication": "Kimler kullanmamalı (1-2 cümle)",
    "sideEffects": ["Yan etki 1", "Yan etki 2", "Yan etki 3"],
    "dosageInstructions": "Nasıl kullanılır",
    "warnings": ["Uyarı 1", "Uyarı 2"],
    "interactions": ["Etkileşim 1", "Etkileşim 2"],
    "pregnancy": "Gebelikte kullanım bilgisi",
    "storage": "Saklama koşulları",
    "activeIngredients": [
      {"name": "Etken madde", "amount": "Miktar"}
    ]
  }
}
`;
}

// ============ YANIT PARSE ============

function parseAIResponse(response: string, barcode: string, source: string): AISearchResult {
  try {
    // JSON'ı temizle (bazen AI ekstra text ekleyebilir)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, confidence: 0, error: 'Geçersiz AI yanıtı' };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.found || !parsed.medicine) {
      return {
        success: false,
        confidence: parsed.confidence || 0,
        error: 'İlaç bulunamadı',
      };
    }

    const medicine: Partial<GlobalMedicine> = {
      barcode,
      name: parsed.medicine.name,
      genericName: parsed.medicine.genericName,
      dosage: parsed.medicine.dosage,
      form: (parsed.medicine.form as MedicineForm) || 'other',
      manufacturer: parsed.medicine.manufacturer || 'Bilinmiyor',
      country: parsed.medicine.country || 'TR',
    };

    return {
      success: true,
      medicine,
      confidence: parsed.confidence || 70,
      source,
    };
  } catch (error) {
    log.error('AI yanit parse hatasi', error);
    return {
      success: false,
      confidence: 0,
      error: 'AI yanıtı işlenemedi',
    };
  }
}

function parseProspectusResponse(response: string): AISearchResult {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, confidence: 0, error: 'Geçersiz AI yanıtı' };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.found || !parsed.prospectus) {
      return { success: false, confidence: 0, error: 'Prospektüs bilgisi bulunamadı' };
    }

    return {
      success: true,
      medicine: {
        prospectus: parsed.prospectus as MedicineProspectus,
      },
      confidence: 80,
    };
  } catch (error) {
    return { success: false, confidence: 0, error: 'Prospektüs yanıtı işlenemedi' };
  }
}
