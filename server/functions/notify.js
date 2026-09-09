/**
 * Bildirim gönderiminin TEK KAPISI — yetki denetimli, token tabanlı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ v1.8.5 — FCM TOPIC YAYINI BİR VERİ SIZINTISIYDI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Dört Firestore tetikleyicisi de bildirimleri **FCM topic**'ine yayınlıyordu:
 *
 *     admin.messaging().send({ topic: `patient_${userId}`, ... })
 *     admin.messaging().send({ topic: `user_${userId}`, ... })
 *
 * FCM topic aboneliği **istemci tarafındadır ve kimlik doğrulaması
 * gerektirmez.** Herhangi bir uygulama örneği (yeniden paketlenmiş bir APK,
 * ya da yalnızca `pId` değerini değiştiren aynı uygulama) şunu çağırabilir:
 *
 *     messaging().subscribeToTopic('patient_<baskasinin_uid>')
 *
 * ve o andan itibaren o hastanın bildirimlerini alır. Sunucu tarafında
 * "bu kişi gerçekten bu hastanın bakıcısı mı" diye SORAN HİÇBİR YER YOKTU.
 * İstemcideki `subscribeToPatientTopics` de istemcinin verdiği hasta
 * kimliğine körlemesine abone oluyordu.
 *
 * Sızan veri, uid'i bilen herkese:
 *   - hasta adı, ilaç adı, doz saati, alındı/atlandı durumu (sağlık verisi)
 *   - **SOS olayında ayrıca `patientPhone` ve `mapsUrl`** — yani hastanın
 *     telefon numarası ve KONUMU.
 *
 * Bu, v1.7.4'te kapatılan `health` fonksiyonuyla aynı sınıf: erişim
 * kontrolünün hiç bulunmadığı bir kanal.
 *
 * Üstelik `onMedicineLogCreated`'in kendi yorumu şöyle diyordu:
 * *"Hem Topic hem Direct Token ile ÇİFT HAT üzerinden garanti iletim."*
 * Kodda token hattı **hiç yoktu**. `onRemoteReminderCreated` ise token'ı
 * OKUYUP kullanmıyordu (`const token = ...` sonra topic'e gönderiyordu) —
 * güvenli yol yazılmış ama bağlanmamıştı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ARTIK NASIL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Yetkinin TEK KAYNAĞI `caregiverRelationships` — Firestore kurallarının da
 * kullandığı kaynak (v1.7.4). Bir bakıcı bildirim alır ancak ve ancak:
 *   - `patientId` eşleşiyorsa,
 *   - `status === 'active'` ise (yetkisi kaldırılan bakıcı almaz),
 *   - ilgili izin bayrağı açıksa (`canReceiveAlerts`),
 *   - ve kayıtlı bir `caregiverFcmToken`'ı varsa.
 *
 * Gönderim `sendEachForMulticast` ile token'lara yapılıyor. Geçersiz
 * token'lar (uygulama silinmiş, token dönmüş) yanıtta işaretlenip
 * temizleniyor; aksi halde her bildirimde aynı ölü token'lara gönderim
 * denenir ve hata sayacı büyür.
 */

const admin = require('firebase-admin');

/** Bir seferde en fazla kaç token'a gönderilir (FCM sınırı 500). */
const MULTICAST_BATCH = 500;

/** Geçersiz token hataları — bu kodlarda token silinir. */
const DEAD_TOKEN_ERRORS = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

/**
 * Bir hastanın bildirim almaya YETKİLİ bakıcılarının token'larını toplar.
 *
 * @param {import('firebase-admin').firestore.Firestore} db
 * @param {string} patientId
 * @param {object} [options]
 * @param {boolean} [options.requireAlertsPermission=true]
 *   `canReceiveAlerts` bayrağı zorunlu mu. SOS için `false` geçilebilir mi?
 *   HAYIR — bkz. aşağıdaki nota. Bayrak her durumda zorunlu; parametre
 *   yalnızca ileride izin türü ayrışırsa diye var.
 * @returns {Promise<{ tokens: string[], relationshipRefs: Map<string, string[]> }>}
 *   `relationshipRefs`: token -> onu taşıyan ilişki dokümanı kimlikleri
 *   (ölü token temizliği için).
 */
