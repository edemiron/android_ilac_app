# 📋 Antigravity (Anti Agent) Çalışma Standartları & Kalıcı Hafıza (GEMINI.md)

Bu dosya, **Antigravity (Anti Agent)** için IDE kapatılıp açılsa dahi her zaman geçerli olan bağlayıcı çalışma kurallarını ve ideal görev döngüsünü içerir.

---

## 🏛️ 1. Temel İş Bölümü: "Beyin (Çift Hakem Heyeti) — El (Antigravity)"

- **ZCode (GLM-5.3 Flash High):** Birincil klinik & Android mimarı. TİTCK ilaç veri modeli, Doze Mode & alarm stratejileri, Refakatçi senkronizasyonu ve hakem kod incelemesini yürütür.
- **Claude Opus 5 (High Effort):** Bağımsız üst hakem & baş denetçi. 1M token bağlam analizi, karmaşık mimari refactoring, derin güvenlik/zafiyet denetimi ve çapraz ikinci görüş sağlar.
- **Anti Agent (Antigravity):** Akıllı yönlendirici (orchestrator), kodlama, dosya işlemleri, tüm Jest testlerini çalıştırma, Gradle release derleme (`assembleRelease`), ADB ile Samsung/Xiaomi cihazlara canlı yükleme ve SemVer Changelog/arşivleme protokolünü icra eder.

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

---

## 🤖 5. Akıllı Hakem Yönlendirme Protokolü (Otomatik Hakem Triage)

Kullanıcı model belirtmeksizin bir soru sorduğunda ya da görev verdiğinde, **Antigravity (Anti Agent)** konunun mahiyetine göre hakemi otomatik seçer ve yanıtında seçilen hakemi açıkça bildirir:

1. **🧠 ZCode (GLM-5.3 Flash High):** Android 14/15 `USE_EXACT_ALARM`, Doze Mode, OEM (Samsung, Xiaomi, Huawei) pil kalkanı, TİTCK ilaç veri tabanı, kaçırılan doz triyajı ve Refakatçi Firestore yarış durumları.
2. **👑 Claude Opus 5 (High Effort):** Büyük çaplı mimari tasarımlar, derin kod refactoring stratejileri, derin güvenlik ve yetkilendirme denetimleri, bellek sızıntıları ve karmaşık algoritmik çakışmalar.
3. **⚖️ Çift Hakem Heyeti (Konsensüs):** Kırıcı değişiklikler (MAJOR SemVer), veritabanı şema migrasyonları veya çekirdek mimariyi değiştiren radikal kararlarda her iki hakeme de danışılır, sentezlenip tek konsensüs raporu sunulur.
4. **⚡ Doğrudan İcra (Antigravity):** Kodlama, dosya işlemleri, test çalıştırma, APK derleme ve ADB cihaz kurulumu gibi operasyonel adımlar hakem meşgul edilmeden doğrudan icra edilir.

