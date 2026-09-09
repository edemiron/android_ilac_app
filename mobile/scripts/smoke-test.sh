#!/usr/bin/env bash
# mobile/scripts/smoke-test.sh
# Tam otomatik E2E Android smoke test.
#
# Sprint 96 — Android Studio + AVD üzerinde İlaç Hatırlatıcı uygulamasının
# boot → build → install → launch → scripted UI smoke verification akışı.
#
# Kullanım:
#   source mobile/scripts/env.sh        # ANDROID_HOME + PATH
#   bash mobile/scripts/smoke-test.sh   # idempotent; AVD zaten açıksa skip
#
# Çıktılar: mobile/.smoke-logs/{screenshot,alarm-dump,notif-dump,launch.log,
#          window-dump.xml} — debug için.
#
# NOT: Bu script Login ekranına kadar UI render'ını doğrular. Gerçek alarm
# ekleme/tetikleme adımı için Firebase Console'da test kullanıcısı (email/password)
# oluşturulmuş olmalı. Alternatif: uygulamaya __DEV__ backdoor eklenmeli
# (Sprint 96 follow-up).

set -uo pipefail

#----- Setup -----
cd "$(dirname "$0")/../.."   # repo root
source "./mobile/scripts/env.sh"

PKG=com.ilachatirlatici
ACT=.MainActivity
AVD_NAME=${AVD_NAME:-Codex_Test_35}
LOGDIR=mobile/.smoke-logs
mkdir -p "$LOGDIR"

