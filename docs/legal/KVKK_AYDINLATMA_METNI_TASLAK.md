> # ⚠️ HUKUKİ İNCELEME BEKLİYOR — YAYIN ÖNCESİ ONAYLANACAK
>
> Bu belge bir **taslaktır** ve avukat incelemesinden geçmemiştir.
> Uygulama Play Store'a çıkmadan önce KVKK/GDPR uyumluluğu açısından
> incelenmeli, `[KÖŞELİ PARANTEZ]` içindeki tüm alanlar doldurulmalıdır.
> Taslağı yazan: Claude (teknik ekip talebiyle), 3 Eylül 2026.

# İlaç Hatırlatıcı — Kişisel Verilerin Korunması Aydınlatma Metni

## 1. Veri Sorumlusu

6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca veri
sorumlusu:

- **Unvan:** [ŞİRKET UNVANI]
- **Adres:** [ŞİRKET ADRESİ]
- **Vergi No / MERSİS:** [VERGİ NO]
- **Veri Sorumlusu Temsilcisi:** [VERİ SORUMLUSU ADI]
- **İletişim:** [İLETİŞİM E-POSTA] · [İLETİŞİM TELEFON]
- **KEP adresi:** [KEP ADRESİ]

> TODO (hukuk): VERBİS kayıt yükümlülüğü değerlendirilecek. Sağlık verisi
> işlendiği için kayıt eşiği düşük olabilir.

## 2. İşlenen Kişisel Veriler

### 2.1 Kimlik ve iletişim verileri
- Ad, soyad (uygulama içinde girdiğiniz profil adı)
- E-posta adresi (hesap oluşturma ve giriş)
- Telefon numarası (yalnızca bakıcı davetinde, sizin girmeniz hâlinde)

### 2.2 Sağlık verileri — ÖZEL NİTELİKLİ KİŞİSEL VERİ
KVKK m.6 uyarınca **özel nitelikli** kişisel veridir:
- İlaç adları, dozları, kullanım talimatları ve tedavi süreleri
- Doz alma kayıtları (aldınız / atladınız / kaçırdınız + atlama nedeni)
- İlaç kutusu / reçete fotoğrafları ve bunlardan çıkarılan metin
- İlaç etkileşim ve yan etki sorgularınız

### 2.3 Cihaz ve kullanım verileri
- Cihaz modeli, işletim sistemi sürümü (alarm güvenilirliği teşhisi için)
- Bildirim izin durumları
- Çökme kayıtları (Firebase Crashlytics)
- Bildirim gönderim kimliği (FCM token)

> **Cihazda kalan, buluta gitmeyen veriler:** uygulama kilidi PIN'inizin
> özeti (hash), biyometrik ayarınız, otomatik kilit süresi. Bunlar
> senkronizasyona **dâhil edilmez** ve yalnızca o cihazda saklanır.
> (Teknik gerekçe: `mobile/src/domain/settingsScope.ts`)

## 3. İşleme Amaçları

| Amaç | Veri |
|---|---|
| İlaç saatinde alarm çalması | ilaç adı, doz saatleri, tedavi süresi |
| Doz geçmişi ve uyum takibi | doz alma kayıtları |
| Hesabın birden fazla cihazda çalışması | tüm ilaç ve kayıt verisi |
| Bakıcı bilgilendirmesi | doz durumu, ilaç adı, profil adı |
| İlaç kutusundan/reçeteden otomatik bilgi çıkarma (yapay zekâ) | fotoğraf |
| İlaç etkileşimi ve genel bilgi sunma (yapay zekâ) | ilaç adları |
| Uygulama kararlılığı ve hata giderme | cihaz ve çökme verileri |

## 4. Hukuki Sebepler

- **Sağlık verileri (özel nitelikli):** KVKK m.6/2 uyarınca **açık rızanız**.
  Uygulamayı kullanmaya başlarken ve yapay zekâ özelliklerini ilk kez
  kullanırken ayrıca rızanız istenir.
- **Kimlik ve iletişim verileri:** sözleşmenin kurulması ve ifası (m.5/2-c).
- **Cihaz ve çökme verileri:** meşru menfaat (m.5/2-f) — uygulamanın alarm
  güvenilirliği doğrudan sağlığınızı etkilediği için.

> TODO (hukuk): meşru menfaat dengeleme testi (LIA) belgelenecek.

## 5. Aktarım ve Yurt Dışına Aktarım

| Alıcı | Ne aktarılır | Nerede işlenir |
|---|---|---|
| Google Firebase (Authentication, Firestore, Storage, Cloud Functions, FCM, Crashlytics) | hesap ve uygulama verisi | [BÖLGE — TODO: europe-west1 doğrulanacak] |
| Google Gemini API (yapay zekâ) | ilaç adı metni, ilaç/reçete fotoğrafı | [BÖLGE — TODO] |
| Bakıcı olarak eklediğiniz kişi | doz durumu, ilaç adı, profil adınız | ilgili kişinin cihazı |

- Yapay zekâ istekleri **doğrudan cihazdan değil**, bizim sunucumuz
  (Cloud Functions, `europe-west1`) üzerinden iletilir.
- Yurt dışına aktarım KVKK m.9 kapsamındadır ve **açık rızanıza** tabidir.

