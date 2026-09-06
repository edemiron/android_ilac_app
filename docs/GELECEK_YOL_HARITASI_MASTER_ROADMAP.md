# 🗺️ İlaç Hatırlatıcı — Hakem Heyeti Master Yol Haritası (Product & Architecture Roadmap)

**Hazırlayan:** Çift Hakem Heyeti & Antigravity (Anti Agent)  
- 🧠 **ZCode (GLM-5.3 Flash High):** Birincil Klinik & Android Mimarı  
- 👑 **Claude Opus 5 (High Effort):** Bağımsız Üst Hakem & Baş Denetçi  
- 🛡️ **Anti Agent (Antigravity):** Heyet Koordinatörü, Laboratuvar & Test Mimarı  
**Tarih:** 6 Eylül 2026  
**Mevcut Temel:** `v1.9.2` (Build 69 - 208 test paketi, 2186 test %100 yeşil)  
**Kapsam:** v1.9.3'ten v2.3.0'a kadar tüm fazların mimari, klinik, güvenlik ve test şartnameleri.

---

## 🏛️ 1. Vizyon & Temel Felsefe

İlaç Hatırlatıcı, basit bir saatli alarm uygulamasının ötesine geçerek; **hasta, yaşlı ve kronik hastalar için kesintisiz klinik güvenlik kalkanı, aile bakıcıları için şeffaf refakatçi köprüsü ve hekimler için doğrulanabilir bir sağlık günlüğü** ekosistemine dönüşmektedir.

Bu yol haritası, heyetin üç temel gücünün senteziyle inşa edilmiştir:
1. **ZCode:** Tavizsiz klinik protokoller, TİTCK veri tabanı uyumu, Android çekirdeği (Kernel/RTC/FSI) ve OEM pil savunması.
2. **Claude Opus 5:** Büyük çaplı mimari dayanıklılık (resilience patterns), KVKK/GDPR sıfır sızıntı güvenliği, Direct Boot kriptografisi ve yarış durumu izolasyonu.
3. **Anti Agent (Antigravity):** Kesintisiz regresyon testleri (2100+ Jest testi), Samsung Galaxy Tab S7 FE ve Xiaomi fiziksel laboratuvar doğrulaması ve üretim sürümleme disiplini.

---

## 🧭 2. Stratejik Ufuklar Özeti (Horizon Overview)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ UFUK 1 (v1.9.3 - v1.9.5): YAYIN ÖNCESİ SİSTEM SAĞLAMLAŞTIRMA & SIFIR ZAFİYET (Hardening)         │
│ • Direct Boot (DE Storage Mirror) • Stream Alarm Volume Override • A1 Anahtar Rotasyon Doğrulama │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ UFUK 2 (v2.0.0 - MAJOR): AKILLI KLİNİK EKOSİSTEM & VİTAL KORELASYONU (Clinical Engine & Vitals)  │
│ • Vital Takibi (Tansiyon/Şeker) • TİTCK İlaç-Gıda Matrisi • Acil Durum Tıbbi Kimlik Kartı (ICE) │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ UFUK 3 (v2.1.0): ÇOKLU MODAL AI & SIFIR VERİ GİRİŞİ (Multimodal AI & Automation)                 │
│ • Gemini Vision E-Reçete/Kutu OCR • İnteraktif Kilit Ekranı Widget'ı • WhatsApp Eczane Siparişi  │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ UFUK 4 (v2.2.0 - v2.3.0): ÇOKLU PROFİL, REFAKATÇİ AĞI & EKOSİSTEM (Family & Enterprise)         │
│ • Çoklu Profil / Aile Modu • SGK Kronik Rapor Takipçisi • NFC Kutu Dokun-ve-Al (Tap-to-Log)     │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 3. Detaylı Faz Şartnameleri ve Teknik Görev Dağılımı

---

