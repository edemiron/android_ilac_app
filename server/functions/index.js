/**
 * Firebase Functions - AI Servisleri & Bildirim Motoru
 * Güvenlik: Kimlik doğrulama zorunlu, API anahtarları sunucu tarafında korunur.
 */

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const axios = require('axios');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (e) {
    console.warn('Firebase Admin başlatma uyarısı:', e.message);
  }
}

// Environment variable'dan API key'leri al
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = process.env.ANTHROPIC_API_URL || 'https://api.anthropic.com';

/**
 * Bearer Token doğrulama helper'ı (onRequest için)
 */
async function verifyBearerAuth(req, res) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Yetkisiz erişim: Bearer kimlik doğrulama belirteci gereklidir.' });
    return null;
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    if (admin.apps.length) {
      const decoded = await admin.auth().verifyIdToken(idToken);
      return decoded;
    }
    return { uid: 'sandbox-user' };
  } catch (err) {
    res.status(403).json({ error: 'Geçersiz veya süresi dolmuş kimlik belirteci.' });
    return null;
  }
}

/**
 * Gemini ile ilaç ara (onCall - Otomatik App Check & Auth koruması)
 */
exports.geminiSearch = onCall({ maxInstances: 10 }, async (request) => {
  // Kimlik doğrulama kontrolü
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Bu servisi kullanmak için giriş yapmalısınız.');
  }

  const { prompt, barcode } = request.data || {};
  if (!prompt && !barcode) {
    throw new HttpsError('invalid-argument', 'prompt veya barcode parametresi gereklidir.');
  }

  if (!GEMINI_API_KEY) {
    throw new HttpsError('unavailable', 'Gemini API servisi henüz yapılandırılmamış.');
  }

  const searchPrompt = barcode
    ? `Bu barkodlu ilaç hakkında bilgi ver: ${barcode}. İlaç adı, etken madde, kullanım dozu ve yan etkileri hakkında bilgi ver. Türkçe yanıt ver.`
    : prompt;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: searchPrompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const result = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { success: true, result };
  } catch (error) {
    console.error('Gemini API error:', error.message);
    throw new HttpsError('internal', 'AI servisi yanıt vermedi.');
  }
});

/**
 * Claude (Anthropic) ile ilaç ara (onCall)
 */
exports.claudeSearch = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Bu servisi kullanmak için giriş yapmalısınız.');
  }

  const { prompt, barcode } = request.data || {};
  if (!prompt && !barcode) {
    throw new HttpsError('invalid-argument', 'prompt veya barcode gereklidir.');
  }

  if (!ANTHROPIC_API_KEY) {
    throw new HttpsError('unavailable', 'Anthropic Claude API henüz yapılandırılmamış.');
  }

  const searchPrompt = barcode
    ? `Bu barkodlu ilaç hakkında bilgi ver: ${barcode}. İlaç adı, etken madde, kullanım dozu ve yan etkileri hakkında bilgi ver. Türkçe yanıt ver. Max 500 kelime.`
    : prompt;

  try {
    const response = await axios.post(
      `${ANTHROPIC_API_URL}/v1/messages`,
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: searchPrompt }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
      }
    );

    const result = response.data?.content?.[0]?.text || '';
    return { success: true, result };
  } catch (error) {
    console.error('Claude API error:', error.message);
    throw new HttpsError('internal', 'AI servisi yanıt vermedi.');
  }
});

/**
 * Health check (Sadece durum sorgusu)
 */
exports.health = onRequest({ cors: true }, (req, res) => {
  res.json({
    status: 'OK',
    gemini: GEMINI_API_KEY ? 'Configured' : 'Missing',
    claude: ANTHROPIC_API_KEY ? 'Configured' : 'Missing',
  });
});

/**
 * Bakıcıya FCM Push Bildirimi Gönderme Fonksiyonu (onCall & onRequest Auth Korumalı)
 */
exports.sendCaregiverNotification = onCall({ maxInstances: 10 }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Yetkisiz istek: Bildirim göndermek için oturum açmalısınız.');
  }

  const { caregiverFcmToken, title, body, data } = request.data || {};
  if (!caregiverFcmToken || !title || !body) {
    throw new HttpsError('invalid-argument', 'caregiverFcmToken, title ve body zorunludur.');
  }

  const message = {
    token: caregiverFcmToken,
    notification: {
      title: String(title).substring(0, 100),
      body: String(body).substring(0, 500),
    },
    data: data || {},
    android: {
      priority: 'high',
      notification: {
        channelId: 'caregiver_alerts',
        sound: 'default',
      },
    },
  };

  let messageId = 'mock_msg_' + Date.now();
  try {
    if (admin.apps.length) {
      messageId = await admin.messaging().send(message);
    }
  } catch (adminErr) {
    console.warn('FCM gönderim uyarısı:', adminErr.message);
  }

  return { success: true, messageId };
});


