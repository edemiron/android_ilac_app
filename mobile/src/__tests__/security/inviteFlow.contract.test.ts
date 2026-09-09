/**
 * K1 — davet akışı sözleşme kapısı (istemci + sunucu kablolaması)
 *
 * ── Neden var ──────────────────────────────────────────────────────────────
 * Davet kodu bir SIRDIR: onu bilen kişi bir hastanın tüm ilaç listesine, doz
 * geçmişine ve telefonuna AKTIF BAKICI olarak erişebilir. Kod eskiden
 * istemcide üretiliyordu — 6 hane × 33 alfabe ≈ 1.29×10⁹ ve `Math.random()`
 * (CSPRNG değil). Üretim sunucuya taşındı (`createCaregiverInvite`), kabul
 * rate-limit + atomik transaction ile sunucuya taşındı
 * (`redeemCaregiverInvite`).
 *
 * Bu geçişin en kırılgan yanı: **geri dönüşü görünmez.** Biri istemciyi
 * yeniden `generateInviteCode()` + `getDoc` akışına bağlarsa hiçbir test
 * kırılmaz — davranış aynı görünür, yalnızca entropy ve enumeration direnci
 * sessizce kaybolur. Bu dosya o geri dönüşü kilitler.
 *
 * Davranışsal kanıt (callable'ların gerçekten çalıştığı) emülatörde
 * `firestoreRules.behavioral.test.ts` kapsamında değil; sunucu fonksiyonları
 * jest ile koşulmuyor (server/functions'un kendi test altyapısı yok — Faz-2
 * madde 28, hâlâ açık). Bu yüzden burada kaynak-tarama + saf-fonksiyon
 * assertion'ları kullanılıyor: `firestoreRules.contract.test.ts` ve
 * `a11y.test.ts` ile aynı desen.
 */

/* global __dirname */
import * as fs from 'fs';
import * as path from 'path';
import { isValidInviteCode } from '../../services/caregiverHelpers';

const ROOT = path.join(__dirname, '..', '..', '..', '..');
const SERVICE_PATH = path.join(ROOT, 'mobile', 'src', 'services', 'caregiverService.ts');
const SERVER_INVITE_PATH = path.join(ROOT, 'server', 'functions', 'inviteService.js');
const SERVER_CALLABLES_PATH = path.join(ROOT, 'server', 'functions', 'caregiverInvites.js');

const serviceRaw = fs.readFileSync(SERVICE_PATH, 'utf8');
const serverInviteRaw = fs.readFileSync(SERVER_INVITE_PATH, 'utf8');
const serverCallablesRaw = fs.readFileSync(SERVER_CALLABLES_PATH, 'utf8');

/** Yorumları atar — kusuru ANLATAN yorumlar kusur sanılmasın. */
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const serviceCode = stripComments(serviceRaw);
// Sunucu dosyaları da soyuluyor: `inviteService.js` başlığı ESKİ istemci
// kusurunu anlatırken `Math.random()` ve `bytes[i] % 33` ifadelerini anıyor.
// Yorumlar soyulmasa "Math.random kullanmıyor" assertion'ı kendi
// açıklamamız yüzünden patlıyordu.
const serverInvite = stripComments(serverInviteRaw);
const serverCallables = stripComments(serverCallablesRaw);