### 🛡️ UFUK 1: Yayın Öncesi Sistem Sağlamlaştırma (`v1.9.3` - `v1.9.5`)
> **Ana Hedef:** Hakem heyetinin alarm analizinde saptadığı donanımsal ve işletim sistemi sınırlarını en aza indirmek; Android 14/15 ve DirectBoot zafiyetlerini kapatmak.

#### 1. 🔑 Direct Boot Koruması — Device Protected (DE) Storage Aynalama (`v1.9.3`)
* **Problem:** Telefon yeniden başladığında, kullanıcı ilk kez PIN/şifre girene kadar `Credential Encrypted (CE)` depolama (AsyncStorage) kilitlidir; alarmlar yeniden kurulamaz.
* **Mimari Çözüm (ZCode & Claude Opus 5):**
  - Android Kotlin katmanında `context.createDeviceProtectedStorageContext()` kullanılarak cihaz şifrelenmemişken bile okunabilen hafif bir SharedPreferences/JSON aynası (`direct_boot_alarms.json`) oluşturulacak.
  - Her ilaç eklendiğinde/silindiğinde önümüzdeki 48 saatin kritik alarm saatleri DE alanına kopyalanacak.
  - `BootReceiver` cihaz açıldığında (`LOCKED_BOOT_COMPLETED`) JS motorunu beklemeden doğrudan Kotlin içinde DE alanından `AlarmManager.setAlarmClock` çağrılarını kuracak.
* **Sorumlu:** ZCode (Kotlin mimarisi) + Anti Agent (Test & ADB doğrulaması).
* **Kabul Kriteri:** Samsung tablette cihaz yeniden başlatılıp kilit ekranında PIN girilmeden alarmın tam vaktinde çalması.

#### 2. 🔊 Hayati İlaç Ses Seviyesi Kalkanı (Stream Volume Override) (`v1.9.4`)
* **Problem:** Kullanıcı telefonun alarm sesini 0'a çekmişse ekran açılır ancak ses çıkmaz.
* **Mimari Çözüm (ZCode):**
  - İlaç modeline `isLifeCritical: boolean` bayrağı eklenecek.
  - Hayati işaretli ilaçların alarmı çaldığı anda native `AudioManager.setStreamVolume(STREAM_ALARM, ...)` ile ses seviyesi kontrol edilecek; eğer ses <%50 ise güvenli %70 seviyesine yükseltilecek.
  - Alarm kapandığında önceki ses seviyesi aslına döndürülecek.
* **Sorumlu:** ZCode (Audio Manager) + Anti Agent (Unit test & ses testleri).
* **Kabul Kriteri:** Cihaz alarm sesi sıfırken hayati ilacın duyulabilir çalması ve kullanıcıyı uyarması.

#### 3. 🔐 Güvenlik ve Anahtar Rotasyonu Mührü (`v1.9.5`)
* **Açık İşlem:** Google Secret Manager üzerindeki Gemini anahtarının son canlı çağrı doğrulaması ve `docs/YAYIN_ONCESI_ACIK_MADDELER.md` üzerindeki son açık maddelerin kapatılması.
* **Sorumlu:** Claude Opus 5 (Güvenlik denetimi) + Anti Agent (Canlı deploy & API dökümü).

---

### 🩺 UFUK 2: Akıllı Klinik Ekosistem & Vital Takibi (`v2.0.0` — MAJOR)
> **Ana Hedef:** Uygulamanın sadece zaman sayan bir saat olmaktan çıkıp, ilacın vücuttaki etkilerini ve klinik güvenliği takip eden bir tıp asistanına dönüşmesi.

#### 1. 📊 Vital Sağlık Takibi & İlaç Korelasyonu
* **Klinik İhtiyaç (ZCode):** Tansiyon ve şeker ilaçlarının etkinliği, hastanın ölçüm değerleriyle doğrudan ilişkilidir. Doz alındıktan sonraki değerlerin izlenmesi hekime eşsiz bir veri sunar.
* **Mimari:**
  - `VitalLog` modeli: `type` (`blood_pressure`, `blood_glucose`, `heart_rate`, `weight`), `value`, `measuredAt`, `medicineId` (ilişkili ilaç).
  - Doz alındı onayından sonra 1 dokunuşla açılan 3 saniyelik hızlı ölçüm girişi (`QuickVitalModal`).
  - `StatisticsScreen` içine "İlaç Alımı vs Vital Trendi" korelasyon grafiği (Örn: "Amlodipin alındığı günlerde sistolik ortalama 125 mmHg, unutulan günlerde 155 mmHg").
