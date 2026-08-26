# Sanal Android Smoke Test Runbook (Sprint 96)

Bu doküman, İlaç Hatırlatıcı uygulamasının Android Studio AVD (sanal cihaz) üzerinde uçtan uca smoke test edilmesi için gereken adımları ve yazılan araçları özetler.

## Yazılan Artefaktlar

| Yol | Amaç |
|---|---|
| `mobile/scripts/env.sh` | ANDROID_HOME + PATH + JAVA_HOME kurulumu (Git Bash) |
| `mobile/scripts/smoke-test.sh` | Boot + build + install + launch + UI render verification (idempotent) |
| `mobile/scripts/trigger-boot.sh` | BootReceiver'ı `adb am broadcast` ile manuel tetikleme |
| `.maestro/flows/smoke_alarm.yaml` | Maestro E2E flow (login + ilaç ekleme + boot trigger) |
| Bu doküman (`docs/smoke-test.md`) | Runbook |

## Ön Koşullar

1. **Android Studio kurulu** + `ANDROID_HOME` env değişkeni ayarlanmış olmalı. `mobile/scripts/env.sh` Windows için `C:\Users\<user>\AppData\Local\Android\Sdk` yolunu varsayar. Farklıysa `env.sh`'i düzenleyin.
2. **Java 17** (Eclipse Adoptium veya Android Studio JBR) — `java --version` ile doğrula.
3. **AVD oluşturulmuş** olmalı. Proje reposunda `Codex_Test_35` (API 35 google_apis x86_64) zaten mevcut. Farklı bir AVD kullanacaksanız `AVD_NAME=...` env ile override:
   ```bash
   export AVD_NAME=ilac_test_avd
   ```
4. **`.env`** dolu (Firebase + Google OAuth) ve `server/` (Express) çalışıyor olmalı.
5. **Firebase Console'da test kullanıcısı** (`test@example.com / Test1234!`) oluşturulmuş + Email/Password Sign-In method etkin olmalı. Yoksa Login akışı "user not found" ile durur, ama UI render doğrulama yine de yapılır.

## 5-Komut Hızlı Başlangıç

```bash
cd "/c/Users/digienes/Documents/ilac_app_v8_claude"

# 1. Env kur (her Bash call'ında tekrarla)
source mobile/scripts/env.sh

# 2. (Opsiyonel) AVD yoksa oluştur; bu repo'ya zaten Codex_Test_35 dahil
"$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager" create avd \
  -n ilac_test_avd \
  -k "system-images;android-34;google_apis;x86_64" \
  -d "pixel_5" \
  --force-if-exists

# 3. Headless boot (eğer zaten açıksa skip)
emulator -avd Codex_Test_35 -no-window -no-audio -no-boot-anim \
  -no-snapshot -gpu swiftshader_indirect &

# 4. Smoke test
bash mobile/scripts/smoke-test.sh

# 5. Alarm pipeline doğrulama (opsiyonel — login başarılıysa)
bash mobile/scripts/trigger-boot.sh broadcast   # BootReceiver tetikle
bash mobile/scripts/trigger-boot.sh reboot     # gerçek reboot (daha güvenilir)
```

## İlk Çalıştırma Süresi

