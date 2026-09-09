Sen kıdemli bir Mobil Ürün Yöneticisi ve Büyüme (Growth Marketing) Uzmanısın. 

Aşağıda sana verdiğim **Apify API Token** bilgisini kullanarak Apify REST API üzerinden ilgili aktörleri tetiklemeni, pazar verilerini çekmeni ve bu verileri analiz ederek yapılandırılmış bir rapor sunmanı istiyorum.

### Bağlam ve Proje
* **Ürün:** iOS ve Android için geliştirilen "İlaç ve Tedavi Takip / Hatırlatıcı" (Pill & Medication Reminder) mobil uygulaması.
* **Hedef Rakipler:** Medisafe, MyTherapy, CareClinic, Round Health vb.
* **Apify API Token:** [<REDACTED-APIFY-TOKEN>]
* **Apify MCP Server:**https://mcp.apify.com/

---

### Görev ve Veri Toplama Adımları (Apify Aktörleri)

1. **Mağaza Yorumları ve Ürün Açıkları:**
   * `compass/google-play-scraper` ve `compass/app-store-scraper` aktörlerini çalıştır.
   * Hedef rakiplerin 1, 2 ve 3 yıldızlı olumsuz kullanıcı yorumlarını çek.

2. **Aktif Reklam ve Kreatif Trendleri:**
   * `curious_coder/facebook-ads-library-scraper` ve `clockworks/tiktok-ads-scraper` aktörlerini çalıştır.
   * Arama terimleri: `pill reminder`, `medication tracker`, `ilaç hatırlatıcı`
   * En uzun süredir yayında olan aktif reklamları, video URL'lerini, görsel formatlarını ve metinlerini (copywriting) çek.

---

### Çıktı Formatı ve Analiz Başlıkları

Çekilen ham JSON veri setlerini işleyerek doğrudan şu 5 başlık altında raporla:

1. **Özellik Yol Haritası & Boşluk Analizi (Feature Gap Analysis):**
   * Kullanıcıların olumsuz yorumlarda en çok şikayet ettiği teknik ve işlevsel sorunlar (örn. arka planda çalmayan alarmlar, karmaşık arayüz).
   * Rakiplerde eksik olan ve bizim ürünümüz için fırsat oluşturan 3–5 inovatif özellik önerisi.

2. **Hedef Kitle Segmentasyonu & Acı Noktaları (Pain Points):**
   * Kronik hastalar, bakım verenler (caregivers) ve vitamin/takviye kullanıcıları için demografi, en büyük problem ve ikna edici mesaj açıları.

3. **Tutan Reklam Kreatifleri & Hook Örnekleri:**
   * Çekilen reklamlarda en çok tekrar eden formatlar (UGC, problem-çözüm, ekran kaydı).
   * İzleyiciyi ilk 3 saniyede yakalayan 5 adet kanca (hook) metni.

4. **Satış Hunisi (Funnel) & Monetizasyon:**
   * Rakiplerin onboarding adımları, anket yapıları ve freemium/paywall (abonelik) dönüşüm stratejileri.

5. **Reklam Medya & Metin Arşivi:**
   * Rakiplerin en iyi performans gösteren reklam metinleri, başlıkları ve video senaryo özetleri (tablo halinde).