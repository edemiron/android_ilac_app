# 🔒 Firestore Rules Sertleştirmesi — Davet Zinciri ve Doz Kaydı Bütünlüğü

> **Kayıt türü:** Denetim kaynaklı güvenlik düzeltmesi — **sürümsüz** (`[Unreleased]`)
> **Tarih & Saat:** 2026-09-07 23:41
> **Commit:** `aec9144` (rules + istemci), `0452299` (scripts/ fail-closed gitignore)
> **Dal:** `fix/critical-issues-and-improvements`
> **Modül / Alan:** Firestore Security Rules · Hasta-Bakıcı Yetkilendirme · Doz Kaydı Bütünlüğü · KVKK m.6
> **Hakem:** Qwen 3.8 Max (Baş Mimar & Baş Denetçi)
> **Durum:** ⚠️ **COMMIT'LENDİ, YAYINLANMADI** — `firebase deploy --only firestore:rules` çalıştırılmadı

---

## 1. Neden sürümsüz kayıt

Bu değişiklik **commit'lendi ama yayınlanmadı**:

- Kurallar yalnızca yerel dosyada; canlı Firestore'a deploy edilmedi.
- APK derlenmedi, cihaza kurulmadı.
- `versionName` / `versionCode` yükseltilmedi (hâlâ **2.4.0 / 82**).

AGENTS.md §3 SemVer karar ağacına göre kurallardaki yetkilendirme değişikliği davranış değiştirdiği için tartışılabilir, ama ortada yayınlanmış bir artefakt olmadığından sürüm damgası basmak **yanlış beyan** olurdu. Keep a Changelog gereği commit'lenmiş-yayınlanmamış işin doğru yeri `[Unreleased]` bölümüdür. Yayın kararı verildiğinde bu kayıt uygun sürüm başlığına taşınmalıdır.

---

## 2. Bağlam: neden kural dosyası tek kritik katman

`firestore.rules:14-15` dosyanın kendi yorumu durumu açıkça teslim ediyor:

> *"App Check mobilde fiilen kapalı olduğu için tek koruma katmanı bu dosyaydı."*

Doğrulandı: `mobile/src/config/appCheck.ts` içindeki `initializeMobileAppCheck(_app)` **`initializeAppCheck`'i hiç çağırmıyor**; üretimde yalnızca `'Mobile App Check: Native attestation not available with Firebase JS SDK'` uyarısını loglayıp dönüyor. Kurallarda hiçbir `request.app` kontrolü yok, hiçbir `onCall` `enforceAppCheck` set etmiyor.

Sonuç: cihaz kanıtlaması olmadığı için her Firestore `get()` ve her callable, `google-services.json`'daki **public** API anahtarıyla düz bir Node betiğinden erişilebilir. Kurallar fiilen tek duvar.

---

## 3. Kapatılan açıklar

### 3.1 K1 (kısmi) — Anonim kimlikle davet okuma/kabul etme

**Açık:** `caregiverInvites/{inviteCode}` üzerinde `allow get: if isAuthenticated()` vardı ve `isAuthenticated()` yalnızca `request.auth != null` demek. `mobile/src/services/authService.ts` `signInAnonymously` import edip `loginAnonymously()` içinde çağırıyordu — yani kimlik doğrulaması **sıfır** olan sınırsız ve atfedilemez tek kullanımlık kimlikler üretilip davet kodu uzayı taranabiliyordu.

**Düzeltme:** `isNotAnonymous()` yardımcısı eklendi ve hem `caregiverInvites` `get`'ine hem `caregiverRelationships.create` dal (2)'ye uygulandı:

```javascript
function isNotAnonymous() {
  return isAuthenticated()
    && 'firebase' in request.auth.token
    && 'sign_in_provider' in request.auth.token.firebase
    && request.auth.token.firebase.sign_in_provider != 'anonymous';
}
```

