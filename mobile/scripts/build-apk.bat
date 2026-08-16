@echo off
setlocal EnableDelayedExpansion
REM ============================================================================
REM  mobile\scripts\build-apk.bat
REM  Android APK/AAB build + dogrulama + (opsiyonel) kurulum  -- cmd.exe surumu
REM
REM  build-apk.sh ile ayni isi yapar; Git Bash gerektirmez.
REM  docs\SORUN-COZUMLERI.md'deki iki tuzagi otomatik cozer:
REM
REM   1) Metro cache (SS1): gradle kendi bundler'ini calistirir ve eski
REM      cache'lenmis bundle'i kullanabilir. Cozum HER ZAMAN clean + assemble.
REM      Manuel "npx react-native bundle" GEREKSIZ -- bu script calistirmaz.
REM
REM   2) %%99 timeout (SS2): gradle APK'yi uretir ama process asili kalabilir.
REM      Bu script exit code'a KORLEMESINE guvenmez. Build oncesi hedef
REM      artifact'i SILER; sonrasinda dosya yeniden olustuysa build basarilidir.
REM
REM  Kullanim:
REM    scripts\build-apk.bat                     temiz release APK
REM    scripts\build-apk.bat --install --launch  kur + baslat
REM    scripts\build-apk.bat --aab               Play Store icin AAB
REM    scripts\build-apk.bat --no-clean          hizli (cache riski!)
REM
REM  Cikti: mobile\build-logs\build-<tarih>.log
REM ============================================================================

REM DIKKAT: script dizini ARGUMAN AYRISTIRMADAN ONCE yakalanmali.
REM `shift` komutu %0'i da kaydirir; ayristirma dongusunden sonra %~dp0
REM artik script'in yolu degil, ilk argumanin "yolu" olur (yani cwd).
set "SCRIPT_DIR=%~dp0"

set "PKG=com.ilachatirlatici"
set "ACTIVITY=.MainActivity"

set "DO_INSTALL=0"
set "DO_LAUNCH=0"
set "DO_CLEAN=1"
set "DO_SYNC_VERSION=0"
set "DRY_RUN=0"
set "VARIANT=release"
set "VARIANT_CAP=Release"
set "ARTIFACT_KIND=apk"
set "DEVICE="

REM ---------------------------------------------------------------- argumanlar
:parse_args
if "%~1"=="" goto args_done
if /i "%~1"=="--install"      ( set "DO_INSTALL=1" & shift & goto parse_args )
if /i "%~1"=="--launch"       ( set "DO_INSTALL=1" & set "DO_LAUNCH=1" & shift & goto parse_args )
if /i "%~1"=="--device"       ( set "DEVICE=%~2" & shift & shift & goto parse_args )
if /i "%~1"=="--debug"        ( set "VARIANT=debug" & set "VARIANT_CAP=Debug" & shift & goto parse_args )
if /i "%~1"=="--aab"          ( set "ARTIFACT_KIND=aab" & shift & goto parse_args )
if /i "%~1"=="--no-clean"     ( set "DO_CLEAN=0" & shift & goto parse_args )
if /i "%~1"=="--dry-run"      ( set "DRY_RUN=1" & shift & goto parse_args )
if /i "%~1"=="--sync-version" ( set "DO_SYNC_VERSION=1" & shift & goto parse_args )
if /i "%~1"=="-h"             goto show_help
if /i "%~1"=="--help"         goto show_help
echo Bilinmeyen secenek: %~1
goto show_help
:args_done

REM ---------------------------------------------------------------------- yollar
set "MOBILE_DIR=%SCRIPT_DIR%.."
pushd "%MOBILE_DIR%" || (echo HATA: mobile dizinine girilemedi & exit /b 1)
set "MOBILE_DIR=%CD%"
popd
set "ANDROID_DIR=%MOBILE_DIR%\android"
pushd "%MOBILE_DIR%\.."
set "REPO_ROOT=%CD%"
popd
set "LOG_DIR=%MOBILE_DIR%\build-logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

for /f "tokens=* delims=" %%t in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "STAMP=%%t"
set "LOG_FILE=%LOG_DIR%\build-%STAMP%.log"
set "ASM_LOG=%LOG_DIR%\assemble-%STAMP%.tmp.log"

REM ------------------------------------------------------------ ortam tespiti
echo.
echo ==^> Ortam tespiti

if not defined ANDROID_HOME set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
if not exist "%ANDROID_HOME%" set "ANDROID_HOME=%USERPROFILE%\AppData\Local\Android\Sdk"
if not exist "%ANDROID_HOME%" (
    echo   XX  Android SDK bulunamadi. ANDROID_HOME'u elle ayarlayin.
    exit /b 1
)
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
set "PATH=%ANDROID_HOME%\platform-tools;%PATH%"
echo   OK  ANDROID_HOME=%ANDROID_HOME%