* **Sorumlu:** ZCode (Klinik normlar) + Anti Agent (UI & Charts).

#### 2. 🍎 TİTCK Genişletilmiş İlaç-Gıda Etkileşim Motoru
* **Klinik İhtiyaç (ZCode):** Greyfurt (CYP3A4 blokajı), K Vitamini (Coumadin/Varfarin antagonizmi), Süt/Kalsiyum (Tetrasiklin emilim blokajı), Alkol ve Tuz ikameleri.
* **Mimari:**
  - `foodDrugInteractions.ts` veritabanı 15 majör gıda kategorisine ve 18.000 TİTCK etken maddesine genişletilecek.
  - İlaç eklenirken veya alarm çaldığında görsel etkileşim rozeti ve klinik tavsiye ("Bu ilacı alırken greyfurt suyu tüketmeyiniz") gösterilecek.

#### 3. 🚨 Kilit Ekranı Acil Durum Tıbbi Kimlik Kartı (ICE - In Case of Emergency)
* **Güvenlik & UX (Claude Opus 5):**
  - Acil müdahale ekipleri (112, Paramedik) için hastanın kan grubu, alerjileri, kronik hastalıkları ve acil irtibat kişisini içeren kilit ekranı kısayolu.
  - KVKK Uyarısı: Hassas sağlık verisinin cihaz kilitliyken sadece kullanıcının açık rızasıyla görünür olması için `showMedicalIdOnLockScreen` ayarı.
* **Sorumlu:** Claude Opus 5 (Veri güvenliği & rıza protokolü) + Anti Agent (UI bileşeni).

---

### 🧠 UFUK 3: Çoklu Modal AI & Sıfır Veri Girişi (`v2.1.0` — MINOR)
> **Ana Hedef:** Yaşlı ve hasta kullanıcıların reçete, kutu veya barkod girerken harcadığı zamanı sıfıra indirmek.

#### 1. 📷 Gemini Vision Multimodal E-Reçete & Barkod OCR
* **Mimari:**
  - Hasta e-Reçete ekran görüntüsünü veya ilaç kutusunun fotoğrafını çektiğinde `geminiGenerate` Cloud Function üzerinden yapılandırılmış JSON çıktısı:
    ```json
    {
      "medicines": [
        { "name": "GLIFOR 1000 MG", "dosage": "1 tablet", "frequency": 2, "instructions": "after_meal", "times": ["09:00", "19:00"] }
      ]
    }
    ```
  - Güvenlik: İstemcide `imageCapture.ts` ile bellek denetimi ve MAX 6MB sınırı korunacak.
* **Sorumlu:** Claude Opus 5 (AI JSON şeması & Cloud Functions) + Anti Agent (Kamera & UI onay akışı).

#### 2. 📱 İnteraktif Android Kilit Ekranı & Ana Ekran Widget'ları
* **Native Mimari (ZCode):**
  - `MedicineWidgetProvider.kt` genişletilerek `PendingIntent` ile uygulamayı açmadan doğrudan widget üzerinden "Aldım" veya "15 Dk Ertele" aksiyonu.
  - Sonraki 3 ilacın gerçek zamanlı sayaçla geri sayımı.
* **Sorumlu:** ZCode (Android AppWidget & RemoteViews) + Anti Agent.

#### 3. 💬 Nöbetçi Eczane Tek Dokunuşla WhatsApp Reçete Hattı
* **Özellik:** `DutyPharmacyScreen` üzerindeki nöbetçi eczanelere tek dokunuşla otomatik şablonlu WhatsApp mesajı gönderme (Reçete no, ilaç ismi, stok sorgusu).