| Adım | Süre |
|---|---|
| Env check + setup | 5 sn |
| İlk AVD boot (cold) | 60-120 sn |
| Gradle build (x86_64-only assembleDebug) | 8-12 dk (ilk), 1-2 dk (cache'li) |
| Install + launch | 30 sn |
| Login denemesi + UI dump | 30 sn |
| Verification dump | 10 sn |
| **TOPLAM (ilk kez)** | **~10-15 dk** |
| **TOPLAM (cache'li)** | **~2-3 dk** |

## Çıktılar

Tüm artefaktlar `mobile/.smoke-logs/` altında:

- `emulator.log` — emulator stdout/stderr
- `build.log` — gradle assembleDebug son satırlar
- `install.log` — `adb install -r` çıktısı
- `launch.log` — `am start` çıktısı
- `focus.log` — current activity (MainActivity / FallbackHome)
- `01-login-screen.png` — Login ekranı screenshot
- `02-post-login.png` — Login sonrası ekran
- `03-final.png` — Smoke sonrası son ekran
- `window-dump.xml` — UI element dump (bounds + text)
- `perm-dump-N.xml` — Permission dialog dump
- `alarm-dump.txt` — `dumpsys alarm | grep com.ilachatirlatici` çıktısı
- `notif-dump.txt` — `dumpsys notification` çıktısı
- `drift.log` — `NotificationDiagnostics` logcat

## Önemli Notlar (Gotchas)

### 1. **`reactNativeArchitectures` x86_64'e set edilmeli**

Default `gradle.properties:41` `armeabi-v7a,arm64-v8a` AVD x86_64 için crash verir:
```
java.lang.UnsatisfiedLinkError: dlopen failed: library "libVisionCamera.so" not found
```
Çözüm: build sırasında `-PreactNativeArchitectures=x86_64` flag'i. `smoke-test.sh` bunu otomatik geçer. Production release için kalıcı çözüm: `gradle.properties`'a `x86_64` eklemek.

### 2. **ANDROID_HOME boşsa**

`env.sh` set eder. Yoksa emulator/avdmanager/sdkmanager PATH'te bulunmaz. Her Bash call'ında `source mobile/scripts/env.sh` tekrarla (Bash tool her call fresh başlatıyor).

### 3. **BootReceiver `exported` davranışı**

`mobile/plugins/withBootReceiver.js` yeni prebuild üretirse `exported="false"` olur; `am broadcast` SecurityException atar. Çözüm: `bash trigger-boot.sh reboot` (gerçek BOOT_COMPLETED).

### 4. **Maestro kurulumu (CI için)**

```bash
# macOS / Linux:
curl -Ls "https://get.maestro.mobile.dev" | bash

# Windows (Scoop):
scoop install maestro
```

Yerelde Maestro yoksa `smoke-test.sh` yeterli.

### 5. **Git Bash'te `adb pull` path quirks**

`adb pull /sdcard/file` Git Bash tarafından yanlış yorumlanır. `//sdcard/...` (çift slash) veya doğrudan Windows path kullan:
```bash
adb pull //sdcard/window_dump.xml "C:/path/to/dest.xml"
```

## Bilinen Kapsam Sınırı (Sprint 96 Follow-up)

Şu anki `smoke-test.sh`:
- ✅ AVD boot + build + install + launch
- ✅ Login ekranı render doğrulaması (JS bundle çalışıyor, network sync visible)
- ✅ Login akışı (email/password) — Firebase response log'lanır
- ⛔ İlaç ekleme ve alarm tetikleme adımı: **giriş başarısızsa atlanır**

Tam alarm tetikleme doğrulaması için iki seçenek:

**A. Test kullanıcı oluştur (hızlı):**
1. Firebase Console → Authentication → Users → Add user → `test@example.com / Test1234!`
2. Authentication → Sign-in method → Email/Password etkin.
3. `smoke-test.sh` çalıştır → Login başarılı → İlaç ekle → Alarm fires (yarın'a atlar).

**B. __DEV__ backdoor (uzun vadeli, deterministik):**
- `mobile/App.tsx` veya yeni `mobile/src/dev/DevSeeds.tsx` ekle, `__DEV__ && <DevSeeds />` ile gate'le.
- Dev build'de görünür "+ Seed Smoke Alarm" butonu → `addMedicine({smokeTriggerTime: now+30s})` çağırır.
- Test ekler, dart ile otomatik alarm fires doğrulanır.

**Sprint 96 follow-up** önerisi: (A) tercih edilir — minimum kod değişikliği.

## İlgili Sprint'ler

- Sprint 95 — `resolveReminderTriggerDate` kök neden fix
- Sprint 96 — Sanal Android kurulum (bu doküman)
- Sprint 96.5 — E2E CI Maestro path mismatch fix (`.github/workflows/e2e.yml:cd mobile/.maestro` → `.maestro`)