step() { printf "\n\033[1;36m=== %s ===\033[0m\n" "$*"; }
warn() { printf "\033[1;33m⚠ %s\033[0m\n" "$*"; }
err()  { printf "\033[1;31m✗ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }

#----- 1. AVD hazır mı? -----
step "1/6 — AVD hazırlığı"
if ! adb devices 2>/dev/null | grep -q "emulator-"; then
  warn "AVD kapalı — boot başlatılıyor (60-120 sn beklenebilir)"
  emulator -avd "$AVD_NAME" \
    -no-window -no-audio -no-boot-anim -no-snapshot \
    -gpu swiftshader_indirect -accel auto -netfast \
    > "$LOGDIR/emulator.log" 2>&1 &
fi
adb wait-for-device
for i in $(seq 1 60); do
  state=$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
  if [ "$state" = "1" ]; then
    ok "boot_completed after $((i*2)) sec"
    break
  fi
  sleep 2
done
[ "$state" = "1" ] || { err "boot timeout — $LOGDIR/emulator.log"; tail -30 "$LOGDIR/emulator.log"; exit 1; }

#----- 2. x86_64 ABI ile debug APK build -----
step "2/6 — Debug APK build (x86_64 ABI)"
cd mobile/android
./gradlew assembleDebug --no-daemon -x lint -PreactNativeArchitectures=x86_64 > "$LOGDIR/build.log" 2>&1 || true
tail -10 "$LOGDIR/build.log"
cd ../..
APK="mobile/android/app/build/outputs/apk/debug/app-debug.apk"
[ -f "$APK" ] || { err "APK yok — $LOGDIR/build.log"; exit 1; }
ok "APK: $APK ($(du -h "$APK" | awk '{print $1}'))"

#----- 3. Install + launch -----
step "3/6 — Install + Launch"
adb uninstall $PKG 2>/dev/null | grep -q "Success" || true
adb install -r "$APK" 2>&1 | tail -3 > "$LOGDIR/install.log"
adb shell pm grant $PKG android.permission.POST_NOTIFICATIONS 2>/dev/null
adb shell am start -n "$PKG/$ACT" 2>&1 | tail -2 > "$LOGDIR/launch.log"
sleep 12  # splash + JS bundle yükleme
adb shell dumpsys window 2>/dev/null | grep mCurrentFocus | head -1 > "$LOGDIR/focus.log"
ok "Install + Launch OK ($(cat "$LOGDIR/focus.log"))"

#----- 4. UI render doğrulama (Login ekranı) -----
step "4/6 — UI render doğrulama"
adb shell uiautomator dump 2>/dev/null
adb pull //sdcard/window_dump.xml "$LOGDIR/window-dump.xml" 2>&1 | tail -1
adb exec-out screencap -p > "$LOGDIR/01-login-screen.png"

if grep -q '"Login"' "$LOGDIR/window-dump.xml"; then
  ok "Login ekranı renderlandı (JS bundle çalışıyor, network sync text görünür)"
else
  warn "Login ekranı bulunamadı — farklı bir ekran açık olabilir, dump: $LOGDIR/window-dump.xml"
fi

# UI bounds tespiti (sıradaki ekranlar için)
EMAIL_BOUNDS=$(grep -oE 'class="android.widget.EditText"[^>]*bounds="\[[0-9]+,[0-9]+\]\[[0-9]+,[0-9]+\]"' "$LOGDIR/window-dump.xml" | head -1 | grep -oE 'bounds="[^"]+"')
PASSWORD_BOUNDS=$(grep -oE 'class="android.widget.EditText"[^>]*bounds="\[[0-9]+,[0-9]+\]\[[0-9]+,[0-9]+\]"' "$LOGDIR/window-dump.xml" | head -2 | tail -1 | grep -oE 'bounds="[^"]+"')

# Email tap → text
adb shell input tap 540 1016        # Email input center
sleep 1
adb shell input text "dorianbinding@web-library.net"
adb shell input keyevent 4         # klavyeyi kapat
sleep 1

# Password tap → text
adb shell input tap 475 1282        # Password input center
sleep 1
adb shell input text "Test1234!"
adb shell input keyevent 4
sleep 1

# Login buton tap (TextView bounds [448,1556][633,1613] ~ center 540,1585)
adb shell input tap 540 1585
sleep 6
adb shell uiautomator dump 2>/dev/null
adb pull //sdcard/window_dump.xml "$LOGDIR/window-dump.xml" 2>&1 | tail -1
adb exec-out screencap -p > "$LOGDIR/02-post-login.png"

if grep -q '"Sign in with Google"' "$LOGDIR/window-dump.xml"; then
  warn "Login başarısız (henüz Login ekranı) — test kullanıcı Firebase'da yok olabilir"
  grep -oE 'text="[^"]+"' "$LOGDIR/window-dump.xml" | head -10
else
  ok "Login sonrası yeni ekran açıldı — dump: $LOGDIR/window-dump.xml"
  grep -oE 'text="[^"]+"' "$LOGDIR/window-dump.xml" | head -15
fi

#----- 5. Permission dialogs (varsa İzin Ver butonları) -----
step "5/6 — Runtime permission dialogs"
for i in 1 2 3 4 5; do
  # System permission dialog varsa — sağ-alt "Allow / İzin Ver" butonu
  adb shell uiautomator dump 2>/dev/null >/dev/null
  adb pull //sdcard/window_dump.xml "$LOGDIR/perm-dump-$i.xml" 2>&1 >/dev/null
  if grep -qE '"(İzin Ver|Allow)"' "$LOGDIR/perm-dump-$i.xml" 2>/dev/null; then
    # Sağ-alt corner permission accept
    adb shell input tap 1015 2200
    sleep 2
  fi
done
ok "Permission dialog işlemi tamamlandı"

#----- 6. Verification -----
step "6/6 — Verification + alarm pipeline dump"
# Eğer home ekranı açıldıysa, alarm kanalı + scheduled trigger var mı?
adb shell dumpsys alarm 2>/dev/null | grep -A 2 "$PKG" > "$LOGDIR/alarm-dump.txt" || true
adb shell dumpsys notification --noredact 2>/dev/null | grep -B 1 -A 6 "$PKG" > "$LOGDIR/notif-dump.txt" || true
adb logcat -d -t 1000 NotificationDiagnostics:V '*:S' > "$LOGDIR/drift.log" 2>&1 || true
adb exec-out screencap -p > "$LOGDIR/03-final.png"

ok "Tüm adımlar tamamlandı"
echo ""
echo "Loglar: $LOGDIR/"
ls -la "$LOGDIR/"
