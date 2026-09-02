# 📋 İlaç Hatırlatıcı — Kapsamlı Keşif Raporu

**Tarama Tarihi:** 2026-08-29
**Taranan Sürüm:** v1.5.5 (APK: `IlacHatirlatici_v1.5.5_release.apk`)
**Aktif Dal:** `fix/critical-issues-and-improvements`
**Tarama Yöntemi:** ZCode (GLM-5.3 Flash) — git geçmişi + kök dizin + dokümantasyon doğrudan incelendi; `mobile/src`, backend/web/firestore.rules ve native/config katmanı için 3 paralel keşif ajanı çalıştırıldı. Salt-okunur keşif — kod değişikliği yapılmadı.

> **Bu dosyanın amacı:** Bir sonraki oturumda (Antigravity veya ZCode) bu rapordan devam edebilmek. Bölüm 7'deki öncelik listesi yapılacak işlerin sıralı planıdır.

---

## 1. Proje Kimliği

| | |
|---|---|
| **Ürün** | İlaç Hatırlatıcı (`com.ilachatirlatici`) — ilaç hatırlatma + bakıcı takibi + AI ilaç arama + premium abonelik |
| **Teknoloji** | React Native 0.81.5 / Expo SDK 54 / React 19, Hermes, `newArchEnabled: false` |
| **Sürüm** | v1.5.5 (mobile/package.json) — ⚠️ sürüm dağınıklığı var, bkz. Bölüm 6 |
| **Bulut** | Firebase projesi `ilachatirlatici-15a71` (Auth, Firestore, FCM, Crashlytics, App Check, Cloud Functions europe-west1) |
| **Hedef kitle** | Türkiye pazarı; kronik hastalar ve yaşlılar (Senior büyük-yazı modu) + bakıcılar |

- Monorepo: `mobile/` (RN uygulaması), `server/` (Express denemesi + gerçek Firebase Functions), `web/` (**ilgisiz** — Antigravity Kit dokümantasyon sitesi, uygulamayla bağlantısı yok).
- Kök `README.md` de ilgisizdir: "Antigravity Kit" şablonuna aittir.
- Git durumu: **çok sayıda commit edilmemiş değişiklik** (`firestore.rules`, `mobile/App.tsx`, `AlarmModule.kt`, `build.gradle`, `package.json` ve ~15 silinmiş `docs/*.md`). Bir sonraki oturum başında `git status` + `git stash list` kontrol edilmeli.

## 2. Boyut ve Mimari

**~105.000 satır TS/TSX, 570 kaynak dosya** (ürün kodu ~79k + testler ~26k).

Mimari: Clean Architecture + **Presenter/Controller** deseni. Her ekran = `XxxScreen.tsx` (salt görünüm) + `useXxxController.ts` (tüm mantık) + `components/` (modüler alt bileşenler). 20 ekranın tamamında tutarlı.

### Envanter

