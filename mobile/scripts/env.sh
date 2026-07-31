#!/usr/bin/env bash
# env.sh — Android SDK ortam değişkenlerini kur
# Bu script bash'te source edilmelidir: `source mobile/scripts/env.sh`
set -u
SDK="C:/Users/digienes/AppData/Local/Android/Sdk"
# Git Bash'te forward-slash eşdeğeri
SDK_UNIX="/c/Users/digienes/AppData/Local/Android/Sdk"
export ANDROID_HOME="$SDK_UNIX"
export ANDROID_SDK_ROOT="$SDK_UNIX"
export PATH="$SDK_UNIX/cmdline-tools/latest/bin:$SDK_UNIX/platform-tools:$SDK_UNIX/emulator:$PATH"
# Java 17 — Eclipse Adoptium (Android Studio jbr da olur)
JAVA_HOME_JDK17="/c/Program Files/Eclipse Adoptium/jdk-17.0.18.8-hotspot"
JAVA_HOME_JBR="/c/Program Files/Android/Android Studio/jbr"
if [ -d "$JAVA_HOME_JDK17" ]; then
  export JAVA_HOME="$JAVA_HOME_JDK17"
elif [ -d "$JAVA_HOME_JBR" ]; then
  export JAVA_HOME="$JAVA_HOME_JBR"
fi
export PATH="$JAVA_HOME/bin:$PATH"
echo "ANDROID_HOME=$ANDROID_HOME"
echo "JAVA_HOME=$JAVA_HOME"
echo "adb: $(adb version | head -1)"
echo "java: $(java -version 2>&1 | head -1)"