describe('K1 — istemci davet akışı sunucuya bağlı', () => {
  it("davet oluşturma `createCaregiverInvite` callable'ını çağırıyor", () => {
    expect(serviceCode).toMatch(/callFunction[\s\S]{0,400}'createCaregiverInvite'/);
  });

  it("davet kabulü `redeemCaregiverInvite` callable'ını çağırıyor", () => {
    expect(serviceCode).toMatch(/callFunction[\s\S]{0,400}'redeemCaregiverInvite'/);
  });

  it('⚠️ üretim yolunda `generateInviteCode()` ÇAĞRILMIYOR', () => {
    // `export { generateInviteCode, ... }` bir yeniden-dışa-aktarım, çağrı
    // değil — o yüzden yalnızca ÇAĞRI biçimi (`(` ile) aranıyor.
    const calls = serviceCode.match(/generateInviteCode\s*\(/g) ?? [];
    expect(calls).toHaveLength(0);
  });

  it('⚠️ kabul akışı daveti `getDoc` ile OKUMUYOR (enumeration yolu kapalı)', () => {
    // Eski akış `const inviteSnap = await getDoc(inviteRef)` yapıyordu;
    // brute-force tam olarak bu okuma üzerinden yürüyordu. Kabul artık
    // sunucuda, dolayısıyla istemcide davet dokümanı okunmamalı.
    expect(serviceCode).not.toMatch(/getDoc\(\s*inviteRef\s*\)/);
  });

  it('⚠️ davet kodu loglanmıyor (kod bir sırdır)', () => {
    // Eski kod `log.info('Bakıcı daveti oluşturuldu', { inviteCode })` ve
    // `log.info('Bakıcı daveti kabul edildi', { inviteCode, ... })` yazıyordu.
    // Loglara düşen bir davet kodu, logu okuyabilen herkesi hastanın AKTİF
    // BAKICISI yapar.
    //
    // Yalnızca log çağrılarının içine bakılıyor ve iki tehlikeli biçim
    // aranıyor:
    //   shorthand → { inviteCode } / { inviteCode, x } / { x, inviteCode }
    //   açık alan → { inviteCode: herhangiBirŞey }
    //
    // `inviteCodeLength: inviteCode.length` BİLİNÇLİ olarak serbest: uzunluk
    // teşhis için yeterli, kodun kendisini ifşa etmez. (İlk denemede regex
    // hem string literal içindeki kelimeyi hem `.length` erişimini yakalayıp
    // iki kez yanlış pozitif verdi — assertion tehlikeli BİÇİMLERE
    // indirgendi.)
    const logCalls = serviceCode.match(/log\.(info|warn|error)\([\s\S]*?\);/g) ?? [];
    expect(logCalls.length).toBeGreaterThan(0);
    for (const call of logCalls) {
      expect(call).not.toMatch(/[{,]\s*inviteCode\s*[,}]/);
      expect(call).not.toMatch(/inviteCode\s*:/);
    }
  });

  it('kabul akışı kota aşımını kullanıcıya anlamlı bildiriyor', () => {
    expect(serviceCode).toMatch(/resource-exhausted/);
  });
});

describe('K1 — sunucu kod üretimi kriptografik', () => {
  it('`crypto.randomBytes` kullanılıyor (Math.random DEĞİL)', () => {
    expect(serverInvite).toMatch(/require\('crypto'\)/);
    expect(serverInvite).toMatch(/crypto\.randomBytes\(/);
    expect(serverInvite).not.toMatch(/Math\.random\(\)/);
  });

  it('⚠️ modulo önyargısı rejection sampling ile engelleniyor', () => {
    // Naif `bytes[i] % 33` önyargılıdır: 256 = 7×33 + 25, yani 25 karakter
    // 8/256, kalan 8 karakter 7/256 olasılıkla seçilir (~%4 sapma, entropy
    // 60 → 59.5 bit). Ölçüldü: naif χ²=7719, rejection sampling χ²=43.15
    // (df=32, p=0.01 kritik değer 53.49).
    expect(serverInvite).toMatch(/Math\.floor\(256 \/ n\) \* n/);
    expect(serverInvite).toMatch(/if \(b < limit\)/);
  });

  it('kod uzunluğu 12 (6 değil) ve validator ile tutarlı', () => {
    expect(serverInvite).toMatch(/INVITE_CODE_LENGTH = 12/);
    // İstemci validator'ı sunucunun ürettiği uzunluğu KABUL ETMELİ — aksi
    // halde sunucu tarafı düzeltme tek başına tüm kabul akışını kırardı.
    expect(isValidInviteCode('A1B2C3D4E5F6')).toBe(true);
  });

  it('istemci validator eski 6-8 haneli kodları da kabul ediyor (saha uyumu)', () => {
    expect(isValidInviteCode('ABC123')).toBe(true);
    expect(isValidInviteCode('ABCD1234')).toBe(true);
  });

  it('istemci validator 12 üzerini ve geçersiz girdiyi reddediyor', () => {
    expect(isValidInviteCode('A1B2C3D4E5F67')).toBe(false);
    expect(isValidInviteCode('abc123')).toBe(false);
    expect(isValidInviteCode('')).toBe(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isValidInviteCode(null as any)).toBe(false);
  });
});

describe('K1/K2 — sunucu kabul yolu güvenlik kontrolleri', () => {
  it('kota DOĞRULAMADAN ÖNCE tüketiliyor', () => {
    // Sıra kritik: kota doğrulamadan sonra tüketilseydi saldırgan geçerli
    // kodu bulana kadar ücretsiz deneyebilirdi.
    const quotaAt = serverCallables.indexOf('checkAndRecordRedeemAttempt(caregiverId)');
    const txAt = serverCallables.indexOf('db.runTransaction');
    expect(quotaAt).toBeGreaterThan(-1);
    expect(txAt).toBeGreaterThan(-1);
    expect(quotaAt).toBeLessThan(txAt);
  });

  it('kota okunamazsa REDDEDİYOR (fail-closed)', () => {
    expect(serverCallables).toMatch(
      /catch \(err\) \{[\s\S]{0,300}throw new HttpsError\('unavailable'/
    );
  });

  it('anonim sağlayıcı sunucu tarafında da reddediliyor', () => {
    expect(serverCallables).toMatch(/sign_in_provider/);
    expect(serverCallables).toMatch(/provider === 'anonymous'/);
  });

  it("⚠️ başarısız kabul GENERIC mesaj dönüyor (enumeration oracle'ı yok)", () => {
    // "Bulunamadı" / "süresi dolmuş" / "zaten kullanılmış" ayrımı saldırgana
    // hangi kodların var olduğunu söyler. Gerçek neden yalnızca loga yazılır.
    expect(serverCallables).toMatch(/GENERIC_REDEEM_FAILURE/);
    expect(serverCallables).toMatch(/reason=\$\{outcome\.reason\}/);
    // Self-invite istisnası bilinçli: yalnızca kodun ÇAĞIRANA ait olduğunu
    // söyler, başkalarının kodları hakkında bilgi vermez.
    expect(serverCallables).toMatch(/reason === 'self-invite'/);
  });

  it('⚠️ kendi davetini kabul SUNUCUDA engelleniyor', () => {
    // İstemcideki kontrol SDK'yı doğrudan kullanan biri için anlamsızdı ve
    // firestore.rules'ta karşılığı YOKTU: hasta kendi koduyla `uid__uid`
    // ilişkisi kurup kendisinin aktif bakıcısı olabiliyordu.
    expect(serverCallables).toMatch(/if \(patientId === caregiverId\)/);
  });

  it('⚠️ ilişki + davet tüketimi TEK transaction içinde (tekrar oynatma kapalı)', () => {
    // İstemcide iki AYRI yazımdı ve davet güncellemesinin başarısızlığı
    // TOLERE ediliyordu → kullanılmış davet `pending` kalıp farklı bir bakıcı
    // tarafından tekrar kullanılabiliyordu. Transaction davet dokümanında
    // serileştiği için eşzamanlı iki kabulden yalnızca biri kazanır.
    const txStart = serverCallables.indexOf('db.runTransaction');
    const txBody = serverCallables.slice(txStart);
    const setRel = txBody.indexOf('tx.set(relRef');
    const updateInvite = txBody.indexOf('tx.update(inviteRef');
    expect(setRel).toBeGreaterThan(-1);
    expect(updateInvite).toBeGreaterThan(-1);
    // İkisi de transaction gövdesinde, tx dışında `setDoc`/`updateDoc` yok.
    expect(serverCallables).not.toMatch(/await setDoc\(/);
    expect(serverCallables).not.toMatch(/await updateDoc\(/);
  });

  it('süre dolumu sayısal `expiresAtMs` ile kontrol ediliyor', () => {
    // firestore.rules'taki `inviteNotExpired` ile aynı politika: Rules
    // Timestamp'te toISOString() olmadığı için ISO string karşılaştırılamaz.
    expect(serverCallables).toMatch(/invite\.expiresAtMs/);
  });

  it('⚠️ KURAL HÂLÂ AÇIK: `allow get` daraltılmadı (yayılıma kapılı)', () => {
    // Bu test BİLİNÇLİ olarak mevcut durumu BELGELİYOR, onaylamıyor.
    // `allow get: if isNotAnonymous()` hâlâ açık; brute-force ancak bu kural
    // `resource.data.patientId == request.auth.uid` ile daraltıldığında biter
    // (enumeration callable üzerinden değil doğrudan `getDoc` ile yürüyor,
    // yani rate-limit onu durdurmuyor).
    //
    // Daraltmak, callable'ları kullanmayan ESKİ istemcileri anında kırar
    // (kabul akışında getDoc yapıyorlardı) — bu yüzden yayılım bekleniyor.
    //
    // 📅 TAM PLAN: docs/DAVET_KODU_ALLOW_GET_DARALTMA_YAYILIM_PLANI.md
    //    (eşikler, 3 test dosyasındaki zorunlu değişiklikler, emülatör
    //    doğrulama sırası, geri alma adımları, Go/No-Go listesi)
    //
    // Bu assertion İKİ YÖNLÜ çalışıyor:
    //   1. Biri ERKEN daraltırsa kırılır → sahadaki eski sürümler
    //      kırılmadan önce fark edilir.
    //   2. Zamanı gelip daraltıldığında YİNE kırılır → planın §5.2(c) adımı
    //      hatırlatılır ve daraltmanın "unutulması" imkânsız hale gelir.
    const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
    const invite = /match \/caregiverInvites\/\{inviteCode\}\s*\{([\s\S]*?)\n {4}\}/.exec(rules);
    expect(invite?.[1]).toMatch(/allow get: if isNotAnonymous\(\);/);
  });
});
