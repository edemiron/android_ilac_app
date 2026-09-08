/**
 * Firestore güvenlik kuralları — SÖZLEŞME TESTİ (v1.7.4, Faz 0.1)
 *
 * ── Neden bu test var ──────────────────────────────────────────────────────
 * Kurallar neredeyse her yerde `isOwner(userId) || isAuthenticated()` yazıyordu.
 * Bu ifade mantıksal olarak `isAuthenticated()`e İNDİRGENİR: hesap açan herkes
 * tüm kullanıcıların ilaç listesini, doz geçmişini ve iletişim bilgilerini
 * okuyabiliyor, loglarına yazabiliyor, kendini bakıcı yapabiliyordu.
 * App Check mobilde kapalı olduğu için tek koruma katmanı bu dosyaydı.
 *
 * Bu test emülatör GEREKTİRMEZ: kural dosyasını okuyup, bir daha aynı sınıf
 * hataya düşülmesini engelleyen yapısal değişmezleri doğrular. Gerçek izin
 * davranışı için ayrıca emülatörlü test yazılmalı (bkz. dosya sonundaki not).
 */

/* global __dirname */
import fs from 'fs';
import path from 'path';

const RULES_PATH = path.join(__dirname, '..', '..', '..', '..', 'firestore.rules');
const rules = fs.readFileSync(RULES_PATH, 'utf8');

/** Yorum satırlarını atar — kusuru ANLATAN yorumlar kusur sanılmasın. */
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const code = stripComments(rules);

/** `allow ...: if <ifade>;` bloklarını çıkarır. */
const allowClauses = (): Array<{ actions: string; condition: string }> =>
  [...code.matchAll(/allow\s+([a-z,\s]+):\s*if([\s\S]*?);/g)].map(m => ({
    actions: m[1].replace(/\s+/g, ''),
    condition: m[2].replace(/\s+/g, ' ').trim(),
  }));

