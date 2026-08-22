# İlaç Hatırlatıcı — Program Genel Bakış + Tema Entegrasyonu (AI Ajan İçin)

> **Hedef kitle:** Bu doküman, projeyi ilk kez gören bir AI ajanın **10 dakikada** programın ne işe yaradığını, mimarisini, tüm ekranları, veri akışını ve **tema sistemiyle nasıl entegre olduğunu** anlaması için yazılmıştır.
>
> **Kapsam:** Monorepo yapısı, 19 ekran + alt component'ler, provider hiyerarşisi, navigation, state yönetimi, notification pipeline, güvenlik, caregiver sistemi, backend, **ve her ekran için tema token kullanımı** (renk, gradient, motion).
>
> **Versiyon:** v1.3.2 (Sprint 101 sonrası). Karol-inspired redesign + Moti entegrasyonu + expo-linear-gradient migration dahil.
>
> **İlgili:** [docs/theme-system.md](theme-system.md) — Tema token referansı (renkler, typography, spacing, motion). [ARCHITECTURE.md](../ARCHITECTURE.md) — Mimari detaylar.

---

## 1. Program Tanıtımı

**İlaç Hatırlatıcı** — Türkçe, Android-öncelikli (Android 7+, paket `com.ilachatirlatici`) mobil uygulama. İlaç hatırlatma + bakıcı yönetimi + premium abonelik + AI arama + barkod tarama + güvenli (PIN/biometric) veri saklama.

**Hedef kullanıcı:** Türkçe konuşan, kronik ilaç kullanan yetişkinler + bakıcılar (yaşlı/hasta yakını).

**Temel özellikler:**

- 📅 **İlaç zamanlama** — doz başına hatırlatma, grup (Sabah/Öğle/Akşam/Gece), sınav/Bildirim zamanı
- ⏰ **Tam ekran alarm** — lock screen üzerinden gelen alarm + barkod doğrulama opsiyonel
- 👥 **Bakıcı sistemi** — 6-haneli davet kodu + QR paylaşımı + gerçek zamanlı FCM push
- 🔒 **PIN + Biometric güvenlik** — 10.000 round SHA-256 hash + salt + constant-time compare
- 💎 **Premium abonelik** — Free (5 ilaç, 10 AI arama/gün) + Premium (sınırsız)
- 🔍 **AI arama** — Gemini + Claude hibrit (TİTCK + OpenFoodFacts + Firebase cache)
- 📊 **İstatistik** — Haftalık/aylık/yıllık uyum oranı grafik + PDF rapor
- 🎨 **6 Accent palette + Dark Mode** — Mint (default), Ocean, Sunset, Forest, Lavender, Cherry

---

## 2. Monorepo Yapısı

```
ilac_app_v8_claude/
├── mobile/              ← React Native (Expo SDK 54) Android uygulaması
│   ├── src/
│   │   ├── App.tsx              ← Root component + provider hiyerarşisi + navigation
│   │   ├── index.ts             ← Native entry (notifee background handler)
│   │   ├── screens/             ← 19 ekran
│   │   ├── contexts/            ← 7 context (Theme, Accent, Auth, Language, vb.)
│   │   ├── hooks/               ← Custom hook'lar
│   │   ├── services/            ← Firebase + API client
│   │   ├── stores/              ← Zustand store'lar
│   │   ├── theme/               ← Palette, tokens, moti-config, palettes
│   │   ├── components/          ← Yeniden kullanılabilir component'ler
│   │   │   ├── common/          ← MotiPressable, Skeleton, LowStockCard, vb.
│   │   │   ├── layouts/         ← HomeScreenLayoutA, HomeScreenLayoutB, Switcher
│   │   │   ├── settings/        ← OptionPicker, AccentColorSection, vb.
│   │   │   └── HomeScreen/      ← Karol redesign component'leri
│   │   └── utils/               ← Modüler utilities
│   ├── android/                 ← Android native (gradle, manifest, pluginler)
│   ├── app.config.json          ← Expo config (plugin zinciri, permissions)
│   ├── .env.example             ← Env şablonu + 90 günlük API key rotation
│   ├── jest.config.js           ← Test ortamı
│   └── package.json
│
├── server/              ← Express + Firebase Functions
│   ├── src/
│   │   ├── server.ts            ← Express app (port 3001)
│   │   ├── routes/              ← Reminders API (email/slack/calendar/whatsapp)
│   │   └── services/            ← Composio proxy
│   └── functions/index.js       ← Firebase Functions (geminiSearch, claudeSearch, health)
│
├── web/                 ← Next.js dokümantasyon sitesi (Antigravity Kit template)
│
├── docs/                ← Proje dokümanları (theme-system, program-overview, ...)
│
├── firestore.rules      ← Firestore güvenlik kuralları
├── ARCHITECTURE.md      ← Mimari detaylar
└── CLAUDE.md            ← Claude Code proje yönergeleri
```