**Kırıcı değil — kanıt:** `loginAnonymously` uygulamanın **hiçbir akışında çağrılmıyor**. Grep ile doğrulandı: `mobile/` altında `loginAnonymously|signInAnonymously` için tek eşleşme tanımın kendisi (`authService.ts:227` tanım, `:229` kendi içindeki çağrı). Yani meşru kullanıcı etkilenmez.

**DÜRÜST SINIR:** Bu, brute-force'u **çözmez**. E-posta/Google hesabı açmak da ucuz ve kurallar rate-limit ifade edemez. Kazanım: atfedilebilirlik ve en ucuz kimlik yolunun kapanması. Kök neden §5'te açık madde olarak duruyor.

### 3.2 K2 — Davet süresi dolumu kuralda bağlayıcı değildi

**Açık:** Süre kontrolü yalnızca istemcideydi (`caregiverService.ts` `if (new Date(invite.expiresAt) < new Date())`). SDK'yı doğrudan kullanan herkes onu atlıyordu; süresi dolmuş ama `pending` kalmış bir davet **sonsuza dek** çalışıyordu. Belgelenen "7 gün geçerlilik" bir güvenlik kontrolü değildi.

**Tip tuzağı (neden naif çözüm çalışmaz):** `expiresAt` istemcide ISO **string** olarak saklanıyor (`types/index.ts` `expiresAt: string; // ISO date string`; yazım `expiresAt.toISOString()`). Rules tarafında `request.time` bir `Timestamp` ve **`toISOString()` metodu YOK** — yalnızca `toMillis()`, `toDate()`, `date()`, `time()` ve bileşen erişimleri var. Dolayısıyla `expiresAt > request.time` bir **string ↔ Timestamp** karşılaştırması olur, kural değerlendirmesi hata verir ve **reddeder**: tüm bakıcı ilişki oluşturmaları kilitlenirdi (fail-closed lockout).

**Çözüm:** sayısal `expiresAtMs` alanı + sentinel'li geçiş:

```javascript
function inviteNotExpired(inviteData) {
  return !('expiresAtMs' in inviteData)
    || inviteData.expiresAtMs > request.time.toMillis();
}
```

Sentinel sayesinde alanı olmayan **eski** davetler reddedilmez; yama tek başına, istemci güncellenmeden de güvenle yayınlanabilir. İstemci `expiresAtMs` yazmaya başladığı an kontrol kendiliğinden bağlayıcı olur.

**İstemci tarafı:** `caregiverService.ts` davet nesnesine `expiresAtMs: expiresAt.getTime()` eklendi; `types/index.ts` `CaregiverInvite`'a `expiresAtMs?: number` alanı eklendi.

**Ayrıca kaldırıldı:** kabul akışındaki `updateDoc(inviteRef, { status: 'expired' })`. Çağıran taraf **bakıcı** olduğu için §3.3'teki sıkılaşmış kural bunu her zaman reddeder; `permission-denied` dış catch'e düşüp kullanıcıya "Davet süresi dolmuş" yerine genel bir hata mesajı gösteriyordu. Süre artık kuralda bağlayıcı olduğundan o yazım zaten gereksizdi.

### 3.3 K2 — Bakıcı davet dokümanında keyfi alan yazabiliyordu

**Açık:** `caregiverInvites.update` bakıcı dalı yalnızca `resource.data.status == 'pending' && request.resource.data.caregiverId == request.auth.uid` istiyordu. Hedef `status` değeri ve alan kümesi kısıtlanmamıştı — bekleyen bir davette `caregiverId`'sini kendi UID'sine eşitleyen **herkes keyfi alan yazabiliyordu**.

**Düzeltme:** geçiş ve alan kümesi sabitlendi:

```javascript
resource.data.status == 'pending' &&
request.resource.data.status == 'accepted' &&
request.resource.data.caregiverId == request.auth.uid &&
request.resource.data.diff(resource.data).affectedKeys().hasOnly([
  'status', 'caregiverId', 'caregiverName', 'acceptedAt'
])
```