describe('firestore.rules — yapısal değişmezler', () => {
  it('HİÇBİR kural `|| isAuthenticated()` ile genişletilmemiş', () => {
    // Kök neden buydu: sahiplik kontrolünün yanına eklenen bu OR, kuralı
    // "oturum açmış herkes" hâline getiriyordu.
    const offenders = allowClauses().filter(
      c =>
        /\|\|\s*isAuthenticated\(\)/.test(c.condition) ||
        /isAuthenticated\(\)\s*\|\|/.test(c.condition)
    );

    expect(offenders).toEqual([]);
  });

  it('kimlik doğrulamasız okuma (`if true`) YOK', () => {
    // `config/{configId}` eskiden `allow read: if true` idi ve istemci bu
    // dokümandan API anahtarı bekliyordu.
    const offenders = allowClauses().filter(c => /^true$/.test(c.condition));

    expect(offenders).toEqual([]);
  });

  it('abonelik dokümanına istemci YAZAMAZ', () => {
    const subscriptionBlock = /match \/subscription\/\{[^}]+\}\s*\{([\s\S]*?)\}/.exec(code);

    expect(subscriptionBlock).toBeTruthy();
    // Ödemesiz Premium: herkes kendi dokümanına tier:'premium' yazabiliyordu.
    expect(subscriptionBlock?.[1]).toMatch(/allow write:\s*if false/);
    expect(subscriptionBlock?.[1]).not.toMatch(/allow write:\s*if isOwner/);
  });

  it('erişim kontrolü deterministik ilişki dokümanına dayanıyor', () => {
    // Kurallarda query çalıştırılamaz; bu yüzden ilişki kimliği taraflardan
    // hesaplanabilir olmalı. Kod tarafındaki `buildRelationshipId` ile aynı şema.
    expect(code).toMatch(/patientId \+ '__' \+ caregiverId/);
    expect(code).toMatch(/function isActiveCaregiverOf\(patientId\)/);
    expect(code).toMatch(
      /get\(relPath\(patientId, request\.auth\.uid\)\)\.data\.status == 'active'/
    );
  });

  it('bakıcı ilişkiyi ancak DAVET KANITIYLA kurabilir', () => {
    const relBlock = /match \/caregiverRelationships\/\{relationshipId\}\s*\{([\s\S]*)$/.exec(code);

    expect(relBlock).toBeTruthy();
    // Davet dokümanının patientId'si eşleşmeli — kodu bilmeyen ilişki kuramaz.
    expect(relBlock?.[1]).toMatch(/caregiverInvites\/\$\(request\.resource\.data\.inviteCode\)/);
    // Kimlik şekli de denetlenmeli, yoksa kural get() ile bulamaz.
    expect(relBlock?.[1]).toMatch(/relationshipId ==/);
  });

  it('yetkisi kaldırılan bakıcı kendini yeniden aktif YAPAMAZ', () => {
    // Bakıcı yalnızca kendi iletişim/token alanlarını güncelleyebilir.
    expect(code).toMatch(
      /affectedKeys\(\)\.hasOnly\(\[\s*'caregiverPhone', 'caregiverFcmToken', 'caregiverName', 'updatedAt'\s*\]\)/
    );
    expect(code).not.toMatch(/allow update: if isRelationshipParty\(\)/);
  });

  it('davet koleksiyonu TARANAMAZ (list kendi davetleriyle sınırlı)', () => {
    const inviteBlock = /match \/caregiverInvites\/\{inviteCode\}\s*\{([\s\S]*?)\n {4}\}/.exec(
      code
    );

    expect(inviteBlock).toBeTruthy();
    // `read` yerine get/list ayrımı: kodu bilen okur, koleksiyon taranamaz.
    expect(inviteBlock?.[1]).not.toMatch(/allow read:/);
    expect(inviteBlock?.[1]).toMatch(/allow list: if isAuthenticated\(\) && \(/);
  });

  /**
   * v1.8.9 — `config/` KOLEKSIYONU SIR TASIYORDU VE ACIKTI.
   *
   * Gecmisi: `mobile/scripts/setupAIConfig.js` Gemini anahtarini
   * `config/ai` dokumanina yaziyordu, `aiMedicineService.ts` oradan
   * okuyordu, ve kural sunu diyordu:
   *
   *   v1.7.4 oncesi : allow read: if true             -> KIMLIK DOGRULAMASI YOK
   *   v1.7.4-v1.8.8 : allow read: if isAuthenticated() -> kayit acik, yani herkes
   *   v1.8.9        : allow read: if false
   *
   * Yani anahtar internete acik bir Firestore dokumanindaydi. Bugun o
   * koleksiyonu okuyan KOD KALMADI; Cloud Functions Admin SDK kullaniyor ve
   * Admin SDK kurallari zaten bypass eder.
   *
   * Bu kapi olmadan biri kurali "gecici olarak" geri acabilir ve kimse fark
   * etmez — kusurun ilk hali de tam olarak boyle yasadi.
   */
  it('`config/` koleksiyonu istemciye TAMAMEN kapali', () => {
    const configBlock = code.match(/match\s+\/config\/\{[^}]*\}\s*\{([\s\S]*?)\}/);

    // Blok hic bulunamazsa kapi sessizce bosa duser — once varligini dogrula.
    expect(configBlock).not.toBeNull();

    const clauses = [
      ...(configBlock as RegExpMatchArray)[1].matchAll(/allow\s+([a-z,\s]+):\s*if([^;]*);/g),
    ].map(m => ({
      actions: m[1].replace(/\s+/g, ''),
      condition: m[2].replace(/\s+/g, ' ').trim(),
    }));

    expect(clauses.length).toBeGreaterThan(0);
    for (const clause of clauses) {
      expect(clause.condition).toBe('false');
    }
  });

  it('kural dosyası varsayılan-kapalı ile bitiyor', () => {
    expect(code).toMatch(/match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/);
  });

  it('hasta verisi alt koleksiyonlarında yazma yalnızca sahibinde (loglar hariç)', () => {
    for (const sub of ['medicines', 'reminderTimes']) {
      const block = new RegExp(`match /${sub}/\\{[^}]+\\}\\s*\\{([\\s\\S]*?)\\}`).exec(code);
      expect(block).toBeTruthy();
      expect(block?.[1]).toMatch(/allow write: if isOwner\(userId\)/);
    }
  });

  // ────────────────────────────────────────────────────────────────────────
  // K1 / K2 / K3 sertleştirmesi + abonelik catch-all düzeltmesi
  //
  // Bu koşullar DAVRANIŞSAL olarak `firestoreRules.behavioral.test.ts`'te
  // (32 senaryo, gerçek Firestore emülatörü) kilitleniyor. AMA o suite
  // `FIRESTORE_EMULATOR_HOST` tanımlı olmadığı için CI'da SKIP ediliyor —
  // yani CI düzeyindeki TEK koruma buradaki şekil assertion'ları.
  //
  // İkisi birlikte gerekli ve birbirinin yerine geçmez:
  //   şekil kapısı      → regresyonu CI'da yakalar, semantiği kanıtlamaz
  //   davranışsal kapı  → semantiği kanıtlar, CI'da koşmaz
  //
  // Neden şart: bu assertion'lar eklenmeden önce K1/K2/K3 sertleştirmesinin
  // HİÇBİR regresyon koruması yoktu — `isNotAnonymous`, `inviteNotExpired`,
  // `caregiver_action` veya bakıcı create-only kuralı silinse 10 testin
  // hepsi yine geçiyordu (grep ile doğrulanmıştı).
  // ────────────────────────────────────────────────────────────────────────

  it('K1: isNotAnonymous() tanımlı ve gerçekten sign_in_provider kontrol ediyor', () => {
    expect(code).toMatch(/function isNotAnonymous\(\)/);
    // Yalnızca fonksiyon adının varlığı yetmez — gövdesi anonim sağlayıcıyı
    // reddetmeli. Aksi halde `function isNotAnonymous() { return true; }`
    // şekil kapısını geçerdi.
    expect(code).toMatch(/sign_in_provider != 'anonymous'/);
  });

  it('K1: davet okuma ve ilişki kurma anonim kimliği reddediyor', () => {
    const invite = /match \/caregiverInvites\/\{inviteCode\}\s*\{([\s\S]*?)\n {4}\}/.exec(code);
    expect(invite).not.toBeNull();
    expect(invite?.[1]).toMatch(/allow get: if isNotAnonymous\(\)/);

    const rel = /match \/caregiverRelationships\/\{relationshipId\}\s*\{([\s\S]*?)\n {4}\}/.exec(
      code
    );
    expect(rel).not.toBeNull();
    expect(rel?.[1]).toMatch(/&& isNotAnonymous\(\)/);
  });

  it('K2: davet süresi SAYISAL alanla kontrol ediliyor (ISO string ile DEĞİL)', () => {
    // `expiresAt` ISO string; Rules Timestamp'te toISOString() YOK. String ↔
    // Timestamp karşılaştırması tip hatası verir ve kural REDDEDER — yani tüm
    // bakıcı kabulleri kilitlenirdi. Bu assertion o tuzağa dönüşü engeller.
    expect(code).toMatch(/function inviteNotExpired\(inviteData\)/);
    expect(code).toMatch(/'expiresAtMs' in inviteData/);
    expect(code).toMatch(/expiresAtMs > request\.time\.toMillis\(\)/);
    expect(code).not.toMatch(/expiresAt > request\.time\b/);
  });

  it('K2: ilişki kurmada süre dolumu gerçekten uygulanıyor', () => {
    const rel = /match \/caregiverRelationships\/\{relationshipId\}\s*\{([\s\S]*?)\n {4}\}/.exec(
      code
    );
    expect(rel?.[1]).toMatch(/&& inviteNotExpired\(/);
  });

  it('K2: bakıcı daveti yalnızca pending→accepted ve SABİT alan kümesiyle güncelleyebilir', () => {
    const invite = /match \/caregiverInvites\/\{inviteCode\}\s*\{([\s\S]*?)\n {4}\}/.exec(code);
    expect(invite?.[1]).toMatch(/resource\.data\.status == 'pending'/);
    expect(invite?.[1]).toMatch(/request\.resource\.data\.status == 'accepted'/);
    expect(invite?.[1]).toMatch(
      /hasOnly\(\[\s*'status', 'caregiverId', 'caregiverName', 'acceptedAt'\s*\]\)/
    );
  });

  it('K3: bakıcı doz kaydını APPEND-ONLY oluşturur, update EDEMEZ', () => {
    const logs = /match \/medicineLogs\/\{logId\}\s*\{([\s\S]*?)\n {6}\}/.exec(code);
    expect(logs).not.toBeNull();
    const block = logs?.[1] ?? '';

    // Hasta tam yetkili.
    expect(block).toMatch(/allow create, update, delete: if isOwner\(userId\)/);
    // Bakıcı yalnızca create + kaynak beyanı.
    expect(block).toMatch(/allow create: if isActiveCaregiverOf\(userId\)/);
    expect(block).toMatch(/request\.resource\.data\.source == 'caregiver_action'/);

    // ⚠️ ÇEKİRDEK GARANTİ: bakıcıya update izni veren HİÇBİR satır olmamalı.
    // Eski kural `allow create, update: if isOwner || isActiveCaregiverOf`
    // idi ve bakıcı hastanın `missed` kaydını `taken`'a çevirip `source`'u
    // aynı yazımda değiştirerek izini örtebiliyordu.
    const caregiverUpdate = /allow\s+[^;]*update[^;]*:\s*if[^;]*isActiveCaregiverOf/.exec(block);
    expect(caregiverUpdate).toBeNull();
  });

  it('⚠️ abonelik catch-all tarafından YENİDEN AÇILMIYOR (OR-semantiği tuzağı)', () => {
    // Firestore kuralları eşleşen TÜM allow ifadelerini OR'lar: daha geniş bir
    // kural daha dar bir `if false`'u geçersiz kılar. `users/{uid}/subscription`
    // hem kendi match'ini hem recursive catch-all'ı eşleştirdiği için, catch-all
    // `subscription`'ı HARİÇ tutmadıkça hasta kendi tier'ını yazabiliyordu.
    // Bu, davranışsal testle bulunmuş gerçek bir açıktı.
    const catchAll = /match \/\{allSubcollections=\*\*\}\s*\{([\s\S]*?)\n {6}\}/.exec(code);
    expect(catchAll).not.toBeNull();
    expect(catchAll?.[1]).toMatch(/allSubcollections\[0\] != 'subscription'/);

    const sub = /match \/subscription\/\{subscriptionId\}\s*\{([\s\S]*?)\n {6}\}/.exec(code);
    expect(sub?.[1]).toMatch(/allow write: if false/);
  });
});

/**
 * NOT — katmanlar ve sınırları:
 *
 * Bu test kuralların ŞEKLİNİ korur, DAVRANIŞINI kanıtlamaz. Davranışsal
 * kanıt `firestoreRules.behavioral.test.ts`'te (32 senaryo, gerçek Firestore
 * emülatörü) ve şu komutla koşulur:
 *
 *   firebase emulators:exec --only firestore "cd mobile && npx jest \
 *     src/__tests__/security/firestoreRules.behavioral.test.ts"
 *
 * Emülatör Java 21+ gerektirir (firebase-tools 15.x) ve CI'da
 * `FIRESTORE_EMULATOR_HOST` tanımlı olmadığı için o suite SKIP edilir.
 * Yani yukarıdaki şekil assertion'ları CI'daki TEK korumadır — bu yüzden
 * K1/K2/K3 ve abonelik catch-all düzeltmesi burada da kilitlenmiştir.
 *
 * Şekil kapısının sınırı somut olarak görüldü: abonelik açığında
 * `allow write: if false` metni DURUYORDU ve bu test GEÇİYORDU, ama gerçek
 * yazma isteği başarılı oluyordu (catch-all OR'ladığı için). Metin varlığı
 * yetki anlamına gelmez.
 */
