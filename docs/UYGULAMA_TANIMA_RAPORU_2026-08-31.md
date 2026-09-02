# 🔍 İlaç Hatırlatıcı — Uygulama Tanıma & Teknik Keşif Raporu

**Tarih:** 2026-08-31
**Yöntem:** Salt-okuma statik keşif (hiçbir kod değiştirilmedi) + `tsc --noEmit` canlı doğrulaması
**Kapsam:** `ila_v8_agy_cmd` monorepo'sunun tamamı (mobile / server / web / android native / docs)

---

## 1. Kimlik Kartı

| Alan | Değer |
| :--- | :--- |
| Ürün | **İlaç Hatırlatıcı** — Türkçe (tr/en) ilaç hatırlatma, bakıcı takibi ve klinik güvenlik uygulaması |
| Platform | Android (öncelikli), iOS yapılandırması mevcut ama pasif |
| Paket adı | `com.ilachatirlatici` |
| Teknoloji | React Native 0.81.5 · React 19.1 · Expo SDK 54 (bare/prebuild, `android/` commit'li) · TypeScript 5.9 |
| Sürüm | `1.6.0` (package.json / app.config.json / src/config/version.ts) |
| Firebase | `ilachatirlatici-15a71` · Functions bölgesi `europe-west1` |
| Min / hedef SDK | minSdk 24 (Android 7+), New Architecture **kapalı** |
| Kod hacmi | `mobile/src`: **580 dosya / ~108.000 satır** TS-TSX · native Kotlin: **11 dosya / 1.884 satır** · **184** test dosyası |
| Aktif branch | `fix/critical-issues-and-improvements` (çok sayıda commit'lenmemiş değişiklik var) |

### Monorepo yapısı
- **`mobile/`** — asıl ürün. RN uygulaması + `android/` native projesi.
- **`server/`** — iki parça: `functions/` (Firebase Cloud Functions, canlı kullanılıyor) ve `src/` (Express + Composio köprüsü, deneysel).
- **`web/`** — ⚠️ uygulamanın web'i **değil**. İçerik `antigravity-kit` dokümantasyon sitesi (Next.js 16). Kök `README.md` ve kök `package.json` da bu template'e ait.

---

## 2. Mimari

### 2.1 Presenter / Controller deseni
Her ekran `screens/<Ekran>Screen/` klasörü + `use<Ekran>Controller.ts` hook'u + modüler `components/` alt bileşenleri şeklinde ayrılmış. View katmanı salt render; iş mantığı controller hook'unda.

**Toplam 20 ekran** (ARCHITECTURE.md 19 diyor — `NotificationCenterScreen` sonradan eklenmiş ve dokümana yansımamış):
Home · Medicines · Statistics · Settings · AddMedicine · Alarm · Interactions · Security · Caregiver · CaregiverInvite · DutyPharmacy · TtsSettings · Permissions · Premium · MedicineProspectus · BarcodeScanner · Onboarding · Login · Register · NotificationCenter

### 2.2 Navigasyon
- `AuthStack` → Login / Register
- `MainTabs` (özel tab bar + ortada yükseltilmiş "+ Ekle" FAB) → Bugün · İlaçlarım · İstatistik · Ayarlar
- `RootStack` → 17 modal/detay ekranı
- `BarcodeScanner` ve `Onboarding` **lazy** yükleniyor (vision-camera açılışı ~5 sn yavaşlattığı için)
- Deep link: `ilachatirlatici://` + `https://ilachatirlatici-15a71.firebaseapp.com/caregiver-invite`

### 2.3 Durum yönetimi
- **Zustand + AsyncStorage persist** (`medicine-storage` anahtarı)
- Slice mimarisi: `slices/medicines · logs · snoozes · settings` + 8 saf yardımcı (`helpers/builders, crud, dateTime, medicineLogs, reschedule, sanitize, snoozes, sync`)
- ⚠️ Geçiş yarım: `medicineStore.ts` hâlâ **1.804 satır** ve depodaki en büyük dosya; yanında `medicineStore.combined.ts` duruyor. Slice'lar tek gerçek kaynağı tam devralmamış.
- Context katmanı: `Auth · Theme · Accent · Language(tr/en) · Subscription · Alert`
- Offline-first: local mutasyon → `firestoreSync` (14 fonksiyon) + `syncQueue` + Zod tabanlı `syncDataValidator`

---

## 3. Uygulamanın kalbi: alarm & bildirim zinciri

Bu, projedeki en olgun ve en çok yatırım yapılmış katman.

**JS tarafı**
- `notifee.createTriggerNotification` + `AlarmManager` `SET_ALARM_CLOCK`, `allowWhileIdle: true`
- `index.ts` (AppRegistry öncesi çalışan giriş noktası):
  - `registerBootTask()` — HeadlessJS boot görevi
  - `messaging().setBackgroundMessageHandler` — uygulama kapalıyken FCM push'u (SOS / bakıcı uyarısı) Notifee ile gösterir, SOS'ta siren + `bypassDnd` + tam ekran + ekran uyandırma
  - `notifee.onBackgroundEvent`:
    - `DELIVERED` → **3 kademeli sahte alarm kalkanı**: (1) alarm daha önce handle edilmiş mi, (2) doz bugün zaten `taken/skipped` loglanmış mı, (3) `pending-alarm` yazıp `AlarmModule.wakeAndOpenApp` (yoksa deeplink fallback)
    - `ACTION_PRESS` → `take` / `skip` / `snooze`; erteleme limiti aşılırsa doz otomatik `skipped` sayılıyor
- `utils/notifications/`: `schedule · channels · listeners · cancel · permissions · behavior · diagnostics · wake · vibration`
- Sessiz saat (quiet hours), kritik ilaç (`isCritical`), stok bilgisi bildirim gövdesinde

**Native (Kotlin) tarafı**
| Dosya | Satır | Rol |
| :--- | :---: | :--- |
| `AlarmModule.kt` | 596 | WakeLock + `setAlarmClock` + keyguard aşımı, ses tuşu ile susturma köprüsü |
| `MedicineWidgetProvider.kt` | 333 | Ana ekran widget'ı (`MEDICINE_TAKEN` aksiyonu dahil) |
| `MainActivity.kt` | 260 | `showWhenLocked` / `turnScreenOn`, tuş olayları |
| `MainApplication.kt` | 169 | Native bildirim kanalları (v4) |
| `AlarmReceiver.kt` | 165 | `com.ilachatirlatici.ALARM_TRIGGER` |
| `BootTaskService.kt` | 110 | `shortService` foreground servis → HeadlessJS |
| `AlarmCheckWorker.kt` | 69 | **15 dakikalık WorkManager watchdog** (alarm yeniden kayıt) |
| `BootReceiver.kt` | 56 | BOOT_COMPLETED · LOCKED_BOOT · TIME_SET · TIMEZONE_CHANGED · MY_PACKAGE_REPLACED |

**OEM kalkanı** — `oemShieldEngine.ts`: samsung · xiaomi · huawei · oppo · vivo · oneplus · pixel için ayrı ayrı otomatik başlatma / pil / popup / exact-alarm rehberleri ve durum tespiti.

**İzinler:** `USE_EXACT_ALARM`, `SCHEDULE_EXACT_ALARM`, `USE_FULL_SCREEN_INTENT`, `SYSTEM_ALERT_WINDOW`, `TURN_SCREEN_ON`, `DISABLE_KEYGUARD`, `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`, `FOREGROUND_SERVICE_SPECIAL_USE`, `RECEIVE_BOOT_COMPLETED`, `POST_NOTIFICATIONS`, `RECORD_AUDIO`, `CAMERA`, konum.

### ⚠️ Bildirim kanalı parçalanması
Kanal kimlikleri **üç ayrı yerde** yönetiliyor ve birbirini takip etmiyor:

| Kaynak | Kanal ID'leri |
| :--- | :--- |
| `utils/notifications/channels.ts` | `CHANNEL_VERSION = 'v7'` + 7 melodi × (vib/novib) = 14 dinamik kanal |
| `src/constants.ts` (`CHANNELS`) | `medicine-alarms-v4`, `medicine-reminders-v4` — `bootHandler`, `persistentNotification`, `index.ts` snooze ve `useSettingsScreen` bunu kullanıyor |
| `MainApplication.kt` (native) | `medicine-alarms-v4`, `medicine-reminders-v4`, `caregiver-live-alerts-v1`, `patient-remote-reminders-v1` |

Bakıcı kanalı tek başına üç farklı ID ile geçiyor: `caregiver-live-alerts-v1` (`caregiverLiveAlertService.ts`), `caregiver-live-alerts-v6` (`index.ts` FCM fallback), `caregiver-live-alerts-v7` (`channels.ts`). Sonuç: aynı olay hangi yoldan geldiğine göre farklı ses/titreşim/DND davranışı gösterebilir ve kullanıcı sistem ayarlarında mükerrer kanal görür.

---

## 4. Klinik & veri katmanı

- **`src/assets/data/titck_medicines.json` — 18.088 gerçek TİTCK kaydı** (5 MB, barkod indeksli; ad, etken madde, ATC kodu, doz, form, üretici, reçete türü, durum). Bundle içinde offline çalışıyor.
- `drugInteraction.ts` (662 satır) — çapraz ilaç etkileşim matrisi; `foodDrugInteractions.ts` — gıda/alkol etkileşimi; `clinicalSafetyEngine.ts` — TİTCK KÜB/KT URL çözümleme.
- **`smartPrescriptionScanner.ts` — 5 katmanlı hibrit reçete okuyucu:** kota/rate-limit (`aiScanRateLimiter`) → cihaz içi PII/KVKK maskeleme (`prescriptionPreprocessService`) → kural tabanlı e-reçete ayrıştırma (`ereceteParser`, 0 maliyet) → yapılandırılmış JSON LLM/VLM → TİTCK fuzzy anti-halüsinasyon doğrulaması (`prescriptionSafetyMatcher`).
- `aiMedicineService.ts` (934 satır) — Gemini; **öncelik Cloud Functions `httpsCallable`, fallback doğrudan REST**.
- Diğer: `pdfReportService` (hekim raporu) · `backupRestoreService` (JSON yedek) · `pharmacyService` (nöbetçi eczane + GPS) · `advancedSpeech`/`react-native-tts` · `widgetService` · `turkishMedicineService` · `titckProspectusService` · barkod (VisionCamera).

---

## 5. Bakıcı / refakatçi & SOS

- `caregiverService.ts` (1.508 satır) + 8 destek servisi (`caregiverLiveAlertService`, `caregiverWatchScheduler`, `caregiverEventHandler`, `patientRemoteReminderService`, `caregiverNotification(Service)`, `caregiverHelpers`, `qrCodeService`).
- Akış: 8 haneli davet kodu / QR → `caregiverInvites` → `caregiverRelationships` → hasta dozu loglandığında `medicineLogs` + `caregiverAlerts`; SOS → `emergencyAlerts`; bakıcıdan hastaya dürtme → `remoteReminders`.
- **Cloud Functions (europe-west1, maxInstances 10):** `geminiSearch` · `claudeSearch` · `health` · `onMedicineLogCreated` · `onRemoteReminderCreated` · `onEmergencyAlertCreated` · `onCaregiverAlertCreated` → FCM ile anında teslim.
- Uygulama içi: `CaregiverEventBridge` + tam ekran `CaregiverFullScreenAlertModal` / `PatientFullScreenReminderModal`.

---

## 6. Monetizasyon

- `subscriptionService.ts` — `free` (2 ilaç, 5 barkod tarama) / `premium` (aylık 49,99 ₺ · yıllık 349,99 ₺ · ömür boyu 499,99 ₺).
- Reklam: `react-native-google-mobile-ads` + tek `AdBanner.tsx`.
- ⚠️ `purchaseService.ts` **gerçek satın alma yapmıyor**: `purchaseProduct` rastgele `tx_...` üretip `success: true` dönüyor, `restorePurchases` sabit `hasActiveSubscription: false` veriyor. `package.json`'da hiçbir faturalama kütüphanesi yok (`react-native-iap` / RevenueCat / Play Billing yok).

---

## 7. Kalite durumu (canlı doğrulama)

### `tsc --noEmit` → **15 hata, çıkış kodu 2**
CI'ın "sıfır TypeScript hatası" kapısı şu an geçilemez durumda. Öne çıkanlar:

1. 🔴 **`services/caregiverNotificationService.ts:251-271`** — `formatCaregiverNotification` içinde **tanımsız `patient` değişkeni 5 kez** kullanılıyor (destructure edilen isim `patientName`). Bu fonksiyon `sendCaregiverNotification` (satır 299) tarafından çağrılıyor; o da `notifyCaregiversAboutMedicineStatus` üzerinden `medicineStore`'un taken/skipped/missed akışlarından tetikleniyor → **çalışma zamanında `ReferenceError`**. Bakıcı push bildirimi bu yoldan gitmiyor (Cloud Functions yolu ayakta olduğu için sorun maskelenmiş olabilir).
   Ek olarak aynı isimde ikinci bir `formatCaregiverNotification` `caregiverHelpers.ts:88`'de var ve `services/index.ts` her ikisini de `export *` ile yayıyor → isim çakışması.
2. 🟠 `components/common/BatchMedicineImportModal.tsx:141` — `handleAddNewItem` **tanımlanmadan önce kullanılıyor** (TS2448/TS2454) ve `:190` `MedicineForm` tipinde `'inhaler'` karşılığı yok.
3. 🟡 `index.ts:113` `bypassDnd` Notifee `NotificationAndroid` tipinde yok · `listeners.ts:170` `notificationId` `NotificationData`'da yok · `backupRestoreService.ts:275` `useInternalStorage` `ShareOptions`'ta yok · `OnboardingQuizStep.tsx:105` `surfaceVariant` yerine `onSurfaceVariant` · 3 test dosyasında tip hatası + eksik `@types/react-test-renderer`.

### Test
- 184 test dosyası; kapsam eşiği `jest.config.js`'te **lines 28 / branches 16 / functions 27** — ARCHITECTURE.md'nin "152 paket / 1.623 test / %100" ve todo.md'nin "~%44" ifadeleriyle uyuşmuyor.
- Bu oturumda test paketi **çalıştırılamadı** (uzaktan bağlı disk üzerinden jest zaman aşımına uğradı); yukarıdaki tespitler statik analiz + typecheck kaynaklı.
- E2E: `.maestro/flows/` (login, add_medicine, alarm, smoke_alarm).

---

## 8. Güvenlik bulguları (öncelik sırasıyla)

### 🔴 P0-1 — Kaynak kodda gömülü AI API anahtarı
`src/services/aiMedicineService.ts:63`
```ts
const DEFAULT_GEMINI_API_KEY = '<REDACTED-GEMINI-API-KEY>...';
```
APK'daki JS bundle'dan çıkarılabilir; kota tükenmesi ve faturalandırma riski. → Anahtarı **iptal/rotate et**, tüm AI çağrılarını yalnızca Cloud Functions üzerinden yap (kod zaten `httpsCallable` yolunu destekliyor), fallback'i kaldır.

### 🔴 P0-2 — Firestore kuralları veri izolasyonunu sağlamıyor
`firestore.rules` içinde neredeyse tüm okuma kuralları `isOwner(userId) || isAuthenticated()`:
```
match /users/{userId}          { allow read: if isOwner(userId) || isAuthenticated(); }
match /users/{userId}/medicines/{id}     { ... aynı ... }
match /users/{userId}/medicineLogs/{id}  { allow create, update: if isOwner(userId) || isAuthenticated(); }
```
Yani **oturum açmış herhangi bir kullanıcı, tüm kullanıcıların profilini, ilaçlarını ve ilaç loglarını okuyabilir/yazabilir**. Bakıcı-hasta ilişkisini doğrulayan hiçbir kural yok (`caregiverRelationships` kontrolü yapılmıyor). `caregiverAlerts` ve `remoteReminders` için `create: if isAuthenticated()` → yabancı biri herkese tam ekran uyarı fırlatabilir.
Ayrıca `match /config/{configId} { allow read: if true; }` → `config/ai` dokümanındaki `geminiApiKey` **kimlik doğrulaması olmadan** okunabilir.
→ Bakıcı yetkisini `get(/databases/.../caregiverRelationships/...)` ile doğrulayan yardımcı fonksiyon yazılmalı; `config` okuması `isAuthenticated()` (tercihen kapalı, anahtar hiç Firestore'da tutulmamalı) olmalı.

### 🔴 P0-3 — Premium bedava alınabilir
`subscription/{id}` kuralı client yazmasına açık, `subscriptionService.upgradeToPremium` doğrudan `setDoc` ile yazıyor ve `purchaseService` sahte transaction dönüyor. CLAUDE.md'de "client `subscription/*`'a yazamaz, backend'den geçmeli" yazıyor ama kural bunu uygulamıyor.
→ Gerçek Play Billing + sunucu tarafı makbuz doğrulaması (Cloud Function) + `subscription` koleksiyonunda `allow write: if false`.

### 🟠 P1-4 — `healthVaultCrypto` kriptografik değil
`utils/healthVaultCrypto.ts` "Sıfır-Bilgi Sağlık Kasası" olarak tanımlanmış ama yaptığı şey **tekrarlayan anahtarla XOR + base64** (Vigenère). KVKK "özel nitelikli sağlık verisi" iddiasını taşımaz.
→ AEAD (AES-256-GCM) kullanan bir kütüphane (`react-native-quick-crypto` vb.) veya veriyi hiç şifreli tutmuyorsa iddiayı dokümandan kaldır.

### 🟡 P1-5 — Mağaza/yapılandırma açıkları
- `app.config.json` → `privacyPolicyUrl: "REPLACE_WITH_ENV_PRIVACY_POLICY_URL"` ve `functionsBaseUrl: "REPLACE_WITH_ENV_FUNCTIONS_BASE_URL"` hâlâ placeholder; gizlilik politikası URL'si Play Store için zorunlu.
- `extra.eas.projectId: "your-eas-project-id"`.
- Firebase `apiKey` commit'li (Firebase için beklenen davranış, ancak CLAUDE.md "placeholder olmalı" diyor → doküman/gerçek uyuşmazlığı). `.env` doğru şekilde `.gitignore`'da.

---

## 9. Sürüm & doküman tutarsızlıkları

| Konu | Gerçek | Dokümanda / diğer yerde |
| :--- | :--- | :--- |
| `versionCode` | `android/app/build.gradle` = **45** | `app.config.json` = 37, `src/config/version.ts` = 37, `app.json` iki farklı yerde 45 ve 37 |
| Sürüm | 1.6.0 (kod, CHANGELOG) | Kökte **v1.7.2'ye kadar APK** var, CHANGELOG 1.6.0'da bitiyor |
| ARCHITECTURE.md | 20 ekran, 184 test dosyası, coverage eşiği %28 | "1.3.2 · 19 ekran · 152 paket / 1.623 test %100" |
| `web/` | antigravity-kit doküman sitesi | "monorepo'nun Next.js web'i" |
| Kök `README.md` / `package.json` | antigravity-kit template'i | proje README'si sanılıyor |
| `tasks/todo.md` | ~108.000 satır kod | "37.662 satır", son güncelleme 2026-06-25 |
| CI script'leri | `test:settings/caregiver/critical` `package.json`'da yok | CI çağırıyor (CLAUDE.md #11 zaten not etmiş) |

**Depo hijyeni:** kökte **20 APK (~1,4 GB)**, `xiaomi_log.txt` **137 MB**, `samsung_log.txt` 36 MB, ~250 PNG ekran görüntüsü, `apk/` klasöründe kopyalar, `short-node-modules/`, zip arşivi. `.gitignore` bunları kapsıyor (git'te izlenen APK/PNG yok) ama çalışma diski ve yedekler şişiyor. `docs/archive/` 83 kayıtla düzenli tutulmuş — bu iyi işleyen taraf.

---

## 10. Özet değerlendirme

**Güçlü yönler**
- Alarm güvenilirliği için gerçekten derin bir yatırım: exact alarm + full-screen intent + boot recovery + 15 dk WorkManager watchdog + OEM'e özel rehberler + native wake modülü. Bu kategoride nadir görülen olgunluk.
- 18.088 kayıtlık offline TİTCK veri tabanı ve reçete okumada anti-halüsinasyon doğrulaması — klinik doğruluk kaygısı ciddiye alınmış.
- Presenter/Controller ayrımı 20 ekranda tutarlı uygulanmış; slice + saf helper yapısı test edilebilir.
- Bakıcı/SOS tarafı hem Firestore listener hem Cloud Functions + FCM ile çift yoldan kurulmuş.

**Acil müdahale gerektirenler**
1. `caregiverNotificationService.ts` içindeki tanımsız `patient` hatası (runtime ReferenceError) ve kalan 14 TS hatası.
2. Gömülü Gemini API anahtarının iptali.
3. Firestore kurallarında veri izolasyonu ve bakıcı yetki doğrulaması.
4. Abonelik doğrulamasının sunucuya taşınması + gerçek Play Billing.

**Orta vadeli borç**
- Bildirim kanalı kimliklerini tek kaynağa indirmek (JS v7 + 14 melodi kanalı / constants v4 / native v4 / caregiver v1-v6-v7).
- `medicineStore.ts`'in slice geçişini bitirip `medicineStore.combined.ts` ikiliğini kapatmak.
- `healthVaultCrypto`'yu gerçek AEAD'e çevirmek ya da iddiayı düzeltmek.
- Doküman-gerçek senkronu (ARCHITECTURE.md, todo.md, kök README, versionCode) ve depo temizliği.

---
*Bu rapor salt-okuma incelemeyle üretilmiştir; hiçbir kaynak dosya değiştirilmemiştir. Tek çalıştırılan komut `tsc --noEmit` (yazma yapmaz).*