İstemcinin kabul akışı tam olarak bu dört alanı yazdığı için (`caregiverService.ts` `cleanUndefined({ status, caregiverId, caregiverName, acceptedAt })`) uyumlu; `hasOnly` alt kümeyi de kabul ettiği için `caregiverName` tanımsız olup düşse bile kural geçiyor.

### 3.4 K3 — Bakıcı doz kaydını sessizce tahrif edebiliyordu

**Açık:** `medicineLogs` üzerinde `allow create, update: if isOwner(userId) || isActiveCaregiverOf(userId)` vardı. Yani bakıcı:

- hastanın kaydettiği bir `missed` logu `taken`'a çevirebilir,
- `source` alanını **aynı yazımda** yeniden yazarak düzenlemenin izini örtebilir,
- `takenAt`'i üzerine yazarak kaydı geriye tarihleyebilirdi.

Üstelik hiçbir yerde aktör kimliği tutulmuyordu: `recordedBy|loggedBy|markedBy|actorUid|auditBy|enteredBy` grep'i **0 eşleşme** veriyordu. Birden çok bakıcısı olan bir hastada dozu **kimin** işaretlediği tespit edilemiyordu.

**Klinik/KVKK etkisi:** Bu, bir klinisyenin, sigortacının veya mahkemenin hastanın antikoagülan / insülin / antiepileptik alıp almadığını belirlemek için güveneceği kayıttır. KVKK m.6 kapsamında özel nitelikli veridir ve **bütünlüğü bir tercih değil yasal yükümlülüktür**.

**Düzeltme:** bakıcı yolu **append-only** yapıldı:

```javascript
// Hasta kendi doz kaydını serbestçe yönetir.
allow create, update, delete: if isOwner(userId);

// Bakıcı YALNIZCA yeni kayıt oluşturabilir; kaynak beyanı zorunlu.
allow create: if isActiveCaregiverOf(userId)
  && request.resource.data.source == 'caregiver_action';
```

Düzeltme artık **eski kayda referans veren yeni bir doküman** olmalı, yerinde düzenleme asla.

**Kırıcı değil — kanıt:** istemci zaten `source: 'caregiver_action'` yazıyor ve bakıcı yolunda **hiçbir `update` çağrısı yok**. `MEDICINE_LOGS_SUBCOLLECTION` kullanımları tarandı: `caregiverService.ts` içinde bir `setDoc` (create) ve iki `collection(...)` (read); `CaregiverEventBridge.tsx` yalnızca `logMedicineTakenByCaregiver`'ı (create) çağırıyor.

**İstemci tarafı:** `logMedicineTakenByCaregiver` log dokümanına `actorUid: auth.currentUser?.uid ?? ''` eklendi.

---

## 4. BİLİNÇLİ OLARAK AÇIK BIRAKILAN: K3 Faz 2

Kurala şu satır **eklenmedi**:

```javascript
  && request.resource.data.actorUid == request.auth.uid
```

**Neden:** istemci alanı artık yazıyor, yani ön koşul kod tarafında hazır. Ama **saha yayılımı** bekleniyor — sahada hâlâ `actorUid` göndermeyen eski sürümler var ve satır şimdi açılırsa o sürümlerdeki bakıcıların "Hasta Aldı" düğmesi `permission-denied` ile kırılır.

Sıralama: **istemci → yayılım → kural.** Kural dosyasında bu karar `FAZ 2 — SAHA YAYILIMI BEKLENİYOR (karar: 2026-09-07)` yorumuyla belgelendi; böylece bir sonraki katkıcı satırı erken açmaz.

**Sonuç:** atfedilebilirlik henüz **kural tarafından zorlanmıyor**. `actorUid` yazılıyor ama doğrulanmıyor; kararlı bir saldırgan alanı atlayabilir veya başka bir UID yazabilir. Faz 2 açılana kadar K3 kısmen kapalıdır.