> TODO (hukuk): m.9 için taahhütname / yeterlilik kararı yolu seçilecek;
> Gemini'nin veri saklama politikası ve model eğitiminde kullanım durumu
> yazılı olarak teyit edilecek. **Fotoğrafın model eğitiminde kullanılmadığı
> teyit edilmezse bu özellik yayına çıkmamalıdır.**

## 6. Saklama Süreleri

| Veri | Süre |
|---|---|
| Hesap ve ilaç verisi | hesabınız açık olduğu sürece |
| Doz kayıtları | [SÜRE — TODO: öneri 5 yıl, tıbbi kayıt teamülü] |
| Silme kayıtları (teknik) | 90 gün |
| Çökme kayıtları | [SÜRE — TODO: Crashlytics varsayılanı] |
| Yapay zekâ istekleri | sunucumuzda saklanmaz; sağlayıcı politikası [TODO] |

Hesabınızı sildiğinizde tüm verileriniz **[SÜRE — TODO]** içinde kalıcı
olarak silinir.

## 7. Haklarınız (KVKK m.11)

Veri sorumlusuna başvurarak;
- işlenip işlenmediğini öğrenme, bilgi talep etme,
- amaca uygun kullanılıp kullanılmadığını öğrenme,
- aktarıldığı üçüncü kişileri bilme,
- düzeltilmesini, silinmesini veya yok edilmesini isteme,
- işlemeye itiraz etme,
- zarara uğramanız hâlinde zararın giderilmesini talep etme

haklarına sahipsiniz. Başvurularınızı [İLETİŞİM E-POSTA] adresine
iletebilirsiniz; en geç **30 gün** içinde yanıtlanır.

**Uygulama içinden:** Ayarlar → Hesap → "Hesabımı ve verilerimi sil" ile
tüm verinizi kendiniz silebilirsiniz.

Bu yolla silinenler:

- İlaç listeniz ve hatırlatma saatleriniz
- Tüm doz geçmişiniz (alınan, atlanan, kaçırılan)
- Reçeteleriniz ve stok kayıtlarınız
- Bakıcı ilişkileriniz ve davet kodlarınız
- Uygulama ayarlarınız
- Giriş hesabınız (e-posta / Google bağlantısı)

Silme sunucu tarafında yürütülür ve **geri alınamaz**; bulut yedeğinden
kurtarma yoktur.

> ✅ v1.8.4 (2026-09-03): Bu ekran ve arkasındaki Cloud Function
> (`deleteMyAccount`, `europe-west1`) YAZILDI. Önceki taslakta "henüz YOK"
> notu vardı.
>
> TODO (teknik, YAYIN ÖNCESİ): fonksiyon canlıya **deploy edilmedi**.
> `cd server/functions && npm run deploy` gerekiyor. Deploy edilmeden
> uygulamadaki düğme hata verir — yani bu madde deploy'a kadar hâlâ
> yayın engeli.
>
> TODO (hukuk): yukarıdaki liste sunucudaki silme kapsamıyla birebir
> tutulmalı (bkz. `server/functions/deleteMyAccount.js`). Yeni bir
> koleksiyon eklenirse iki yer birlikte güncellenecek.
>
> (ESKİ NOT, artık geçersiz): bu ekran ve arkasındaki Cloud Function henüz YOK.
> Yayın öncesi zorunlu — bkz. denetim planı Faz 2 madde 17.

## 8. Rıza ve Rızanın Geri Alınması

- Uygulamayı ilk açtığınızda sağlık verilerinin işlenmesine ve yurt dışına
  aktarımına ilişkin açık rızanız istenir.
- Yapay zekâ özelliklerini (fotoğraftan ilaç okuma, etkileşim sorgusu) ilk
  kez kullandığınızda **ayrı** bir rıza istenir.
- Rızanızı Ayarlar → Gizlilik bölümünden her zaman geri alabilirsiniz.
  Rızayı geri almanız, alarm ve doz takibi gibi cihazda çalışan temel
  işlevleri **etkilemez**; yapay zekâ özellikleri devre dışı kalır.

## 9. Çocukların Verileri

Uygulama **18 yaşından küçükler için tasarlanmamıştır**. Bir çocuk adına
ilaç takibi yapıyorsanız, veri sorumlusu sizsiniz ve velisi olarak hukuki
sorumluluk sizdedir.

> TODO (hukuk): ebeveyn/vasi kullanımı için ayrı metin gerekip gerekmediği
> değerlendirilecek.

## 10. Tıbbi Sorumluluk Reddi

Bu uygulama bir **hatırlatma aracıdır**; tıbbi teşhis, tedavi veya tavsiye
sunmaz. Yapay zekâ ile üretilen ilaç bilgileri **genel bilgilendirme**
amaçlıdır ve hekim/eczacı görüşünün yerini almaz. İlacınızla ilgili her
kararı hekiminize veya eczacınıza danışarak alın.

> TODO (hukuk): bu maddenin kullanım koşullarına da taşınması ve uygulama
> içinde ilk açılışta gösterilmesi değerlendirilecek.

---

**Sürüm:** taslak 1 · 3 Eylül 2026
**Durum:** HUKUKİ İNCELEME BEKLİYOR
