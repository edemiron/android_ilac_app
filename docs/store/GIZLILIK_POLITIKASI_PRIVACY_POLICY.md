# 🛡️ GİZLİLİK POLİTİKASI (PRIVACY POLICY)

**Son Güncelleme:** 21 Ağustos 2026  
**Uygulama Adı:** İlaç Hatırlatıcı & Takip (Pill Reminder & Medication Tracker)  
**Geliştirici / Veri Sorumlusu:** İlaç Hatırlatıcı Geliştirici Ekibi  
**İletişim:** destek@ilachatirlatici.app  

---

## 1. Giriş ve Genel Bakış
İlaç Hatırlatıcı ("Uygulama"), kullanıcılarımızın kişisel ve sağlık verilerinin gizliliğine en üst düzeyde saygı duyar. Bu Gizlilik Politikası, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK), Avrupa Birliği Genel Veri Koruma Tüzüğü (GDPR) ve Google Play Sağlık Verileri Politikaları ile tam uyumlu olarak hazırlanmıştır.

Uygulamamız **"Önce Yerel Gizlilik" (Local-First Privacy)** mimarisiyle tasarlanmıştır.

---

## 2. Toplanan Veriler ve Kullanım Amaçları

### A. Sağlık ve İlaç Verileri (Kullanıcı Tarafından Girilen)
* **Veri Tipleri:** İlaç adları, dozaj bilgileri, kullanım sıklığı ve saatleri, ilaç alım/atlama kayıtları, atlama nedenleri ve stok miktarları.
* **Kullanım Amacı:** Size zamanında ilaç hatırlatıcı alarmları sunmak, ilaç etkileşim risklerini yerel olarak analiz etmek ve talep ettiğinizde doktorunuz için klinik PDF raporu oluşturmak.
* **Depolama:** Bu veriler varsayılan olarak **yalnızca cihazınızın yerel hafızasında** şifreli/güvenli olarak saklanır. Sunucularımıza veya üçüncü taraflara izniniz olmadan iletilmez.

### B. Kamera ve Fotoğraf Verileri
* **Kullanım Amacı:** İlaç kutusu üzerindeki metinleri (AI OCR) ve barkodları okuyarak formu hızlıca doldurmanızı sağlamak.
* **İşleme:** Kamera anlık olarak kutu üzerindeki metinleri ayrıştırmak için kullanılır. Fotoğraflarınız izniniz dışında harici sunucularda saklanmaz.

### C. Konum Verileri (İsteğe Bağlı)
* **Kullanım Amacı:** Stoğu azalan ilaçlarınız için bulunduğunuz bölgedeki **en yakın nöbetçi eczaneleri** haritada gösterebilmek.
* **İşleme:** Konumunuz yalnızca o anki sorgulama sırasında kullanılır, geçmiş konum kaydı tutulmaz.

---

## 3. Veri Güvenliği ve Kriptografi
* **PIN ve Biyometrik Kilit:** Uygulama içi verilerinize başkalarının erişmesini engellemek için cihazınızın donanımsal anahtarlığında (`SecureStore` / Keychain) SHA-256 ile tuzlanmış (salted) PIN ve Parmak İzi / Yüz Tanıma desteği sunulur.
* **Veri İzolasyonu:** Yedekleme ve senkronizasyon işlemleri sırasında veriler Zod şemalarıyla doğrulanır ve temizlenir.

---

## 4. Üçüncü Taraf Hizmetler
Uygulama, temel işlevlerini yerine getirebilmek için sınırlı ve güvenli altyapı sağlayıcıları kullanabilir:
* **Firebase Crashlytics & Analytics:** Uygulama çökme ve performans raporları (Anonimleştirilmiş cihaz bilgileri).
* **Google Mobile Ads:** Uygulamanın ücretsiz sunulabilmesi için kişiselleştirilmemiş reklam gösterimi (Kullanıcı dilerse Premium abonelikle tamamen kaldırabilir).

---

## 5. Kullanıcı Hakları ve Veri Silme
Kullanıcılarımız diledikleri zaman:
* Uygulama ayarlarından tüm verilerini **JSON olarak dışa aktarabilir (Yedekleme)**,
* Uygulamayı cihazdan kaldırarak veya "Verileri Sıfırla" seçeneğini kullanarak **tüm kayıtlarını anında ve kalıcı olarak silebilir**.

---

## 6. İletişim
Gizlilik politikamız veya verilerinizle ilgili sorularınız için bizimle **destek@ilachatirlatici.app** adresinden iletişime geçebilirsiniz.
