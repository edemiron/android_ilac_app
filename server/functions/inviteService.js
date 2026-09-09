/**
 * Bakıcı davet servisi — sunucu tarafı kod üretimi ve rate-limit'li kabul.
 *
 * ── Bu modül neden var ─────────────────────────────────────────────────────
 * Davet kodu bir SIRDIR: onu bilen kişi bir hastanın tüm ilaç listesine,
 * doz geçmişine ve telefonuna aktif bakıcı olarak erişebilir. Kod istemcide
 * üretiliyordu ve iki kusuru vardı:
 *
 *   1. `INVITE_CODE_LENGTH = 6` × 33'lük alfabe ≈ 1.29×10⁹ olasılık.
 *   2. `Math.random()` — CSPRNG DEĞİL. V8'in xorshift128+ üretecinin iç
 *      durumu birkaç çıktıdan kurtarılabilir, yani gerçek entropy 39 bitin
 *      de altında olabilir.
 *
 * `firestore.rules`'ta `caregiverInvites/{kod}` üzerinde `allow get` açık
 * olduğu için saldırgan anonim hesap açıp `getDoc` döngüsüyle kod uzayını
 * tarayabiliyordu. Kurallar rate-limit ifade EDEMEZ — bu yüzden üretim ve
 * kabul sunucuya taşınıyor.
 *
 * ── ÖNEMLİ: bu modül tek başına brute-force'u DURDURMAZ ───────────────────
 * Enumeration `getDoc(caregiverInvites/{kod})` üzerinden yapılır ve ona
 * callable değil **firestore.rules** karar verir. Saldırıyı gerçekten
 * bitiren adım, `allow get`'i sahibiyle sınırlamaktır:
 *
 *     allow get: if isAuthenticated() && resource.data.patientId == request.auth.uid;
 *
 * Bu BİLİNÇLİ OLARAK henüz uygulanmadı: mevcut istemci kabul akışında
 * `getDoc` yaptığı için kuralı şimdi daraltmak sahadaki eski sürümleri
 * anında kırar. Zorunlu sıra:
 *   1. callable'ları deploy et (bu commit — eklemeli, kırıcı değil)
 *   2. callable kullanan istemciyi yayınla
 *   3. yayılımı bekle
 *   4. `allow get`'i daralt  ← brute-force burada biter
 *
 * ── Entropy / UX dengesi ───────────────────────────────────────────────────
 * 12 karakter × 33 alfabe ≈ 1.7×10¹⁸ (~60 bit). Rapordaki ≥128 bit
 * önerisinden bilinçli sapma: hedef kitle yaşlı hastalar ve kod bir mesajla
 * paylaşılıyor; 26 karakter (gerçek 128 bit) kopyala-yapıştır dışında
 * kullanılamaz hale getirirdi. Güvenliği taşıyan asıl kontrol uzunluk değil
 * **rate-limit + `allow get`'in kapanması** — 60 bit bu ikisiyle birlikte
 * pratikte kırılamaz (saatte 10 deneme ile 1.7×10¹⁸ uzay ~10¹⁰ yıl).
 *
 * E-posta bağlama (`caregiverEmail == token.email`) BİLİNÇLİ olarak
 * eklenmedi: `caregiverEmail` istemcide boş bırakılabiliyor ve bakıcı Google
 * ile farklı bir adresle girebiliyor → meşru akışı kırardı. Ürün kararı.
 */

const crypto = require('crypto');
const admin = require('firebase-admin');

/** I, O, Q çıkarılmış alfabe — telefonda/görsel olarak karışmasın diye. */
const INVITE_CODE_CHARS = '0123456789ABCDEFGHJKLMNPRSTUVWXYZ';
const INVITE_CODE_LENGTH = 12;
const INVITE_EXPIRY_DAYS = 7;

