# 📋 Antigravity (Anti Agent) Çalışma Standartları & Kalıcı Hafıza (GEMINI.md)

Bu dosya, **Antigravity (Anti Agent)** için IDE kapatılıp açılsa dahi her zaman geçerli olan bağlayıcı çalışma kurallarını ve ideal görev döngüsünü içerir.

---

## 🏛️ 1. Temel İş Bölümü: "Beyin (ZCode) — El (Antigravity)"

- **ZCode (GLM-5.3 Flash High):** Mimari planlama, klinik güvenlik kuralları, TİTCK veri modellemesi, zamanlama algoritmaları, Doze Mode & alarm stratejileri, SemVer sürümleme kararları ve hakem kod incelemesini (Code Review) yürütür.
- **Anti Agent (Antigravity):** Kodlama, dosya işlemleri, tüm Jest test paketlerini çalıştırma, Gradle release derleme (`assembleRelease`), ADB ile Samsung/Xiaomi cihazlara canlı yükleme ve SemVer Changelog/arşivleme protokolünü icra eder.

---

## 🔄 2. İdeal 7 Adımlı Görev Döngüsü (Her Görevde Zorunlu)

1. **Adım 1 — Mimari & Strateji:** ZCode (GLM-5.3 Flash High) ile mimari kararları, SemVer sürüm türünü (Patch/Minor/Major) ve edge-case analizlerini belirle.
2. **Adım 2 — Kodlama & Refactoring:** Belirlenen mimariye göre React Native UI, TypeScript servisleri ve Kotlin sınıflarını yaz.
3. **Adım 3 — Test & Doğrulama:** `npm test` ile tüm test paketlerini ve stres testini çalıştır, sıfır hata sağla.
4. **Adım 4 — Hakem Kod İncelemesi (Code Review):** Kritik servisleri ZCode (GLM-5.3)'e incelet ve onay al.
5. **Adım 5 — Release Derleme:** `versionCode`'u +1 artır, `versionName`'i güncelle ve `./gradlew assembleRelease` ile release APK derle.
6. **Adım 6 — Canlı Cihaz Dağıtımı:** Samsung tablet (`R52TB0HJREP`) ve Xiaomi (`43cebdf1`) cihazlara ADB ile yükle ve ekran görüntüsüyle doğrula.
7. **Adım 7 — Sürüm Arşivi, CHANGELOG & Ekip Raporu:** `CHANGELOG.md` ve `docs/archive/` altına kayıt oluştur, `ARCHIVE_INDEX.md` tablosunu güncelle, APK'ları `apk/` ve ana dizine kaydet, detaylı ortak ekip raporunu ve Google Play Store "Neler Yeni?" notunu kullanıcıya sun.

---

## 📐 3. SemVer & Sürüm Yükseltme Standartları

- 🔴 **MAJOR (`vX.0.0`):** Kırıcı değişiklikler, veritabanı migrasyonları, komple redesign.
- 🟡 **MINOR (`v1.X.0`):** Yeni modül / özellik paketleri (AI reçete okuma, klinik raporlar).
- 🟢 **PATCH (`v1.X.Y`):** Hata düzeltmeleri, alarm optimizasyonları, küçük UI dokunuşları.
- **Android Senkronizasyonu:** `versionName` SemVer string, `versionCode` her derlemede +1 tamsayı.
- **Commit Standardı:** `<type>(<scope>): <subject>` formatı (`feat:`, `fix:`, `perf:`, `refactor:`, `docs:`, `chore:`).

---

## 📦 4. Teslimat Protokolü

1. **Merkezi Changelog:** Kök dizin `CHANGELOG.md` dosyasında `Keep a Changelog` standardı uygulanacaktır.
2. **Sürüm Arşivi:** `docs/archive/vX.X.X_YYYY-MM-DD_HH-mm_konu-basligi.md` oluşturulacak ve `ARCHIVE_INDEX.md` güncellenecektir.
3. **APK Kaydı:** Güncel release APK ana dizine (`IlacHatirlatici_vX.X.X_release.apk`, `app-release.apk`) ve `apk/` klasörüne kopyalanacaktır.
4. **Anti Agent Eylem Raporu & Store Notu:** Rapor sonucunda Anti Agent'ın ve ZCode'un yaptığı teknik adımlar ve mağaza güncelleme notu açıkça sunulacaktır.