REM Gradle icin JDK 17 tercih edilir; yoksa Android Studio JBR.
if not exist "%JAVA_HOME%\bin\java.exe" set "JAVA_HOME="
if not defined JAVA_HOME (
    for /d %%d in ("%ProgramFiles%\Microsoft\jdk-17*") do set "JAVA_HOME=%%d"
)
if not defined JAVA_HOME (
    for /d %%d in ("%ProgramFiles%\Eclipse Adoptium\jdk-17*") do set "JAVA_HOME=%%d"
)
if not defined JAVA_HOME (
    if exist "%ProgramFiles%\Android\Android Studio\jbr\bin\java.exe" set "JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr"
)
if defined JAVA_HOME (
    set "PATH=!JAVA_HOME!\bin;%PATH%"
    echo   OK  JAVA_HOME=!JAVA_HOME!
) else (
    echo   !!  JAVA_HOME bulunamadi -- PATH'teki java kullanilacak
)

where java >nul 2>&1 || (echo   XX  java bulunamadi & exit /b 1)

if not exist "%ANDROID_DIR%\gradlew.bat" (
    echo   XX  gradlew.bat bulunamadi: %ANDROID_DIR%
    exit /b 1
)

REM ------------------------------------------------------- imzalama durumu
echo.
echo ==^> Imzalama yapilandirmasi
set "RELEASE_SIGNED=0"
set "PROPS=%ANDROID_DIR%\release-keystore.properties"
if exist "%PROPS%" (
    for /f "usebackq tokens=1,* delims==" %%a in ("%PROPS%") do (
        if /i "%%a"=="storeFile" set "STORE_REL=%%b"
    )
    if defined STORE_REL (
        set "STORE_REL=!STORE_REL: =!"
        if exist "%ANDROID_DIR%\!STORE_REL!" set "RELEASE_SIGNED=1"
        if exist "!STORE_REL!" set "RELEASE_SIGNED=1"
    )
)
if "!RELEASE_SIGNED!"=="1" (
    echo   OK  release keystore mevcut -- gercek release imzasi
) else (
    echo   !!  release keystore YOK
    if /i "%VARIANT%"=="release" echo   !!  DEBUG keystore ile imzalanacak -- Play Store'a YUKLENEMEZ
)

REM ------------------------------------------------------------ versiyon senkronu
if "%DO_SYNC_VERSION%"=="1" (
    echo.
    echo ==^> Versiyon senkronu
    pushd "%MOBILE_DIR%"
    call npm run sync-version >>"%LOG_FILE%" 2>&1 && (echo   OK  sync-version tamam) || (echo   !!  sync-version basarisiz)
    popd
)

REM ------------------------------------------------------------------- hedefler
if /i "%ARTIFACT_KIND%"=="aab" (
    set "GRADLE_TASK=bundle%VARIANT_CAP%"
    set "OUT_DIR=%ANDROID_DIR%\app\build\outputs\bundle\%VARIANT%"
    set "OUT_EXT=aab"
) else (
    set "GRADLE_TASK=assemble%VARIANT_CAP%"
    set "OUT_DIR=%ANDROID_DIR%\app\build\outputs\apk\%VARIANT%"
    set "OUT_EXT=apk"
)

REM Ortami build'e girmeden dogrula (uzun build oncesi hizli kontrol).
if "%DRY_RUN%"=="1" (
    echo.
    echo ==^> Dry-run -- build CALISTIRILMADI
    echo   gradle task : !GRADLE_TASK!
    echo   cikti dizini: !OUT_DIR!
    if "%DO_CLEAN%"=="1" ( echo   clean       : evet ) else ( echo   clean       : HAYIR )
    exit /b 0
)

REM ---------------------------------------------------------------------- clean
if "%DO_CLEAN%"=="1" (
    echo.
    echo ==^> gradlew clean   ^(Metro cache tuzagi -- SORUN-COZUMLERI SS1^)
    pushd "%ANDROID_DIR%"
    REM TAM YOL sart: bu sistemde cmd.exe calistirilabilir ararken gecerli
    REM dizine BAKMIYOR (NoDefaultCurrentDirectoryInExePath). pushd ile android
    REM dizinindeyken bile bare "gradlew.bat" -> "is not recognized" verir.
    call "%ANDROID_DIR%\gradlew.bat" clean >>"%LOG_FILE%" 2>&1
    if errorlevel 1 ( echo   !!  clean hata verdi -- build yine de denenecek ) else ( echo   OK  clean tamam )
    popd
) else (
    echo   !!  clean ATLANDI -- kod degisiklikleri APK'ya yansimayabilir ^(Metro cache^)
)

