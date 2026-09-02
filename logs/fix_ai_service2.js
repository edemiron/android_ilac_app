/* eslint-disable */
// Faz 0.3 (2/2) — prospektus, gorsel tanima ve etkilesim analizini sunucuya tasi.
const fs = require('fs');
const p = 'C:/Users/digienes/Documents/ila_v8_agy_cmd/mobile/src/services/aiMedicineService.ts';
let s = fs.readFileSync(p, 'utf8');
const before = s;

function replaceBetween(startMarker, endMarker, replacement, label) {
  const i = s.indexOf(startMarker);
  const j = s.indexOf(endMarker);
  if (i === -1 || j === -1 || j <= i) throw new Error('MARKER YOK: ' + label);
  s = s.slice(0, i) + replacement + s.slice(j);
  console.log('OK  ' + label);
}

// ---- 1) Prospektus (getMedicineInfoAI + getInfoWithGemini + getInfoWithOpenAI) ----
replaceBetween(
  '// ============ İLAÇ HAKKINDA BİLGİ GETIR ============',
  '// ============ YANIT PARSE ============',
  `// ============ İLAÇ HAKKINDA BİLGİ GETIR ============

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

`,
  'prospektus'
);

// ---- 2/3/4) config + fetch bloklarini callGeminiGenerate'e cevir ----
// (a) "config al + anahtar yok kontrolu" bloklarini kaldir
const configBlock =
  /\n\s*const config = await getAIConfig\(\);\n\s*if \(!config \|\| !config\.geminiApiKey\) \{[\s\S]*?\n\s*\}\n/g;
let removed = 0;
s = s.replace(configBlock, () => {
  removed++;
  return '\n';
});
console.log('OK  getAIConfig blogu kaldirildi: ' + removed);

// (b) gorsel iceren fetch bloklarini callGeminiGenerate ile degistir
const visionFetch =
  /const response = await fetch\(\s*`https:\/\/generativelanguage[\s\S]*?inlineData: \{\s*mimeType: 'image\/jpeg',\s*data: (\w+),\s*\},[\s\S]*?generationConfig: \{\s*temperature: ([\d.]+),\s*maxOutputTokens: (\d+),\s*\},\s*\}\),\s*\}\s*\);\s*\n\s*const data = await response\.json\(\);\s*\n\s*if \(data\.error\) \{[\s\S]*?\n\s*\}\s*\n\s*const textResponse = data\.candidates\?\.\[0\]\?\.content\?\.parts\?\.\[0\]\?\.text;/g;
let vision = 0;
s = s.replace(visionFetch, (_m, imgVar, temp, maxTok) => {
  vision++;
  return `const textResponse = await callGeminiGenerate({
      prompt,
      imageBase64: ${imgVar},
      imageMimeType: 'image/jpeg',
      temperature: ${temp},
      maxOutputTokens: ${maxTok},
    });`;
});
console.log('OK  gorsel fetch blogu tasindi: ' + vision);

if (s === before) throw new Error('HICBIR DEGISIKLIK YAPILMADI');
fs.writeFileSync(p, s, 'utf8');
console.log('yazildi.');
