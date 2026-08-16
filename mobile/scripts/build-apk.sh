#!/usr/bin/env bash
# mobile/scripts/build-apk.sh
# Android APK/AAB build + dogrulama + (opsiyonel) kurulum.
#
# Neden bu script var — docs/SORUN-COZUMLERI.md'deki iki tuzagi otomatik cozer:
#
#   1. Metro cache (§1): gradle kendi bundler'ini calistirir ve eski cache'lenmis
#      bundle'i kullanabilir. Cozum HER ZAMAN `clean` + `assembleRelease`.
#      Dokumanda ayrica "manuel `npx react-native bundle` GEREKSIZ" deniyor;
#      bu script manuel bundle CALISTIRMAZ, gradle'in kendi bundler'ina birakir.
#
#   2. %99 timeout (§2): gradle APK'yi uretir ama process kapanmaz/asili kalir.
#      Bu script exit code'a KORLEMESINE guvenmez; APK'nin build baslangicindan
#      SONRA olusup olusmadigina ve log'da BUILD SUCCESSFUL olup olmadigina bakar.
#
# Kullanim:
#   bash mobile/scripts/build-apk.sh                    # temiz release APK
#   bash mobile/scripts/build-apk.sh --install --launch # kur + baslat
#   bash mobile/scripts/build-apk.sh --aab              # Play Store icin AAB
#   bash mobile/scripts/build-apk.sh --no-clean         # hizli (cache riski!)
#
# Cikti: mobile/build-logs/build-<tarih>.log

set -uo pipefail

#----------------------------------------------------------------------
# Ayarlar
#----------------------------------------------------------------------
PKG="com.ilachatirlatici"
ACTIVITY=".MainActivity"

DO_INSTALL=0
DO_LAUNCH=0
DO_CLEAN=1
DO_SYNC_VERSION=0
DRY_RUN=0
VARIANT="release"
ARTIFACT="apk"
DEVICE=""
TIMEOUT_SEC=2400

usage() {
    # Shebang'den sonraki bitisik yorum blogunu basliga cevir.
    awk 'NR>1 && /^#/ { sub(/^# ?/, ""); print; next } NR>1 { exit }' "$0"
    cat <<'EOF'

Secenekler:
  --install         APK'yi bagli cihaza kur (adb install -r)
  --launch          Kurulumdan sonra uygulamayi baslat (--install gerektirir)
  --device <seri>   Belirli cihazi hedefle (adb -s <seri>)
  --debug           release yerine debug variant build et
  --aab             APK yerine AAB uret (Play Store yuklemesi icin)
  --no-clean        clean adimini atla — HIZLI ama Metro cache riski var
  --dry-run         Sadece ortam/imza kontrolu yap, build etme
  --sync-version    Build oncesi npm run sync-version calistir
  --timeout <sn>    Gradle timeout (varsayilan: 2400)
  -h, --help        Bu yardim
EOF
}

while [ $# -gt 0 ]; do
    case "$1" in
        --install) DO_INSTALL=1 ;;
        --launch) DO_LAUNCH=1; DO_INSTALL=1 ;;
        --device) DEVICE="${2:-}"; shift ;;
        --debug) VARIANT="debug" ;;
        --aab) ARTIFACT="aab" ;;
        --no-clean) DO_CLEAN=0 ;;
        --dry-run) DRY_RUN=1 ;;
        --sync-version) DO_SYNC_VERSION=1 ;;
        --timeout) TIMEOUT_SEC="${2:-2400}"; shift ;;
        -h|--help) usage; exit 0 ;;
        *) echo "Bilinmeyen secenek: $1" >&2; usage; exit 2 ;;
    esac
    shift
done

#----------------------------------------------------------------------
# Yollar
#----------------------------------------------------------------------
MOBILE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$MOBILE_DIR/android"
REPO_ROOT="$(cd "$MOBILE_DIR/.." && pwd)"
LOG_DIR="$MOBILE_DIR/build-logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/build-$(date +%Y%m%d-%H%M%S).log"

step()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()    { printf '\033[1;32m  OK\033[0m  %s\n' "$*"; }
warn()  { printf '\033[1;33m  !!\033[0m  %s\n' "$*"; }
fail()  { printf '\033[1;31m  XX\033[0m  %s\n' "$*" >&2; }

adb_cmd() { if [ -n "$DEVICE" ]; then adb -s "$DEVICE" "$@"; else adb "$@"; fi; }

