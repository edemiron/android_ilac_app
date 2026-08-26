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
 * Hem Topic (`patient_{userId}`) hem Direct Token ile çift hat üzerinden garanti iletim.
 */
exports.onMedicineLogCreated = onDocumentCreated('users/{userId}/medicineLogs/{logId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const logData = snapshot.data();
  const userId = event.params.userId;
  const status = logData.status;

  console.log(`[onMedicineLogCreated] Event tetiklendi: userId=${userId}, status=${status}`);

  if (status !== 'taken' && status !== 'skipped' && status !== 'missed') {
    console.log(`[onMedicineLogCreated] Status '${status}' bildirim gerektirmiyor.`);
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

    const medicineName = logData.medicineName || 'İlaç';
    const scheduledTime = logData.scheduledTime || '';
    const time = scheduledTime.includes('T') ? scheduledTime.split('T')[1].slice(0, 5) : scheduledTime;

    const isTaken = status === 'taken';
    const title = isTaken ? `🎉 ${patientName} İlacını Aldı!` : `⚠️ ${patientName} İlacını Atladı`;
    const body = isTaken
      ? `${medicineName} (${time}) dozunu başarıyla tamamladı.`
      : `${medicineName} (${time}) dozunu atladı.`;

    const notificationPayload = {
      title,
      body,
    };

    const dataPayload = {
      title,
      body,
      type: 'caregiver_alert',
      patientId: userId,
      patientName,
      medicineName,
      status,
      scheduledTime,
    };

    const androidConfig = {
      priority: 'high',
      notification: {
        channelId: 'caregiver-live-alerts-v1',
        sound: 'default',
        priority: 'max',
        visibility: 'public',
        defaultVibrateTimings: true,
      },
    };

    const promises = [];

    // 1. TOPIC BROADCAST: patient_{userId} konusuna yayın yap (Anında tüm bağlı bakıcılar alır!)
    const topicMessage = {
      topic: `patient_${userId}`,
      notification: notificationPayload,
      data: dataPayload,
      android: androidConfig,
    };
    promises.push(
      admin.messaging().send(topicMessage)
        .then(msgId => console.log(`[onMedicineLogCreated] Topic patient_${userId} mesajı gönderildi: ${msgId}`))
        .catch(err => console.warn(`[onMedicineLogCreated] Topic gönderim hatası: ${err.message}`))
    );

    // 2. DIRECT TOKEN MESSAGES: caregiverRelationships koleksiyonunu tara (filtresiz geniş arama)
    const relSnap = await db.collection('caregiverRelationships')
      .where('patientId', '==', userId)
      .get();

    console.log(`[onMedicineLogCreated] Bulunan ilişki sayısı: ${relSnap.size}`);

    const sentTokens = new Set();

    for (const doc of relSnap.docs) {
      const rel = doc.data();
      let token = rel.caregiverFcmToken;

      if (!token && rel.caregiverId) {
        try {
          const cUserDoc = await db.collection('users').doc(rel.caregiverId).get();
          if (cUserDoc.exists) {
            const cData = cUserDoc.data();
            token = cData?.pushToken || cData?.caregiverFcmToken || cData?.fcmToken;
          }
        } catch (_cErr) {}
      }

      if (token && !sentTokens.has(token)) {
        sentTokens.add(token);
        const directMessage = {
          token,
          notification: notificationPayload,
          data: dataPayload,
          android: androidConfig,
        };
        promises.push(
          admin.messaging().send(directMessage)
            .then(msgId => console.log(`[onMedicineLogCreated] Direct token mesajı gönderildi (${token.slice(0, 15)}...): ${msgId}`))
            .catch(err => console.warn(`[onMedicineLogCreated] Direct token gönderim hatası: ${err.message}`))
        );
      }
    }

    await Promise.all(promises);
    console.log(`[onMedicineLogCreated] Toplam ${promises.length} bildirim akışı tamamlandı.`);
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

    const token = userDoc.data()?.pushToken || userDoc.data()?.caregiverFcmToken || userDoc.data()?.fcmToken;

    const caregiverName = reminder.caregiverName || 'Bakıcınız';
    const medicineName = reminder.medicineName || 'İlacınızı';
    const messageText = reminder.customMessage || `${caregiverName} size ${medicineName} ilacınızı hatırlattı.`;

    const notificationPayload = {
      title: `📢 ${caregiverName} Hatırlatması`,
      body: messageText,
    };

    const dataPayload = {
      title: `📢 ${caregiverName} Hatırlatması`,
      body: messageText,
      type: 'patient_remote_reminder',
      reminderId: event.params.reminderId,
      caregiverName,
      medicineName,
      scheduledTime: reminder.scheduledTime || '',
    };

    const androidConfig = {
      priority: 'high',
      notification: {
        channelId: 'patient-remote-reminders-v1',
        sound: 'default',
        priority: 'max',
        visibility: 'public',
        defaultVibrateTimings: true,
      },
    };

    const promises = [];

    // 1. Topic: user_{userId}
    promises.push(
      admin.messaging().send({
        topic: `user_${userId}`,
        notification: notificationPayload,
        data: dataPayload,
        android: androidConfig,
      }).catch(err => console.warn('Remote reminder topic error:', err.message))
    );

    // 2. Direct Token
    if (token) {
      promises.push(
        admin.messaging().send({
          token,
          notification: notificationPayload,
          data: dataPayload,
          android: androidConfig,
        }).catch(err => console.warn('Remote reminder token error:', err.message))
      );
    }

    await Promise.all(promises);
    console.log(`[onRemoteReminderCreated] Hasta ${userId} kullanıcısına FCM iletildi.`);
  } catch (error) {
    console.error('[onRemoteReminderCreated] Hata:', error);
  }
});