---

## 3. Provider Hiyerarşisi (kritik sıra)

`mobile/App.tsx`'teki provider sırası — **yanlış sıra kırılır**:

```
┌─ GestureHandlerRootView (Sprint 97.1 — gesture için zorunlu)
│  └─ SafeAreaProvider
│     └─ ErrorBoundary (Sprint 87)
│        └─ UserProfileProvider (profile.accentColor, layout)
│           └─ AccentProvider ← profile.accentColor → ACCENT_PALETTES
│              └─ ThemeProvider ← accent override → colors.primary
│                 └─ LowStockDismissProvider
│                    └─ OnboardingProvider
│                       └─ LanguageProvider
│                          └─ AuthProvider (Firebase Auth)
│                             └─ SubscriptionProvider
│                                └─ AlertProvider
│                                   └─ CaregiverEventBridge (Sprint 72)
│                                      └─ AppContent
│                                         ├─ AuthNavigator (Login/Register) — auth yoksa
│                                         └─ RootStack
│                                            ├─ PermissionsScreen (showPermissions gate)
│                                            ├─ OnboardingScreen (first-run)
│                                            ├─ MainTabs (Home/Medicines/Statistics/Settings)
│                                            └─ Modal'lar (AddMedicine, Alarm, BarcodeScanner, vb.)
```

> ⚠️ **`AccentProvider` mutlaka `ThemeProvider`'ın ÜSTÜNDE** olmalı çünkü `ThemeProvider` `useAccent()` çağırır.

---

## 4. Navigasyon Akışı

```
┌─ Splash (loading)
│
├─ showPermissions gate → PermissionsScreen
│  └─ Continue → OnboardingProvider kontrol
│
├─ Onboarding tamamlanmamış → OnboardingScreen (4 slide, Skip → Main)
│  └─ Skip veya 4× Next → Profile'a onboardingDone=true yaz
│
├─ Auth yok → AuthNavigator (Login + Register)
│  ├─ LoginScreen (email/password + Google Sign-In)
│  └─ RegisterScreen
│
├─ Auth var + onboarding tamamlanmış → RootStack
│  └─ MainTabs (4 tab + FAB)
│     ├─ Home (Layout A veya B — userProfile.layout)
│     ├─ Medicines (+ AddMedicine modal)
│     ├─ Statistics
│     └─ Settings (Tema, Dil, Bildirim, Bakıcı, Premium, Güvenlik)
│
└─ Root Modal'lar:
   ├─ AlarmScreen (fullScreenModal, fade) — lock screen üzerinden
   ├─ AddMedicine (modal slide)
   ├─ BarcodeScanner (fullScreenModal, vision-camera)
   ├─ InteractionsScreen
   ├─ MedicineProspectusScreen
   ├─ PremiumScreen (modal)
   ├─ SecurityScreen
   ├─ TtsSettingsScreen
   ├─ CaregiverScreen
   └─ CaregiverInviteScreen
```

**Bottom Tab Bar** (`mobile/App.tsx MainTabs`):

