# 🚀 İlaç Hatırlatıcı — Yeni Özellikler & Geliştirme Yol Haritası (Product Roadmap)

**Tarih:** 2026-08-24  
**Durum:** Planlandı / Uygulamaya Hazır  
**Mevcut Temel:** v1.3.5 (Build 35 - VersionCode 18)  
**Hedef Sürümler:** v1.4.0 (Sağlık & Güvenlik), v1.5.0 (AI & OS Entegrasyonu), v1.6.0 (Çoklu Profil & Ekosistem)

---

## 📌 1. Vizyon & Amaç

Uygulamayı klasik bir "alarm ve bildirim aracı" olmaktan çıkarıp; **hastalar, yaşlılar ve aile bakıcıları için uçtan uca Akıllı Sağlık ve İlaç Güvenliği Ekosistemi** haline getirmek.

---

## 📋 2. Faz Bazlı Geliştirme Planı ve Yapılacaklar Listesi (TODO)

---

### 🩺 FAZ 1: Sağlık, Güvenlik & Eczane Paketi (`v1.4.0`)
> **Hedef:** Kullanıcının günlük sağlık yönetimini güçlendirmek, ilaç-gıda etkileşim risklerini sıfıra indirmek ve acil durumlarda hayat kurtarmak.

#### 1. 🍎 Gıda & Besin İlaç Etkileşim Motoru (Food-Drug Interactions)
- [ ] **Veri Modeli & Servis (`mobile/src/services/drugInteraction.ts`):**
  - [ ] İlaç etken maddelerine göre gıda etkileşim veritabanını genişlet (Greyfurt, Süt/Kalsiyum, Alkol, Kafein, Sarı Kantaron, K Vitamini/Yeşil Yapraklılar, Tuz İkamesi).
  - [ ] Her etkileşim için risk seviyesi (`critical`, `warning`, `info`), mekanizma açıklaması ve klinik öneri tanımlama.
- [ ] **UI & Deneyim:**
  - [ ] `InteractionsScreen` içine "Gıda & Besin Etkileşimleri" sekmesi ekleme.
  - [ ] `AddMedicineScreen` içinde ilaç seçildiğinde kritik gıda uyarısı varsa anlık bilgi banner'ı gösterme.
  - [ ] Prospektüs detay ekranında "Yemek & İçecek ile Kullanım Rehberi" bölümü.
- [ ] **Testler:** Etkileşim eşleştirme algoritması için birim testleri (`drugInteraction.test.ts`).

#### 2. 🚨 Acil Durum Sağlık Kartı (ICE - In Case of Emergency / SOS Medical ID)
- [ ] **Veri Modeli & Depolama (`mobile/src/types/index.ts` & `settingsSlice.ts`):**
  - [ ] `MedicalProfile` modeli: Kan grubu, kronik hastalıklar, alerjiler (ilaç/gıda), acil durum irtibat kişisi (Ad, Telefon, Yakınlık derecesi), organ bağışı durumu.
- [ ] **UI & Ekranlar:**
  - [ ] `MedicalIdScreen` (Yeni Ekran): Temiz, yüksek kontrastlı, acil müdahale ekiplerinin (112 / Doktor) ilk bakışta anlayabileceği medikal kimlik kartı.
  - [ ] Tek dokunuşla 112 / Acil Kişiyi arama butonu.
  - [ ] Ana Ekran (`HomeScreen`) ve Ayarlar (`SettingsScreen`) üzerinden tek tıkla hızlı erişim butonu.
  - [ ] Kilit ekranı bildiriminde veya widget'ında acil durum kartı kısayolu.
- [ ] **Testler:** Veri kaydetme, düzenleme ve acil arama tetikleyicisi testleri.

#### 3. 📊 Vital Takibi & Klinik Korelasyon (Tansiyon, Kan Şekeri, Nabız)
- [ ] **Veri Modeli & Zustand Slice (`mobile/src/stores/slices/vitals.ts`):**
  - [ ] `VitalLog` modeli: `id`, `type` (`blood_pressure`, `blood_glucose`, `heart_rate`, `weight`), `value` (örn. `systolic: 120, diastolic: 80` veya `glucose: 110, condition: 'fasting' | 'post_meal'`), `timestamp`, `medicineId` (ilişkili ilaç).
- [ ] **UI Bileşenleri:**
  - [ ] `QuickVitalModal`: İlaç "Alındı" işaretlendikten sonra veya bağımsız 3 saniyede ölçüm girme penceresi.
  - [ ] `StatisticsScreen` içine Vital Trend Grafiği ve İlaç Alım Korelasyonu sekmesi (Örn: "Tansiyon ilacı alındığı günlerdeki tansiyon ortalaması vs. aksatılan günler").
  - [ ] `pdfReportService.ts` güncellemesi: Doktor PDF raporuna tansiyon/şeker tablosu ve uyum grafiğinin entegre edilmesi.
- [ ] **Testler:** Vital ekleme, filtreleme, ortalama hesaplama ve PDF render testleri.

#### 4. 💬 Nöbetçi Eczaneye Tek Tıkla WhatsApp Sipariş & Reçete Şablonu
- [ ] **Entegrasyon (`mobile/src/services/pharmacyService.ts`):**
  - [ ] Nöbetçi eczanenin telefon numarasını WhatsApp `https://wa.me/{phone}?text={encodedText}` formatına dönüştürme.
  - [ ] Otomatik mesaj şablonu oluşturucu:
    > *"İyi günler [Eczane Adı], İlaç Hatırlatıcı uygulamasından ulaşıyorum. Reçetemdeki [İlaç Adı - Doz] ilacım için stoğunuz var mıdır? Reçete Kodum: [XXX]"*