- **20 ekran:** Home, AddMedicine, Medicines, Alarm (tam ekran), Statistics, Interactions, Settings, Security, TtsSettings, NotificationCenter, Permissions, Premium, BarcodeScanner, MedicineProspectus (KÜB), Caregiver, CaregiverInvite, DutyPharmacy, Login, Register, Onboarding.
- **29 servis** (`src/services/`): `firestoreSync` (offline-first, last-write-wins, 500'lük batch), `aiMedicineService` (Gemini/Claude callable), `drugInteraction` (662 satır), `turkishMedicineService` (TİTCK offline DB), `pharmacyService` (nöbetçi eczane + GPS), `pdfReportService`, `backupRestoreService`, `subscriptionService`, `purchaseService` ve en büyüğü `caregiverService` (**1.508 satır**). Bakıcı kümesi: `caregiverNotificationService`, `caregiverLiveAlertService`, `caregiverWatchScheduler` vb.
- **Native katman (~1.700 satır Kotlin, `mobile/android/app/src/main/java/com/ilachatirlatici/`):**
  - `AlarmModule.kt` (614 satır) — AlarmManager exact alarm, full-screen intent, ekran uyandırma/parlaklık, pil optimizasyonu bypass, OEM kalkanları (Xiaomi/Samsung/Huawei otostart yönlendirme), donanım tuşu event'leri.
  - `MainActivity.kt` — alarm intent işleme, parlaklık sıfırlama, kilit ekranı görünürlüğü.
  - `BootReceiver.kt` + `BootTaskService.kt` — cihaz yeniden başladığında HeadlessJS ile alarm'ları yeniden kurar (`src/utils/bootHandler.ts`).
  - `AlarmCheckWorker.kt` — WorkManager periyodik güvenlik ağı.
  - `MedicineWidgetProvider.kt` — ana ekran widget'ları (dokun → doz alındı işaretle), `WidgetDataModule` ile JS köprüsü.
- **State:** Zustand — `stores/medicineStore.ts` (1.700 satır monolit, hâlâ ana kaynak) + paralel `stores/slices/` mimarisi + `medicineStore.combined.ts` facade. **Slice göçi yarıda kalmış** (kod içi yorumlar "riskli" diyor).
- **6 Context:** Auth, Language (TR/EN inline sözlük), Theme, Accent, Alert, Subscription.
- **25 hook:** en büyükler `useSettingsScreen` (726), `useAddMedicine` (601), `useMedicinePersistence` (497); gerçek zamanlı `useCaregiverRealtimeWatcher`, kapılar `useSecurityGate`/`usePermissionsGate`, kurtarma `useBootRecovery`.
- **98 paylaşılan bileşen** + ~130 ekran-yerel bileşen.

## 3. Özellik Envanteri (öne çıkanlar)

- **Alarm motoru:** Notifee + native exact alarm, kilit ekranında uyanma, donanım tuşuyla sessize alma, 6 alarm sesi (`android/app/src/main/res/raw/`), TTS seslendirme, erteleme limiti (`maxSnoozeCount`).
- **Bakıcı sistemi:** 6 haneli kod / QR eşleşme; hasta doz al/bırak → anında bakıcıya FCM (topic `patient_{uid}`, kanal `caregiver-live-alerts-v1`); bakıcıdan hastaya uzaktan hatırlatma (`patient-remote-reminders-v1`); **SOS acil çağrı** (`emergency-sos-v6`, siren `sound_urgent_alert`, DND bypass, tam ekran uyanma).
- **AI:** `geminiSearch` + `claudeSearch` Cloud Functions (onCall) — ilaç arama, prospektüs analizi, onboarding quiz AI analizi.
- **Türkiye'ye özgü:** TİTCK resmi ilaç listesi offline gömülü (`src/assets/data/titck_medicines.json`, ~18.100 ilaç; üretim: `mobile/scripts/importTITCK.js` / `generateTITCKData.js`), nöbetçi eczane, e-Reçete parser (`ereceteParser.ts`), KÜB prospektüs.
- **Klinik güvenlik:** `clinicalSafetyEngine.ts` — gıda-ilaç etkileşimi (greypfrut/süt/alkol), aynı etken madde kalkanı, kaçan doz triyajı.
- **Güvenlik/Gizlilik:** PIN (SHA-256, 10.000 round stretch, 32-byte salt, constant-time karşılaştırma) + biyometrik + otomatik kilit; `healthVaultCrypto.ts` zero-knowledge şifreleme.
- **Diğer:** TR/EN i18n, dark mode, AdMob, PDF doktor raporu, JSON yedekleme/paylaşım, sesli komutla ilaç ekleme, viral paylaşım kutlaması, wheel time picker.

## 4. Backend ve Bulut

Gerçek backend Firebase; **7 Cloud Function** (`server/functions/index.js`, Node 20, europe-west1):

| Function | Tip | Görev |
|---|---|---|
| `geminiSearch` | onCall | Gemini ile ilaç arama/analiz (auth zorunlu) |
| `claudeSearch` | onCall | Claude 3.5 Sonnet ile aynı (auth zorunlu) |
| `health` | onRequest | ⚠️ **Tüm kullanıcıları (ad, e-posta, push token) + bakıcı ilişkilerini döker, CORS açık** — bkz. Bölüm 5 |
| `onMedicineLogCreated` | Firestore trigger | Doz logu → FCM topic `patient_{userId}` |
| `onRemoteReminderCreated` | Firestore trigger | Bakıcı hatırlatması → topic `user_{userId}` |
| `onEmergencyAlertCreated` | Firestore trigger | SOS → hasta cihazı (siren kanalı) |
| `onCaregiverAlertCreated` | Firestore trigger | SOS → bakıcı cihazı |

- `server/src` altındaki Express + Composio sunucusu (port 3001) **üretime girmemiş deneme** — mobil uygulama kullanmıyor.
- CI: `.github/workflows/ci.yml` (lint, typecheck, test, coverage gate, APK/AAB artifact) + `e2e.yml` (Maestro, Android emülatör API 31).

## 5. 🔴 Güvenlik Bulguları (öncelik sırasıyla)

1. **`health` Cloud Function açık ve PII döküyor** — CORS herkese açık; tüm kullanıcıların ad/e-posta/push token'ları + `caregiverRelationships` dökülüyor. Public'a deploy edilmişse **kritik**. Kaldırılmalı veya Admin-credential'a bağlanmalı. (`server/functions/index.js`)
2. **Premium client-trusted** — Abonelik istemciden doğrudan `users/{uid}/subscription/current`'a yazılıyor (`subscriptionService.ts`), sunucu tarafı receipt doğrulaması yok. Herkes kendine premium yazabilir.
3. **Firestore rules zayıf izolasyon** (`firestore.rules`) — Herhangi bir otantik kullanıcı herhangi bir kullanıcının profili/ilaç listesi/log zamanlarını okuyabiliyor; `medicineLogs` create herhangi bir auth kullanıcıya açık (bakıcı onayı için, ama ilişki doğrulaması yok). Bakıcı ilişkisi kural değil, sadece uygulama mantığı.
4. **Hardcoded API key** — `scripts/glm_bridge.js:6` içinde GLM (Z.ai) API key fallback. Rotate edilmeli + depodan silinmeli.
5. **Config hijyeni** — `app.json` içinde gerçek Firebase web API key + OAuth client ID'ler inline; `scripts/importTITCK.js` içinde firebaseConfig gömülü. `tasks/todo.md`'ye göre `.env` git geçmişinde kalmış olabilir → `git filter-repo` temizliği + key rotation hâlâ yapılmemiş görünüyor.
6. **CI script uyumsuzluğu** — CI `test:settings/test:caregiver/test:critical` çağırıyor ama package.json'da yoklar (CLAUDE.md #11); `validate-server` job'ı package.json'da hiç olmayan lint/test scriptlerini çalıştırıyor → sürekli fail.

## 6. Kalite ve Teknik Borç

- **Testler:** 175 test dosyası / ~25.800 satır. Değerli suiteler: `stress10kUsers` (10k kullanıcı / 364k log / 12.800 log-sn), `securityAudit`, `offlineResilience`, `resourceCleanupAudit`. Coverage eşikleri düşük: satır %28 (hedef %60; jest.config.js'de "current −3" stratejisi).
- **Sıfır TODO/FIXME** tüm `src`'de. ~53 dosyada Sprint 4 → Sprint 107 numaralı sprint yorumları (uzun artımlı refactor geçmişi).
- **4 dev dosya (>1000 satır):** `stores/medicineStore.ts` (1.700), `services/caregiverService.ts` (1.508), `screens/CaregiverScreen/components/CaregiverPatientDetailModal.tsx` (1.367), `screens/SettingsScreen/components/AccountDetailsModal.tsx` (1.015).
- **Sürüm dağınıklığı:** package.json **1.5.5** / app.json versionCode **32** / `android/app/build.gradle` versionName **1.5.2**, versionCode **34** / `app.config.json` eski **1.3.2**'de takılı. Çözüm aracı mevcut: `mobile/scripts/sync-version.js` (kaynak: `src/config/version.ts`).
- **Dokümantasyon:** `docs/archive/` 53 kayıt, v1.5.4'e kadar güncel (AGENTS.md protokolü işliyor). ⚠️ `ARCHITECTURE.md` geride: 1.3.2 / 1.623 test diyor (gerçekte 175 dosya). CLAUDE.md güncel.
- **Repo hijyeni:** Kök dizinde ~200 on-device test artefaktı (xiaomi_*/samsung_*/tab_*/v155_* PNG/XML) + **137 MB `xiaomi_log.txt`** + 36 MB `samsung_log.txt`; kök + `mobile/` içinde toplam ~8 release APK (her biri ~74 MB). Arşivlenip temizlenmeli.

## 7. Önerilen Öncelik Sırası (devam planı)

- [ ] **P0-1:** `health` function'ını kaldır veya App Check/credential altına al (`server/functions/index.js`) → deploy.
- [ ] **P0-2:** `scripts/glm_bridge.js` içindeki API key'i rotate et + depodan sil.
- [ ] **P1-1:** `firestore.rules` okuma izolasyonunu `caregiverRelationships`'e bağla (sadece bağlı bakıcılar okuyabilsin) → deploy + rules test.
- [ ] **P1-2:** Abonelik doğrulamasını sunucuya taşı (Play Developer API receipt check; `subscription/*` client yazısına kapanmalı).
- [ ] **P1-3:** Commit edilmemiş çalışan dalı güvene al; PR review/merge akışını düzelt.
- [ ] **P2-1:** `sync-version` çalıştır; sürümleri tekilleştir (package.json ↔ app.json ↔ build.gradle ↔ src/config/version.ts); app.config.json'ı app.json ile birleştirip eskiyi sil.
- [ ] **P2-2:** Kök dizindeki test artefaktları ve büyük log'ları `logs/` veya `docs/archive/artifacts/` altına taşı (veya sil); APK'ları `apk/` dışına da bırakma.
- [ ] **P2-3:** CI script uyumsuzluklarını gider (eksik test scriptleri + validate-server).
- [ ] **P3:** ARCHITECTURE.md'yi v1.5.5'e güncelle; coverage eşiğini kademeli yükselt (todo.md Sprint 7); medicineStore slice göçünü tamamla.

## 8. Hızlı Referans — Kritik Dosya Yolları

| Konu | Yol |
|---|---|
| Ana store | `mobile/src/stores/medicineStore.ts` (+ `slices/`) |
| Alarm pipeline (JS) | `mobile/index.ts`, `mobile/src/utils/notifications/` (13 modül) |
| Alarm pipeline (native) | `mobile/android/.../AlarmModule.kt`, `MainActivity.kt`, `BootReceiver.kt`, `AlarmCheckWorker.kt` |
| Bakıcı sistemi | `mobile/src/services/caregiverService.ts` + `caregiverNotificationService.ts` |
| Cloud Functions | `server/functions/index.js` |
| Güvenlik kuralları | `firestore.rules` (kök) |
| Sürüm kaynağı | `mobile/src/config/version.ts` → `mobile/scripts/sync-version.js` |
| TİTCK veri üretimi | `mobile/scripts/importTITCK.js` → `mobile/src/assets/data/titck_medicines.json` |
| Operasyonel dersler | `tasks/lessons.md`, `docs/SORUN-COZUMLERI.md` |
| Sprint durumu | `tasks/todo.md` (2026-06-25 tarihli, geride) |