| # | Tab | İkon | Tema Token |
|---|---|---|---|
| 0 | Home | `home` | `colors.primary` (accent'ten) |
| 1 | Medicines | `medical` | `colors.secondary` (#2563EB blue) |
| 2 | **FAB** (centered, primary renk, + ikon) | ➕ | `colors.primary` + shadow |
| 3 | Statistics | `bar-chart` | `colors.accent` (#7C3AED purple) |
| 4 | Settings | `settings-sharp` | warning renk (#B45309 amber) |

`getTabColors(isDark)` fonksiyonu (App.tsx:138) — **dark mode override**: Teal → Soft mor-mavi, Blue → Cyan, Purple → Açık mor, Amber → Sarı.

---

## 5. Tüm Ekranlar + Tema Entegrasyonu

### 5.1 Ana Ekranlar

#### HomeScreen (`screens/HomeScreen.tsx`)

- **Görev:** Bugünkü hatırlatmalar + uyum oranı + zaman çizelgesi + "Şu An" CTA
- **Layout sistemi:** `profile.layout === 'A'` → LayoutB (Detaylı, 7 kart), `'B'` → LayoutA (Sade, kompakt) — Sprint 78 ters eşleme
- **Karol redesign (Sprint 98-99):** Layout B — gradient hero + 2x2 StatsGrid + SectionHeader + MedicineAvatar + IconBadge + TrustBadge

**Tema entegrasyonu:**

| Element | Token | Gradient | Motion |
|---|---|---|---|
| Hero header (Layout B) | `colors.gradientStart → gradientEnd` (light: teal→cyan, dark: lila→cyan) | ✅ `<LinearGradient from expo-linear-gradient>` | `motiTransitions.standard` mount fade |
| 2x2 StatsGrid hücreleri | `colors.surface` + `colors.border` + accent-tinted IconBadge | ❌ | Stagger 50ms `motiTransitions.standard` |
| IconBadge (her hücre) | `colors.primary` / `colors.success` / `colors.warning` / `colors.error` + `+ '15'` alpha | ❌ | Mount fade |
| CurrentDoseCard | `colors.surface` + `colors.cardPending/Taken/Skipped` | ❌ | `motiTransitions.expressive` pop-in |
| MedicineAvatar | `medicine.color + '25'` (15% alpha tint) | ❌ | `motiTransitions.expressive` scale 0.8→1 |
| SectionHeader | `colors.primary` (TR/EN uppercase) | ❌ | `motiTransitions.quick` slide |
| TimelineItem | `colors.surface` + saat badge `colors.primary + '18'` | ❌ | Mount fade |
| Filter tabs (Pending/Taken/Missed) | `colors.primary` aktif, `colors.textMuted` pasif | ❌ | `MotiPressable` scale 0.96 |
| TrustBadge (floating) | `colors.gradientStart → gradientEnd` + beyaz text | ✅ | `motiTransitions.standard` slide-in from right |
| FAB (centered tab) | `colors.primary` + shadow | ❌ | `MotiPressable` scale 0.95 |

#### MedicinesScreen (`screens/MedicinesScreen.tsx`)

- **Görev:** Tüm ilaçlar + aktif/pasif toggle + çoklu seçim + filtreleme
- **Tema:** MD3 ListItem pattern, accent renk aktif vurgusu
- **Motion:** MedicineRow long-press selection, çoklu seçim animasyonu

#### StatisticsScreen (`screens/StatisticsScreen.tsx`)

- **Görev:** Haftalık/aylık/yıllık uyum + grafik + PDF rapor
- **Tema:** CircularProgress hero (`colors.primary` + `colors.success` adherence rate), MiniChart sparkline
- **Motion:** Reanimated tarafından `react-native-chart-kit` LineChart animasyonu

#### SettingsScreen (`screens/SettingsScreen.tsx`)

- **Görev:** Tema, dil, bildirim, bakıcı, premium, güvenlik, geliştirici
- **Tema:** AccentColorSection (6 chip), QuietHoursSection, OptionPicker (indicator slide)
- **Motion:** OptionPicker `motiTransitions.standard` indicator slide, Accent chip `motiTransitions.press` scale

#### AlarmScreen (`screens/AlarmScreen.tsx`)

- **Görev:** Tam ekran alarm + barkod doğrulama + al/erteleme/atla
- **Tema:** MD3 tam ekran, success/warning/error durum rengi yoğun
- **Motion:** Pulse animasyon (Reanimated `react-native-reanimated`), success checkmark

### 5.2 Modal & Alt Ekranlar

| Ekran | Tema Özelliği | Motion |
|---|---|---|
| **AddMedicineScreen** | Form kartları `colors.surface`, helper text `colors.textSecondary` | LayoutAnimation (form büyüme/küçülme) |
| **BarcodeScannerScreen** | Vision-camera overlay + `colors.primary` border | Barcode algılama pulse |
| **InteractionsScreen** | Status card'lar (severity color-coded) | Mount fade |
| **MedicineProspectusScreen** | Bölüm başlıkları `colors.primary`, body `colors.text` | Scroll-based fade |
| **PremiumScreen** | Hero gradient (`colors.gradientStart → gradientEnd`) ✅ | `motiTransitions.standard` mount |
| **SecurityScreen** | PIN input `colors.inputBackground`, weak PIN warning `colors.warning` | `MotiPressable` |
| **TtsSettingsScreen** | Slider/voice picker, accent renk aktif | `motiTransitions.press` |
| **CaregiverScreen** | Bakıcı kartları + QR kod (`colors.primary` border) | Mount fade |
| **CaregiverInviteScreen** | 6-haneli kod input + accent renk onay | `MotiPressable` |

### 5.3 Auth & Onboarding

| Ekran | Tema Özelliği | Motion |
|---|---|---|
| **LoginScreen** | Email/password input, primary CTA, Google button | `MotiPressable` |
| **RegisterScreen** | Form validasyon, success/error inline | `MotiPressable` |
| **OnboardingScreen** | 4 slide, emoji pop-in, dot indicator width animasyonu | `motiTransitions.expressive` (pop), `motiTransitions.standard` (slide) |
| **PermissionsScreen** | İzin listesi (Notifications, Exact Alarm, Full Screen, Battery Optimization, Notification Settings) | Mount fade, success checkmark |

### 5.4 Karol Redesign Component'leri (`screens/HomeScreen/components/`)

| Component | Tema Token | Gradient | Motion |
|---|---|---|---|
| **Header.tsx** | `colors.gradientStart → gradientEnd` + beyaz text | ✅ LinearGradient | `motiTransitions.standard` slide-down |
| **StatsGrid.tsx** | `colors.surfaceContainerLow` + `colors.border` + `colors.text` value + `colors.textMuted` label | ❌ | Stagger 50ms `motiTransitions.standard` |
| **SectionHeader.tsx** | `colors.primary` title + "Tümü ›" link | ❌ | `motiTransitions.quick` slide |
| **MedicineAvatar.tsx** | `medicine.color + '25'` (15% alpha tint) + ilaç rengi metin | ❌ | `motiTransitions.expressive` pop-in |
| **IconBadge.tsx** | `colors.primary/success/warning/error` + `+ '15'` alpha | ❌ | Mount fade |
| **TrustBadge.tsx** | `colors.gradientStart → gradientEnd` + beyaz text + shield icon | ✅ LinearGradient | `motiTransitions.standard` slide-in |

---

## 6. Veri Modelleri (`mobile/src/types/index.ts`)

| Tip | Ana alanlar |
|---|---|
| `Medicine` | id, name, dosage, frequency, instructions, color, category, form, startDate/endDate, isActive, imageUri, stockEnabled/Count/Threshold/Unit, expiryDate, requireBarcodeOnTake, barcode, customTimes |
| `ReminderTime` | id, medicineId, time (HH:mm), notificationId, isEnabled |
| `MedicineLog` | id, medicineId, reminderTimeId, scheduledTime, takenAt, status (pending/taken/skipped/missed), note |
| `Snooze` | id, medicineId, reminderTimeId, originalScheduledTime, triggerTime, snoozeCount, isActive |
| `UserSettings` | wake/sleep, notificationSound, alarmSound, alarmVolume, snoozeDuration, maxSnoozeCount, quietHours, securityEnabled/Type/Pin/biometricsEnabled/lockTimeout, ttsEnabled, persistentNotificationEnabled |
| `CaregiverRelationship` | id, patientId, caregiverId, status (pending/active/paused/removed), permissions, caregiverFcmToken |
| `CaregiverInvite` | id (6-haneli kod), patientId, caregiverEmail, status, expiresAt, permissions |
| `SubscriptionPlan` / `UserSubscription` | tier (free/premium), price, features, limits |
| `GlobalMedicine` | barcode, name, genericName, dosage, form, manufacturer, prospectus, isVerified |

---

## 7. State Yönetimi

### 7.1 Context'ler (`mobile/src/contexts/`)

| Context | Sprint | Görev | Tema İlişkisi |
|---|---|---|---|
| `AuthContext` | — | Firebase Auth + Google Sign-In | — |
| **`ThemeContext`** | 55/58.5 | Light/Dark/Sistem + MD3 renk + WCAG AA + accent inject | **Tüm renklerin kaynağı** |
| **`AccentContext`** | 63 | 6 accent palette → Theme'e inject | **`colors.primary` override** |
| `LanguageContext` | — | TR/EN çeviriler (200+ key) | — |
| `SubscriptionContext` | — | Free/Premium tier + limitler | Premium banner accent renk |
| `AlertContext` | — | CustomAlert wrapper | Status renkleri (success/warning/error) |
| `UserProfileProvider` (hooks) | 58/63/64/77 | Layout A/B + accent + haptics (AsyncStorage v1→v3 migration) | Accent + layout tercihi |

### 7.2 Zustand Store

- `medicineStore.ts` (~1947 satır) — medicines, logs, snoozes, settings slice'ları. Sprint 4 refactor hedefi.

### 7.3 AsyncStorage Keys (`mobile/src/constants.ts STORAGE_KEYS`)

- `medicine-storage` (Zustand persist)
- `pending-alarm`, `handled-alarms` (background handler → App)
- `security-settings`, `security_pin_hash`, `last-active-time`
- `app_theme`, `app_user_profile`, `app_language`
- `barcode_scan_count`
- `dev-mode`, `miui_battery_check_shown`

---

## 8. Notification Pipeline

### 8.1 Kütüphaneler

- **@notifee/react-native** — trigger notification, full-screen alarm, background handler
- **expo-notifications** — Expo notification API
- **react-native-haptic-feedback** — titreşim (7 tip: light/medium/heavy/selection/success/warning/error)

### 8.2 Modüler Utils (`mobile/src/utils/notifications/`)

| Dosya | Sprint | Görev |
|---|---|---|
| `channels.ts` | 3 | Android channel setup (4 kanal: ALARM/ALARM-NV/REMINDER/REMINDER-NV) |
| `schedule.ts` | — | `scheduleMedicineNotification`, `scheduleSnoozeNotification` |
| `cancel.ts` | — | `cancelMedicineNotifications`, `cleanupOrphanNotifications` |
| `listeners.ts` | — | Foreground event listener |
| `permissions.ts` | — | İzin kontrolleri |
| `actions.ts` | — | Notification action butonları (Take/Skip/Snooze) |
| `behavior.ts` | — | Davranış ayarları |

**Channel renkleri:**
- ALARM: `colors.error` (Red 800)
- REMINDER: `colors.primary` (accent teal/mint)
- Alarm background: `colors.warning` (Amber 700) — full-screen alarm

### 8.3 Alarm Akışı

```
[Bell schedule] → notifee.triggerNotification → channel (ALARM)
   ↓
[App closed → AlarmActivity Plugin] → android:showWhenLocked="true"
   ↓
[Bell fires] → MainActivity.enableLockScreenVisibility() → KeyguardManager.requestDismissKeyguard
   ↓
[App opens] → AlarmScreen (fullScreenModal, fade)
   ↓
[User action] → Take / Snooze / Skip / Caregiver action
   ↓
[MedicineLog] → Firestore + AsyncStorage persist + Caregiver FCM push
```

### 8.4 AlarmActivity Plugin (`plugins/withAlarmActivity.js`)

- AndroidManifest.xml'e `android:showWhenLocked="true"`, `android:turnScreenOn="true"`, `android:showOnLockScreen="true"` ekler
- MainActivity.kt'ye `enableLockScreenVisibility()` fonksiyonu ekler
- `plugins/withBootReceiver.js` — Native boot receiver (exported=false, directBootAware=false)

---

## 9. Güvenlik

### 9.1 PIN Sistemi (`utils/security.ts` + `utils/security/pinCrypto.ts`)

- 4-6 hane, **10.000 round SHA-256 zinciri** + 32-byte random salt + **constant-time comparison**
- **Expo SecureStore** — PIN hash device keychain'de (`security.pin.hash`, `security.pin.salt`)
- **AsyncStorage** — `security_settings`, `last_active_time` (Plain)
- **Weak PIN listesi** (`SecurityScreen`): 1234, 1111, 0000, 1212, 7777, 1004, 2000, 4444, 2222, 3333, 5555, 6666, 8888, 9999, 123456, 654321
- **Settings type:** `pin | biometric | both | none`
- **Lock timeout** — `lastActiveTime` ile otomatik kilit (5/10/30 min)

### 9.2 Biometric (`expo-local-authentication`)

- Parmak izi + yüz tanıma
- Fallback: device PIN

### 9.3 Tema entegrasyonu

| Güvenlik UI | Token |
|---|---|
| PIN input | `colors.inputBackground` + `colors.inputBorder` |
| Zayıf PIN uyarısı | `colors.warning` (Amber 700) |
| Biometric prompt | `colors.primary` accent |
| Lock overlay | `colors.overlay` (rgba slate-900 0.5) |

---

## 10. Bakıcı Sistemi

### 10.1 Akış

```
[Hasta] CaregiverScreen → "Davet Oluştur" → 6-haneli kod üretilir (7 gün geçerli)
   ↓
[Hasta] QR kod ile paylaşır veya kodu mesajla gönderir
   ↓
[Bakıcı] CaregiverInviteScreen → kodu girer → acceptCaregiverInvite
   ↓
[caregiverRelationships/{id}] pending → active (Sprint 72)
   ↓
[Bakıcı] Hasta profilini salt-okunur görür (medicines, logs, statistics)
   ↓
[Hasta] İlacı alır → CaregiverEventBridge → FCM push → Bakıcı notification alır
```

### 10.2 Tema entegrasyonu

| UI | Token |
|---|---|
| Bakıcı kartı | `colors.surface` + `colors.border` |
| QR kod çerçevesi | `colors.primary` border |
| Davet kodu input | `colors.inputBackground` + accent ring on success |
| Bakıcı push notification | `colors.secondary` (Blue 600) icon + accent text |

---

## 11. Premium Abonelik

### 11.1 Planlar (`services/subscriptionService.ts`)

| Tier | Fiyat | Limitler |
|---|---|---|
| **Free** | ₺0 | 5 ilaç, 10 AI arama/gün, 5 barkod tarama/gün, cloud sync (sınırlı), reklâm var |
| **Premium Monthly** | ₺49.99/ay | Sınırsız ilaç, sınırsız AI, sınırsız barkod, full cloud sync, reklâm yok |
| **Premium Yearly** | ₺349.99/yıl | Monthly ile aynı, %42 indirim |

### 11.2 Tema entegrasyonu

- **PremiumScreen hero:** `colors.gradientStart → gradientEnd` ✅ gradient
- **Premium CTA button:** `colors.primary` (accent teal/mint)
- **Locked feature badge:** `colors.warning` (Amber 700) "PRO" pill

---

## 12. Backend (`server/`)

### 12.1 Express (port 3001)

- `GET /health`
- `POST /api/reminders/{email|slack|calendar|whatsapp|batch}` — Composio API proxy (3rd party integrations)

### 12.2 Firebase Functions

- `geminiSearch` — `gemini-pro:generateContent` proxy (CORS enabled, maxInstances 10)
- `claudeSearch` — `claude-3-5-sonnet-20241022` proxy
- `health` — Yapılandırma durumu

### 12.3 Firestore Yapısı

- `caregiverInvites/{code}` — 6-haneli kod primary
- `caregiverRelationships/{id}`
- `users/{uid}/medicines` (subcollection)
- `users/{uid}/reminderTimes`
- `users/{uid}/medicineLogs` (Sprint 72 — caregiver event bridge)
- `users/{uid}/snoozes`
- `users/{uid}/subscription` (client read-only)
- `users/{uid}/fcmToken`
- `globalMedicines` (admin-curated ilaç DB)

**Firestore Rules:** Regex allowlist + content validation + referential integrity (`firestore.rules`).

---

## 13. Web (`web/`)

**Next.js** dokümantasyon sitesi — **Antigravity Kit** template'i.

- 19 agent + 36 skill + 11 workflow tanıtım sayfası
- Routes: `/`, `/docs/agents`, `/docs/skills`, `/docs/workflows`, `/docs/installation`, `/docs/guide`, `/docs/cli`
- **Admin paneli değil** — `.agent/` altyapısı için rehber
- App ile doğrudan bağlantısı yok

---

## 14. Tema Sistemi — Özet Entegrasyon Haritası

Bu harita, AI ajanın **"şu ekran şu token'ı kullanır"** sorusunu hızlıca cevaplaması içindir:

### 14.1 Gradient (sadece 4 yerde)

| Yer | Token | Kullanım |
|---|---|---|
| HomeScreen.Header (Layout A+B) | `gradientStart → gradientEnd` | Karol hero |
| HomeScreen.TrustBadge | `gradientStart → gradientEnd` | Floating "ANLIK/SESSİZ/GÜVENLİ" |
| PremiumScreen | `gradientStart → gradientEnd` | Premium hero |
| OnboardingScreen (son slide?) | `gradientStart → gradientEnd` | CTA highlight |

> ⚠️ Gradient accent'ten **etkilenmez**. Sabit (Sprint 101 — expo-linear-gradient named export).

### 14.2 Renk Token Kullanım Yoğunluğu

| Token | En çok kullanılan yer |
|---|---|
| `primary` | Butonlar, aktif tab, FAB, link, primary CTA |
| `secondary` | FAB + İkincil buton + info banner |
| `success` | Taken state, başarı alert, success badge |
| `warning` | Pending state, uyarı, weak PIN |
| `error` | Skipped state, hata, silme, ALARM channel |
| `text` | Birincil metin (WCAG AAA) |
| `textSecondary` | Açıklama, helper text |
| `textMuted` | Disabled, placeholder (sadece 18pt+) |
| `surface` + `border` | Kart arka plan + sınır |
| `cardTaken/Skipped/Pending` | Status kart arka planları (soft tints) |

### 14.3 Motion (Moti) Kullanım Yoğunluğu

| Preset | En çok kullanılan yer |
|---|---|
| `press` (150ms) | MotiPressable default scale |
| `quick` (180ms) | Modal fade, section header mount, slide-in |
| `standard` (260ms) | Mount fade, list reorder, hero slide-down |
| `expressive` (spring) | Emoji pop-in, avatar mount, success checkmark |
| `successSnappy` (snappy spring) | "İlacı aldım" checkmark (kısa) |
| `loop` (800ms) | Skeleton shimmer, AlarmScreen pulse |

Detaylı pattern'ler için → [docs/theme-system.md §11](theme-system.md).

---

## 15. Akış Diyagramları

### 15.1 İlk Açılış

```
App Start → Splash → BootRecovery (cleanup)
   ↓
Auth yok → AuthNavigator → Login → register
   ↓
Login başarılı → PermissionsScreen → Allow (Notifications, Exact Alarm, vb.)
   ↓
OnboardingProvider: onboardingDone?
   ├─ false → OnboardingScreen (4 slide) → Skip veya 4× Next
   └─ true → MainTabs
   ↓
MainTabs → HomeScreen → Layout A veya B (profile.layout)
```

### 15.2 Hatırlatma Akışı

```
Scheduled time → notifee.triggerNotification → channel (REMINDER veya ALARM)
   ↓
Foreground: App aktif → setupNotificationListeners → handleIncomingAlarm → AlarmScreen (fullScreenModal)
   ↓
Background: App kapalı → AlarmActivity → enableLockScreenVisibility → AlarmScreen
   ↓
Cold start: notifee.getInitialNotification() + AsyncStorage pending-alarm → useAlarmNavigation → AlarmScreen
   ↓
User action (Take/Snooze/Skip):
   ├─ Take → MedicineLog (taken) + cancel notification + Caregiver FCM push
   ├─ Snooze → scheduleSnoozeNotification + Snooze persist
   └─ Skip → MedicineLog (skipped) + cancel notification + Caregiver FCM push
```

### 15.3 Tema Değişimi

```
Settings → AccentColorSection → kullanıcı palette seçer
   ↓
profile.accentColor = 'lavender' → AsyncStorage + Firestore persist
   ↓
AccentProvider re-render → palette = ACCENT_PALETTES['lavender']
   ↓
ThemeProvider re-render → colors.primary = palette.lightPrimary (#8B5CF6 Violet)
   ↓
Tüm useTheme() kullanan component'ler otomatik re-render (lavender accent her yerde)
   ↓
Gradient etkilenmez (gradientStart/End sabit kalır)
```

---

## 16. Yeni AI Ajan İçin Onboarding Checklist

Yeni bir agent bu projede çalışmaya başladığında:

- [ ] **CLAUDE.md** oku — sprint pattern, coverage disiplini, env-specific dosyalar, peer message limitleri
- [ ] **docs/theme-system.md** oku — renkler, typography, spacing, motion token'ları, gradient pattern
- [ ] **docs/program-overview.md** (bu dosya) oku — ekranlar, provider sırası, navigation, state
- [ ] **ARCHITECTURE.md** oku — state, notification pipeline, güvenlik, caregiver, backend mimarisi
- [ ] **firestore.rules** oku — veri modeli + erişim kontrolü
- [ ] **mobile/jest.config.js** oku — test ortamı + coverage eşikleri
- [ ] **mobile/src/constants.ts** oku — `STORAGE_KEYS`, `CHANNELS`
- [ ] **mobile/App.tsx** provider sırasını doğrula (UserProfile → Accent → Theme)
- [ ] **tasks/lessons.md** oku — operasyonel dersler (büyük refactor öncesi)
- [ ] **tasks/todo.md** oku — sprint durumu + bekleyen P1/P2/P3 işler
- [ ] **docs/SORUN-COZUMLERI.md** oku — Metro cache + gradle timeout çözümleri
- [ ] **useTheme()** hook'unu kullan (hardcoded hex YOK)
- [ ] **MotiPressable** kullan (TouchableOpacity YOK, yeni component'lerde)
- [ ] **expo-linear-gradient** named export kullan + `[a, b] as const` modifier
- [ ] **Test mock factory**: `{ LinearGradient: 'LinearGradient' }` (default export değil)

---

## 17. İlgili Dokümanlar

- [docs/theme-system.md](theme-system.md) — Tema token referansı (renkler, typography, spacing, motion)
- [CLAUDE.md](../CLAUDE.md) — Claude Code proje yönergeleri
- [ARCHITECTURE.md](../ARCHITECTURE.md) — Mimari detaylar
- [firestore.rules](../firestore.rules) — Veri modeli + erişim kontrolü
- `mobile/src/types/index.ts` — Tüm veri modeli tanımları
- `mobile/src/constants.ts` — `STORAGE_KEYS`, `CHANNELS`, app-wide sabitler
- `mobile/App.tsx` — Root component + provider hiyerarşisi + navigation
- `mobile/src/contexts/ThemeContext.tsx` — Renk paleti + useTheme()
- `mobile/src/contexts/AccentContext.tsx` — Accent provider
- `mobile/src/theme/` — Palette, tokens, moti-config, README
- `mobile/src/components/common/MotiPressable.tsx` — TouchableOpacity drop-in
- `mobile/src/screens/HomeScreen/components/` — Karol redesign component'leri
- `mobile/app.config.json` — Expo plugin zinciri, permissions, intent filter'lar
- `docs/SORUN-COZUMLERI.md` — Metro cache + gradle timeout çözümleri

---

**Hazırlayan:** Sprint 101 sonrası — program + tema entegrasyonunu tek dokümanda birleştiren AI ajan onboarding rehberi.
**Versiyon geçmişi:** v1.0 (Sprint 101 sonrası, ilk sürüm).