REM Tazelik guvencesi: eski artifact'i SIL. Boylece "dosya var" == "bu build uretti".
REM Timestamp karsilastirmasindan daha guvenilir ve batch'te daha basit.
if exist "!OUT_DIR!\*.!OUT_EXT!" del /q "!OUT_DIR!\*.!OUT_EXT!" >nul 2>&1

REM ---------------------------------------------------------------------- build
echo.
echo ==^> gradlew !GRADLE_TASK!   ^(log: build-logs\build-%STAMP%.log^)
pushd "%ANDROID_DIR%"
REM Ciktiyi hem EKRANA hem log'a yaz. Onceki surum sadece log'a yaziyordu;
REM 10+ dakikalik build boyunca konsol tamamen sessiz kaliyor ve "kilitlendi"
REM gibi gorunuyordu. Batch'te yerlesik tee yok -> PowerShell Tee-Object.
REM ForEach-Object { "$_" }: native stderr'i ErrorRecord yerine duz metne
REM cevirir, yoksa PowerShell kirmizi hata bloklari basar.
REM exit $LASTEXITCODE sart: yoksa %errorlevel% gradle'in degil PowerShell'in
REM cikis kodunu tasir.
powershell -NoProfile -ExecutionPolicy Bypass -Command "& '%ANDROID_DIR%\gradlew.bat' !GRADLE_TASK! 2>&1 | ForEach-Object { \"$_\" } | Tee-Object -FilePath '%ASM_LOG%'; exit $LASTEXITCODE"
set "GRADLE_EXIT=!errorlevel!"
popd
type "%ASM_LOG%" >>"%LOG_FILE%" 2>nul

REM ----------------------------------------------------------------- dogrulama
echo.
echo ==^> Cikti dogrulamasi

set "ARTIFACT_PATH="
for %%f in ("!OUT_DIR!\*.!OUT_EXT!") do set "ARTIFACT_PATH=%%~ff"

set "BUILD_OK_IN_LOG=0"
REM Sadece assemble log'una bakiyoruz -- clean de "BUILD SUCCESSFUL" yaziyor.
findstr /c:"BUILD SUCCESSFUL" "%ASM_LOG%" >nul 2>&1 && set "BUILD_OK_IN_LOG=1"

if not "!GRADLE_EXIT!"=="0" (
    if defined ARTIFACT_PATH if "!BUILD_OK_IN_LOG!"=="1" (
        echo   !!  gradle exit=!GRADLE_EXIT! ama BUILD SUCCESSFUL + taze artifact var.
        echo   !!  Bilinen %%99 timeout sorunu ^(SORUN-COZUMLERI SS2^) -- devam ediliyor.
        goto verify_ok
    )
    echo   XX  Build basarisiz ^(exit=!GRADLE_EXIT!^). Son satirlar:
    powershell -NoProfile -Command "Get-Content -Tail 30 '%ASM_LOG%'"
    del /q "%ASM_LOG%" >nul 2>&1
    exit /b 1
)

if not defined ARTIFACT_PATH (
    echo   XX  Taze artifact uretilmemis. Beklenen dizin: !OUT_DIR!
    powershell -NoProfile -Command "Get-Content -Tail 30 '%ASM_LOG%'"
    del /q "%ASM_LOG%" >nul 2>&1
    exit /b 1
)

:verify_ok
del /q "%ASM_LOG%" >nul 2>&1

for %%f in ("!ARTIFACT_PATH!") do set /a "SIZE_MB=%%~zf/1048576"
echo   OK  artifact: !ARTIFACT_PATH! ^(!SIZE_MB! MB^)

