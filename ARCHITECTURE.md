# İlaç Hatırlatıcı - Mimari Dokümanı

**Son güncelleme:** 2026-06-25  
**Versiyon:** 1.3.2 (PR #1 sonrası)

---

## Proje Yapısı

```
mobile/
├── App.tsx                          # Ana composition layer (~1210 satır, Sprint 2 sonrası)
├── android/                         # Android native
├── src/
│   ├── components/                  # Paylaşılan UI bileşenleri
│   │   ├── addMedicine/              # İlaç ekleme form bileşenleri
│   │   ├── barcodeScanner/          # Barkod tarayıcı bileşenleri
│   │   ├── settings/                # Ayar ekranı bileşenleri
│   │   └── common/                  # CustomAlert, ErrorBoundary, vs.
│   ├── contexts/                    # React context'leri
│   │   ├── AuthContext              # Firebase Auth
│   │   ├── ThemeContext             # Açık/koyu tema
│   │   ├── LanguageContext          # tr/en çeviri
│   │   ├── SubscriptionContext      # Premium abonelik
│   │   └── AlertContext             # Custom alert
│   ├── hooks/                       # Custom React hook'ları (Sprint 2 sonrası)
│   │   ├── usePermissionsGate       # İzin ekranı yönetimi
│   │   ├── useSecurityGate          # PIN/biometric auth gate
│   │   ├── useBootRecovery          # Startup notification cleanup
│   │   ├── useAlarmQueue            # Pending alarm state
│   │   ├── useAddMedicine           # İlaç ekleme logic
│   │   ├── useBarcodeScanner        # Kamera + barkod tarama
│   │   ├── useCaregiver             # Bakıcı yönetimi
│   │   ├── useMedicinePersistence   # Snapshot + sync
│   │   ├── useSettingsScreen        # Ayar ekranı logic
│   │   ├── useAppVersion            # Uygulama versiyonu
│   │   └── useDebounce              # Debounce helper
│   ├── screens/                     # Tam ekran bileşenleri
│   ├── services/                    # Firebase + native service'ler
│   │   ├── authService              # Firebase Auth wrapper
│   │   ├── firestoreSync            # Firestore senkronizasyon
│   │   ├── caregiverService         # Bakıcı ilişkileri
│   │   ├── caregiverNotificationService  # Bakıcı push notifications
│   │   ├── patientNotificationService    # Hasta push notifications
│   │   ├── subscriptionService      # Premium abonelik
│   │   ├── widgetService            # Native widget sync
│   │   ├── pdfReportService         # PDF rapor oluşturma
│   │   └── medicineSearchOrchestrator  # İlaç arama
│   ├── stores/
│   │   └── medicineStore.ts         # Zustand store (1947 satır, Sprint 4'te slice)
│   ├── types/                       # TypeScript type tanımları
│   └── utils/                       # Pure utility fonksiyonlar
│       ├── notifications.ts          # Notifee wrapper (1748 satır, Sprint 3'te modüler)
│       ├── notifications/
│       │   └── channels.ts          # Channel setup (Sprint 3)
│       ├── security.ts              # PIN + biometric (SecureStore)
│       ├── bootHandler.ts           # Alarm re-register (boot)
│       ├── alarmNavigation.ts       # Alarm key + dedup (Sprint 5-6)
│       ├── medicineForm.ts          # Form helpers
│       ├── timeCalculator.ts        # Saat dilimleri
│       ├── idGenerator.ts           # UUID v7
│       ├── logger.ts                # Scoped logger
│       └── ...
├── __tests__/                       # Test suite'leri (308 test)
└── jest.config.js                   # Jest konfigürasyonu
```

## Mimari Katmanları

### 1. Composition Layer (App.tsx)
- Navigation setup
- Provider'lar (Auth, Theme, Language, vb.)
- App-level hook'lar (usePermissionsGate, useSecurityGate, vb.)

### 2. Screens
- Tam ekran UI
- Hook'ları kullanır, servisleri çağırır
- Navigation route'ları

### 3. Hooks (Sprint 2 ile güçlendirildi)
- State management + side effects
- Context + store + service compositing
- Test edilebilir

### 4. Stores (Sprint 4'te slice)
- Zustand store (1947 satır)
- Sprint 4 sonrası: medicines, logs, snoozes, settings slice'larına ayrılacak

### 5. Services
- Firebase wrapper
- Native bridge
- External API integration

### 6. Utils
- Pure functions
- Zod schemas
- Date/time helpers
- ID generation
- Security primitives

## State Management

**Zustand** ana state yönetim aracı:
- `medicineStore`: İlaç, alarm, log, snooze state'i
- `useShallow`: Shallow equality ile re-render optimizasyonu (Sprint 1 PR #1)

## Güvenlik

- **PIN Hash:** 10,000 round SHA-256 + constant-time comparison
- **PIN Storage:** `expo-secure-store` (device keychain)
- **Notification Visibility:** PRIVATE (kilit ekranında ilaç ismi gizli)
- **BootReceiver:** exported=false, directBootAware=false
- **Lock Screen:** Keyguard bypass kaldırıldı (PIN/biometric korunur)
- **API Keys:** Placeholder (gerçek key rotation kullanıcıya ait)
- **PDF XSS:** escapeHtml/escapeSvgText
- **Firestore Rules:** Regex allowlist + content validation + referential integrity

## Testing

- **Jest** + **@testing-library/react-native**
- 308 test (Sprint 7 sonu), %17.74 line coverage
- Coverage gate: lines 17, statements 17, branches 8, functions 16 (Sprint 7 sonrası)
- Sprint 7 hedefi: %65 coverage (yeni hook + ekran testleri ile)

## CI/CD

- **GitHub Actions:** `.github/workflows/ci.yml`
  - Lint (ESLint)
  - Typecheck (TypeScript)
  - Test (settings + caregiver + critical + coverage gate)
  - Coverage artifact upload
- **Permissions:** `contents: read` (PR'lar için)
- **E2E:** Maestro workflow sprint 11'de geri yazılacak

## Build Konfigürasyonu

- **Expo SDK 54** + **React Native 0.81.5** + **React 19.1**
- **ABI:** arm64-v8a + armeabi-v7a (Sprint 12 — 4 ABI → 2 ABI)
- **Min SDK:** 24 (Android 7+)
- **Target SDK:** 34 (Android 14)

## Sprint Tarihçesi

| Sprint | Açıklama | PR |
|---|---|---|
| 0 (PR #1) | Kritik güvenlik + coverage gate | [#1](https://github.com/edemiron/android_ilac_app/pull/1) |
| 1 (kısmi) | Keyguard bypass + lint fix | [#1]'in parçası |
| 2 | App.tsx hook refactor (4 hook) | (sonraki PR) |
| 3 | notifications/channels modülü | (sonraki PR) |
| 4-16 | Devam eden sprintler | - |

## Notlar

- **Mimari borç:** medicineStore.ts slice'lara bölünmeli (Sprint 4)
- **Test coverage:** Hedef %65, mevcut %18
- **Kayıp dosyalar:** Sprint 1'de stash drop sonrası kaybolan dosyalar (authValidation, vb.) Sprint 1.7'de yeniden oluşturuldu