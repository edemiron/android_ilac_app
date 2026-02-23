# Sorun #2: Build %99'da Timeout Oluyor

**Tarih:** 2025-02-23

## Sorun
`gradlew.bat assembleRelease --no-daemon` komutu %99'da takılıyor ve timeout veriyor. Ancak APK dosyası başarıyla oluşuyor.

## Kök Neden
Gradle build işlemi tamamlanıyor ve APK üretiliyor, ancak build process'i düzgün kapanmıyor veya son adımda bekliyor. Bu genellikle:
- Daemon process'lerinin temizlenmemesi
- Background task'ların bitmemesi
- Log output buffer'ının flush edilmemesi

## Çözüm
APK başarıyla oluştuğu için timeout'u görmezden gel ve direkt install et:

```bash
cd mobile
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

## Alternatif Çözümler

### 1. Timeout Süresini Artır
`mobile/android/gradle.properties` dosyasına ekle:
```properties
org.gradle.daemon=false
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m
```

### 2. Build Sonrası Manuel Install
Build timeout olsa bile APK oluşuyorsa:
```bash
# Build'i başlat (timeout olabilir)
cd mobile/android
.\gradlew.bat assembleRelease --no-daemon

# APK'yı kontrol et
dir app\build\outputs\apk\release\app-release.apk

# Varsa yükle
cd ..\..
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

## Önemli Notlar
- APK dosyası `mobile/android/app/build/outputs/apk/release/app-release.apk` konumunda oluşuyor
- Timeout olsa bile APK genellikle kullanılabilir durumda
- `--no-daemon` flag'i zaten daemon'ları kapatıyor, sorun başka bir yerde
- Build log'unda "BUILD SUCCESSFUL" görülüyorsa APK güvenle kullanılabilir

## İlgili Dosyalar
- `mobile/android/gradle.properties`
- `mobile/android/app/build.gradle`

## Test Edildi
- ✅ APK yüklendi ve çalıştı
- ✅ Kod değişiklikleri bundle'a dahil oldu