#----------------------------------------------------------------------
# Ortam tespiti
# NOT: scripts/env.sh KULLANILMIYOR — orada SDK yolu baska bir kullaniciya
# ('digienes') sabitlenmis ve bu makinede yok. Burada otomatik tespit ediyoruz.
#----------------------------------------------------------------------
step "Ortam tespiti"

if [ -z "${ANDROID_HOME:-}" ] || [ ! -d "${ANDROID_HOME:-}" ]; then
    # NOT: Git Bash'te $USER tanimsizdir (Windows'ta $USERNAME) — set -u ile
    # patlamamasi icin hepsi varsayilanli genisletme ile yaziliyor.
    for c in "${HOME:-}/AppData/Local/Android/Sdk" \
             "${LOCALAPPDATA:-}/Android/Sdk" \
             "/c/Users/${USERNAME:-${USER:-}}/AppData/Local/Android/Sdk"; do
        [ -n "$c" ] && [ -d "$c" ] && { export ANDROID_HOME="$c"; break; }
    done
fi
[ -n "${ANDROID_HOME:-}" ] && [ -d "$ANDROID_HOME" ] || { fail "Android SDK bulunamadi. ANDROID_HOME'u elle ayarlayin."; exit 1; }
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
ok "ANDROID_HOME=$ANDROID_HOME"

# Gradle icin JDK: Android Studio JBR tercih edilir (AGP ile uyumlulugu garanti).
if [ -z "${JAVA_HOME:-}" ] || [ ! -x "${JAVA_HOME:-}/bin/java" ]; then
    for c in "/c/Program Files/Android/Android Studio/jbr" \
             "/c/Program Files/Eclipse Adoptium/jdk-17"*; do
        [ -d "$c" ] && { export JAVA_HOME="$c"; break; }
    done
