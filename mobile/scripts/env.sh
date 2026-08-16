#!/usr/bin/env bash
# env.sh — Android SDK + JDK ortam degiskenlerini kur
# Bu script bash'te source edilmelidir: `source mobile/scripts/env.sh`
#
# NOT: Onceki surumde SDK ve JDK yollari tek bir gelistirici makinesine
# ('digienes') sabitlenmisti ve baska makinede sessizce bozuluyordu.
# Artik otomatik tespit ediliyor; ANDROID_HOME/JAVA_HOME zaten set ise
# ve gecerliyse onlara dokunulmuyor.
set -u

#----- Android SDK -----
if [ -z "${ANDROID_HOME:-}" ] || [ ! -d "${ANDROID_HOME:-}" ]; then
    # Git Bash'te $USER tanimsizdir (Windows'ta $USERNAME) — varsayilanli genislet.
    for c in "${HOME:-}/AppData/Local/Android/Sdk" \
             "${LOCALAPPDATA:-}/Android/Sdk" \
             "/c/Users/${USERNAME:-${USER:-}}/AppData/Local/Android/Sdk"; do
        if [ -n "$c" ] && [ -d "$c" ]; then
            export ANDROID_HOME="$c"
            break
        fi
    done
fi

if [ -n "${ANDROID_HOME:-}" ] && [ -d "$ANDROID_HOME" ]; then
    export ANDROID_SDK_ROOT="$ANDROID_HOME"
    export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
else
    echo "UYARI: Android SDK bulunamadi — ANDROID_HOME'u elle ayarlayin" >&2
fi

#----- JDK (Gradle icin 17 tercih edilir) -----
if [ -z "${JAVA_HOME:-}" ] || [ ! -x "${JAVA_HOME:-}/bin/java" ]; then
    for c in "/c/Program Files/Microsoft/jdk-17"* \
             "/c/Program Files/Eclipse Adoptium/jdk-17"* \
             "/c/Program Files/Android/Android Studio/jbr"; do
        if [ -d "$c" ]; then
            export JAVA_HOME="$c"
            break
        fi
    done
fi

if [ -n "${JAVA_HOME:-}" ] && [ -d "$JAVA_HOME" ]; then
    export PATH="$JAVA_HOME/bin:$PATH"
else
    echo "UYARI: JDK bulunamadi — PATH'teki java kullanilacak" >&2
fi

#----- Ozet -----
echo "ANDROID_HOME=${ANDROID_HOME:-<yok>}"
echo "JAVA_HOME=${JAVA_HOME:-<yok>}"
command -v adb  >/dev/null && echo "adb: $(adb version | head -1)"          || echo "adb: <yok>"
command -v java >/dev/null && echo "java: $(java -version 2>&1 | head -1)"  || echo "java: <yok>"
