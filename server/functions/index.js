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

/**
 * ⚠️ v1.8.5 — Bildirim gonderiminin TEK KAPISI.
 *
 * Dort tetikleyici de FCM TOPIC'ine yayin yapiyordu; topic aboneligi
 * istemci tarafinda ve kimlik dogrulamasiz oldugu icin uid'i bilen herkes
 * bir hastanin ilac bildirimlerini — SOS'ta TELEFON NUMARASI ve KONUM
 * dahil — alabiliyordu. Gerekcenin tamami: `notify.js` dosya basi.
 */
const {
  getAuthorizedCaregiverTokens,
  getPatientToken,
  sendToTokens,
} = require('./notify');

if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (e) {
    console.warn('Firebase Admin başlatma uyarısı:', e.message);
  }
}

/**
 * ⚠️ v1.9.0 — API ANAHTARLARI ARTIK GOOGLE SECRET MANAGER'DA.
 *
 * ── Nereden geldik ────────────────────────────────────────────────────────
 * 1. En basta anahtar Firestore'daki `config/ai` dokumanindaydi ve
 *    `firestore.rules` onu `allow read: if true` ile aciyordu — yani KIMLIK
 *    DOGRULAMASI OLMADAN internete acikti (bkz. v1.8.9).
 * 2. v1.7.4 istemci katmanini kaldirdi ve anahtarlari `.env` dosyasina aldi.
 *    O turun commit basligi "Secret Manager'a tasindi" diyordu AMA kod
 *    `process.env` okumaya devam ediyordu: gercekte Secret Manager'a hic
 *    gecilmemisti. Bu tur o farki kapatiyor.
 *
 * ── `.env` neden yeterli degil ────────────────────────────────────────────
 * `firebase deploy` `.env` icerigini fonksiyonun ortam degiskenleri olarak
 * DUZ METIN halinde gomer. Sonuc:
 *   - Cloud Console'da fonksiyonun detay sayfasini gorebilen HERKES okur
 *     (Viewer rolu bile yeter — "gizli" degil, yalnizca "gorunmez" saniliyor)
 *   - Deploy eden makinede dosya olarak durur, yedeklere/senkronlara sizar
 *   - Versiyonu yok: rotasyon "dosyayi degistir + yeniden deploy" demek,
 *     eski degerin nerede kaldigini kimse bilmez
 *   - Kim ne zaman okudu sorusunun cevabi yok
 *
 * ── Secret Manager ne veriyor ─────────────────────────────────────────────
 *   - Beklemede SIFRELI, erisim IAM ile (`roles/secretmanager.secretAccessor`)
 *   - VERSIYONLU: rotasyon = yeni versiyon; eskisi `disable` edilir ve
 *     gerekirse geri alinir
 *   - Erisim denetim kaydina (audit log) yazilir
 *   - Deponun icinde HICBIR yerde durmaz
 *
 * ── Dikkat edilmesi gereken tek sey ───────────────────────────────────────
 * `.value()` YALNIZCA istek isleyicisinin ICINDE cagrilabilir. Modul
 * kapsaminda cagirmak deploy analizi sirasinda bos deger dondurur ve
 * fonksiyon "yapilandirilmamis" sanilir — bu yuzden asagida her okuma
 * handler'in ilk satirlarindadir, eskiden oldugu gibi dosya basinda DEGIL.
 *
 * Kurulum ve rotasyon adimlari: docs/YAYIN_ONCESI_ACIK_MADDELER.md → A1.
 */
const { defineSecret, defineString } = require('firebase-functions/params');

const geminiApiKey = defineSecret('GEMINI_API_KEY');
const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY');

// Bu bir SIR DEGIL, yalnizca uc nokta adresi — Secret Manager'a koymak
// gereksiz yere IAM ve maliyet ekler. Parametre olarak tanimli ki
// degistirmek icin kod degisikligi gerekmesin.
const anthropicApiUrl = defineString('ANTHROPIC_API_URL', {
  default: 'https://api.anthropic.com',
});

/**
 * Gemini ile ilaç ara (onCall)
 */