---

## 5. Açık kalan maddeler (bu kayıtla KAPANMADI)

| # | Madde | Neden kurallarla çözülemez |
|---|---|---|
| 1 | Davet kodu **6 hane** × 33'lük alfabe ≈ **1.29 milyar** olasılık ve **`Math.random()`** (CSPRNG değil — V8 xorshift128+ durumu birkaç çıktıda kurtarılabilir). `caregiverHelpers.ts` `INVITE_CODE_LENGTH = 6` | Kural, kodun nasıl üretildiğini göremez. Sunucuda `crypto.randomBytes(16)` ile ≥128 bit üretim gerekir |
| 2 | Güçlendirilmiş **8 haneli** üretici (`utils/caregiverInvite.ts`) **ölü kod** — tek çağıranı kendi testi | Silinip tek üretici bırakılmalı |
| 3 | `allow get` **rate-limit'siz**; `getDoc` döngüsüyle kod uzayı taranabilir | Rules rate-limit ifade edemez. UID+IP başına sınırlayan, denemeleri loglayan bir `redeemInvite` callable'ı gerekir |
| 4 | Davet, kabul eden kişinin **kimliğine bağlı değil** — kodu bilen herkes bağlanabilir | Kuralda ifade edilebilir (`caregiverEmail == request.auth.token.email`) ama **bilinçli olarak eklenmedi**: `caregiverEmail` boş string olabiliyor ve bakıcı Google ile farklı bir adresle girebiliyor → meşru akışı kırar. Önce "davette e-posta zorunlu mu?" ürün kararı gerekir |
| 5 | Tüketim **atomik değil**: `setDoc(relationship)` ve `updateDoc(invite → accepted)` ayrı yazımlar ve ikincisinin başarısızlığı istemcide tolere ediliyor | Kullanılan davet `pending`'de kalıp tekrar oynatılabilir. Çözüm: tek `writeBatch` + kuralda `get(...)` yerine `getAfter(...)`. Ayrı iş kalemi |
| 6 | Sentinel dalı | `expiresAtMs` yayıldıktan ve `INVITE_EXPIRY_DAYS` (7 gün) geçtikten sonra `inviteNotExpired` içindeki sentinel kaldırılıp kontrol koşulsuz yapılmalı |
| 7 | **App Check fiilen kapalı** | Yukarıdaki her maddenin çarpanı. `@react-native-firebase/app-check` + Play Integrity gerekir |
| 8 | 🚨 **`scripts/` içinde canlı API anahtarı** | Aşağıda §6 |

---

## 6. Yan bulgu: `scripts/` içinde canlı API anahtarı

Denetim sırasında `scripts/` dizinindeki **iki ayrı** betikte düz metin canlı anahtar bulundu:

- `scripts/qwen_alarm_audit.js:5`
- `scripts/qwen_general_codebase_audit.js:5`

Her ikisi de aynı `cf_live_` önekli değeri taşıyor ve `:78`'de `Authorization: Bearer ${apiKey}` olarak kullanılıyor. Önek ve kullanım biçimi bunun bir placeholder değil **canlı production credential** olduğunu gösteriyor (aynı dosyadaki `COMPOSIO_API_KEY=your_composio_api_key_here` gibi bariz placeholder'larla karıştırılmamalı).

**Doğrulanan durum:**

| Kontrol | Sonuç |
|---|---|
| `git log --all -S "<anahtar-öneki>"` | **boş** — anahtar tarihe HİÇ girmedi |
| `git show e6aad7a \| findstr <anahtar-öneki>` | **boş** — v2.4.0 commit'inde yok |
| `git grep -I "<anahtar-öneki>" $(git rev-parse HEAD)` | **boş** — HEAD ağacında yok |
| Depo genelinde grep | yalnızca o 2 dosya, başka kopya yok |

