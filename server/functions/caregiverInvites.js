/**
 * Bakıcı daveti callable'ları — sunucu otoritesi.
 *
 * İki fonksiyon:
 *   createCaregiverInvite  — hasta adına daveti SUNUCUDA üretir (CSPRNG)
 *   redeemCaregiverInvite  — bakıcının kabulünü rate-limit + ATOMIK
 *                            transaction ile işler
 *
 * ── Neden sunucu ──────────────────────────────────────────────────────────
 * Gerekçe ve kademeli yayın planı `inviteService.js` dosya başında. Özet:
 * davet kodu bir sırdır, istemcide `Math.random()` ile 6 hane üretiliyordu
 * (≈1.29×10⁹) ve `firestore.rules`'taki açık `allow get` sayesinde kod uzayı
 * `getDoc` döngüsüyle taranabiliyordu. Kurallar rate-limit ifade edemez;
 * üretim ve kabul bu yüzden sunucuya taşınıyor.
 *
 * ── redeemCaregiverInvite'ın kapattığı ikinci açık: tekrar oynatma ────────
 * İstemcide kabul akışı iki AYRI yazımdı: `setDoc(relationship)` sonra
 * `updateDoc(invite → accepted)`, ve ikincisinin başarısızlığı TOLERE
 * ediliyordu (`caregiverService.ts`: "Davet durumu accepted olarak
 * güncellenemedi ama ilişki başarıyla kuruldu"). Sonuç: kullanılan davet
 * `pending`'de kalıp **farklı bir bakıcı** tarafından tekrar kullanılabiliyordu
 * — ilişki kimlikleri çift-başına (`{patientId}__{caregiverId}`) olduğu için
 * hiçbir şey çakışmıyor ve hiçbir yazım reddedilmiyordu. v2.1.4'ün eklediği
 * `status == 'pending'` kuralı bu pencereyi kapatmadı, yalnızca biçim
 * değiştirdi.
 *
 * Burada iki yazım TEK Firestore transaction'ında: davet dokümanı okunduğu
 * için transaction onun üzerinde serileşir → eşzamanlı iki kabulden yalnızca
 * biri kazanır, diğeri `status != 'pending'` görür. Tekrar oynatma yapısal
 * olarak kapanır.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

const {
  INVITE_CODE_LENGTH,
  INVITE_EXPIRY_DAYS,
  REDEEM_MAX_PER_HOUR,
  REDEEM_MAX_PER_DAY,
  generateInviteCode,
  isValidInviteCodeFormat,
  checkAndRecordRedeemAttempt,
} = require('./inviteService');

/**
 * Her başarısız kabulde AYNI mesaj döner.
 *
 * Sebep: "kod bulunamadı" / "süresi dolmuş" / "zaten kabul edilmiş" ayrımı
 * bir ENUMERATION ORACLE'ı olur — saldırgan hangi kodların var olduğunu
 * deneme yanılma ile öğrenebilirdi. Gerçek neden yalnızca sunucu loguna
 * yazılır (operasyon için yeterli, saldırgan için görünmez).
 */
const GENERIC_REDEEM_FAILURE = 'Davet kodu geçersiz veya artık kullanılamıyor.';

/** İstemciden gelen izin bayraklarını yalnızca boolean olarak kabul et. */
function sanitizePermissions(input) {
  const defaults = {
    canViewSchedule: true,
    canViewHistory: true,
    canReceiveAlerts: true,
  };
  if (!input || typeof input !== 'object') return defaults;
  const out = {};
  for (const key of Object.keys(defaults)) {
    out[key] = input[key] === true;
  }
  return out;
}

/**
 * Hasta adına davet oluşturur.
 *
 * Kod SUNUCUDA üretilir: istemci ne uzunluğu ne entropiyi seçebilir.
 * Doküman Admin SDK ile yazıldığı için firestore.rules'ı atlar — bu
 * bilinçli, çünkü daveti yazma yetkisi "kendi patientId'siyle" kuralda
 * zaten doğrulanabiliyordu; asıl kazanım kodun CSPRNG ile üretilmesi.
 */