exports.geminiSearch = onCall({ secrets: [geminiApiKey] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Bu servisi kullanmak için giriş yapmalısınız.');
  }

  const { prompt, barcode } = request.data || {};
  if (!prompt && !barcode) {
    throw new HttpsError('invalid-argument', 'prompt veya barcode parametresi gereklidir.');
  }

  // v1.9.0: sir YALNIZCA burada, handler icinde okunur.
  const GEMINI_API_KEY = geminiApiKey.value();
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

exports.geminiGenerate = onCall({ secrets: [geminiApiKey] }, async (request) => {
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
  // v1.9.0: sir YALNIZCA burada, handler icinde okunur.
  const GEMINI_API_KEY = geminiApiKey.value();
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
exports.claudeSearch = onCall({ secrets: [anthropicApiKey] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Bu servisi kullanmak için giriş yapmalısınız.');
  }

  const { prompt, barcode } = request.data || {};
  if (!prompt && !barcode) {
    throw new HttpsError('invalid-argument', 'prompt veya barcode gereklidir.');
  }

  // v1.9.0: sir YALNIZCA burada, handler icinde okunur.
  const ANTHROPIC_API_KEY = anthropicApiKey.value();
  const ANTHROPIC_API_URL = anthropicApiUrl.value() || 'https://api.anthropic.com';
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
 * HESAP VE VERİ SİLME (KVKK md. 7/11-e, GDPR md. 17, Google Play veri silme
 * politikası). Ayrı dosyada, çünkü gerekçesi uzun ve tek başına okunmalı:
 * bkz. `deleteMyAccount.js` dosya başı — özetle uygulamada var olan
 * `deleteAccount()` YALNIZCA Auth kaydını siliyordu ve hiçbir yerden
 * çağrılmıyordu; çağrılsaydı sağlık verisini sunucuda ULAŞILAMAZ hâlde
 * bırakacaktı.
 */
exports.deleteMyAccount = require('./deleteMyAccount').deleteMyAccount;

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

    /*
     * ⚠️ v1.8.5 — TOPIC YAYINI KALDIRILDI (VERİ SIZINTISI).
     *
     * Eski hâli: `admin.messaging().send({ topic: `patient_${userId}`, ... })`
     * FCM topic aboneliği istemci tarafındadır ve kimlik doğrulaması
     * gerektirmez; uid'i bilen herkes `subscribeToTopic('patient_<uid>')`
     * ile bu hastanın ilaç bildirimlerini almaya başlayabiliyordu ve
     * sunucuda "bu kişi gerçekten bakıcı mı" diye soran hiçbir yer yoktu.
     * Ayrıntı: `notify.js` dosya başı.
     *
     * Bu fonksiyonun eski yorumu "hem Topic hem Direct Token ile ÇİFT HAT"
     * diyordu ama kodda token hattı HİÇ YOKTU.
     */
    const { tokens, relationshipRefs } = await getAuthorizedCaregiverTokens(db, userId);

    await sendToTokens(
      db,
      tokens,
      { notification: notificationPayload, data: dataPayload, android: androidConfig },
      { label: `onMedicineLogCreated/${status}`, relationshipRefs }
    );
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

    // v1.8.5: Bu satir ZATEN VARDI ama kullanilmiyordu; asagida `user_{uid}`
    // topic'ine yayin yapiliyordu. Yani guvenli yol yazilmis, baglanmamisti.
    const token = await getPatientToken(db, userId);
    if (!token) {
      console.log(`[onRemoteReminderCreated] Hasta ${userId} icin token yok, atlandi`);
      return;
    }

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

    // v1.8.5: `user_{userId}` topic yayini yerine hastanin KENDI token'i.
    // Topic aboneligi kimlik dogrulamasiz oldugu icin uid'i bilen herkes
    // bu hatirlatmalari alabiliyordu (bkz. notify.js dosya basi).
    await sendToTokens(
      db,
      [token],
      { notification: notificationPayload, data: dataPayload, android: androidConfig },
      { label: 'onRemoteReminderCreated' }
    );
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

    /*
     * ⚠️ v1.8.5 — BU EN AĞIR SIZINTIYDI.
     *
     * SOS bildirimi `patient_{userId}` topic'ine yayınlanıyordu ve
     * `dataPayload` içinde **`patientPhone`** ile **`mapsUrl`** (konum) var.
     * FCM topic aboneliği kimlik doğrulaması gerektirmediği için, uid'i
     * bilen herhangi biri hastanın telefon numarasını ve konumunu
     * alabiliyordu. Ayrıntı: `notify.js` dosya başı.
     */
    const { tokens, relationshipRefs } = await getAuthorizedCaregiverTokens(db, userId);

    await sendToTokens(
      db,
      tokens,
      { notification: notificationPayload, data: dataPayload, android: androidConfig },
      { label: 'onEmergencyAlertCreated', relationshipRefs }
    );
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

    /*
     * v1.8.5: `user_{caregiverId}` topic yayini yerine bakicinin KENDI
     * token'i. Burada dokuman zaten BAKICININ kendi alt koleksiyonunda
     * (users/{caregiverId}/caregiverAlerts) — yani yetki kontrolu Firestore
     * kurallarinda yapilmis durumda; eksik olan tek sey bildirimin yalnizca
     * O kisiye gitmesiydi. Topic aboneligi kimlik dogrulamasiz oldugu icin
     * caregiverId'yi bilen herkes hastanin TELEFONU ve KONUMUNU
     * iceren bu SOS bildirimini alabiliyordu.
     */
    const token = await getPatientToken(db, caregiverId);
    if (!token) {
      console.log(`[onCaregiverAlertCreated] Bakici ${caregiverId} icin token yok, atlandi`);
      return;
    }

    await sendToTokens(
      db,
      [token],
      { notification: notificationPayload, data: dataPayload, android: androidConfig },
      { label: 'onCaregiverAlertCreated' }
    );
  } catch (error) {
    console.error('[onCaregiverAlertCreated] Hata:', error);
  }
});