> 🔒 **Redaksiyon notu:** bu tablo ilk halinde arama komutlarını anahtarın ilk
> karakterleriyle **olduğu gibi** içeriyordu. Kullanılabilir bir credential
> değildi (anahtarın yalnızca başlangıcı, kalanı bilinmiyor) ama canlı bir
> anahtarın herhangi bir parçasını depoya — dolayısıyla uzağa — yazmak kötü
> hijyendir. Push öncesi fark edilip `<anahtar-öneki>` placeholder'ına
> indirgendi. Doğrulamanın kendisi geçerli: üç komut da gerçekten boş döndü.

**Alınan önlem (commit `0452299`):** `scripts/` **fail-closed** yok sayılıyor:

```gitignore
scripts/*
!scripts/ask_qwen.ps1
!scripts/generate_wheel_tick.js
```

Whitelist yerine fail-closed seçildi çünkü anahtar aynı dizinde **iki kez** ortaya çıktı — burası ajan betiklerinin tekrar tekrar anahtar gömdüğü bir yer. Bu kalıpla dizine **yeni** eklenen her dosya otomatik dışlanır; kazara bir `git add -A` ile sızıntı mümkün olmaz. Ters kurgu (yalnızca `*audit*` kalıpları) farklı adlandırılmış bir sonraki betiği kaçırırdı — nitekim ikinci dosya `qwen_general_codebase_audit.js` adıyla gelmişti.

Serbest bırakılan iki araç **tek tek okunarak** doğrulandı: `ask_qwen.ps1` saf Qwen CLI sarmalayıcı (sır, ağ çağrısı veya kimlik bilgisi yok; AGENTS.md'de hakem aracı olarak geçiyor), `generate_wheel_tick.js` yalnızca `fs`/`path` kullanıyor (v2.1.3'te commit'lenen `wheel_tick.wav` asset'inin üreteci — yeniden üretilebilirlik için repoda olması değerli).

**Doğrulama:** `git check-ignore` ile 6 dosyanın tamamı sınıflandırıldı (2 TRACKABLE / 4 IGNORED) ve `git add --dry-run -A` provası yalnızca 2 whitelist dosyasını listeledi.

### ⚠️ KAPANMAYAN KISIM

**gitignore sızıntıyı ÖNLER ama mevcut anahtarı İPTAL ETMEZ.** Anahtar hâlâ diskte ve geçerli olabilir.

Yapılması gerekenler (yalnızca kullanıcı/sahiplik tarafında yapılabilir):

1. **Sağlayıcı panelinden anahtarı İPTAL ET.** Yeni anahtar üretmek eskisini geçersiz kılmaz.
2. Betikleri anahtarı **ortam değişkeninden** okuyacak şekilde düzelt.
3. İptal ve düzeltme sonrası gerekirse whitelist'e ekle.

Bu, projenin daha önce Firestore `config/ai` üzerinden yaşadığı ve `firestore.rules:180-192`'de belgelenen sızıntının **aynı sınıfı**. Orada da sızıntı kapatılmış ama iptal doğrulanmamıştı (`docs/YAYIN_ONCESI_ACIK_MADDELER.md` içindeki "Yeni anahtar üret ve ESKİSİNİ İPTAL ET" ve "7. Doğrula" kutucukları hâlâ işaretsiz). Aynı hatanın tekrarlanmaması için bu maddenin kapatılması yayın öncesinden daha acildir.

### 🚨 DÜZELTME — "Gemini anahtarı git geçmişinde yok" sonucu YANLIŞTI

Bu kaydın §6'sındaki doğrulama tablosu `cf_live_` anahtarı için **doğru**: o anahtar gerçekten hiç commit'lenmedi. Ama denetim sırasında bunun yanında verilen **"Gemini anahtarı git geçmişinden kurtarılamıyor"** sonucu **yanlıştı** ve push denemesi bunu ortaya çıkardı.

GitHub push protection (GH013) iki canlı credential tespit etti:

| Sır | Biçim | HEAD'deki konum |
|---|---|---|
| **Google AI Studio / Gemini API anahtarı** | `AQ.` öneki + toplam 50 karakter *(anahtar malzemesi redakte)* | `docs/UYGULAMA_TANIMA_RAPORU_2026-08-31.md`, `docs/YAYIN_ONCESI_ACIK_MADDELER.md`, `docs/archive/v1.6.0_2026-08-31_05-30_gemini-api-anahtari-kaydedildi-…md` |
| **Apify API token** | Apify'nin standart token öneki + toplam 46 karakter *(ön ek redakte)* | `docs/strateji/APIFY_ANALIZ.md` |

> 🔒 **Redaksiyon notu (ikinci tur):** bu tablo ilk halinde iki sırrın da önek
> parçalarını **olduğu gibi** içeriyordu — `cf_live_` vakasında yapılan hatanın
> aynısı. Ürün önekleri herkese açık biçim bilgisidir ve tek başına sır
> değildir, ama öneki izleyen karakterler anahtar malzemesidir ve dokümana
> yazılmamalıdır. Kazıma komutlarında kullanılan arama terimleri de aynı
> gerekçeyle `<anahtar-öneki>` placeholder'ına indirgendi.

**Neden denetim kaçırdı:** arama kalıpları fazla spesifiktir — `sk-ant-api`, `AQ\.<anahtar-öneki>`, `sk_ant`. Gerçek anahtar `AQ.` öneki + **farklı** bir devam olduğu için hiçbir kalıp eşleşmedi. Üstelik bu üç dosyanın hepsi denetimde okunmuştu; `docs/YAYIN_ONCESI_ACIK_MADDELER.md` aynı sayfada hem kısmi anahtar malzemesi taşıyan Secret Manager **adlarını** hem tam anahtarı içeriyordu ve yalnızca adlar fark edilmişti.

**Ders:** sır taraması bilinen kalıplarla değil, **entropi/uzunluk temelli** yapılmalı; ayrıca `.md` dosyaları "dokümantasyon" varsayılıp tarama dışında bırakılmamalı. Bu depoda sırlar koda değil **arşiv notlarına** gömülmüş. Ve bir sırrı *belgeleyen* metin de sır taşıyabilir — bu notun kendisi iki kez aynı hatayı yaptı.

