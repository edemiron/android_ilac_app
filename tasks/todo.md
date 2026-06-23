# TODO ve Uygulama Durumu

**Tarih:** 2026-06-23
**Oturum:** Kritik+Yüksek öncelikli sorunları çözme (kullanıcı talebi)

---

## ✅ Tamamlanan (FAZ 1-4)

### FAZ 1: Güvenlik Kritik
- [x] **1.1** Üretim API anahtarları temizlendi
  - `mobile/.env` → placeholder değerler
  - `mobile/app.config.json` → REPLACE_WITH_ENV_* placeholder
  - Root `.gitignore` oluşturuldu (silinmişti)
  - **⚠️ Kullanıcı notu:** Firebase Console / Anthropic Console / Google AI Studio'dan gerçek key rotation gerekli
- [x] **1.2** PIN hash iterasyonu düzeltildi
  - `mobile/src/utils/security.ts`: 100 → 10.000 round
  - Constant-time karşılaştırma eklendi (`constantTimeEqual`)
  - Migration path eklendi (`migratePinHashIfNeeded`)
- [x] **1.3** Notification visibility → PRIVATE
  - `mobile/src/utils/notifications.ts`: 8 PUBLIC → PRIVATE (channel + 4 trigger)
- [x] **1.4** BootReceiver exported=false + directBootAware=false
  - `mobile/plugins/withBootReceiver.js`: LOCKED_BOOT_COMPLETED kaldırıldı
- [x] **1.5** PDF HTML escape (XSS)
  - `mobile/src/services/pdfReportService.ts`: `escapeHtml()` + `escapeSvgText()` helper'ları
- [x] **1.6** Firestore rules sıkılaştırıldı
  - `firestore.rules`: regex allowlist, `medicineId` referential integrity

### FAZ 2: Yapısal Mimari
- [x] **2.3** medicineStore selector memoization
  - `useShallow` ile `useActiveMedicines`, `useTodayReminders`, `useLowStockMedicines`
- [ ] **2.1** App.tsx hook'lara böl → **roadmap'e bırakıldı** (büyük refactor riski)
- [ ] **2.2** navigateToAlarm DRY → **roadmap'e bırakıldı** (dependency injection gerekli)

### FAZ 3: Test Coverage
- [x] **3.1** `authValidation` testi eklendi (6 test)
  - `mobile/src/__tests__/utils/authValidation.test.ts`
- [x] **3.2** LoginScreen testi eklendi (3 test)
  - `mobile/src/__tests__/screens/LoginScreen.test.tsx`
- [x] **3.3** Coverage threshold yükseltildi
  - `mobile/jest.config.js`: branches 15→28, lines 20→40, vs.

### FAZ 4: Build & Config
- [x] **4.1** CI build + coverage job eklendi
  - `.github/workflows/ci.yml`: `permissions: contents: read`, `coverage` step, artifact upload
- [x] **4.2** babel-plugin-transform-remove-console eklendi
  - `mobile/babel.config.js`: production için (test'te devre dışı)
- [ ] **4.3** jest testEnvironment jsdom → **roadmap'e bırakıldı** (mevcut testler node ile çalışıyor)

---

## 📊 Doğrulama Sonuçları

### Tests
- **Toplam test:** 511 (önce 502, +9 yeni: authValidation 6 + LoginScreen 3)
- **Pass:** 511 / 511 (%100)
- **Test suite:** 47

### Typecheck
- **Sonuç:** 0 hata ✅

### Lint
- **Errors:** 4 (mevcut, benim değişikliklerimden değil)
  - `useCaregiver.ts:182,211,236` — `no-unsafe-finally` (mevcut sorun)
  - `aiVoiceService.test.ts:61` — `Buffer not defined` (mevcut)
- **Warnings:** 9 (mevcut, `react-hooks/exhaustive-deps`)

### Coverage
- **Lines:** 43.87% → **44.24%** (arttı)
- **Branches:** 31.52% → **31.52%** (aynı)
- **Functions:** 41.47% → **41.47%** (aynı)
- **Statements:** 44.24% → **44.24%** (arttı)

---

## 🗺️ Roadmap'te Kalan (Orta/Düşük Öncelik)

### Mimari Borç
- [ ] **App.tsx parçalama** (1929 satır) — `useBootRecovery`, `useSecurityGate`, `useNotificationBridge` hook'larına böl
- [ ] **medicineStore.ts parçalama** (1951 satır) — slice mimarisi
- [ ] **notifications.ts parçalama** (1492 satır) — channels/scheduler/diagnostics
- [ ] **navigateToAlarm DRY** — `handleIncomingAlarmNavigation` ile App.tsx'i sıfırla

### Performans
- [ ] `getAdherenceRate`/`getCurrentStreak` derived state hook'larına ayır
- [ ] List item component'leri `React.memo` ile sar (HomeScreen, MedicinesScreen)
- [ ] CaregiverNotificationService dynamic → static import

### Dependency Temizliği
- [ ] Unused: `xlsx`, `base-64`, `@types/react-native-vector-icons` kaldır
- [ ] `react-native-html-to-pdf` → `expo-print` migration
- [ ] Duplicate Firebase config (app.json + app.config.json) birleştir
- [ ] 4 ABI → 2 ABI (APK boyutu)
- [ ] `enableBundleCompression=true`

### Test
- [ ] `useAddMedicine` hook testi (AddMedicineScreen testi zaten kapsamlı)
- [ ] `useBarcodeScanner`, `useMedicinePersistence` hook testleri
- [ ] 12 eksik ekran testi (Settings, Permissions, NotificationDiagnostics vb.)
- [ ] `idGenerator`, `defaultSettings`, `syncQueue`, `syncDataValidator` testleri
- [ ] E2E workflow (Maestro/Detox) geri yaz

### E2E / CI
- [ ] Maestro E2E workflow'u geri yaz (silinmiş `e2e.yml` yerine)
- [ ] CI'a release build job (EAS veya gradle bundleRelease)
- [ ] Metro cache CI'da

### Güvenlik (Orta/Düşük)
- [ ] AsyncStorage → SecureStore taşıma (security ayarları, fcmToken, lastCaregiverEmail)
- [ ] MainActivity `keyguardManager.requestDismissKeyguard` kaldır
- [ ] Caregiver invite code 8 karaktere çıkar + expiry
- [ ] Crashlytics userId PII → kaldır veya hash'le
- [ ] `appCheck.ts` debug token prod build kontrolü

### Dokümantasyon
- [ ] Keystore rotasyon prosedürü
- [ ] `.gitignore` değişiklik notu (mobile + root)
- [ ] `app.config.json` `eas.projectId` placeholder → gerçek ID

---

## 📁 Değiştirilen Dosyalar

### Production
- `mobile/.env` (placeholder)
- `mobile/app.config.json` (placeholder)
- `mobile/src/utils/security.ts` (PIN hash)
- `mobile/src/utils/notifications.ts` (visibility)
- `mobile/plugins/withBootReceiver.js` (exported)
- `mobile/src/services/pdfReportService.ts` (escape)
- `firestore.rules` (content validation)
- `mobile/src/stores/medicineStore.ts` (memoization)
- `mobile/babel.config.js` (transform-remove-console)

### Test / Config
- `mobile/jest.config.js` (threshold)
- `mobile/jest.setup.js` (safe-area mock)
- `.github/workflows/ci.yml` (coverage, permissions)
- `.gitignore` (root)

### Yeni Dosyalar
- `mobile/src/__tests__/utils/authValidation.test.ts`
- `mobile/src/__tests__/screens/LoginScreen.test.tsx`