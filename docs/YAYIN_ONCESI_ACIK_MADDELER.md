# Yayın Öncesi Açık Maddeler

**Son güncelleme:** 3 Eylül 2026, 20:15 — v1.8.6 sonrası
**Kaynak:** v1.7.3 denetim raporu + v1.7.4 … v1.8.6 arşiv kayıtları

Bu dosya tek bir soruyu cevaplıyor: **yayına çıkmak için daha ne gerekiyor?**
Her madde ya "sende" ya "kodda". Kod tarafındaki her düzeltme
`docs/archive/` içindeki kendi kaydında gerekçesiyle duruyor; burada yalnızca
durum var.

---

## 🚨 A — YAYINI ENGELLEYEN, SENDE OLAN İŞLER

Bunlar kod tarafında bitti ama **senin bir dış işlem yapmadan çalışmıyor.**

### A1. Sızdırılan API anahtarlarını döndür — ⚠️ SANDIĞIMIZDAN CİDDİ

v1.8.9'da kaynak yeniden incelendi ve bu maddenin **önceki hâli iki yerde
eksikti**: sızıntının yolu yanlış tarif edilmişti ve iki anahtar hiç
listelenmemişti.

#### Sızıntı gerçekte nasıl oldu

Bu madde eskiden "v1.7.4 öncesinde APK'ya gömülü Gemini anahtarı dağıtılmış
**olabilir**" diyordu. Gerçek yol bu değil ve "olabilir" değil:

1. `mobile/scripts/setupAIConfig.js` Gemini anahtarını **Firestore'a**
   yazıyordu: `doc(db, 'config', 'ai')` → alan `geminiApiKey`.
2. `aiMedicineService.ts` (v1.7.4 öncesi) onu oradan **okuyordu**.
3. Ve `firestore.rules` o dokümanı şöyle açıyordu:

   | Sürüm | Kural | Kimler okuyabiliyordu |
   | :--- | :--- | :--- |
   | v1.7.4 **öncesi** | `allow read: if true` | **KİMLİK DOĞRULAMASI YOK** — proje kimliğini bilen herkes |
   | v1.7.4 – v1.8.8 | `allow read: if isAuthenticated()` | kayıt açık olduğu için: uygulamayı kurup üye olan herkes |
   | v1.8.9 (bu tur) | `allow read: if false` | hiç kimse |

Yani anahtar bir APK'nın içinde "belki" değil, **internete açık bir Firestore
dokümanında** duruyordu. APK'nın dağıtılıp dağıtılmaması konuyu değiştirmiyor.
Bu, v1.7.4'te kapatılan `health` fonksiyonu ve v1.8.5'teki FCM topic
sızıntısıyla **aynı sınıf**: erişim kontrolünün hiç bulunmadığı bir kanal.

#### Döndürülecek anahtarların TAM listesi

| Anahtar | Dosya | Aciliyet | Neden |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | `server/functions/.env` **ve** `server/.env` | 🔴 **YÜKSEK** | Firestore `config/ai` üzerinden kimlik doğrulamasız okunabiliyordu |
| `ANTHROPIC_API_KEY` | `server/functions/.env` **ve** `server/.env` | 🟡 orta | Firestore'a hiç yazılmadı; yalnızca sunucuda. Aynı dönemin hijyeni için döndür |
| `RESEND_API_KEY` | `server/.env` | 🟢 düşük | Yalnızca `server/src` Express sunucusunda ve **o sunucu hiçbir yere deploy edilmiyor** (`package.json`da yalnızca `start`/`dev` var) |
| `COMPOSIO_API_KEY` | `server/.env` | 🟢 düşük | Aynı sunucu. **Bu madde eskiden bu anahtarı hiç listelemiyordu** |

> `GEMINI_API_KEY` ve `ANTHROPIC_API_KEY` **iki dosyada birden** duruyor.
> Yalnızca `server/functions/.env`i güncellemek yarım iş olur.

#### Yapılacaklar — sırayla

- [ ] **1. Konsollardan yeni anahtar üret ve ESKİSİNİ SİL/İPTAL ET.**
      Yeni anahtar üretmek eskisini geçersiz kılmaz; eskisini **açıkça iptal
      etmezsen sızan anahtar çalışmaya devam eder.**
      - Gemini → Google AI Studio / Google Cloud Console → API'ler ve Hizmetler → Kimlik Bilgileri
      - Anthropic → console.anthropic.com → API Keys
      - Resend → resend.com → API Keys
      - Composio → Composio panosu → API Keys