**Alınan önlem:** her iki sır `git filter-branch --tree-filter` ile `239c2fe..HEAD` aralığındaki (43 commit) **tüm** `.md` dosyalarından regex ile kazındı; `<REDACTED-GEMINI-API-KEY>` / `<REDACTED-GCP-SECRET-NAME>` / `<REDACTED-APIFY-TOKEN>` placeholder'larıyla değiştirildi. Doğrulama: kazıma sonrası `git grep <anahtar-öneki> HEAD` ve Apify öneki için aynı tarama **boş**, `git log -S` aralıkta **boş**, `git diff --stat backup/pre-scrub-20260908 HEAD` → **yalnızca 4 dosya / 6 satır** (başka hiçbir içerik değişmedi), 43 commit korundu. Yedek ref'ler (`backup/*` tag'leri ve `refs/original/`) push doğrulandıktan sonra silindi, reflog süresi dolduruldu ve `git gc --prune=now` çalıştırıldı; `.git` 203 MB → 177 MB.

**⚠️ KAZIMA YETMEZ — İPTAL ŞART:** bu iki credential günlerdir yerel depoda, yedeklerde ve olası bulut sync'lerinde duruyordu. Geçmişten silmek **yayınlamayı** engeller, **maruziyeti** kaldırmaz. İkisi de sağlayıcı panelinden iptal edilmeli. Gemini anahtarı için bu, §K4'ün "iptali doğrulanmamış anahtar" maddesinin somut karşılığıdır.

**Olumlu sonuç:** her iki push denemesi de reddedildiği için (GH001 ve GH013) sırlar uzak depoya **hiç ulaşmadı**; başarılı push yalnızca kazınmış tarihi içeriyordu.

---

## 7. Sözleşme testi uyumu

`mobile/src/__tests__/security/firestoreRules.contract.test.ts` kural dosyasının **şeklini** kilitliyor. Yamanın 11 assertion ile uyumu tek tek denetlendi:

| Assertion | Durum |
|---|---|
| Hiçbir kural `\|\| isAuthenticated()` içermemeli | ✅ eklenen hiçbir koşulda yok |
| `if true` olmamalı | ✅ |
| `subscription` → `allow write: if false` | ✅ dokunulmadı |
| Deterministik ilişki dokümanı (`patientId + '__' + caregiverId`, `isActiveCaregiverOf`, `status == 'active'`) | ✅ dokunulmadı |
| `caregiverRelationships` bloğu `caregiverInvites/$(request.resource.data.inviteCode)` literallerini içermeli | ✅ davet yolu **bilinçli olarak inline bırakıldı**, yardımcı fonksiyona taşınmadı |
| `affectedKeys().hasOnly(['caregiverPhone','caregiverFcmToken','caregiverName','updatedAt'])` bulunmalı **ve** `allow update: if isRelationshipParty()` bulunmamalı | ✅ ilişki `update` kuralına dokunulmadı; yeni `hasOnly` davet bloğunda farklı alan listesiyle, regex literali hâlâ eşleşiyor |
| `caregiverInvites` bloğu `allow read:` içermemeli | ✅ yalnızca `allow get` kullanıldı |
| `allow list: if isAuthenticated() && (` birebir korunmalı | ✅ **değiştirilmedi** |
| `config/` tümüyle `if false` | ✅ |
| Dosya deny-all ile bitmeli | ✅ |
| `medicines` / `reminderTimes` → `allow write: if isOwner(userId)` | ✅ dokunulmadı |

**Regex güvenliği:** `inviteBlock` regex'i `\n {4}\}` üzerinde duruyor; yardımcılar blokların **dışına** ve dosyanın üstüne eklendi, blokların içine 4-boşluk girintili kapanış girilmedi → yakalama sınırları kaymadı.

---

## 8. Doğrulama

| Kontrol | Komut | Sonuç |
|---|---|---|
| Yapısal sözleşme kapısı | `npx jest src/__tests__/security/firestoreRules.contract.test.ts --ci` | ✅ **10/10 geçti** |
| Tip güvenliği | `npm run typecheck` (`tsc --noEmit`) | ✅ exit 0 |
| Güvenlik + servis testleri | `npx jest src/__tests__/security src/__tests__/services --ci` | ✅ 28 suite / 364 test, 0 FAIL |
| Tam paket | `npx jest --ci` | ✅ **220 suite / 2291 test**, 0 FAIL |
| Lint | `npm run lint` | ✅ **0 error** / 191 warning |
| Sır taraması | `git log --all -S`, `git grep`, `git show` | ✅ anahtar geçmişte ve HEAD'de yok |

**⚠️ YAPILAMAYAN doğrulama — davranışsal kural testi:**

Kuralların **gerçek davranışı** test edilmedi; yalnızca yapısal kapı ve mevcut birim testleri koşuldu. Nedenleri:

- `java version "1.8.0_503"` — Firebase emülatörleri Java 11+ gerektiriyor.
- `@firebase/rules-unit-testing` kurulu değil.
- `firebase.json`'da `emulators` bloğu yok.
- `firebase deploy --only firestore:rules` paylaşılan altyapıyı değiştirdiği için **izin alınmadan çalıştırılmadı**.

**Deploy öncesi koşulması gereken 6 senaryo:**

1. Hasta kendi `medicineLogs`'unu create/update/delete edebiliyor.
2. Aktif bakıcı `source: 'caregiver_action'` ile create edebiliyor.
3. Aktif bakıcı **`source` olmadan** create edemiyor.
4. Aktif bakıcı mevcut bir logu **update EDEMİYOR** (K3'ün özü).
5. Anonim kimlik `caregiverInvites/{code}` `get` edemiyor; e-posta ile girmiş kullanıcı edebiliyor.
6. `expiresAtMs` geçmişte olan bir davetle ilişki **kurulamıyor**; alanı olmayan eski davetle **kurulabiliyor** (sentinel).

Hazırlık: Java 17 kur → `npm i -D @firebase/rules-unit-testing` → `firebase.json`'a `emulators.firestore` ekle.

---

## 9. Yayın sırası

```
1. ✅ firestore.rules + istemci değişiklikleri (commit aec9144)
2. ✅ sözleşme testi + tam paket yeşil
3. ✅ scripts/ fail-closed gitignore (commit 0452299)
4. ⬜ Emülatörde 6 senaryonun davranışsal doğrulaması (Java 17 gerekir)
5. ⬜ firebase deploy --only firestore:rules   ← PAYLAŞILAN ALTYAPI, izin gerekir
6. ⬜ 🚨 cf_live_ anahtarını İPTAL ET (§6)
7. ⬜ actorUid yayılımını bekle → K3 Faz 2 satırını aç (§4)
8. ⬜ 7 gün sonra inviteNotExpired sentinel dalını kaldır (§5.6)
9. ⬜ Atomik tüketim: writeBatch + getAfter (§5.5)
10. ⬜ Sunucuda ≥128 bit davet kodu + rate-limit'li redeemInvite callable (§5.1-5.3)
11. ⬜ App Check / Play Integrity (§5.7) — yukarıdakilerin çarpanı
```

---

## 10. Google Play "Neler Yeni?" notu

Bu değişiklik **kullanıcıya görünür bir yenilik içermiyor**; bir güvenlik ve veri bütünlüğü düzeltmesi. Yine de mağaza notu gerekiyorsa hasta dilinde:

> 🔒 **Güvenlik ve kayıt güvenliği iyileştirmeleri**
> - Refakatçi davet sistemi güçlendirildi: davetlerin geçerlilik süresi artık cihazdan bağımsız olarak sunucu tarafında da denetleniyor.
> - Doz kayıtlarınızın bütünlüğü koruma altına alındı: refakatçileriniz artık mevcut bir dozu geriye dönük olarak değiştiremez, yalnızca yeni kayıt ekleyebilir.
> - Sağlık verilerinize kimin erişebildiği üzerindeki denetim sıkılaştırıldı.

---

## 11. Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `firestore.rules` | `isNotAnonymous()` + `inviteNotExpired()` yardımcıları; `caregiverInvites.get` ve `.update` sıkılaştırması; `caregiverRelationships.create` dal (2)'ye iki koşul; `medicineLogs` bakıcı yolu append-only |
| `mobile/src/services/caregiverService.ts` | `expiresAtMs` yazımı; `actorUid` yazımı; gereksiz `status:'expired'` yazımı kaldırıldı; kullanılmayan `addDoc`/`writeBatch` importları temizlendi |
| `mobile/src/types/index.ts` | `CaregiverInvite.expiresAtMs?: number` |
| `.gitignore` | kök cihaz-doğrulama artıkları (`/*.png`, `/dump_*.xml`, `/window_dump.xml`) + `scripts/` fail-closed |

---

*Bu kayıt, 2026-09-07 tarihli kapsamlı depo denetiminin (6 kritik / 10 yüksek / 22 orta bulgu) K1, K2 ve K3 maddelerine verilen yanıttır. Denetimin geri kalanı — özellikle çevrimdışı bakıcı bildiriminin kalıcı kaybı (K5), bulut senkronunun yıkıcı silmeleri (Y1/Y2) ve AI klinik tavsiyesinin doğrulanmadan gösterilmesi (K6) — **açık kalmaya devam ediyor**.*