---

### 👨‍👩‍👧‍👦 UFUK 4: Çoklu Profil, Refakatçi Ağı & Ekosistem Ölçeği (`v2.2.0` - `v2.3.0`)
> **Ana Hedef:** Tüm ailenin veya bakım evlerindeki birden çok hastanın tek bir cihazdan ya da uzaktan güvenle yönetilebilmesi.

#### 1. 👥 Çoklu Profil Yönetimi (Multi-Profile Support)
* **Mimari (Claude Opus 5):**
  - `activeProfileId` desteği: "Kendim", "Annem", "Babam".
  - Her profilin bağımsız ilaç listesi, bildirim saatleri ve isteğe bağlı Kolay Mod (Senior View) ayarı.
* **Sorumlu:** Claude Opus 5 (Zustand şema izolasyonu) + Anti Agent.

#### 2. 📋 SGK Kronik İlaç Rapor Takipçisi & Randevu Sayacı
* **Klinik İhtiyaç (ZCode):** Kronik hastaların 3 veya 6 aylık SGK sağlık kurulu raporlarının bitiş tarihini takip etme; rapor bitimine 15 gün ve 7 gün kala hekime yönlendiren akıllı bildirimler.

#### 3. 🏷️ NFC Kutusu 'Dokundur-ve-Kaydet' (Tap-to-Log)
* **Donanım Entegrasyonu (Anti Agent):** NTAG213/215 etiketine telefon dokundurulduğunda anında dozu onaylama ve Türkçe sesli bildirim ("Dozunuz kaydedildi").

---

## 🔬 4. Heyet Çalışma ve Doğrulama Protokolü (SOP)

Gelecek her sürümde aşağıdaki **6 Aşamalı Kalite Mührü** zorunludur:

```
[1. Mimari Tasarım]  ──> ZCode (Klinik/Android) + Claude Opus 5 (Güvenlik/Veri Yapısı)
[2. Kodlama & A11y]  ──> Anti Agent (React Native, TypeScript, Kotlin, A11y >= 14pt)
[3. Test Paketi]     ──> 2100+ Jest testi ve 10.000 kullanıcı stres testi (%100 Başarı)
[4. Bağımsız İnceleme] ──> Claude Opus 5 (Derin Kod Denetimi & Zafiyet Taraması)
[5. Release Derleme] ──> SemVer versionCode +1, versionName, assembleRelease APK
[6. Fiziksel Laboratuvar] ──> Samsung Galaxy Tab S7 FE ve Xiaomi cihazlara ADB kurulumu & Logcat kontrolü
```

---

## 📊 5. Sürüm Dağıtım Takvimi

| Hedef Sürüm | Kod Adı | Odak Alanı | Tahmini Kapsam |
| :--- | :--- | :--- | :--- |
| `v1.9.3` | **DirectBoot Sentinel** | Direct Boot DE Storage aynası, ilk kilit öncesi alarm | Sistem Dayanıklılığı |
| `v1.9.4` | **Critical Volume Shield** | Hayati ilaçlarda ses düzeyi zorlaması (%70 taban) | Klinik Güvenlik |
| `v1.9.5` | **Security Seal** | Son sızıntı denetimi, anahtar rotasyon mühürlemesi | Güvenlik / KVKK |
| `v2.0.0` | **Clinical Ecosystem** | Vital takibi, tansiyon/şeker korelasyonu, TİTCK gıda, ICE kartı | Major Klinik Dönüşüm |
| `v2.1.0` | **Multimodal Vision** | Gemini Vision e-reçete OCR, Kilit ekranı interaktif widget | AI & UX Devrimi |
| `v2.2.0` | **Family & Care** | Çoklu profil, SGK kronik rapor sayacı | Çoklu Kullanıcı |
| `v2.3.0` | **Hardware Touch** | NFC Tap-to-log, donanım entegrasyonları | IoT / Donanım |

---
*Bu belge, heyetin oy birliğiyle onaylanmış kalıcı ürün geliştirme anayasasıdır.*