- [ ] **UI:** `DutyPharmacyScreen` eczane kartlarına `[WhatsApp ile Sor 💬]` butonu.

---

### 🧠 FAZ 2: AI & OS Derin Entegrasyonu (`v1.5.0`)
> **Hedef:** Veri giriş süresini sıfıra indirmek ve kilit ekranı etkileşimini maksimuma çıkarmak.

#### 1. 📷 E-Reçete / e-Nabız AI OCR ile Otomatik İlaç İçe Aktarma
- [ ] **AI İşleme (`mobile/src/services/aiMedicineService.ts` & Cloud Function):**
  - [ ] Gemini Vision ile e-Reçete / e-Nabız ekran görüntüsünden çoklu ilaç, kullanım periyodu (örn: `2x1 sabah-akşam tok`), kutu adedi ve kullanım süresini JSON olarak parse etme.
- [ ] **UI Akışı:**
  - [ ] `ImportPrescriptionScreen`: Fotoğraf/PDF seçimi -> AI Analiz Çubuğu -> Tespit edilen ilaçların onay listesi -> "Tek Tıkla Takvime Ekle".
- [ ] **Testler:** Farklı e-reçete ve e-Nabız formatları ile mock OCR testleri.

#### 2. 📱 Android & iOS İnteraktif Kilit Ekranı Widget'ları (Interactive Widgets)
- [ ] **Native Modül & Entegrasyon:**
  - [ ] Android AppWidgetProvider içine `PendingIntent` ile doğrudan arka planda Store'a erişip ilacı "Alındı" veya "15 Dk Ertele" olarak işaretleme.
  - [ ] Widget arayüzünde sonraki 3 ilacın saat, isim ve renk gösterimi.
- [ ] **Testler:** Widget arka plan tetikleme ve UI senkronizasyon testleri.

#### 3. 🏷️ NFC İlaç Kutusu 'Dokundur-ve-Kaydet' (Tap-to-Log)
- [ ] **NFC Yöneticisi:**
  - [ ] Standart NTAG213/215 etiketlerine ilaç ID'sini yazma ve okuma.
  - [ ] Telefon kutuya yaklaştırıldığında uygulamanın otomatik olarak o ilacın o anki dozunu onaylaması ve sesli "İlacınız başarıyla kaydedildi" anonsu yapması.

---

### 👨‍👩‍👧‍👦 FAZ 3: Çoklu Profil & Sağlık Ekosistemi (`v1.6.0`)
> **Hedef:** Tüm aile bireylerinin tek cihazdan yönetimi ve kurumsal sağlık uyumluluğu.

#### 1. 👥 Çoklu Profil Yönetimi (Multi-Profile Support)
- [ ] **Mimari:** `ProfileSlice` ile `activeProfileId` desteği. Her ilacın, logun ve ayarın ilgili profile bağlanması.
- [ ] **UI:** Üst barda profil avatar seçicisi (Örn: "Ben", "Annem", "Babam", "Çocuğum").
- [ ] Kolay Modun profil bazında açılıp kapanabilmesi (Örn: Anne profili büyük yazılı Kolay Mod, ana profil standart mod).

#### 2. 📋 SGK İlaç Rapor Bitiş & Doktor Randevu Takvimi
- [ ] Kronik ilaçlar için 3 veya 6 aylık SGK sağlık kurulu raporu bitiş tarihi girişi.
- [ ] Rapor bitimine 15 gün ve 7 gün kala özel bildirim ve hatırlatıcı.

---

## 🏗️ 3. Mimari ve Kodlama Standartları

Bu yol haritasındaki tüm geliştirmeler aşağıdaki değişmez standartlara bağlı kalacaktır:

1. **Presenter / Controller Deseni:** Ekran dosyalarında (`*Screen.tsx`) doğrudan iş mantığı yazılmayacak, her ekranın `use*Controller.ts` hook'u ve atomik bileşenleri (`components/`) olacaktır.
2. **Tasarım Sistemi Bileşenleri:** Yeni arayüzlerde `HeroCard`, `StatCard`, `ListSection`, `TopAppBar`, `ClinicalButton`, `ModalSheet` bileşenleri kullanılacaktır.
3. **Zustand & Offline-First:** Tüm sağlık verileri öncelikle cihazda (`AsyncStorage`) tutulacak, internet olduğunda Firebase Firestore ile çift yönlü eşitlenecektir.
4. **Kapsamlı Test Kapsamı:** Eklenen her yeni servis, store slice'ı ve presenter hook'u için Jest/RNTL birim testleri yazılacaktır.

---

## 🎯 4. İlerleme Takibi (Sprint Tracker)

| Faz | Hedef Sürüm | Kapsam | Durum |
| :--- | :--- | :--- | :--- |
| **Faz 1.1** | v1.4.0-alpha1 | Gıda & Besin İlaç Etkileşim Motoru | ⏳ Başlanacak |
| **Faz 1.2** | v1.4.0-alpha2 | Acil Durum Sağlık Kartı (ICE / Medical ID) | ⏳ Sırada |
| **Faz 1.3** | v1.4.0-beta1 | Vital & Tansiyon/Şeker Takip Modülü | ⏳ Sırada |
| **Faz 1.4** | v1.4.0-rc1 | WhatsApp Eczane Sipariş Entegrasyonu | ⏳ Sırada |
| **Faz 2** | v1.5.0 | AI E-Reçete OCR & İnteraktif Widget'lar | ⏳ Planlandı |
| **Faz 3** | v1.6.0 | Çoklu Profil & SGK Rapor Takibi | ⏳ Planlandı |