const createCaregiverInvite = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Davet oluşturmak için giriş yapmalısınız.');
  }

  const patientId = request.auth.uid;
  const data = request.data || {};

  const patientName =
    typeof data.patientName === 'string' && data.patientName.trim()
      ? data.patientName.trim().slice(0, 120)
      : 'Hasta';

  // E-posta bilinçli olarak BAĞLAYICI değil (bkz. inviteService.js başı):
  // boş bırakılabiliyor ve bakıcı farklı bir adresle giriş yapabiliyor.
  // Yalnızca bilgi/UX amacıyla saklanıyor.
  const caregiverEmail =
    typeof data.caregiverEmail === 'string' ? data.caregiverEmail.trim().toLowerCase().slice(0, 320) : '';

  const permissions = sanitizePermissions(data.permissions);
  const db = admin.firestore();

  // Çakışma yeniden denemesi: 60 bit uzayda çakışma olasılığı ~0 ama
  // doc().set() sessizce üzerine yazacağı için yine de kontrol ediliyor.
  const MAX_COLLISION_RETRIES = 5;
  for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt++) {
    const code = generateInviteCode();
    const ref = db.collection('caregiverInvites').doc(code);

    const existing = await ref.get();
    if (existing.exists) {
      console.warn(`[createCaregiverInvite] Kod çakışması, yeniden deneniyor (attempt=${attempt + 1})`);
      continue;
    }

    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 86_400_000);

    await ref.set({
      id: code,
      patientId,
      patientName,
      caregiverEmail,
      status: 'pending',
      // `expiresAt` ISO string: istemcinin mevcut alanı ve geriye dönük uyum.
      expiresAt: expiresAt.toISOString(),
      // `expiresAtMs` sayısal: firestore.rules `inviteNotExpired()` bunu
      // okuyor. Rules Timestamp'te toISOString() olmadığı için ISO string
      // ile `request.time` karşılaştırılamaz — sayısal alan zorunlu.
      expiresAtMs: expiresAt.getTime(),
      createdAt: new Date().toISOString(),
      permissions,
    });

    console.log(`[createCaregiverInvite] Davet üretildi: patientId=${patientId} length=${code.length}`);

    return {
      inviteCode: code,
      patientId,
      patientName,
      caregiverEmail,
      status: 'pending',
      expiresAt: expiresAt.toISOString(),
      expiresAtMs: expiresAt.getTime(),
      permissions,
    };
  }

  // 60 bit uzayda 5 kez üst üste çakışma pratikte imkânsız; buraya düşmek
  // bir şeylerin ciddi yanlış olduğunu gösterir.
  console.error('[createCaregiverInvite] Çakışma yeniden denemeleri tükendi');
  throw new HttpsError('internal', 'Davet kodu üretilemedi, lütfen tekrar deneyin.');
});

/**
 * Bakıcının daveti kabulü — rate-limit + atomik transaction.
 */