- [ ] **2. Yeni değerleri iki `.env` dosyasına da yaz:**
      `server/functions/.env` ve `server/.env`.
- [ ] **3. Firestore'daki eski dokümanı SİL.** Kural kapatıldı ama
      **doküman silinmedi**; `config/ai` hâlâ eski anahtarı taşıyor olabilir.
      Firebase Console → Firestore → `config` koleksiyonu → `ai` dokümanı →
      sil. (Kuralı kapatmak veriyi silmez; ileride biri kuralı gevşetirse
      sızıntı yeniden açılır.)
- [ ] **4. Yeni Firestore kurallarını deploy et** (A2'deki functions deploy
      bunu KAPSAMAZ):
      ```
      firebase deploy --only firestore:rules
      ```
- [ ] **5. Sonra A2** (`firebase deploy --only functions`).
- [ ] **6. Doğrula:** Gemini/Anthropic konsollarında eski anahtarın
      kullanımı **sıfırlanmalı**; yeni anahtarın kullanımı deploy sonrası
      AI aramasını denediğinde artmalı.

İstemcide artık hiçbir anahtar yok (v1.7.4), o yüzden **APK'yı yeniden
derlemek gerekmiyor.**

#### Sıfırdan yapılan kontroller (v1.8.9)

- ✅ Hiçbir `.env` dosyası git geçmişine **hiç** girmemiş
  (`git log --all --diff-filter=A` ile `.env` araması boş).
- ✅ `config/` koleksiyonunu okuyan **kod kalmadı** — bu yüzden kural
  tamamen kapatılabildi. Cloud Functions Admin SDK kullanıyor ve Admin SDK
  kuralları zaten bypass eder, yani `false` sunucuyu etkilemez.
- ⚠️ `config/ai` dokümanının **hâlâ var olup olmadığını doğrulayamadım** —
  Firestore'u okumak için servis hesabı kimliği gerekiyor. Konsoldan bakman
  30 saniye sürer ve 3. adımın cevabı bu.
### A2. Cloud Functions'ı deploy et

```
cd server/functions
npm run deploy
```

Bu tek deploy **üç şeyi** birlikte canlıya alır:

| Ne | Neden zorunlu |
| :--- | :--- |
| A1'deki yeni anahtarlar | AI çağrıları eski anahtarla çalışıyor |
| `deleteMyAccount` (v1.8.4) | Ayarlar'daki "Hesabımı ve Verilerimi Sil" düğmesi **deploy edilmeden hata verir**. Google Play bu yolu zorunlu tutuyor |
| `notify.js` yetki denetimi (v1.8.5) | **Deploy edilmeden FCM topic sızıntısı canlıda açık kalır** — uid'i bilen herkes bir hastanın ilaç bildirimlerini, SOS'ta telefonunu ve konumunu alabilir |

**Sıra önemli:** önce A1 (anahtarları döndür ve `.env`e yaz), sonra A2.

- [ ] Deploy et.
- [ ] Functions günlüklerinde `[notify] onMedicineLogCreated/taken: 1 basarili`
      benzeri bir satır gör (topic yerine token yolunun çalıştığının kanıtı).

### A3. Google Sign-In'i fiilen dene — iki bilinen hata nedeni de ELENDİ

v1.8.7'de cihazda kontrol edildi. Girişin bozulabileceği **iki** bilinen
neden vardı; ikisi de artık elendi:

1. **Yanlış client ID** (v1.8.6'nın düzelttiği kusur) — v1.8.6'da çalışma
   zamanında `Constants.expoConfig.extra.google.webClientId` gerçekten
   çözümlendi ("client ID bulunamadı" hatası çıkmadı).
2. **Kayıtlı olmayan SHA-1** (v1.8.6 kaydının açık bıraktığı şüphe) —
   `apksigner verify --print-certs` ile v1.8.7 APK'sının gerçek imzası
   okundu ve `google-services.json`'daki kayıtla **birebir eşleşti**:

   ```
   APK imza SHA-1                        : badf423c0d30bcf4ee727e8c948a45b6672a5dde
   google-services.json certificate_hash : badf423c0d30bcf4ee727e8c948a45b6672a5dde
   (client_type=1, package com.ilachatirlatici, project 506876057044)
   ```

- [ ] **Sana kalan tek adım (~20 saniye):** çıkış yap → "Google ile devam
      et" → bir hesap seç. Firebase Console → Authentication'da
      sağlayıcısı Google olan yeni bir kullanıcı görünmeli.
      Bunu ben yapmadım çünkü çıkış yapmak **yerel veriyi siliyor**
      (`AuthContext.logout` → `clearAllData()`); bulut eşitlemesi aktif
      olduğu için geri gelmesi gerekir ama gerçek doz geçmişinle bu kumarı
      senin onayın olmadan oynamak doğru olmaz.

### A3b. ⚠️ YENİ RİSK — Play App Signing kullanılıyorsa SHA-1 EKSİK

`google-services.json` içinde **tek bir** Android sertifika hash'i var ve o
da yerel `release.keystore`'a ait. Play Store'a **AAB** yüklersen
(v1.8.1'de `npm run build:aab` eklendi) Google Play, uygulamayı
**kendi anahtarıyla yeniden imzalar**. O zaman kullanıcının cihazındaki
APK'nın SHA-1'i yerel keystore'unkinden FARKLI olur ve:

- Google ile giriş **canlıda** `DEVELOPER_ERROR` verir,
- ama **senin cihazında çalışmaya devam eder** (sen yerel imzalı APK
  kuruyorsun) — yani test ederken göremezsin.

Bu, "bende çalışıyordu" sınıfının klasik örneği.

- [ ] Play Console → **Uygulama imzalama** sayfasından
      **"Uygulama imzalama anahtarı sertifikası"** SHA-1'ini kopyala.
- [ ] Firebase Console → Proje ayarları → uygulaman → **parmak izi ekle**
      olarak o SHA-1'i de ekle (yükleme anahtarınınkinin yanına).
- [ ] Yeni `google-services.json`'ı indirip
      `mobile/android/app/google-services.json` üzerine yaz — sonra
      dosyada **iki** `certificate_hash` görmen gerekir.

> Not: Bu adım APK ile dağıtım yapıyorsan gerekmez. AAB yüklüyorsan
> **zorunlu** ve yayın sonrası fark edilmesi en can sıkıcı kusurlardan biri.
### A4. Hesap silmeyi bir TEST hesabıyla dene — akışın YARISI doğrulandı

v1.8.7'de cihazda doğrulandı (v1.8.7 kurulu, gerçek hesapta, **hiçbir şey
silinmeden**):

- [x] Silme satırı Ayarlar'da var ve modal açılıyor.
- [x] Modal **altı veri kalemini tek tek** sayıyor (KVKK'nın istediği
      "neyin silindiğini somut söylemek"): ilaç listesi + saatler, tüm doz
      geçmişi, reçete + stok, bakıcı ilişkileri + davet kodları, ayarlar,
      giriş hesabı.
- [x] Onay kapısı çalışıyor: alan boşken **"Kalıcı Olarak Sil" düğmesi
      `enabled=false`**.
- [x] **Türkçe noktasız-I tuzağı üretimde doğru** — cihazda iki yönlü
      test edildi:

      | Yazılan | Beklenen | Cihazda |
      | :--- | :--- | :--- |
      | `SIL` (noktasız I) | reddet | düğme `enabled=false` ✅ |
      | `sil` (küçük harf) | kabul et | düğme `enabled=true` ✅ |

      Kod `toUpperCase()` kullansa `'sil'` → `'SIL'` ≠ `'SİL'` olur ve
      "sil" yazan kullanıcı **hiçbir zaman** onaylayamazdı.
      `toLocaleUpperCase('tr-TR')` bunu çözüyor.

**Doğrulanmayan yarısı** ve nedeni: `deleteMyAccount` **canlıda yok**
(`firebase functions:list` çıktısı 10 fonksiyon gösteriyor, bu yok). Yani
düğmeye basmak bugün hiçbir şey silemez, yalnızca hata yolunu çalıştırır
(sunucu başarısız → yerel veri KORUNUR → çıkış YAPILMAZ). O yolu senin
gerçek hesabında ben tetiklemedim: "Kalıcı Olarak Sil" düğmesine basma
kararı bana ait olmamalı.

- [ ] **Deploy'dan SONRA** bir test hesabı aç, birkaç ilaç ekle, bir bakıcı
      bağla, sonra sil. Firebase Console'da kontrol et: `users/{uid}` yok,
      `caregiverRelationships` temiz, Authentication'da kullanıcı yok.
- [ ] Ayrıca **deploy'dan ÖNCE** bir test hesabıyla düğmeye bas: beklenen
      davranış "Hesabınız silinemedi. Verilerinize hâlâ erişebiliyorsunuz."
      mesajı, ilaçların yerinde durması ve oturumun AÇIK kalması.
### A5. KVKK aydınlatma metni

`docs/legal/KVKK_AYDINLATMA_METNI_TASLAK.md` yazıldı ama başında
**"HUKUKİ İNCELEME BEKLİYOR"** notu var ve içinde doldurulmamış alanlar
duruyor:

- [ ] `[ŞİRKET UNVANI]`, `[ŞİRKET ADRESİ]`, `[VERGİ NO]`,
      `[VERİ SORUMLUSU ADI]`, `[İLETİŞİM E-POSTA]`, `[İLETİŞİM TELEFON]`,
      `[KEP ADRESİ]`
- [ ] Saklama süreleri (doz kayıtları için öneri: 5 yıl, tıbbi kayıt teamülü)
- [ ] VERBİS kayıt yükümlülüğü değerlendirmesi
- [ ] KVKK m.9 (yurt dışına aktarım) için taahhütname / yeterlilik kararı yolu
- [ ] Gemini'nin veri saklama politikası ve **fotoğrafın model eğitiminde
      kullanılmadığının** yazılı teyidi
- [ ] Gizlilik politikası URL'si: eski değer `app.config.json`daki
      `REPLACE_WITH_ENV_PRIVACY_POLICY_URL` idi; o dosya v1.8.1'de silindi,
      **yeni bir yer belirlenmedi**

### A6. Cihazda gözle doğrulanacak üç şey — ✅ İKİSİ KAPANDI

v1.8.7'de cihaz kilidi açıldı ve üçü de doğrulandı. Ayrıntı:
[`docs/archive/v1.8.7_…`](./archive/v1.8.7_2026-09-03_20-45_cihazda-dogrulama-emoji-kapisinin-deligi-ve-erisilebilir-ad.md)

- [x] **Bildirim gölgesi** (v1.8.2) — **KAPANDI.** İki bağımsız yolla:
      canlı OS kaydında `actions=2` → `[0] "Aldım"`, `[1] "Ertele"`; ve
      erişilebilirlik ağacında iki `android.widget.Button`
      (`[309,767][800,861]`, `[800,767][1291,861]` — 94 px ≈ 54 dp).
      **Emoji yok, "Atla" yok.** Ayrıca gölgeden "Aldım"a basıldı:
      bildirim kayboldu ve **uyum sayacı değişmedi** (`1 / 2`, `%50`) —
      test alarmı doz kaydı yazmıyor.
- [x] **Yazı boyutu** (v1.8.3) — **KAPANDI (tablet).** Ana ekran, Ayarlar,
      Yeni İlaç Ekle, tam ekran alarm ve bildirim gölgesinde kırpılan metin
      yok. Sürüm satırı `Sürüm 1.8.7` okuyor.
      ⚠️ Yalnızca **tablet** geometrisinde (SM-T733, 1600×2560).
      **Telefonda ayrıca bakılmalı** — makinede ikinci bir cihaz bağlı
      (Xiaomi `24030PN60G`, kablosuz).
- [ ] **Barkod tarayıcı** (v1.8.1) — **YARISI KAPANDI, kalan sende.**
      Yazılım tarafı logcat'ten kanıtlandı: ML Kit modeli APK'da değil
      (`Local module descriptor … not found` — beklenen), Play Services'ten
      indi (`Selected remote version … >= 263234001`),
      `libbarhopper_v3.so` yüklendi, kamera açıldı, kare işleyici kaydoldu.
      **Sana kalan tek adım:** gerçek bir ilaç kutusunun barkodunu okut ve
      TİTCK eşleşmesinin geldiğini gör. Çalışmazsa geri dönüş tek satır:
      `android/gradle.properties` → `VisionCamera_enableCodeScanner=true`
      (8.6 MB geri gelir).

### A7. Uygulama içi emoji — ✅ KARAR VERİLDİ VE UYGULANDI (v1.8.8)

Kullanıcının kararı: **alarm ekranındakiler gitsin, ana ekrandaki dekoratif
emoji kalsın.** v1.8.8'de uygulandı ve cihazda doğrulandı:

- [x] Alarm ekranı: hero `💊` → ikon fontu hap, `✓` → `checkmark-circle`,
      `⏰ 5 dk ertele` → `5 dk ertele`, `🕐 Herhangi bir zaman` → saat ikonu
      + düz metin, `🚨` kaldırıldı (kalkan ikonu mükerrerdi).
- [x] `🧪 TEST ALARMI` bilinçli korundu.
- [x] Ana ekran dokunulmadı (karar bu).

Kalan iki küçük yer (istenirse):

- [ ] Ayarlar → teşhis kartındaki `⏰ Test Alarmı Kuruldu` diyalog başlığı
      (alarm ekranı değil, Ayarlar ekranı — kapsam dışı bırakıldı).
- [ ] Gıda etkileşim rozetleri (`FOOD_INTERACTION_DETAILS.icon`) — o tablo
      İlaç Ekle ekranıyla **paylaşılıyor**, değiştirmek "ana ekran kalsın"
      kararının dışına taşar.
---

## 📋 B — KODDA KALAN İŞLER (fazlara göre)

Yayını doğrudan engellemeyen ama denetim planında duran maddeler.

### Faz 1 (alarm çekirdeği) — 1 madde kaldı

| # | İş | Not |
| :-- | :--- | :--- |
| 9 | notifee + native arasında paylaşılan `alarmInstanceId` | Üç ayrı dedup mekanizmasının yerini alır. Native köprü imzası değişiyor. Alarm yolu şu an **çalışıyor**; bu bir sadeleştirme, düzeltme değil |

### Faz 2 (bulut & senkron) — 4 madde kaldı

| # | İş | Not |
| :-- | :--- | :--- |
| 13b | Tam yükleme yerine artımlı senkron | Şu an her senkronda tüm koleksiyon yazılıyor |
| 14 | Kalıcı giden kutusu (outbox) + NetInfo ile yeniden deneme | Ağ kesildiğinde yazma **sessizce kayboluyor** |
| 15 | Tek Firebase yığını (web SDK'yı bırak) | Uygulama hem `firebase` (web) hem `@react-native-firebase` taşıyor. Web SDK'nın RN'de çevrimdışı kalıcılığı yok ve bundle'ı büyütüyor. **Ama** her senkron yolu ona bağlı: çok günlük bir göç. Yayın sonrasına önerim |
| 16 (kalan) | `caregiverService.ts` içindeki **iki doğrudan Expo Push çağrısı** hâlâ yetki denetimsiz; `users/{uid}` üzerindeki **üç ayrı token alanı** tek alana indirilmedi | v1.8.5 sunucu tetikleyicilerini kapattı, bu iki çağrı istemciden gidiyor |

**Ayrıca iki push sistemi bir arada:** bakıcı yolu Expo Push (`exp.host`)
kullanıyor, sunucu tetikleyicileri doğrudan FCM. İkisini birleştirmek iki
cihazla doğrulama gerektiriyor.

### Faz 3 (arayüz) — 2 madde kaldı

| # | İş | Not |
| :-- | :--- | :--- |
| 21 | Ana ekranda "alarm sağlığı" banner'ı; ilk ilaç kaydında zorunlu izin kontrolü; onboarding sonunda **gerçek 10 sn alarm testi** | Onboarding'de gerçek alarm testi en değerli parçası: kullanıcı ilk günde alarmın çalıp çalmadığını görür |
| 23 | Gerçek i18n (`react-i18next` + ICU), bildirim/native katmanı dahil | Şu an `language === 'tr' ? ... : ...` üçlüleri her dosyada. JSX'te Türkçe literal için lint kuralı da bu maddede |

**Madde 19 (Kolay Mod) BİLİNÇLİ OLARAK AÇILMADI** — gerekçesi v1.8.3
kaydında. Özet: ikinci bir tam arayüz modu test yüzeyini ikiye katlar ve bu
kod tabanı testlerinin davranış yerine şekil sabitlediğini dört kez gösterdi;
varsayılanın tabanını yükseltmek herkese yarıyor.

### Faz 4 (hijyen) — 3 madde kaldı

| # | İş | Not |
| :-- | :--- | :--- |
| 25 | Ölü kod ve barrel temizliği; `knip`, `import/no-cycle`, `no-restricted-imports` | |
| 27 | Type-aware ESLint (`no-floating-promises` = error), `alarm-`/`snooze-` literal kapısı, `NativeModules.AlarmModule` kapısı | Alarm yolunda kaybolan bir promise = sessizce yutulan hata |
| 28 | `server/functions` için **kendi jest yapılandırması** (şu an sunucu testi mobil pakette — bkz. v1.8.5 kaydındaki itiraf); `skip`leri kaldır; `TZ` çift koşu; kapsam %28 → %60 | |

### Ölçülmüş erişilebilirlik birikimi (v1.8.3)

| İş | Miktar |
| :--- | ---: |
| Kritik yol dışı `fontSize` < 14 | ~376 nokta |
| 44dp altı kutu / touchable | 253 kutu, 324 touchable (35'inde `hitSlop`) |
| `numberOfLines={1}` + sabit `height` (sistem yazı ölçeği %130'da kırpma) | 41 + 205 |
| `<ThemedText>` benimsenmesi | 1001 ham `<Text>` |
| CI'da kontrast testi | yok |
| İkon-only dokunulabilirde erişilebilir ad | ✅ **0 kaldı** (v1.8.7'de 50 düzeltildi, kapı kuruldu) |

Hepsi **kilidi açık bir cihazda görsel doğrulama** gerektiriyor.

### Aydınlatma metninde tarif edilmiş ama uygulamada OLMAYAN

- **Rıza ekranı**: ilk açılışta sağlık verisi + yurt dışına aktarım için açık
  rıza, ve AI özellikleri için **ayrı** rıza. Metin bunları anlatıyor,
  uygulamada karşılığı yok.
- **Veri taşınabilirliği** (KVKK m.11 / GDPR m.20): JSON dışa aktarma var
  (`handleExportBackup`) ama "makine okunabilir tam kopya" olduğu
  doğrulanmadı.

---

## ✅ C — BU TURDA KAPANANLAR (v1.8.1 → v1.8.7)

Ayrıntı için ilgili arşiv kaydına bak.

| Sürüm | Ne kapandı |
| :--- | :--- |
| v1.8.7 | **Cihazda doğrulama turu.** Emoji kapısının karakter sınıfı `⏰` (U+23F0) dahil tüm `\u{2300}-\u{23FF}` bloğunu görmüyordu — dört test dosyasındaki dört kopya da aynı deliği taşıyordu; kapı tek kaynağa indi ve `\p{Extended_Pictographic}`e geçti · kapı artık üreticiye değil **notifee'ye giden yüke** bakıyor (`schedule.ts` kendi metnini üretiyor ve eski kapının dışındaydı) · **ikon-only butonların erişilebilir adı yoktu**: 207 ikonlu dokunulabilirden 50'si TalkBack'e `U+F293` gibi ikon-font glifi okutuyordu → 50 → **0**, yeni kapı 0 tolerans · `BootTaskService.onDestroy()` temizlik ağı · A6'nın 2,5 maddesi kapandı |
| v1.8.1 | APK 71 → 57 MB (arm64 43 MB), AAB 46 MB · depodaki **gizli ikinci Expo yapılandırması** (`npx expo config` aylardır 1.6.0 döndürüyordu) · **`android/` klasörünün tamamı `.gitignore`daydı** — temiz bir klon derlenemiyordu ve arşivlenen native düzeltmeler tek makinede yaşıyordu |
| v1.8.2 | Bildirimden **tek dokunuşla, onaysız, gerekçesiz doz atlama** · emoji temizliği (TalkBack) · klinik dil (uygulama emir vermiyor) · bildirim metninin tek kaynağı (başlık iki modül arasında yazılı olmayan bir sözleşmeydi ve zaten bozuktu) |
| v1.8.3 | Erişilebilirlik tabanı ölçüldü ve tek yerde tanımlandı · alarm/doz yolundaki 47 küçük yazı düzeltildi · ESLint + test kapısı · **madde 19 için ürün kararı** |
| v1.8.4 | **Hesap silme yolu hiç yoktu** (Play zorunluluğu) · var olan `deleteAccount()` sağlık verisini ulaşılamaz bırakacaktı · sunucu tarafı `deleteMyAccount` · "Tüm Verileri Sil" satırı **sahteydi**, gerçekleştirildi |
| v1.8.5 | **FCM topic yayını bir veri sızıntısıydı**: uid'i bilen herkes bir hastanın ilaç bildirimlerini, SOS'ta telefonunu ve konumunu alabiliyordu. Gönderim `caregiverRelationships` üzerinden yetki denetimli token yoluna taşındı |
| v1.8.6 | **"Google ile devam et" hiç çalışmıyordu**: client ID başka bir GCP projesine aitti (denetimin "doğrulanamayan şüphe"si doğru çıktı) |

Her sürümde: `tsc` temiz, ESLint 0 hata, tüm testler yeşil, cihazda kurulup
`FATAL 0` / `E/ReactNativeJS 0` doğrulandı. Son durum: **200 suite / 2107
test**.
