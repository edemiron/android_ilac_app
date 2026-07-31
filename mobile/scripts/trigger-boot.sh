#!/usr/bin/env bash
# mobile/scripts/trigger-boot.sh
# AVD'de BootReceiver'ı manuel tetikle.
#
# Kullanım:
#   source mobile/scripts/env.sh
#   bash mobile/scripts/trigger-boot.sh              # MY_PACKAGE_REPLACED broadcast
#   bash mobile/scripts/trigger-boot.sh boot         # BOOT_COMPLETED simulation
#
# Not: prebuilt AndroidManifest'te BootReceiver exported=true ise
# (mobile/plugins/withBootReceiver.js yeni prebuild üretirse false yapabilir).
# Gerçek reboot için: bash trigger-boot.sh reboot (AVD yeniden başlatır — yavaş).

set -uo pipefail
source "$(dirname "$0")/env.sh"
PKG=com.ilachatirlatici

case "${1:-broadcast}" in
  broadcast)
    adb shell am broadcast \
      -a android.intent.action.MY_PACKAGE_REPLACED \
      -n $PKG/.BootReceiver
    sleep 3
    adb logcat -d -t 100 ReactNativeJS:V '*:S' 2>&1 | tail -5
    ;;
  boot)
    adb shell am broadcast \
      -a android.intent.action.BOOT_COMPLETED \
      -n $PKG/.BootReceiver
    sleep 3
    ;;
  time)
    adb shell am broadcast \
      -a android.intent.action.TIME_SET \
      -n $PKG/.BootReceiver
    sleep 3
    ;;
  tz)
    adb shell am broadcast \
      -a android.intent.action.TIMEZONE_CHANGED \
      -n $PKG/.BootReceiver
    sleep 3
    ;;
  reboot)
    warn "AVD reboot (30-60 sn)"
    adb reboot
    adb wait-for-device
    for i in $(seq 1 30); do
      state=$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
      [ "$state" = "1" ] && break
      sleep 2
    done
    ;;
  *)
    echo "Kullanım: $0 {broadcast|boot|time|tz|reboot}"
    exit 1
    ;;
esac
