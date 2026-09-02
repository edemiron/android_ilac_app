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
 * Genel amaçlı Gemini üretimi (onCall) — metin ve/veya görsel.
 *
 * ⚠️ v1.7.4 (Faz 0.3): İstemci eskiden APK'ya GÖMÜLÜ bir API anahtarıyla
 * doğrudan `generativelanguage.googleapis.com`a istek atıyordu. Anahtar
 * Hermes bytecode'undan çıkarılabildiği için kota/fatura istismarına açıktı;
 * ayrıca `config/ai` dokümanı kimlik doğrulamasız okunabildiğinden anahtarlar
 * oradan da sızıyordu. Tüm AI çağrıları artık BURADAN geçer.
 *
 * Güvenlik notları:
 *  - `request.auth` zorunlu.
 *  - Model, izinli listeyle sınırlı: istemci keyfi model/endpoint enjekte edemez.
 *  - Görsel boyutu sınırlı (base64 ~8 MB) — bellek/maliyet koruması.
 */
const ALLOWED_GEMINI_MODELS = new Set([
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
]);
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';
const MAX_INLINE_IMAGE_CHARS = 8 * 1024 * 1024; // base64 karakter sayısı

exports.geminiGenerate = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Bu servisi kullanmak için giriş yapmalısınız.');
  }

  const { prompt, imageBase64, imageMimeType, model, temperature, maxOutputTokens } =
    request.data || {};

  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw new HttpsError('invalid-argument', 'prompt parametresi gereklidir.');
  }
  if (imageBase64 !== undefined) {
    if (typeof imageBase64 !== 'string' || imageBase64.length === 0) {
      throw new HttpsError('invalid-argument', 'imageBase64 geçersiz.');
    }
    if (imageBase64.length > MAX_INLINE_IMAGE_CHARS) {
      throw new HttpsError('invalid-argument', 'Görsel çok büyük.');
    }
  }
  if (!GEMINI_API_KEY) {
    throw new HttpsError('unavailable', 'Gemini API servisi henüz yapılandırılmamış.');
  }

  const selectedModel = ALLOWED_GEMINI_MODELS.has(model) ? model : DEFAULT_GEMINI_MODEL;

  const parts = [{ text: prompt }];
  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: typeof imageMimeType === 'string' ? imageMimeType : 'image/jpeg',
        data: imageBase64,
      },
    });
  }

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts }],
        generationConfig: {
          temperature: typeof temperature === 'number' ? Math.min(Math.max(temperature, 0), 1) : 0.4,
          maxOutputTokens:
            typeof maxOutputTokens === 'number' ? Math.min(Math.max(maxOutputTokens, 64), 8192) : 2048,
        },
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 60000 }
    );

    const result = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { success: true, result, model: selectedModel };
  } catch (error) {
    console.error('geminiGenerate error:', error.message);
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
 * ⚠️ v1.7.4 — `health` KALDIRILDI (Faz 0.2, KRİTİK GÜVENLİK)
 *
 * Eski hâli `onRequest({ cors: true })` idi, yani KİMLİK DOĞRULAMASIZ public
 * HTTPS endpoint. Tek bir GET isteği ile:
 *   - `users` koleksiyonunun TAMAMI (uid, isim, e-posta, FCM/Expo push token),
 *   - `caregiverRelationships` tamamı (telefon numaraları, bakıcı token'ları)
 * JSON olarak dönüyordu; `?testPatientId=<uid>` parametresiyle de HERHANGİ bir
 * hastanın bakıcılarına push bildirimi gönderilebiliyordu.
 *
 * "Sağlık kontrolü" için kullanıcı verisi döndürmek hiçbir koşulda doğru
 * değil. Servis durumu gerekiyorsa kimlik doğrulamalı `onCall` + admin claim
 * arkasında, YALNIZCA sayaç/durum döndüren bir fonksiyon yazılmalı.
 *
 * NOT: Bu fonksiyon canlıya deploy edilmiş olabilir; kodu silmek yetmez,
 * `firebase functions:delete health` ile ortamdan da kaldırılmalıdır.
 */

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

    const collapseKey = `patient_${userId}_${time || 'log'}_${status}`;
    const notificationTag = `med_log_${userId}_${status}`;

    const androidConfig = {
      priority: 'high',
      collapseKey,
      notification: {
        channelId: 'caregiver-live-alerts-v1',
        sound: 'default',
        priority: 'max',
        visibility: 'public',
        defaultVibrateTimings: true,
        tag: notificationTag,
      },
    };

    // 1. TOPIC BROADCAST: patient_${userId} konusuna tekil yayın yap (Tüm bağlı bakıcılar tek seferde alır)
    const topicMessage = {
      topic: `patient_${userId}`,
      notification: notificationPayload,
      data: dataPayload,
      android: androidConfig,
    };

    const msgId = await admin.messaging().send(topicMessage);
    console.log(`[onMedicineLogCreated] Topic patient_${userId} mesajı başarıyla gönderildi: ${msgId}`);
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

    const collapseKey = `reminder_${event.params.reminderId}`;
    const notificationTag = `reminder_${event.params.reminderId}`;

    const androidConfig = {
      priority: 'high',
      collapseKey,
      notification: {
        channelId: 'patient-remote-reminders-v1',
        sound: 'default',
        priority: 'max',
        visibility: 'public',
        defaultVibrateTimings: true,
        tag: notificationTag,
      },
    };

    // Topic user_{userId} broadcast
    await admin.messaging().send({
      topic: `user_${userId}`,
      notification: notificationPayload,
      data: dataPayload,
      android: androidConfig,
    });
    console.log(`[onRemoteReminderCreated] Hasta ${userId} konusuna FCM iletildi.`);
  } catch (error) {
    console.error('[onRemoteReminderCreated] Hata:', error);
  }
});

