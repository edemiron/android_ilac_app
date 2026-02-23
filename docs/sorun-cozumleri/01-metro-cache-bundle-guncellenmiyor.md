# Sorun #1: Metro Cache - Kod Değişiklikleri Bundle'a Dahil Edilmiyor

**Tarih:** 2025-02-23

## Sorun
Kod değişiklikleri yapıldı (örn: ColorPicker.tsx'e kategori chip'leri eklendi) ama `gradlew assembleRelease` sonrası APK'da görünmüyor.

## Kök Neden
Gradle'ın `createBundleReleaseJsAndAssets` task'ı kendi Metro bundler'ını çalıştırıyor ve eski cache'lenmiş bundle'ı kullanıyor. Metro cache temizlenmediği için eski kod bundle'a giriyor.

## Veri Akışı
```
Kod Değişikliği (ColorPicker.tsx)
    ↓
Metro Bundler (cache kontrol)
    ↓
Cache var mı? → EVET → Eski bundle kullan ❌
    ↓
Cache yok mu? → HAYIR → Yeni bundle oluştur ✅
    ↓
Gradle createBundleReleaseJsAndAssets
    ↓
APK'ya bundle dahil et
```

## Çözüm
Her build öncesi `clean` task'ını çalıştır:

```bash
cd mobile/android
.\gradlew.bat clean
.\gradlew.bat assembleRelease --no-daemon
cd ..
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

## Neden Bu Çalışıyor?
- `clean` task'ı `build/` klasörünü tamamen siler
- Metro bundler cache'i de `build/` içinde saklanıyor
- Yeni build'de Metro cache bulamayınca yeni bundle oluşturuyor
- Build log'da "Bundler cache is empty, rebuilding" mesajı görülür

## YAPILMAMASI GEREKENLER

### ❌ Manuel Bundle Oluşturma
```bash
# GEREKSIZ - Gradle zaten kendi bundler'ını çalıştırıyor
npx react-native bundle --entry-file index.ts ...
```

### ❌ node_modules Cache Silme
```bash
# GEREKSIZ - Sorun Metro cache'inde, node_modules'de değil
rm -rf node_modules/.cache
```

### ❌ Metro Server Manuel Başlatma
```bash
# GEREKSIZ - Release build Metro server kullanmıyor
npx react-native start --reset-cache
```

## Doğrulama
Build log'unda şu mesajları ara:

✅ **Başarılı:**
```
info: Bundler cache is empty, rebuilding (this may take a minute)...
info: Done writing bundle output
```

❌ **Başarısız (cache kullanıldı):**
```
info: Using cached bundle
```

## İlgili Dosyalar
- `mobile/android/app/build.gradle` - `createBundleReleaseJsAndAssets` task tanımı
- `mobile/android/build/` - Metro cache konumu
- `mobile/index.ts` - Bundle entry point

## Alternatif Çözümler

### 1. Her Zaman Clean Build
`mobile/android/gradle.properties` dosyasına ekle:
```properties
# Her build'de otomatik clean (yavaşlatır)
org.gradle.caching=false
```

### 2. Selective Clean
Sadece JS bundle cache'ini temizle:
```bash
cd mobile/android
.\gradlew.bat cleanBuildCache
.\gradlew.bat assembleRelease --no-daemon
```

## Test Edildi
- ✅ ColorPicker kategori chip'leri APK'da görünüyor
- ✅ Build log'da "Bundler cache is empty" mesajı var
- ✅ APK boyutu değişti (yeni kod eklendi)

## Önleme
Her kod değişikliğinden sonra:
1. `clean` + `assembleRelease` birlikte çalıştır
2. Build log'unda cache mesajlarını kontrol et
3. APK'yı test cihazında doğrula
