/* eslint-disable */
// Faz 0.3 — aiMedicineService.ts: dogrudan-saglayici cagrilarini sunucuya tasi.
const fs = require('fs');
const p = 'C:/Users/digienes/Documents/ila_v8_agy_cmd/mobile/src/services/aiMedicineService.ts';
let s = fs.readFileSync(p, 'utf8');

function replaceBetween(startMarker, endMarker, replacement, label) {
  const i = s.indexOf(startMarker);
  const j = s.indexOf(endMarker);
  if (i === -1 || j === -1 || j <= i) {
    throw new Error('MARKER BULUNAMADI: ' + label + ' (start=' + i + ', end=' + j + ')');
  }
  s = s.slice(0, i) + replacement + s.slice(j);
  console.log('OK  ' + label);
}

// ---- 1) Barkod + isim aramasi ----
replaceBetween(
  '// ============ BARKOD İLE İLAÇ ARAMA ============',
  '// ============ İLAÇ HAKKINDA BİLGİ GETIR ============',
  `// ============ BARKOD İLE İLAÇ ARAMA ============

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

`,
  'barkod + isim aramasi'
);

fs.writeFileSync(p, s, 'utf8');
console.log('yazildi.');