async function getAuthorizedCaregiverTokens(db, patientId, options = {}) {
  const { requireAlertsPermission = true } = options;

  const snapshot = await db
    .collection('caregiverRelationships')
    .where('patientId', '==', patientId)
    .where('status', '==', 'active')
    .get();

  const tokens = [];
  const relationshipRefs = new Map();

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // NOT: `canReceiveAlerts` SOS'ta da zorunlu. "Acil durum" gerekçesiyle
    // izni yok sayan bir yol, kullanicinin kapattigi bir bildirimi
    // sunucunun geri acmasi demek olurdu; ustelik izni kapali bir bakiciya
    // hastanin TELEFONU ve KONUMU gonderilirdi.
    if (requireAlertsPermission && data.canReceiveAlerts !== true) continue;

    const token = data.caregiverFcmToken;
    if (typeof token !== 'string' || !token) continue;

    tokens.push(token);
    const existing = relationshipRefs.get(token) || [];
    existing.push(doc.id);
    relationshipRefs.set(token, existing);
  }

  // Ayni bakici iki cihazdan ayni token'i tasiyamaz ama savunma amacli
  // tekilleştiriyoruz: mukerrer token FCM'de mukerrer bildirim demek.
  return { tokens: [...new Set(tokens)], relationshipRefs };
}

/**
 * Bir hastanın (kullanıcının) KENDİ cihaz token'ını döndürür.
 *
 * `users/{uid}` dokümanındaki üç olası alan sırayla denenir; bu alan
 * çeşitliliği mevcut kodun mirası, tek alana indirmek ayrı bir iş.
 */
async function getPatientToken(db, userId) {
  const doc = await db.collection('users').doc(userId).get();
  if (!doc.exists) return null;

  const data = doc.data() || {};
  const token = data.pushToken || data.caregiverFcmToken || data.fcmToken;

  return typeof token === 'string' && token ? token : null;
}

/**
 * Token listesine gönderir; geçersiz token'ları temizler.
 *
 * @returns {Promise<{ sent: number, failed: number, pruned: number }>}
 */
async function sendToTokens(db, tokens, message, context = {}) {
  if (!tokens.length) {
    console.log(`[notify] ${context.label || 'gonderim'}: yetkili token YOK, atlandi`);
    return { sent: 0, failed: 0, pruned: 0 };
  }

  let sent = 0;
  let failed = 0;
  const deadTokens = [];

  for (let i = 0; i < tokens.length; i += MULTICAST_BATCH) {
    const batch = tokens.slice(i, i + MULTICAST_BATCH);

    const response = await admin.messaging().sendEachForMulticast({
      ...message,
      tokens: batch,
    });

    sent += response.successCount;
    failed += response.failureCount;

    response.responses.forEach((result, index) => {
      if (result.success) return;
      const code = result.error && result.error.code;
      console.warn(`[notify] ${context.label || 'gonderim'} basarisiz: ${code}`);
      if (DEAD_TOKEN_ERRORS.has(code)) {
        deadTokens.push(batch[index]);
      }
    });
  }

  let pruned = 0;
  if (deadTokens.length && context.relationshipRefs) {
    pruned = await pruneDeadCaregiverTokens(db, deadTokens, context.relationshipRefs);
  }

  console.log(
    `[notify] ${context.label || 'gonderim'}: ${sent} basarili, ${failed} basarisiz, ${pruned} olu token temizlendi`
  );

  return { sent, failed, pruned };
}

/**
 * Geçersiz token'ları taşıyan ilişki dokümanlarından token alanını siler.
 *
 * Temizlemezsek her bildirimde aynı ölü token'lara gönderim denenir; hata
 * sayacı büyür ve gerçek hataları gölgeler.
 */
async function pruneDeadCaregiverTokens(db, deadTokens, relationshipRefs) {
  const docIds = new Set();
  for (const token of deadTokens) {
    for (const id of relationshipRefs.get(token) || []) docIds.add(id);
  }

  if (!docIds.size) return 0;

  const batch = db.batch();
  for (const id of docIds) {
    batch.update(db.collection('caregiverRelationships').doc(id), {
      caregiverFcmToken: admin.firestore.FieldValue.delete(),
    });
  }

  try {
    await batch.commit();
    return docIds.size;
  } catch (error) {
    console.error('[notify] Olu token temizligi basarisiz', error);
    return 0;
  }
}

module.exports = {
  MULTICAST_BATCH,
  DEAD_TOKEN_ERRORS,
  getAuthorizedCaregiverTokens,
  getPatientToken,
  sendToTokens,
};
