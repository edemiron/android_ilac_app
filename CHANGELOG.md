# Changelog

Bu projedeki tüm önemli ve kayda değer değişiklikler bu dosyada belgelenmektedir.

Biçimlendirme standardı [Keep a Changelog](https://keepachangelog.com/tr/1.0.0/) prensiplerine dayanır ve bu proje [Semantic Versioning (SemVer)](https://semver.org/lang/tr/) kurallarına uyar.

---

## [Unreleased]
### Added
- Gelecek sürüm geliştirmeleri ve yol haritası maddeleri.

---

## [1.7.0] - 2026-08-31
### Added
- **14 Günlük Kayar Ufuk Doz Zamanlama Algoritması (`rollingHorizonScheduler.ts`):** iOS 64 bekleyen yerel bildirim sınırını (`MAX_PENDING = 60`) ve Android aşırı alarm bellek şişmesini engelleyen akıllı kayar pencere projeksiyon motoru.
- **Canlı Alarm & Sistem Teşhis Paneli (`AlarmDiagnosticCard.tsx`):** Ayarlar ekranında `USE_EXACT_ALARM` yetkisi, pil tasarrufu muafiyeti, 14 günlük toplam planlanan doz ve bir sonraki alarmın anlık takibi.
- **5 Saniyelik Canlı Alarm Simülasyonu:** Kullanıcının tek dokunuşla kilit ekranı uyanma ve ses tepkisini anında doğrulayabilmesi.

---

## [1.6.2] - 2026-08-31
### Fixed
- **Tablet ve Navigasyon Çubuğu Güvenli Alan Desteği (`ModalSheet` & `ConfirmDialog`):** Samsung One UI Görev Çubuğu (Taskbar) ve 3 tuşlu Android navigasyon barlarının alt modal butonlarının (`Vazgeç`, `Evet, Erken Aldım`) üzerini kapatması engellendi. `useSafeAreaInsets` ile dinamik alt padding uygulandı (`ModalSheet.tsx`, `TimeSlotModal.tsx`).

---

## [1.6.1] - 2026-08-31
### Added
- **Klinik Erken Doz Güvenlik Kalkanı (Early Dose Guard):** İlaç saatine 45 dakikadan fazla olduğunda kazara alımı ve aşırı doz birikmesini engelleyen akıllı zaman kilidi ve klinik onay penceresi (`CurrentDoseCard.tsx`, `TimelineItem.tsx`).
- **Dinamik Açık/Koyu Mod Korumalı Buton Durumları:** 
  - Vakti gelmemiş ilaçlarda sakin, yüksek kontrastlı ve gözü yormayan `⏳ Erken Al` tasarımı (Açık ve Koyu tema uyumlu).
  - Vakti gelen veya geciken ilaçlarda dikkat çeken `✅ Şimdi Al` birincil yeşil butonu.
- **Akıllı Erteleme Filtresi:** Henüz alarmı çalmamış gelecek ilaçlarda kafa karışıklığını önlemek amacıyla `Ertele` butonu otomatik olarak gizlendi.

### Fixed
- **Bildirim Olay Dinleyicisi Düzeltmesi:** `notifee.cancelNotification` fonksiyonu için güvenli opsiyonel zincirleme koruması (`listeners.ts`).
- **Jest Test Paketleri:** 183 test paketi (1828 test) %100 geçecek şekilde güncellendi ve yeni bileşen testleri eklendi (`CurrentDoseCard.test.tsx`, `TimelineItem.test.tsx`).

---

## [1.6.0] - 2026-08-31
### Added
- **100k Ölçekli Hibrit AI Reçete ve İlaç Okuyucu:** 5 katmanlı akıllı reçete okuma mimarisi (`smartPrescriptionScanner.ts`).
- **Cihaz İçi PII ve KVKK Maskeleme:** Reçete fotoğraflarındaki TCKN, ad, soyad ve hekim bilgileri cihazda otomatik maskelenir (`prescriptionPreprocessService.ts`).
- **TİTCK Levenshtein Güvenlik Doğrulayıcısı:** 18.000+ resmi ilaç veri tabanıyla yazım hatalarını düzelten ve gıda etkileşimlerini eşleyen kalkan (`prescriptionSafetyMatcher.ts`).
- **AI Tarama Kotası & Hız Sınırlayıcı:** Ücretsiz kullanıcılar için günlük 5 tarama, Premium için sınırsız kota yöneticisi (`aiScanRateLimiter.ts`).
- **Klinik Hekim PDF Raporu:** Hasta ilaç geçmişi ve uyum grafiğini tek dokunuşla dışa aktaran resmi hekim rapor modülü (`pdfReportService.ts`).
- **Kristal Bildirim Melodisi:** WhatsApp ve mesajlaşma kalitesinde net ve tatlı bildirim sesi (`sound_crystal_bell`, kanal versiyonu `v7`).

### Fixed
- **3 Kademeli Sahte/Gereksiz Alarm Engelleme Kalkanı:** Günlük tüm dozlar alındığında arka plan veya sistem kaynaklı zamansız alarmların çalması tamamen engellendi (`index.ts`, `App.tsx`, `useAlarmController.ts`).
- **Bildirim Metni Temizliği:** Kayan bildirim gövdesinde ham enum kodu olan `any_time` metninin görünmesi engellendi, Türkçe açıklamalar standardize edildi (`schedule.ts`).
- **Anında Bildirim Kapatma:** Bildirim üzerindeki '✅ Aldım' veya '❌ Atla' butonuna basıldığı anda bildirimin durum çubuğundan anında silinmesi sağlandı (`listeners.ts`, `App.tsx`, `index.ts`).

### Security
- **6 Vektörlü Güvenlik ve Penetrasyon Denetimi:** XSS, SQLi/NoSQLi, ReDoS, KVKK/HIPAA, Şifreli Kasa (`healthVaultCrypto`) ve Android Network Security onaylandı.

---

## [1.5.0] - 2026-08-25
### Added
- **Refakatçi & Bakıcı Canlı Takip Modülü:** Firestore üzerinden anlık ilaç alma/atlama bildirimleri ve FCM High Priority uyarıları.
- **Acil Durum (SOS) ve Panik Butonu:** Yakınlara anında konum ve acil durum bildirimi fırlatan kalkan.
- **Doze Mode & Samsung/Xiaomi Pil Koruma Kalkanı:** Android 14/15 `USE_EXACT_ALARM` ve kilit ekranı tam ekran uyandırma entegrasyonu.

### Changed
- Ana ekran kart tasarımları ve günlük doz ilerleme çubuğu modernleştirildi.
- Alarm melodileri için 6 farklı frekans ayarlı stüdyo sesi eklendi.

### Security
- Biyometrik (Parmak İzi / Yüz Tanıma) ve 6 Haneli PIN Kodu güvenlik kapısı (`useSecurityGate.ts`).