fi
if [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/java" ]; then
    export PATH="$JAVA_HOME/bin:$PATH"
    ok "JAVA_HOME=$JAVA_HOME"
else
    warn "JAVA_HOME bulunamadi — PATH'teki java kullanilacak"
fi
command -v java >/dev/null || { fail "java bulunamadi"; exit 1; }
ok "java: $(java -version 2>&1 | head -1)"

[ -f "$ANDROID_DIR/gradlew.bat" ] || [ -f "$ANDROID_DIR/gradlew" ] || { fail "gradlew bulunamadi: $ANDROID_DIR"; exit 1; }

#----------------------------------------------------------------------
# Imzalama durumu
# build.gradle release keystore YOKSA sessizce debug keystore'a duser —
# boyle bir APK Play Store'a YUKLENEMEZ. Bunu build oncesi soyluyoruz.
#----------------------------------------------------------------------
step "Imzalama yapilandirmasi"
RELEASE_SIGNED=0
PROPS="$ANDROID_DIR/release-keystore.properties"
if [ -f "$PROPS" ]; then
    STORE_REL="$(grep -E '^\s*storeFile' "$PROPS" | cut -d= -f2- | tr -d ' \r')"
    if [ -n "$STORE_REL" ] && { [ -f "$ANDROID_DIR/$STORE_REL" ] || [ -f "$STORE_REL" ]; }; then
        RELEASE_SIGNED=1
        ok "release keystore mevcut -> gercek release imzasi"
    else
        warn "release-keystore.properties var ama keystore dosyasi yok ($STORE_REL)"
    fi
else
    warn "release-keystore.properties yok"
fi
if [ "$VARIANT" = "release" ] && [ "$RELEASE_SIGNED" -eq 0 ]; then
    warn "DEBUG keystore ile imzalanacak — Play Store'a YUKLENEMEZ (sadece lokal test)"
fi

#----------------------------------------------------------------------
# Versiyon senkronu
#----------------------------------------------------------------------
if [ "$DO_SYNC_VERSION" -eq 1 ]; then
    step "Versiyon senkronu"
    (cd "$MOBILE_DIR" && npm run sync-version) && ok "sync-version tamam" || warn "sync-version basarisiz"
fi

#----------------------------------------------------------------------
# Build
#----------------------------------------------------------------------
if [ "$ARTIFACT" = "aab" ]; then
    GRADLE_TASK="bundle$(echo "${VARIANT^}")"
    OUT_DIR="$ANDROID_DIR/app/build/outputs/bundle/$VARIANT"
    OUT_EXT="aab"
else
    GRADLE_TASK="assemble$(echo "${VARIANT^}")"
    OUT_DIR="$ANDROID_DIR/app/build/outputs/apk/$VARIANT"
    OUT_EXT="apk"
fi

GRADLEW="./gradlew.bat"
[ -f "$ANDROID_DIR/gradlew.bat" ] || GRADLEW="./gradlew"

# Ortami build'e girmeden dogrula (uzun build oncesi hizli kontrol).
if [ "$DRY_RUN" -eq 1 ]; then
    step "Dry-run — build CALISTIRILMADI"
    echo "  gradle task : $GRADLE_TASK"
    echo "  cikti dizini: $OUT_DIR"
    echo "  clean       : $([ "$DO_CLEAN" -eq 1 ] && echo evet || echo HAYIR)"
    exit 0
fi

if [ "$DO_CLEAN" -eq 1 ]; then
    step "gradlew clean  (Metro cache tuzagi — SORUN-COZUMLERI §1)"
    (cd "$ANDROID_DIR" && "$GRADLEW" clean) >>"$LOG_FILE" 2>&1 \
        && ok "clean tamam" || warn "clean hata verdi — build yine de denenecek"
else
    warn "clean ATLANDI — kod degisiklikleri APK'ya yansimayabilir (Metro cache)"
fi

step "gradlew $GRADLE_TASK   (log: ${LOG_FILE#$MOBILE_DIR/})"
# Isaretci: `clean` adimi da log'a "BUILD SUCCESSFUL" yaziyor. Asagidaki
# dogrulama yalnizca BU isaretciden sonrasina bakmali, yoksa assemble
# basarisiz olsa bile clean'in ciktisi yanlis pozitif uretir.
BUILD_MARKER="===ASSEMBLE-STEP-BASLANGICI==="
echo "$BUILD_MARKER" >>"$LOG_FILE"

# Tazelik guvencesi: eski artifact'i SIL, sonra "dosya var" == "bu build uretti".
# Zaman damgasi karsilastirmasi kullanilmiyor cunku artimli build'de gradle
# her seyi up-to-date bulursa APK'ya DOKUNMAZ; mtime eski kalir ve saglam bir
# APK yanlislikla "taze degil" diye reddedilirdi. Ciktiyi silmek ayrica
# gradle'in paketleme task'ini yeniden calistirmasini garantiler.
rm -f "$OUT_DIR"/*."$OUT_EXT" 2>/dev/null || true
# Timeout'a KARSI dayanikli: %99'da asili kalma bilinen bir sorun (§2).
# Exit code'a guvenmiyoruz; asagida artifact tazeligi ile karar veriyoruz.
#
# tee: gradle ciktisi hem EKRANA hem log'a gider. Onceki surum sadece log'a
# yaziyordu; 10+ dakikalik build boyunca konsol tamamen sessiz kaliyor ve
# "kilitlendi" gibi gorunuyordu.
# PIPESTATUS[0] sart: $? tee'nin exit code'unu verir, gradle'inkini degil.
if command -v timeout >/dev/null 2>&1; then
    (cd "$ANDROID_DIR" && timeout "${TIMEOUT_SEC}s" "$GRADLEW" "$GRADLE_TASK") 2>&1 | tee -a "$LOG_FILE"
else
    (cd "$ANDROID_DIR" && "$GRADLEW" "$GRADLE_TASK") 2>&1 | tee -a "$LOG_FILE"
fi
GRADLE_EXIT=${PIPESTATUS[0]}

#----------------------------------------------------------------------
# Dogrulama — exit code YETERLI DEGIL (§2: timeout olsa da APK saglam olabilir)
#----------------------------------------------------------------------
step "Cikti dogrulamasi"

ARTIFACT_PATH="$(ls -t "$OUT_DIR"/*."$OUT_EXT" 2>/dev/null | head -1)"
BUILD_SUCCESS_IN_LOG=0
sed -n "/$BUILD_MARKER/,\$p" "$LOG_FILE" 2>/dev/null | grep -q "BUILD SUCCESSFUL" \
    && BUILD_SUCCESS_IN_LOG=1

FRESH=0
# Build oncesi silindigi icin dosyanin VARLIGI tazeligi kanitlar.
[ -n "$ARTIFACT_PATH" ] && [ -f "$ARTIFACT_PATH" ] && FRESH=1

if [ "$GRADLE_EXIT" -ne 0 ]; then
    if [ "$FRESH" -eq 1 ] && [ "$BUILD_SUCCESS_IN_LOG" -eq 1 ]; then
        warn "gradle exit=$GRADLE_EXIT ama BUILD SUCCESSFUL + taze artifact var."
        warn "Bu bilinen %99 timeout sorunu (SORUN-COZUMLERI §2) — devam ediliyor."
    else
        fail "Build basarisiz (exit=$GRADLE_EXIT). Son 30 satir:"
        tail -30 "$LOG_FILE" >&2
        exit 1
    fi
fi

if [ "$FRESH" -eq 0 ]; then
    fail "Taze artifact uretilmemis. Beklenen dizin: $OUT_DIR"
    tail -30 "$LOG_FILE" >&2
    exit 1
fi

SIZE="$(du -h "$ARTIFACT_PATH" | cut -f1)"
ok "$(basename "$ARTIFACT_PATH")  ($SIZE)"
ok "$ARTIFACT_PATH"

# Imza dogrulamasi: debug keystore'a dusup dusmedigini KANITLAR.
# Windows'ta .bat sarmalayicisi tercih edilir; uzantisiz dosya Git Bash'te
# duzgun calismayabiliyor.
APKSIGNER="$(ls -t "$ANDROID_HOME"/build-tools/*/apksigner.bat 2>/dev/null | head -1)"
[ -n "$APKSIGNER" ] || APKSIGNER="$(ls -t "$ANDROID_HOME"/build-tools/*/apksigner 2>/dev/null | head -1)"
if [ "$OUT_EXT" = "apk" ] && [ -n "$APKSIGNER" ]; then
    # apksigner ciktisi "Signer #1 certificate DN: CN=..." formatinda.
    # (Onceki surum "Subject:" ariyordu — hic eslesmiyor ve blok SESSIZCE
    # atlaniyordu; bu yuzden asagida bulunamama durumu da raporlanir.)
    SIGNER_OUT="$("$APKSIGNER" verify --print-certs "$ARTIFACT_PATH" 2>/dev/null \
        | grep -i "certificate DN" | head -1)"
    if echo "$SIGNER_OUT" | grep -qi "CN=Android Debug"; then
        warn "APK DEBUG sertifikasi ile imzali — Play Store'a YUKLENEMEZ."
    elif [ -n "$SIGNER_OUT" ]; then
        ok "imza: ${SIGNER_OUT#*DN: }"
    else
        warn "imza dogrulanamadi (apksigner beklenen ciktiyi vermedi)"
    fi
