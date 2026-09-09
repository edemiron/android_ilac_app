# 🏛️ İlaç Hatırlatıcı — Sistem Mimarisi & Teknik Tasarım Dokümanı

**Son Güncelleme:** 2026-08-23  
**Sürüm:** 1.3.2 (Production Release)  
**Mimari Model:** GoF Presenter / Controller Pattern + Clean Layered Architecture  
**Test Durumu:** 152 Test Paketi / 1.623 Test (%100 Başarı) + 10k Kullanıcı Kaos Stres Testi  
**Dağıtım Durumu:** Google Play App Bundle (`.aab`) & Production APK (`.apk`) Hazır  

---

## 📐 1. Mimari Prensipler ve Tasarım Desenleri

Uygulama, çoklu yapay zeka müdahalelerinden ve legacy kod kalıntılarından kaynaklanan monolit "God View" yapıları ortadan kaldırmak amacıyla katmanlı bir mimariye (Clean Architecture) ve **Presenter / Controller Tasarım Deseni**'ne dayanır:

1. **Separation of Concerns (İlgi Alanlarının Ayrımı):**
   * **View (Ekran / Komponent):** Salt görünüm katmanıdır. Doğrudan API/Store çağrıları veya karmaşık filtreleme mantıkları içermez. Sadece Presenter Hook'undan gelen prop'ları render eder.
   * **Presenter / Controller Hook (`use*Controller.ts`):** İş mantığını, veri formatlamasını, Zustand store etkileşimlerini, animasyonları ve yan etkileri yönetir.
   * **Modular Sub-components (`components/*`):** Her ekranın karmaşık kartları ve modal'ları kendi modüler bileşenlerine ayrılmıştır.
2. **Offline-First & Resilience:**
   * Tüm CRUD işlemleri yerel AsyncStorage/Zustand katmanında anında işlenir ve optimistic UI yaklaşımı uygulanır.
   * Ağ bağlantısı koptuğunda işlemler güvenli sıraya alınır; bağlantı sağlandığında `updatedAt` Last-Write-Wins ve 500-batch blokları ile Firestore'a senkronize edilir.
   * Zod şemaları ile buluttan gelen bozuk veya şüpheli veriler izole edilir.
3. **Kriptografik Güvenlik & Donanım İzolasyonu:**
   * PIN kodları 32-byte salt ve **10.000 Round SHA-256 Key Stretching** zinciri ile şifrelenir.
   * Şifreli veriler Android Keystore / iOS Keychain donanımında `expo-secure-store` ile saklanır.
   * Yan kanal (side-channel) saldırılarına karşı `constantTimeEqual` karşılaştırma kullanılır.
   * 5 ardışık başarısız denemede 5 dakika otomatik kilitleme (lockout) devreye girer.

---

## 🗂️ 2. Proje Dizin Yapısı

