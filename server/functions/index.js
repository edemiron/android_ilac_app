/**
 * Firebase Functions - AI Servisleri & Otomatik Bildirim Motoru
 * Güvenlik: Kimlik doğrulama zorunlu, API anahtarları sunucu tarafında korunur.
 */

const { setGlobalOptions } = require('firebase-functions/v2');
setGlobalOptions({ region: 'europe-west1', maxInstances: 10 });

const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
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
 * Gemini ile ilaç ara (onCall)
 */
exports.geminiSearch = onCall(async (request) => {
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
exports.claudeSearch = onCall(async (request) => {
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
 * Health check
 */
exports.health = onRequest({ cors: true }, (req, res) => {
  res.json({
    status: 'OK',
    gemini: GEMINI_API_KEY ? 'Configured' : 'Missing',
    claude: ANTHROPIC_API_KEY ? 'Configured' : 'Missing',
  });
});

/**
 * ⚡ OTOMATİK CLOUD TRIGGER: Hasta İlaç Aldığında/Atladığında Bakıcıya Anında FCM Gönder
 * Hasta uygulaması kapalı olsa veya arkaplanda olsa dahi Firestore yazıldığı an tetiklenir.
 */
exports.onMedicineLogCreated = onDocumentCreated('users/{userId}/medicineLogs/{logId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const logData = snapshot.data();
  const userId = event.params.userId;
  const status = logData.status;

  if (status !== 'taken' && status !== 'skipped' && status !== 'missed') {
    return;
  }

  try {
    const db = admin.firestore();

    // 1. Hasta adını al
    let patientName = 'Hastanız';
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const uData = userDoc.data();
        patientName = uData.displayName || uData.name || 'Hastanız';
      }
    } catch (_uErr) {}

    // 2. Bakıcıları bul
    const relSnap = await db.collection('caregiverRelationships')
      .where('patientId', '==', userId)
      .where('status', '==', 'active')
      .get();

    if (relSnap.empty) {
      console.log('Bildirim gönderilecek aktif bakıcı bulunamadı');
      return;
    }

    const medicineName = logData.medicineName || 'İlaç';
    const scheduledTime = logData.scheduledTime || '';
    const time = scheduledTime.includes('T') ? scheduledTime.split('T')[1].slice(0, 5) : scheduledTime;

    const isTaken = status === 'taken';
    const title = isTaken ? `🎉 ${patientName} İlacını Aldı!` : `⚠️ ${patientName} İlacını Atladı`;
    const body = isTaken
      ? `${medicineName} (${time}) dozunu başarıyla tamamladı.`
      : `${medicineName} (${time}) dozunu atladı.`;

    // 3. Her bakıcıya FCM gönder
    const promises = [];
    for (const doc of relSnap.docs) {
      const rel = doc.data();
      let token = rel.caregiverFcmToken;

      if (!token && rel.caregiverId) {
        try {
          const cUserDoc = await db.collection('users').doc(rel.caregiverId).get();
          if (cUserDoc.exists) {
            token = cUserDoc.data()?.pushToken || cUserDoc.data()?.caregiverFcmToken;
          }
        } catch (_cErr) {}
      }

      if (token) {
        const message = {
          token,
          notification: {
            title,
            body,
          },
          data: {
            type: 'caregiver_alert',
            patientId: userId,
            patientName: rel.patientName || patientName,
            medicineName,
            status,
            scheduledTime,
          },
          android: {
            priority: 'high',
            notification: {
              channelId: 'caregiver-live-alerts-v1',
              sound: 'default',
              priority: 'max',
              defaultVibrateTimings: true,
            },
          },
        };
        promises.push(admin.messaging().send(message).catch(err => console.warn('FCM send error:', err.message)));
      }
    }

    await Promise.all(promises);
    console.log(`[onMedicineLogCreated] ${promises.length} bakıcıya FCM push iletildi.`);
  } catch (error) {
    console.error('[onMedicineLogCreated] Hata:', error);
  }
});

/**
 * ⚡ OTOMATİK CLOUD TRIGGER: Bakıcı Hastaya Hatırlatıcı Gönderdiğinde Hastaya Anında FCM Gönder
 */
exports.onRemoteReminderCreated = onDocumentCreated('users/{userId}/remoteReminders/{reminderId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const reminder = snapshot.data();
  const userId = event.params.userId;

  try {
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return;

    const token = userDoc.data()?.pushToken || userDoc.data()?.caregiverFcmToken;
    if (!token) return;

    const caregiverName = reminder.caregiverName || 'Bakıcınız';
    const medicineName = reminder.medicineName || 'İlacınızı';
    const messageText = reminder.customMessage || `${caregiverName} size ${medicineName} ilacınızı hatırlattı.`;

    const message = {
      token,
      notification: {
        title: `📢 ${caregiverName} Hatırlatması`,
        body: messageText,
      },
      data: {
        type: 'patient_remote_reminder',
        reminderId: event.params.reminderId,
        caregiverName,
        medicineName,
        scheduledTime: reminder.scheduledTime || '',
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'patient-remote-reminders-v1',
          sound: 'default',
          priority: 'max',
          defaultVibrateTimings: true,
        },
      },
    };

    await admin.messaging().send(message);
    console.log(`[onRemoteReminderCreated] Hasta ${userId} kullanıcısına FCM iletildi.`);
  } catch (error) {
    console.error('[onRemoteReminderCreated] Hata:', error);
  }
});
