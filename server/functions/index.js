/**
 * Firebase Functions — AI proxy.
 *
 * GUVENLIK MODELI
 * ---------------
 * API anahtarlari Secret Manager'da tutulur ve istemciye HICBIR kosulda
 * gitmez. Onceki surumde anahtarlar Firestore'daki `config/ai` dokumaninda
 * duz metin duruyordu ve kural `allow read: if isAuthenticated()` oldugu icin
 * kaydolan HERKES anahtarlari cekebiliyordu. Artik:
 *
 *   1. `config/ai` istemciye tamamen kapali (firestore.rules).
 *   2. Anahtarlar yalnizca bu fonksiyonun calisma ortamina enjekte edilir.
 *   3. Cagrilar onCall'dir — Firebase kimlik dogrulamasi zorunlu.
 *   4. Kullanici basina gunluk kota Firestore transaction'i ile uygulanir.
 *
 * Onceki surum `onRequest` kullaniyordu: kimlik dogrulamasi, kota veya App
 * Check olmadan herkese acikti (fatura suistimali). Ayrica istemci
 * `httpsCallable` ile cagirdigi icin protokol hic uyusmuyordu — yani AI
 * ozelligi her zaman istemci tarafi anahtarla calisan yedek yola dusuyordu.
 *
 * DAGITIM
 *   firebase functions:secrets:set GEMINI_API_KEY
 *   firebase functions:secrets:set OPENAI_API_KEY
 *   firebase deploy --only functions
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

/** Prompt'lar istemcide uretilir; kotuye kullanimi sinirlamak icin ust sinir. */
const MAX_PROMPT_CHARS = 4000;

/** Kullanici basina gunluk AI cagrisi ust siniri. */
const DAILY_QUOTA = 50;

/**
 * Kullanici basina gunluk kotayi atomik olarak uygular.
 * Sayaclar `aiUsage/{uid}` altinda tutulur; bu koleksiyon istemciye kapalidir
 * (firestore.rules'daki catch-all deny kurali kapsar).
 */
async function consumeQuota(uid) {
  const ref = db.collection('aiUsage').doc(uid);
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : null;
    const used = data && data.day === today ? data.count || 0 : 0;

    if (used >= DAILY_QUOTA) {
      throw new HttpsError(
        'resource-exhausted',
        'Gunluk AI arama limitine ulastiniz. Lutfen yarin tekrar deneyin.'
      );
    }

    tx.set(
      ref,
      {
        day: today,
        count: used + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
}

/**
 * Saglayici/model tercihini Firestore'dan okur.
 * Bu dokuman artik SIR ICERMEZ — yalnizca provider ve model adlari.
 * Anahtarlar Secret Manager'dadir.
 */
async function loadProviderConfig() {
  try {
    const snap = await db.collection('config').doc('ai').get();
    const data = snap.exists ? snap.data() : {};
    return {
      provider: data.provider === 'openai' ? 'openai' : 'gemini',
      geminiModel: data.geminiModel || DEFAULT_GEMINI_MODEL,
      openaiModel: data.openaiModel || DEFAULT_OPENAI_MODEL,
    };
  } catch (error) {
    logger.warn('config/ai okunamadi, varsayilanlar kullanilacak', error);
    return {
      provider: 'gemini',
      geminiModel: DEFAULT_GEMINI_MODEL,
      openaiModel: DEFAULT_OPENAI_MODEL,
    };
  }
}

async function callGemini(prompt, model, apiKey, options) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.temperature,
          maxOutputTokens: options.maxOutputTokens,
        },
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    logger.error('Gemini API hatasi', { status: response.status, body });
    throw new HttpsError('internal', 'AI servisi su anda yanit veremiyor.');
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callOpenAI(prompt, model, apiKey, options) {
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
          content: 'Sen bir ilac bilgi asistanisin. Dogru ve olculu bilgi verirsin.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: options.temperature,
      max_tokens: options.maxOutputTokens,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error('OpenAI API hatasi', { status: response.status, body });
    throw new HttpsError('internal', 'AI servisi su anda yanit veremiyor.');
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || '';
}

/**
 * Tek genel amacli AI ucu.
 *
 * Istemci prompt'u kendisi kurar (aiMedicineHelpers) ve donen ham metni
 * kendisi ayristirir; sunucunun tek isi anahtari gizli tutarak modeli
 * cagirmaktir.
 *
 * NOT: enforceAppCheck su an KAPALI. App Check istemci tarafinda henuz
 * gercek bir attestation saglayicisiyla baslatilmiyor
 * (mobile/src/config/appCheck.ts). Play Integrity saglayicisi devreye
 * alindiginda bu bayrak true yapilmalidir.
 */
exports.aiGenerate = onCall(
  {
    secrets: [GEMINI_API_KEY, OPENAI_API_KEY],
    enforceAppCheck: false,
    maxInstances: 10,
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async request => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Bu islem icin giris yapmalisiniz.');
    }

    const prompt = typeof request.data?.prompt === 'string' ? request.data.prompt.trim() : '';

    if (!prompt) {
      throw new HttpsError('invalid-argument', 'prompt alani zorunludur.');
    }

    if (prompt.length > MAX_PROMPT_CHARS) {
      throw new HttpsError(
        'invalid-argument',
        `prompt en fazla ${MAX_PROMPT_CHARS} karakter olabilir.`
      );
    }

    const temperature = Number.isFinite(request.data?.temperature)
      ? Math.min(Math.max(request.data.temperature, 0), 1)
      : 0.1;
    const maxOutputTokens = Number.isFinite(request.data?.maxOutputTokens)
      ? Math.min(Math.max(Math.trunc(request.data.maxOutputTokens), 1), 4096)
      : 2048;

    await consumeQuota(request.auth.uid);

    const config = await loadProviderConfig();
    const options = { temperature, maxOutputTokens };

    if (config.provider === 'openai') {
      const key = OPENAI_API_KEY.value();
      if (!key) {
        throw new HttpsError('failed-precondition', 'AI servisi yapilandirilmamis.');
      }
      const text = await callOpenAI(prompt, config.openaiModel, key, options);
      return { text, provider: 'OpenAI' };
    }

    const key = GEMINI_API_KEY.value();
    if (!key) {
      throw new HttpsError('failed-precondition', 'AI servisi yapilandirilmamis.');
    }
    const text = await callGemini(prompt, config.geminiModel, key, options);
    return { text, provider: 'Gemini' };
  }
);