/** Kabul denemesi kotaları — enumeration'ı ekonomik olarak anlamsız kılar. */
const REDEEM_MAX_PER_HOUR = 10;
const REDEEM_MAX_PER_DAY = 30;

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/**
 * Kriptografik olarak güvenli, MODÜLO ÖNYARGISI OLMAYAN davet kodu.
 *
 * Naif `bytes[i] % 33` kullanmak önyargı üretir: 256 = 7×33 + 25, yani
 * 25 karakter 8/256, kalan 8 karakter 7/256 olasılıkla seçilir (~%4 sapma).
 * Entropy'yi 60 bitten ~59.5 bite düşürür. Reddederek örnekleme (rejection
 * sampling) ile 231 ve üzerindeki baytlar atılır → tam tekdüze dağılım.
 *
 * @returns {string} 12 karakter, [0-9A-Z] (I, O, Q hariç)
 */
function generateInviteCode() {
  const n = INVITE_CODE_CHARS.length;
  const limit = Math.floor(256 / n) * n; // 231 — bu ve üzeri baytlar reddedilir

  let code = '';
  // Döngü pratikte 1-2 turda biter: her 32 baytın ~%90'ı kabul edilir.
  while (code.length < INVITE_CODE_LENGTH) {
    const bytes = crypto.randomBytes(INVITE_CODE_LENGTH * 2);
    for (let i = 0; i < bytes.length && code.length < INVITE_CODE_LENGTH; i++) {
      const b = bytes[i];
      if (b < limit) {
        code += INVITE_CODE_CHARS[b % n];
      }
    }
  }
  return code;
}

/**
 * Kod biçimini doğrula. Hem istemcideki `isValidInviteCode` ile uyumlu hem de
 * Firestore'a anlamsız doküman kimliğiyle sorgu atılmasını engeller.
 *
 * Üst sınır 12: sunucu artık 12 üretiyor, ama sahada 6-8 karakterlik ESKİ
 * kodlar da dolaşıyor ve onların reddedilmesi kabul akışını kırardı.
 */
function isValidInviteCodeFormat(code) {
  return typeof code === 'string' && /^[A-Z0-9]{6,12}$/.test(code);
}

/**
 * UID başına kabul denemesi kotası — Firestore transaction ile atomik.
 *
 * Sabit saatlik/günlük kovalar kullanılıyor (kayan pencere değil): basit,
 * transaction içinde tek doküman okumasıyla hesaplanabilir ve enumeration
 * için yeterli caydırıcılığı sağlıyor.
 *
 * @returns {Promise<{allowed: boolean, hourCount: number, dayCount: number}>}
 */
async function checkAndRecordRedeemAttempt(uid) {
  const db = admin.firestore();
  const ref = db.collection('inviteRedeemAttempts').doc(uid);
  const now = Date.now();
  const hourBucket = Math.floor(now / HOUR_MS);
  const dayBucket = Math.floor(now / DAY_MS);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() || {};

    const hourCount = data.hourBucket === hourBucket ? (data.hourCount || 0) : 0;
    const dayCount = data.dayBucket === dayBucket ? (data.dayCount || 0) : 0;

    if (hourCount >= REDEEM_MAX_PER_HOUR || dayCount >= REDEEM_MAX_PER_DAY) {
      return { allowed: false, hourCount, dayCount };
    }

    tx.set(ref, {
      uid,
      hourBucket,
      hourCount: hourCount + 1,
      dayBucket,
      dayCount: dayCount + 1,
      lastAttemptAt: now,
    });

    return { allowed: true, hourCount: hourCount + 1, dayCount: dayCount + 1 };
  });
}

module.exports = {
  INVITE_CODE_CHARS,
  INVITE_CODE_LENGTH,
  INVITE_EXPIRY_DAYS,
  REDEEM_MAX_PER_HOUR,
  REDEEM_MAX_PER_DAY,
  generateInviteCode,
  isValidInviteCodeFormat,
  checkAndRecordRedeemAttempt,
};