const redeemCaregiverInvite = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Daveti kabul etmek için giriş yapmalısınız.');
  }

  // K1: anonim kimlikle davet kabul edilemez (firestore.rules'taki
  // isNotAnonymous() ile aynı politika, sunucu tarafında da uygulanıyor).
  const provider = request.auth.token && request.auth.token.firebase
    ? request.auth.token.firebase.sign_in_provider
    : undefined;
  if (provider === 'anonymous') {
    throw new HttpsError(
      'permission-denied',
      'Daveti kabul etmek için e-posta veya Google ile giriş yapmalısınız.'
    );
  }

  const rawCode = (request.data || {}).inviteCode;
  if (!isValidInviteCodeFormat(typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : rawCode)) {
    // Biçim hatası enumeration bilgisi sızdırmaz: alfabe ve uzunluk zaten
    // kamuya açık bilgiler, gizli olan kodun kendisi.
    throw new HttpsError('invalid-argument', 'Davet kodu biçimi geçersiz.');
  }
  const code = rawCode.trim().toUpperCase();
  const caregiverId = request.auth.uid;

  // ── Rate limit — enumeration'ı ekonomik olarak anlamsız kılan asıl kontrol.
  // Kota ÖNCE tüketilir, doğrulamadan sonra değil: aksi halde saldırgan
  // geçerli kodları bulana kadar ücretsiz deneme yapabilirdi.
  let quota;
  try {
    quota = await checkAndRecordRedeemAttempt(caregiverId);
  } catch (err) {
    console.error('[redeemCaregiverInvite] Kota kontrolü hatası:', err);
    // Kota okunamıyorsa REDDET (fail-closed). Açık bırakmak rate-limit'i
    // tek bir Firestore hatasıyla devre dışı bırakırdı.
    throw new HttpsError('unavailable', 'Şu anda davet kabul edilemiyor, lütfen tekrar deneyin.');
  }

  if (!quota.allowed) {
    console.warn(
      `[redeemCaregiverInvite] Kota aşıldı: uid=${caregiverId} hour=${quota.hourCount}/${REDEEM_MAX_PER_HOUR} day=${quota.dayCount}/${REDEEM_MAX_PER_DAY}`
    );
    throw new HttpsError(
      'resource-exhausted',
      'Çok fazla davet kodu denemesi yaptınız. Lütfen bir saat sonra tekrar deneyin.'
    );
  }

  const db = admin.firestore();
  const inviteRef = db.collection('caregiverInvites').doc(code);
  const data = request.data || {};
  const caregiverName =
    typeof data.caregiverName === 'string' ? data.caregiverName.trim().slice(0, 120) : '';
  const caregiverFcmToken =
    typeof data.caregiverFcmToken === 'string' ? data.caregiverFcmToken.trim().slice(0, 400) : '';
  const caregiverPhone =
    typeof data.caregiverPhone === 'string' ? data.caregiverPhone.trim().slice(0, 32) : '';

  let outcome;
  try {
    outcome = await db.runTransaction(async (tx) => {
      const inviteSnap = await tx.get(inviteRef);
      if (!inviteSnap.exists) return { ok: false, reason: 'not-found' };

      const invite = inviteSnap.data() || {};
      if (invite.status !== 'pending') return { ok: false, reason: `status:${invite.status}` };

      // Süre dolumu. `expiresAtMs` olmayan ESKİ davetler kabul edilir
      // (firestore.rules'taki sentinel ile aynı politika — sahada hâlâ
      // bekleyen davetleri kırmamak için).
      if (typeof invite.expiresAtMs === 'number' && invite.expiresAtMs <= Date.now()) {
        return { ok: false, reason: 'expired' };
      }

      const patientId = invite.patientId;
      if (typeof patientId !== 'string' || !patientId) {
        return { ok: false, reason: 'malformed-invite' };
      }

      const relationshipId = `${patientId}__${caregiverId}`;
      const relRef = db.collection('caregiverRelationships').doc(relationshipId);

      const relSnap = await tx.get(relRef);
      if (relSnap.exists) return { ok: false, reason: 'already-linked' };

      const nowIso = new Date().toISOString();

      tx.set(relRef, {
        patientId,
        caregiverId,
        inviteCode: code,
        status: 'active',
        canReceiveAlerts: true,
        caregiverName,
        caregiverPhone,
        caregiverFcmToken,
        permissions: sanitizePermissions(invite.permissions),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        acceptedAt: nowIso,
      });

      // Davet AYNI transaction'da tüketiliyor → eşzamanlı ikinci kabul bu
      // dokümanda serileşir ve `status != 'pending'` görür. Tekrar oynatma
      // yapısal olarak kapanır.
      tx.update(inviteRef, {
        status: 'accepted',
        caregiverId,
        caregiverName,
        acceptedAt: nowIso,
      });

      return {
        ok: true,
        patientId,
        patientName: invite.patientName || 'Hasta',
        relationshipId,
        permissions: sanitizePermissions(invite.permissions),
      };
    });
  } catch (err) {
    console.error('[redeemCaregiverInvite] Transaction hatası:', err);
    throw new HttpsError('internal', 'Davet kabul edilemedi, lütfen tekrar deneyin.');
  }

  if (!outcome.ok) {
    // Gerçek neden YALNIZCA loga — istemciye generic mesaj (oracle engeli).
    console.warn(`[redeemCaregiverInvite] Reddedildi: uid=${caregiverId} reason=${outcome.reason}`);
    throw new HttpsError('failed-precondition', GENERIC_REDEEM_FAILURE);
  }

  console.log(
    `[redeemCaregiverInvite] Kabul edildi: patientId=${outcome.patientId} caregiverId=${caregiverId}`
  );

  return {
    success: true,
    patientId: outcome.patientId,
    patientName: outcome.patientName,
    relationshipId: outcome.relationshipId,
    permissions: outcome.permissions,
    inviteCodeLength: INVITE_CODE_LENGTH,
  };
});

module.exports = { createCaregiverInvite, redeemCaregiverInvite };