/**
 * 🚨 OTOMATİK CLOUD TRIGGER: Hasta Acil Durum SOS Butonuna Bastığında Tüm Bakıcılara Anında Yüksek Öncelikli Sirenli FCM Gönder
 */
exports.onEmergencyAlertCreated = onDocumentCreated('users/{userId}/emergencyAlerts/{alertId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const alertData = snapshot.data();
  const userId = event.params.userId;
  const alertId = event.params.alertId;

  try {
    const db = admin.firestore();
    const patientName = alertData.patientName || 'Hastanız';
    const customNote = alertData.customNote || '';
    const bodyText = customNote || `${patientName} acil durum butonuna basarak yardım talep etti! Lütfen hemen kontrol edin veya arayın.`;
    const titleText = `🚨 ACİL DURUM: ${patientName} Yardım İstiyor!`;

    const notificationPayload = {
      title: titleText,
      body: bodyText,
    };

    const dataPayload = {
      title: titleText,
      body: bodyText,
      type: 'emergency_sos',
      alertId,
      patientId: userId,
      patientName,
      patientPhone: alertData.patientPhone || '',
      customNote,
      mapsUrl: alertData.location?.mapsUrl || '',
      createdAt: alertData.createdAt || new Date().toISOString(),
      channelId: 'emergency-sos-v6',
      sound: 'sound_urgent_alert',
    };

    const collapseKey = `sos_${alertId}`;
    const notificationTag = `sos_${alertId}`;

    const androidConfig = {
      priority: 'high',
      collapseKey,
      notification: {
        channelId: 'emergency-sos-v6',
        sound: 'sound_urgent_alert',
        priority: 'max',
        visibility: 'public',
        defaultVibrateTimings: true,
        tag: notificationTag,
      },
    };

    // 1. TOPIC: patient_{userId} (Bağlı tüm bakıcılar anında tekil uyanır)
    const msgId = await admin.messaging().send({
      topic: `patient_${userId}`,
      notification: notificationPayload,
      data: dataPayload,
      android: androidConfig,
    });
    console.log(`[onEmergencyAlertCreated] Topic patient_${userId} SOS iletildi: ${msgId}`);
  } catch (error) {
    console.error('[onEmergencyAlertCreated] Hata:', error);
  }
});

/**
 * 🚨 OTOMATİK CLOUD TRIGGER: Bakıcı /caregiverAlerts koleksiyonuna acil durum yazıldığında bakıcıya doğrudan FCM uyarısı gönder
 */
exports.onCaregiverAlertCreated = onDocumentCreated('users/{caregiverId}/caregiverAlerts/{alertId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const alertData = snapshot.data();
  const caregiverId = event.params.caregiverId;

  // Sadece acil durum SOS alert'leri için özel siren bildirimi tetikle
  if (alertData.type !== 'emergency_sos' && alertData.type !== 'EMERGENCY_SOS') {
    return;
  }

  try {
    const db = admin.firestore();
    const patientName = alertData.patientName || 'Hastanız';
    const bodyText = alertData.customNote || `${patientName} acil durum butonuna basarak yardım talep etti! Lütfen hemen kontrol edin veya arayın.`;
    const titleText = `🚨 ACİL DURUM: ${patientName} Yardım İstiyor!`;

    const notificationPayload = {
      title: titleText,
      body: bodyText,
    };

    const dataPayload = {
      title: titleText,
      body: bodyText,
      type: 'emergency_sos',
      alertId: event.params.alertId,
      patientId: alertData.patientId || '',
      patientName,
      patientPhone: alertData.patientPhone || '',
      customNote: alertData.customNote || '',
      mapsUrl: alertData.location?.mapsUrl || '',
      createdAt: alertData.createdAt || new Date().toISOString(),
      channelId: 'emergency-sos-v6',
      sound: 'sound_urgent_alert',
    };

    const collapseKey = `sos_${event.params.alertId}`;
    const notificationTag = `sos_${event.params.alertId}`;

    const androidConfig = {
      priority: 'high',
      collapseKey,
      notification: {
        channelId: 'emergency-sos-v6',
        sound: 'sound_urgent_alert',
        priority: 'max',
        visibility: 'public',
        defaultVibrateTimings: true,
        tag: notificationTag,
      },
    };

    // Topic user_{caregiverId}
    const msgId = await admin.messaging().send({
      topic: `user_${caregiverId}`,
      notification: notificationPayload,
      data: dataPayload,
      android: androidConfig,
    });
    console.log(`[onCaregiverAlertCreated] Bakıcı ${caregiverId} kullanıcısına SOS FCM iletildi: ${msgId}`);
  } catch (error) {
    console.error('[onCaregiverAlertCreated] Hata:', error);
  }
});