elif [ "$OUT_EXT" = "apk" ]; then
    warn "apksigner bulunamadi — imza dogrulanamadi"
fi

# Kolay erisim icin proje kok dizinine kopyala.
# NOT: .gitignore'a eklendi — bu dosya commit EDILMEMELI (70 MB; daha once
# repo'ya girmis ve sisirmisti).
ROOT_COPY="$REPO_ROOT/$(basename "$ARTIFACT_PATH")"
if cp -f "$ARTIFACT_PATH" "$ROOT_COPY" 2>/dev/null; then
    ok "kok dizine kopyalandi: $ROOT_COPY"
else
    warn "kok dizine kopyalanamadi: $ROOT_COPY"
fi

#----------------------------------------------------------------------
# Kurulum / baslatma
#----------------------------------------------------------------------
if [ "$DO_INSTALL" -eq 1 ]; then
    if [ "$OUT_EXT" = "aab" ]; then
        warn "AAB dogrudan kurulamaz (bundletool gerekir) — kurulum atlandi"
    else
        step "Cihaza kurulum"
        DEV_COUNT="$(adb devices | grep -cw "device" || true)"
        if [ "$DEV_COUNT" -eq 0 ]; then
            fail "Bagli cihaz yok (adb devices bos)"
            exit 1
        fi
        if adb_cmd install -r "$ARTIFACT_PATH" >>"$LOG_FILE" 2>&1; then
            ok "kuruldu"
        else
            warn "install -r basarisiz — imza degisimi olabilir, kaldirip deneniyor"
            adb_cmd uninstall "$PKG" >>"$LOG_FILE" 2>&1
            adb_cmd install "$ARTIFACT_PATH" >>"$LOG_FILE" 2>&1 \
                && ok "kaldirip kuruldu" || { fail "kurulum basarisiz — bkz. $LOG_FILE"; exit 1; }
        fi

        if [ "$DO_LAUNCH" -eq 1 ]; then
            step "Uygulama baslatiliyor"
            adb_cmd shell am start -n "$PKG/$ACTIVITY" >>"$LOG_FILE" 2>&1 \
                && ok "baslatildi" || warn "baslatilamadi"
        fi
    fi
fi

step "Bitti"
echo "  artifact : $ARTIFACT_PATH"
[ -f "$ROOT_COPY" ] && echo "  kok kopya: $ROOT_COPY"
echo "  log      : $LOG_FILE"