```
mobile/
├── App.tsx                               # Ana Composition & Provider Layer
├── android/                              # Android Native Projesi (Gradle, Keystore, Proguard)
│   └── app/build/outputs/
│       ├── bundle/release/app-release.aab# Google Play Store Dağıtım Paketi (56.5 MB)
│       └── apk/release/app-release.apk   # Standalone Production APK (70.6 MB)
├── src/
│   ├── components/                       # Paylaşılan Atomik ve Moleküler UI Bileşenleri
│   │   ├── common/                       # ScreenHeader, ClinicalCard, ClinicalButton, SkipReasonModal...
│   │   ├── addMedicine/                  # ScheduleSelector, DrugInteractionWarningBanner, ReminderTimes...
│   │   ├── settings/                     # ProfileHeaderCard, BackupRestoreSection, AppearanceSection...
│   │   └── home/                         # SeniorHomeView, StatsGrid, TimeSlotGrid...
│   ├── contexts/                         # React Context Katmanı (Auth, Theme, Language, Alert)
│   ├── screens/                          # 19 Temel Ekran (Tamamı Presenter Mimarisine Sahip)
│   │   ├── HomeScreen/                   # useHomeController.ts + Modüler Zaman Çizelgesi
│   │   ├── StatisticsScreen/             # useStatisticsController.ts + AdherenceLineChart, MonthCalendarView
│   │   ├── MedicinesScreen/              # useMedicinesController.ts + FilterChipRow, MedicineRow
│   │   ├── AlarmScreen/                  # useAlarmController.ts + Ses, Titreşim, TTS ve Notifee İzolasyonu
│   │   ├── SecurityScreen/               # useSecurityController.ts + PinFormView, AutoLockCard
│   │   ├── CaregiverScreen/              # useCaregiverController.ts + QRModal, PendingInvites
│   │   ├── DutyPharmacyScreen/           # useDutyPharmacyController.ts + GPS, Şehir ve Harita Arama
│   │   ├── TtsSettingsScreen/            # useTtsSettingsController.ts + Ses Seviyesi, Test Okuma
│   │   ├── SettingsScreen/               # useSettingsController.ts + 7 Bölümlü Modüler Ayar Kartları
│   │   ├── PermissionsScreen/            # usePermissionsController.ts + Android 12/14 İzin Rehberleri
│   │   ├── PremiumScreen/                # usePremiumController.ts + IAP Satın Alma & Planlar
│   │   ├── MedicineProspectusScreen/     # useMedicineProspectusController.ts + AI Prospektüs Görünümü
│   │   ├── InteractionsScreen/           # useInteractionsController.ts + Çapraz İlaç Çakışma Kartları
│   │   ├── LoginScreen/                  # useLoginController.ts + Google/Email/Guest Auth
│   │   ├── RegisterScreen/               # useRegisterController.ts + Kayıt Formu
│   │   ├── CaregiverInviteScreen/        # useCaregiverInviteController.ts + 8 Haneli Kod / QR Katılım
│   │   ├── AddMedicineScreen/            # useAddMedicineController.ts + 5 Kartlı Modüler İlaç Formu
│   │   ├── BarcodeScannerScreen/         # useBarcodeScannerController.ts + VisionCamera Entegrasyonu
│   │   └── OnboardingScreen/             # useOnboardingController.ts + Tanıtım Pager & İzin Akışı
│   ├── services/                         # Servis Katmanı
│   │   ├── firestoreSync.ts              # Optimistic Firestore Senkronizasyonu & Çakışma Çözümü
│   │   ├── authService.ts                # Firebase Auth & Google Sign-In
│   │   ├── pharmacyService.ts            # Nöbetçi Eczane GPS & İlçe Arama Servisi
│   │   ├── aiMedicineService.ts          # Gemini AI Prospektüs ve İlaç Analiz Motoru
│   │   ├── drugInteraction.ts            # Çapraz İlaç Etkileşim ve Uyarı Motoru
│   │   ├── backupRestoreService.ts       # JSON Veri Yedekleme ve Geri Yükleme
│   │   ├── pdfReportService.ts           # Doktor PDF Raporu Oluşturma
│   │   └── purchaseService.ts            # In-App Purchase (IAP) ve Abonelik Servisi
│   ├── stores/                           # Zustand Global Durum Yönetimi
│   │   ├── medicineStore.ts              # Ana Store Kompozisyonu
│   │   └── slices/                       # Modular Slices (medicines, logs, snoozes, settings)
│   ├── utils/                            # Yardımcı Araçlar ve Primitifler
│   │   ├── alarmSoundManager.ts          # Native Audio Instance & Memory Leak İzolasyonu
│   │   ├── advancedSpeech.ts             # TTS Motoru ve Tekrar Yöneticisi
│   │   ├── security/pinCrypto.ts         # 10.000 Round SHA-256 & Constant-Time Crypto
│   │   ├── notifications/                # Notifee Bildirim Kanalları ve Alarm Motoru
│   │   ├── timeCalculator.ts             # Doz Saatleri ve Zaman Dilimi Hesaplayıcı
│   │   └── logger.ts                     # Kapsamlı Scoped Loglama
│   └── __tests__/                        # 152 Test Paketi (1.623 Test + 10k Kaos Stres Testi)
└── .github/workflows/
    └── ci.yml                            # GitHub Actions CI/CD (Test, Typecheck, Android Build)
```

---

## 🔄 3. 19 Ekranın Presenter / Controller Dönüşümü