REM Imza dogrulamasi -- debug keystore'a dusup dusmedigini KANITLAR.
if /i "!OUT_EXT!"=="apk" (
    set "APKSIGNER="
    REM dir /s YOL ORTASINDA joker kabul etmez ("build-tools\*\apksigner.bat"
    REM sozdizimi hatasi verir). Dosya adiyla ozyinelemeli aranir; sonuclar
    REM surum sirasinda geldigi icin SONUNCUSU en yeni build-tools olur.
    for /f "delims=" %%s in ('dir /b /s "%ANDROID_HOME%\build-tools\apksigner.bat" 2^>nul') do set "APKSIGNER=%%s"
    if defined APKSIGNER (
        REM apksigner ciktisi: "Signer #1 certificate DN: CN=..."
        REM findstr /c: SART -- tirnak icindeki bosluklu ifade /c: olmadan
        REM "certificate VEYA DN" diye yorumlanir.
        for /f "delims=" %%c in ('call "!APKSIGNER!" verify --print-certs "!ARTIFACT_PATH!" 2^>nul ^| findstr /i /c:"certificate DN"') do (
            if not defined CERT_LINE set "CERT_LINE=%%c"
        )
        if defined CERT_LINE (
            echo !CERT_LINE! | findstr /i /c:"CN=Android Debug" >nul && (
                echo   !!  APK DEBUG sertifikasi ile imzali -- Play Store'a YUKLENEMEZ.
            ) || (
                echo   OK  imza: !CERT_LINE!
            )
        ) else (
            echo   !!  imza dogrulanamadi ^(apksigner beklenen ciktiyi vermedi^)
        )
    ) else (
        echo   !!  apksigner bulunamadi -- imza dogrulanamadi
    )
)

REM Kolay erisim icin proje kok dizinine kopyala.
REM NOT: .gitignore'a eklendi -- bu dosya commit EDILMEMELI (70 MB; daha once
REM repo'ya girmis ve sisirmisti).
for %%f in ("!ARTIFACT_PATH!") do set "ROOT_COPY=%REPO_ROOT%\%%~nxf"
copy /y "!ARTIFACT_PATH!" "!ROOT_COPY!" >nul 2>&1
if exist "!ROOT_COPY!" (
    echo   OK  kok dizine kopyalandi: !ROOT_COPY!
) else (
    echo   !!  kok dizine kopyalanamadi: !ROOT_COPY!
)

REM ------------------------------------------------------------------- kurulum
if "%DO_INSTALL%"=="1" (
    if /i "!OUT_EXT!"=="aab" (
        echo   !!  AAB dogrudan kurulamaz ^(bundletool gerekir^) -- kurulum atlandi
        goto done
    )
    echo.
    echo ==^> Cihaza kurulum
    set "ADB=adb"
    if defined DEVICE set "ADB=adb -s %DEVICE%"

    set "DEV_FOUND=0"
    for /f "skip=1 tokens=2" %%d in ('adb devices 2^>nul') do (
        if /i "%%d"=="device" set "DEV_FOUND=1"
    )
    if "!DEV_FOUND!"=="0" (
        echo   XX  Bagli cihaz yok ^(adb devices bos^)
        exit /b 1
    )

    !ADB! install -r "!ARTIFACT_PATH!" >>"%LOG_FILE%" 2>&1
    if errorlevel 1 (
        echo   !!  install -r basarisiz -- imza degisimi olabilir, kaldirip deneniyor
        !ADB! uninstall %PKG% >>"%LOG_FILE%" 2>&1
        !ADB! install "!ARTIFACT_PATH!" >>"%LOG_FILE%" 2>&1
        if errorlevel 1 (
            echo   XX  kurulum basarisiz -- bkz. %LOG_FILE%
            exit /b 1
        )
        echo   OK  kaldirip kuruldu
    ) else (
        echo   OK  kuruldu
    )

    if "%DO_LAUNCH%"=="1" (
        echo.
        echo ==^> Uygulama baslatiliyor
        !ADB! shell am start -n %PKG%/%ACTIVITY% >>"%LOG_FILE%" 2>&1
        if errorlevel 1 ( echo   !!  baslatilamadi ) else ( echo   OK  baslatildi )
    )
)

:done
echo.
echo ==^> Bitti
echo   artifact : !ARTIFACT_PATH!
if exist "!ROOT_COPY!" echo   kok kopya: !ROOT_COPY!
echo   log      : %LOG_FILE%
exit /b 0

REM ------------------------------------------------------------------- yardim
:show_help
echo.
echo build-apk.bat -- Android APK/AAB build ^(cmd.exe surumu^)
echo.
echo Kullanim: scripts\build-apk.bat [secenekler]
echo.
echo   --install         APK'yi bagli cihaza kur ^(adb install -r^)
echo   --launch          Kurulumdan sonra uygulamayi baslat ^(--install gerektirir^)
echo   --device ^<seri^>   Belirli cihazi hedefle ^(adb -s^)
echo   --debug           release yerine debug variant build et
echo   --aab             APK yerine AAB uret ^(Play Store yuklemesi icin^)
echo   --no-clean        clean adimini atla -- HIZLI ama Metro cache riski var
echo   --dry-run         Sadece ortam/imza kontrolu yap, build etme
echo   --sync-version    Build oncesi npm run sync-version calistir
echo   -h, --help        Bu yardim
echo.
echo Not: Bash surumu icin scripts\build-apk.sh ^(--timeout secenegi orada var^).
exit /b 0
