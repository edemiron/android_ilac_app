# Sorun Çözümleri

Bu dosya projede karşılaşılan sorunları ve çözümlerini içerir.

> **Aşağıdaki §1 ve §2 artık otomatik çözülüyor.** Elle gradle çağırmak yerine
> build script'ini kullanın — `clean` adımını hep uygular ve %99 timeout'unda
> exit code yerine APK'nın gerçekten üretilip üretilmediğine bakar:
>
> ```bash
> npm run build:release          # veya: bash mobile/scripts/build-apk.sh
> npm run build:device           # kur + başlat
> ```
>
> cmd.exe için: `mobile\scripts\build-apk.bat` (Git Bash gerektirmez).
> Uzun build'e girmeden ortamı kontrol etmek için: `--dry-run`.

**Detaylı Çözüm:** [docs/sorun-cozumleri/02-build-timeout-99-percent.md](sorun-cozumleri/02-build-timeout-99-percent.md)

---

## 2. Build %99'da Timeout Oluyor

**Tarih:** 2025-02-23

**Sorun:**
`gradlew.bat assembleRelease --no-daemon` komutu %99'da takılıyor ve timeout veriyor. Ancak APK dosyası başarıyla oluşuyor.

**Kök Neden:**
Gradle build işlemi tamamlanıyor ve APK üretiliyor, ancak build process'i düzgün kapanmıyor veya son adımda bekliyor.

**Çözüm:**
APK başarıyla oluştuğu için timeout'u görmezden gel ve direkt install et:
```bash
cd mobile
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

**Önemli Notlar:**
- Timeout olsa bile APK genellikle kullanılabilir durumda
- Build log'unda "BUILD SUCCESSFUL" görülüyorsa APK güvenle kullanılabilir
- APK konumu: `mobile/android/app/build/outputs/apk/release/app-release.apk`

---

## 1. Metro Cache Sorunu - Kod Değişiklikleri Bundle'a Dahil Edilmiyor

**Tarih:** 2025-02-23

**Sorun:**
Kod değişiklikleri yapıldı (örn: ColorPicker.tsx'e kategori chip'leri eklendi) ama `gradlew assembleRelease` sonrası APK'da görünmüyor.

**Kök Neden:**
Gradle'ın `createBundleReleaseJsAndAssets` task'ı kendi Metro bundler'ını çalıştırıyor ve eski cache'lenmiş bundle'ı kullanıyor.

**Çözüm:**
```bash
cd mobile/android
.\gradlew.bat clean
.\gradlew.bat assembleRelease --no-daemon
cd ..
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

**Önemli Notlar:**
- `npx react-native bundle` manuel çalıştırmak GEREKSIZ - Gradle zaten kendi bundler'ını çalıştırıyor
- Her zaman `clean` + `assembleRelease` birlikte kullan
- Metro cache sorunu için `node_modules/.cache` silmeye gerek yok
- Build log'da "Bundler cache is empty, rebuilding" mesajı görülmeli

**Detaylı Çözüm:** [docs/sorun-cozumleri/01-metro-cache-bundle-guncellenmiyor.md](sorun-cozumleri/01-metro-cache-bundle-guncellenmiyor.md)

---
