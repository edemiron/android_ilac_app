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

### A1. Sızdırılan API anahtarlarını döndür

Gemini, Resend ve Anthropic anahtarları git geçmişine hiç girmedi
(`server/.env` ve `server/functions/.env` `.gitignore:54` ile korunuyor,
doğrulandı) **ama** v1.7.4 öncesinde APK'ya gömülü Gemini anahtarı
dağıtılmış olabilir.

- [ ] Üç anahtarı ilgili konsollardan **döndür** (rotate).
- [ ] Yeni değerleri `server/functions/.env` içine yaz.

İstemcide artık hiçbir anahtar yok (v1.7.4), o yüzden APK'yı yeniden
derlemek gerekmiyor.

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

### A3. Google Sign-In'i fiilen dene

v1.8.6 client ID'yi düzeltti (yanlış GCP projesine gidiyordu). Doğrulaması
sende:

- [ ] Uygulama → giriş ekranı → "Google ile devam et" → bir hesap seç.
- [ ] Firebase Console → Authentication'da sağlayıcısı Google olan yeni bir
      satır belirdi mi?

Hâlâ hata veriyorsa hata metnini paylaş:

| Hata | Anlamı |
| :--- | :--- |
| `audience` içeren mesaj | Client ID hâlâ yanlış |
| `DEVELOPER_ERROR` | **Release keystore'unun SHA-1'i** Google Cloud Console'a kayıtlı değil. Depodan görülemez; `google-services.json`daki `certificate_hash` ile eşleşmesi gerekiyor |

### A4. Hesap silmeyi bir TEST hesabıyla dene

A2'den sonra:

- [ ] Bir test hesabı aç, birkaç ilaç ekle, bir bakıcı bağla.
- [ ] Ayarlar → "Hesabımı ve Verilerimi Sil" → onay kelimesini yaz → sil.
- [ ] Firebase Console'da kontrol et: `users/{uid}` **yok**,
      `caregiverRelationships`te o kişiye ait kayıt **yok**,
      Authentication'da kullanıcı **yok**.

Gerçek bir hesapla denemeyin — geri alınamaz.

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

### A6. Cihazda gözle doğrulanacak üç şey

Test cihazı desen kilitli olduğu için yapamadığım kontroller:

- [ ] **Barkod tarayıcı** (v1.8.1): ML Kit modeli artık APK'da gömülü değil,
      Play Services'ten iniyor. Bir ilaç kutusunun barkodunu okut. İlk
      denemede birkaç saniye gecikme normal. Çalışmazsa geri dönüş tek satır:
      `android/gradle.properties` → `VisionCamera_enableCodeScanner=true`
      (8.6 MB geri gelir).
- [ ] **Bildirim gölgesi** (v1.8.2): bir test alarmı kur. Gölgede **yalnızca
      "Aldım" ve "Ertele"** görünmeli; emoji olmamalı, **"Atla" olmamalı**.
- [ ] **Yazı boyutu** (v1.8.3): ana ekran, zaman dilimi kartları, haftalık
      şerit, alarm ekranı ve atlama gerekçesi modalında **kırpılan metin var
      mı**. 47 punto 14'e çıkarıldı; kırpma riski programatik olarak
      sıfırlandı ama gözle görülmedi.

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

Hepsi **kilidi açık bir cihazda görsel doğrulama** gerektiriyor.

### Aydınlatma metninde tarif edilmiş ama uygulamada OLMAYAN

- **Rıza ekranı**: ilk açılışta sağlık verisi + yurt dışına aktarım için açık
  rıza, ve AI özellikleri için **ayrı** rıza. Metin bunları anlatıyor,
  uygulamada karşılığı yok.
- **Veri taşınabilirliği** (KVKK m.11 / GDPR m.20): JSON dışa aktarma var
  (`handleExportBackup`) ama "makine okunabilir tam kopya" olduğu
  doğrulanmadı.

---

## ✅ C — BU TURDA KAPANANLAR (v1.8.1 → v1.8.6)

Ayrıntı için ilgili arşiv kaydına bak.

| Sürüm | Ne kapandı |
| :--- | :--- |
| v1.8.1 | APK 71 → 57 MB (arm64 43 MB), AAB 46 MB · depodaki **gizli ikinci Expo yapılandırması** (`npx expo config` aylardır 1.6.0 döndürüyordu) · **`android/` klasörünün tamamı `.gitignore`daydı** — temiz bir klon derlenemiyordu ve arşivlenen native düzeltmeler tek makinede yaşıyordu |
| v1.8.2 | Bildirimden **tek dokunuşla, onaysız, gerekçesiz doz atlama** · emoji temizliği (TalkBack) · klinik dil (uygulama emir vermiyor) · bildirim metninin tek kaynağı (başlık iki modül arasında yazılı olmayan bir sözleşmeydi ve zaten bozuktu) |
| v1.8.3 | Erişilebilirlik tabanı ölçüldü ve tek yerde tanımlandı · alarm/doz yolundaki 47 küçük yazı düzeltildi · ESLint + test kapısı · **madde 19 için ürün kararı** |
| v1.8.4 | **Hesap silme yolu hiç yoktu** (Play zorunluluğu) · var olan `deleteAccount()` sağlık verisini ulaşılamaz bırakacaktı · sunucu tarafı `deleteMyAccount` · "Tüm Verileri Sil" satırı **sahteydi**, gerçekleştirildi |
| v1.8.5 | **FCM topic yayını bir veri sızıntısıydı**: uid'i bilen herkes bir hastanın ilaç bildirimlerini, SOS'ta telefonunu ve konumunu alabiliyordu. Gönderim `caregiverRelationships` üzerinden yetki denetimli token yoluna taşındı |
| v1.8.6 | **"Google ile devam et" hiç çalışmıyordu**: client ID başka bir GCP projesine aitti (denetimin "doğrulanamayan şüphe"si doğru çıktı) |

Her sürümde: `tsc` temiz, ESLint 0 hata, tüm testler yeşil, cihazda kurulup
`FATAL 0` / `E/ReactNativeJS 0` doğrulandı. Son durum: **200 suite / 2107
test**.
