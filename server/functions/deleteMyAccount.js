/**
 * Hesap ve veri silme (KVKK md. 7 / md. 11-e, GDPR md. 17 "silinme hakkı",
 * ve Google Play "Veri silme" politikası).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NEDEN BU FONKSİYON VAR — v1.8.4
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Uygulamada `authService.deleteAccount()` diye bir fonksiyon VARDI ve şunu
 * yapıyordu:
 *
 *     const user = auth.currentUser;
 *     if (user) await deleteUser(user);        // ← YALNIZCA Auth kaydı
 *
 * İki ayrı kusur:
 *
 * 1. **Hiçbir yerden çağrılmıyordu.** Arayüzde hesap silme yolu YOKTU.
 *    Google Play, hesap oluşturmaya izin veren uygulamalarda uygulama İÇİNDE
 *    bir hesap silme yolu zorunlu tutuyor; bu tek başına yayın engeli.
 *
 * 2. **Çağrılsaydı DAHA KÖTÜ olurdu.** Auth kaydı silinince `request.auth.uid`
 *    bir daha var olmaz, ama Firestore'daki `users/{uid}` alt ağacı yerinde
 *    kalır. Kurallar erişimi `request.auth.uid`e bağladığı için o veri artık
 *    HİÇ KİMSE tarafından okunamaz ve silinemez — yani kullanıcının ilaç
 *    listesi, doz geçmişi ve bakıcı ilişkileri (özel nitelikli sağlık
 *    verisi) sunucuda sonsuza kadar, silinemez bir çöp olarak kalırdı.
 *    "Sildim" diyen bir düğmenin veriyi bırakması, olmamasından kötüdür.
 *
 * Ayrıca istemci tarafındaki `deleteAllUserData()` yalnızca DÖRT koleksiyonu
 * siliyordu (medicines, reminderTimes, medicineLogs, settings). Kurallarda
 * tanımlı olanlar ise: prescriptions, subscription, caregiverAlerts,
 * emergencyAlerts, remoteReminders, meta (silme kayıtları) ve `{allSubcollections=**}`
 * ile açılan her şey. Üstüne iki KÖK koleksiyon daha var: `caregiverInvites`
 * ve `caregiverRelationships`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NİYE İSTEMCİDE DEĞİL, SUNUCUDA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * - Auth kaydını silmek yalnızca sunucunun (admin SDK) güvenilir biçimde
 *   yapabileceği bir iş; istemcide `deleteUser` son giriş çok eskiyse
 *   `auth/requires-recent-login` ile başarısız olur ve kullanıcı yarı
 *   silinmiş bir durumda kalır.
 * - Alt koleksiyonları özyinelemeli silmek istemci kurallarıyla mümkün ama
 *   yarıda kesilirse (uygulama kapanır, ağ gider) veri kısmen kalır ve bir
 *   daha ulaşılamaz. Sunucuda sıra: ÖNCE veri, EN SON Auth. Böylece herhangi
 *   bir adımda kesinti olsa bile kullanıcı hâlâ giriş yapıp yeniden
 *   deneyebilir.
 * - `caregiverRelationships` iki tarafı ilgilendiriyor; karşı tarafın
 *   dokümanına yazma yetkisi istemcide yok.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KAPSAM
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `request.auth.uid` DIŞINDA hiçbir kimlik kabul edilmiyor: fonksiyon
 * parametre olarak silinecek kullanıcıyı ALMIYOR. Bu bilinçli — bir
 * `userId` parametresi, bir gün yetki kontrolü atlanırsa "herkesin hesabını
 * silen" bir uç noktaya dönüşür.
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

/** Silinecek KÖK koleksiyonlar: alan adı -> koleksiyon. */
const ROOT_COLLECTION_FIELDS = [
  { collection: 'caregiverInvites', fields: ['patientId', 'caregiverId'] },
  { collection: 'caregiverRelationships', fields: ['patientId', 'caregiverId'] },
];

/**
 * Bir sorgunun sonuçlarını parça parça siler.
 *
 * Firestore batch sınırı 500; `recursiveDelete` kök koleksiyon sorgularında
 * kullanılamadığı için burada elle grupluyoruz.
 */
async function deleteQueryResults(db, query, label, summary) {
  const snapshot = await query.get();
  if (snapshot.empty) return;

  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    for (const doc of docs.slice(i, i + 400)) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }

  summary[label] = (summary[label] || 0) + docs.length;
}

exports.deleteMyAccount = onCall(async request => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Bu islem icin giris yapmalisiniz.');
  }

  const uid = request.auth.uid;
  const db = admin.firestore();
  const summary = {};

  console.log(`[deleteMyAccount] baslatildi uid=${uid}`);

  // ── 1. users/{uid} ve TUM alt koleksiyonlari ────────────────────────────
  // `recursiveDelete` alt koleksiyonlari da gezer; kurallarda
  // `{allSubcollections=**}` ile acilan, adini bilmedigimiz koleksiyonlar da
  // bu sayede siliniyor. Elle bir liste tutmak, bir gun eklenen yeni bir alt
  // koleksiyonun sessizce geride kalmasi demekti.
  try {
    await db.recursiveDelete(db.collection('users').doc(uid));
    summary.userDocument = 1;
  } catch (error) {
    console.error('[deleteMyAccount] users/{uid} silinemedi', error);
    // Auth kaydini SILMEDEN hata firlatiyoruz: kullanici hala giris yapip
    // yeniden deneyebilsin. Auth'u once silmek, veriyi ulasilamaz kilardi.
    throw new HttpsError('internal', 'Veriler silinemedi, lutfen tekrar deneyin.');
  }

  // ── 2. Kok koleksiyonlardaki iki tarafli kayitlar ───────────────────────
  for (const { collection, fields } of ROOT_COLLECTION_FIELDS) {
    for (const field of fields) {
      try {
        await deleteQueryResults(
          db,
          db.collection(collection).where(field, '==', uid),
          `${collection}.${field}`,
          summary
        );
      } catch (error) {
        console.error(`[deleteMyAccount] ${collection}.${field} silinemedi`, error);
        throw new HttpsError('internal', 'Iliskili kayitlar silinemedi, lutfen tekrar deneyin.');
      }
    }
  }

  // ── 3. EN SON: Auth kaydi ───────────────────────────────────────────────
  // Sira onemli. Auth once silinseydi, 1. ve 2. adimda bir kesinti olmasi
  // halinde geride kalan veriye bir daha hicbir kimlik erisemezdi.
  try {
    await admin.auth().deleteUser(uid);
    summary.authUser = 1;
  } catch (error) {
    if (error && error.code === 'auth/user-not-found') {
      // Zaten yok — istenen son durum bu, hata degil.
      summary.authUser = 0;
    } else {
      console.error('[deleteMyAccount] Auth kaydi silinemedi', error);
      // Veriler gitti ama Auth kaldi. Kullaniciya dogruyu soylemek gerekiyor:
      // tekrar denedigi zaman 1. ve 2. adim zaten bos donecek, yalnizca Auth
      // silinecek.
      throw new HttpsError(
        'internal',
        'Verileriniz silindi ancak hesap kaydi kaldirilamadi. Lutfen tekrar deneyin.'
      );
    }
  }

  console.log(`[deleteMyAccount] tamamlandi uid=${uid}`, summary);

  return { success: true, summary };
});
