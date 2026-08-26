#!/usr/bin/env bash
# mobile/scripts/seed-smoke-medicine.sh
# Sprint 96.1 — AsyncStorage'a bypassBuffer=false seed ekle, 90s alarm fires'ı izle.

set -uo pipefail
source "$(dirname "$0")/env.sh"

cd "$(dirname "$0")/../.."

SEED_NAME="${SEED_NAME:-SmokeSeed}"
TRIGGER_SECONDS="${TRIGGER_SECONDS:-90}"
LOGDIR=mobile/.smoke-logs
mkdir -p "$LOGDIR"

echo "=========================================="
echo "  Sprint 96.1 — seed smoke medicine"
echo "  Trigger offset: ${TRIGGER_SECONDS}s"
echo "  Medicine name:  $SEED_NAME"
echo "=========================================="
echo ""

# Python script çalıştır
PYTHONPATH=$(which python3 2>/dev/null || which python)
"$PYTHONPATH" mobile/scripts/seed-smoke-medicine.py \
  --seconds="$TRIGGER_SECONDS" \
  --name="$SEED_NAME" 2>&1 | tee "$LOGDIR/seed.log"

echo ""
echo "=========================================="
echo "  Alarm fires monitor başladı"
echo "  Toplam bekleme: $TRIGGER_SECONDS saniye"
echo "=========================================="

TOTAL=$TRIGGER_SECONDS
INTERVAL=15
TICK=0
while [ $TICK -lt $TOTAL ]; do
  sleep $INTERVAL
  TICK=$((TICK + INTERVAL))
  REMAIN=$((TOTAL - TICK))
  if [ $REMAIN -lt 0 ]; then REMAIN=0; fi
  echo ""
  echo "--- tick +${TICK}s (kalan: ${REMAIN}s) ---"
  # Alarm fires olmuş mu?
  TRIG=$(adb shell dumpsys notification --noredact 2>/dev/null | grep -B 1 -A 4 "pkg=com.ilachatirlatici" 2>/dev/null | head -10 || true)
  if echo "$TRIG" | grep -q "importance"; then
    echo "  ✓ Bildirim channel/record görünür:"
    echo "$TRIG" | head -10
  else
    # JS logları
    adb logcat -d -t 100 ReactNativeJS:V '*:S' 2>/dev/null | grep -iE "alarm|trigger|schedul" | tail -5 || true
  fi
done

echo ""
echo "=========================================="
echo "  Final verification"
echo "=========================================="
adb exec-out screencap -p > "$LOGDIR/seed-final.png"
WIN_TMP=$(cygpath -w /tmp 2>/dev/null)
cp "$LOGDIR/seed-final.png" "$WIN_TMP/seed-final.png" 2>/dev/null || true
adb shell dumpsys notification --noredact 2>/dev/null | grep -B 1 -A 6 "pkg=com.ilachatirlatici" > "$LOGDIR/seed-notif-dump.txt" || true
adb logcat -d -t 500 ReactNativeJS:V '*:S' > "$LOGDIR/seed-js.log" 2>&1 || true

echo "  ✓ Screenshot: $LOGDIR/seed-final.png"
echo "  ✓ Notification dump: $LOGDIR/seed-notif-dump.txt"
echo "  ✓ JS log: $LOGDIR/seed-js.log"
echo ""
echo "  İlaç 'Next Dose' satırı:"
adb shell uiautomator dump 2>/dev/null >/dev/null
adb pull //sdcard/window_dump.xml "$WIN_TMP/seed-dump.xml" 2>/dev/null | tail -1 || true
grep -oE 'text="(SmokeSeed|Next Dose[^"]+|Aldım[^"]+)"' "$WIN_TMP/seed-dump.xml" 2>/dev/null | head -5 || echo "  (UI dump mevcut değil — app ölmüş veya alarm modalı açmış olabilir)"