| Ekran | Controller Hook | Modüler Alt Bileşenler | Sorumluluk |
| :--- | :--- | :--- | :--- |
| **`HomeScreen`** | `useHomeController` | `Header`, `SeniorHomeView`, `WeeklyCalendarStrip`, `TimeSlotGrid`, `TimeSlotModal` | Günlük ilaç doz takibi, kıdemli modu, zaman dilimi takibi |
| **`StatisticsScreen`** | `useStatisticsController` | `HeroAdherenceCard`, `SummaryStatGrid`, `AdherenceLineChart`, `MonthCalendarView`, `DoctorReportCard` | Uyum istatistikleri, takvim görünümü, PDF rapor üretimi |
| **`MedicinesScreen`** | `useMedicinesController` | `FilterChipRow`, `MedicineRow`, `SelectionActionBar`, `MedicineEmptyState` | İlaç listeleme, çoklu seçim, arama, filtreleme, stok uyarısı |
| **`AlarmScreen`** | `useAlarmController` | `AlarmActionButtons`, `AlarmHeader`, `MedicineInfoCard` | Tam ekran alarm, ses/titreşim döngüsü, TTS motoru, erteleme |
| **`SecurityScreen`** | `useSecurityController` | `SecurityStatusCard`, `SecurityToggleCard`, `PinFormView`, `AutoLockCard`, `PinManagementCard` | PIN belirleme, biyometrik yetkilendirme, otomatik kilit |
| **`CaregiverScreen`** | `useCaregiverController` | `CaregiverInviteInputCard`, `PendingInvitesList`, `CaregiversList`, `CaregiverQRModal` | Bakıcı yönetimi, QR kod oluşturma, davet listesi |
| **`DutyPharmacyScreen`** | `useDutyPharmacyController` | `CitySelectorBar`, `GpsStatusBanner`, `PharmacySearchBar`, `DutyPharmacyCard` | Nöbetçi eczaneler, GPS konumu, telefon ve yol tarifi |
| **`TtsSettingsScreen`** | `useTtsSettingsController` | `TtsMainToggleCard`, `TtsVolumeCard`, `TtsRepeatCountCard`, `TtsOptionsCard`, `TtsPreviewCard` | Sesli hatırlatıcı ayarları, ses seviyesi, ses önizleme |
| **`SettingsScreen`** | `useSettingsController` | `ProfileSection`, `AccessibilitySection`, `DataSecuritySection`, `NotificationsSection`, `BackupRestoreSection` | Genel ayarlar, tema/dil seçimi, JSON yedekleme |
| **`PermissionsScreen`** | `usePermissionsController` | `PermissionsHeader`, `PermissionsInfoBox`, `PermissionItemRow`, `PermissionsActionButtons` | Alarm, bildirim, pil optimizasyonu, OEM rehberleri |
| **`PremiumScreen`** | `usePremiumController` | `PremiumHeader`, `PremiumFeaturesCard`, `PricingOptionCard`, `PremiumActionButtons`, `PremiumActiveView` | IAP paketleri, üyelik durumu, satın alma/restore |
| **`MedicineProspectusScreen`**| `useMedicineProspectusController`| `ProspectusHeader`, `ProspectusSectionCard`, `ProspectusErrorCard` | Gemini AI destekli prospektüs analizi ve doz rehberi |
| **`InteractionsScreen`** | `useInteractionsController` | `ActiveMedicinesCard`, `InteractionSummaryCard`, `InteractionDetailCard` | Çapraz ilaç etkileşimleri ve ciddiyet dereceleri |
| **`LoginScreen`** | `useLoginController` | `AuthHeader`, `SocialAuthButtons`, `AuthCard` | Firebase Auth, Google Sign-in, Misafir oturumu |
| **`RegisterScreen`** | `useRegisterController` | `AuthHeader`, `RegisterCard`, `SocialAuthButtons` | Yeni kullanıcı kaydı ve şifre validasyonu |
| **`CaregiverInviteScreen`** | `useCaregiverInviteController`| `CaregiverInviteCard`, `QrScannerModal` | Bakıcı davet kodu / QR ile eşleşme |
| **`AddMedicineScreen`** | `useAddMedicineController` | `BasicInfoCard`, `ScheduleSelector`, `ReminderTimes`, `AdvancedSettingsCard`, `DrugInteractionWarningBanner` | 5 kartlı modüler ilaç tanımlama ve etkileşim kontrolü |
| **`BarcodeScannerScreen`** | `useBarcodeScannerController` | `ScannerHeader`, `CameraPreviewView`, `ManualEntryModal` | VisionCamera ile barkod tarama ve manuel giriş |
| **`OnboardingScreen`** | `useOnboardingController` | `OnboardingSlide`, `PaginationDots`, `OnboardingActionButtons` | İlk açılış tanıtımı ve kritik izin akışı |

---

## 🧪 4. Test Stratejisi ve Kalite Metrikleri

* **Birim & Entegrasyon Testleri:** Jest ile 152 test paketi, 1.623 test case (%100 yeşil).
* **Kaos & Stres Testi (`stress10kUsers.test.ts`):** 10.000 sanal kullanıcı, 30.000 ilaç, 364.000 log işleme, **12.800+ log/sn throughput**, **0 çökme**.
* **Kaynak & Bellek Denetimi (`resourceCleanupAudit.test.ts`):** Audio instance release, TTS listener teardown, unmount timer cleanup güvencesi.
* **Kriptografik Güvenlik Denetimi (`securityAudit.test.ts`):** 10.000 round SHA-256 stretching, constant-time equality, SecureStore şifreleme.
* **Offline Dayanıklılık Denetimi (`offlineResilience.test.ts`):** Ağ kesintisi kuyruğu, Zod şema koruması, 500-batch bloklama.

---

## 🚀 5. Sürekli Entegrasyon ve Dağıtım (CI/CD)

GitHub Actions workflow dosyası ([.github/workflows/ci.yml](file:///c:/Users/digienes/Documents/ila_v8_ant/.github/workflows/ci.yml)) ile:
1. **Lint & Format:** ESLint kontrolleri.
2. **Typecheck:** `tsc --noEmit` ile sıfır TypeScript hatası zorunluluğu.
3. **Automated Tests:** Tüm 152 test paketinin çalıştırılması ve coverage gate doğrulaması.
4. **Android Production Build:** Node 20 + Java Temurin JDK 17 ortamında `assembleRelease` (APK) ve `bundleRelease` (Google Play AAB) derlenerek GitHub Artifacts olarak arşivlenmesi.