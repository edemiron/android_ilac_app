# 📋 Antigravity (Anti Agent) Çalışma Standartları & Kalıcı Hafıza (GEMINI.md)

Bu dosya, **Antigravity (Anti Agent)** için IDE kapatılıp açılsa dahi her zaman geçerli olan bağlayıcı çalışma kurallarını ve ideal görev döngüsünü içerir.

---

## 🏛️ 1. Temel İş Bölümü: "Altın Üçgen — Kusursuz Kod, Klinik Güvenlik & İcraat Formülü"

> **"En hatasız kod; Qwen 3.8 Max'in algoritma, mantık ve tip mimarisini kurguladığı; ZCode'un Android/Klinik kurallarını denetlediği; Anti Agent'ın IDE'ye döküp testlerle mühürlediği koddur."**

- **⚡ Qwen 3.8 Max (Qwen CLI / High Reasoning 1M Context):** Baş mimar, kodlama otoritesi & baş denetçi. Karmaşık algoritmalar, katı tip mimarisi (TypeScript/Kotlin), mimari refactoring, 1M token bağlam analizi (983k window), derin güvenlik, bellek sızıntıları ve kod kalitesi onayı (`scripts/ask_qwen.ps1`).
- **🧠 ZCode (GLM-5.3 Flash High):** Klinik mantık & Android sistem uzmanı. TİTCK ilaç veri modeli, Doze Mode, OEM pil kalkanı, Firestore senkronizasyonu ve Android çekirdek kalkanı denetimi.
- **💤 Claude Opus 5 (High Effort) — [PASİF]:** Anthropic API bakiye tükenmesi sebebiyle devre dışı bırakılmıştır; tüm görevleri Qwen 3.8 Max ve ZCode'a devredilmiştir.
- **🛡️ Anti Agent (Antigravity):** İcracı mühendis & orkestratör. Kodlama, dosya işlemleri, tüm Jest testlerini çalıştırma (180+ paket), Gradle release derleme (`assembleRelease`), ADB ile fiziksel cihazlara yükleme ve SemVer arşivleme protokolünü icra eder.

---

## 🔄 2. Optimize Edilmiş 7 Adımlı Altın Görev Döngüsü

1. **Adım 1 — Mimari & Algoritma:** Qwen 3.8 Max veri yapısını, tipleri ve refactor planını kurar; ZCode Android/klinik kısıtlarını belirler.
2. **Adım 2 — Kodlama & Düzenleme:** Anti Agent (Antigravity) onaylanan planı React Native, TS ve Kotlin kodlarına döker.
3. **Adım 3 — Test & Doğrulama:** `npm test` ile tüm test paketlerini (180+ paket) ve 10.000 kullanıcı stres testini çalıştır, sıfır hata sağla.
4. **Adım 4 — Çift Hakem İncelemesi (Review):** Qwen 3.8 Max kod kalitesi/güvenlik/tip onayını, ZCode Android/klinik onayını verir (Çift Onay).
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

1. **⚡ Qwen 3.8 Max (Qwen CLI High Reasoning / 1M Context) Alanı:**
   - *(Claude Opus 5'in devredilen tüm alanları dahil)*
   - Saf kodlama, karmaşık algoritmalar, katı tip mimarisi (TypeScript/Kotlin) ve mimari refactoring.
   - 1 Milyon token bağlam analizi (983k window), derin güvenlik ve yetkilendirme analizleri.
   - Bellek sızıntıları (memory leaks), karmaşık state makineleri ve asenkron yarış durumları (race conditions).
   - Çapraz hakemlik ve kod incelemesinde (Code Review) nihai kod kalitesi onayı (`scripts/ask_qwen.ps1`).

2. **🧠 ZCode (GLM-5.3 Flash High) Alanı:**
   - Android 14/15 `USE_EXACT_ALARM`, Doze Mode, OEM (Samsung, Xiaomi, Huawei) pil kalkanı, TİTCK ilaç veri tabanı, kaçırılan doz triyajı ve Refakatçi Firestore yarış durumları.

3. **⚖️ Çift Hakem Konsensüsü (Qwen 3.8 Max & ZCode):**
   - Kırıcı değişiklikler (MAJOR SemVer), veritabanı şema migrasyonları veya çekirdek mimariyi değiştiren radikal kararlarda Qwen 3.8 Max ve ZCode konsensüs raporu oluşturur.

4. **💤 Claude Opus 5 (High Effort) — [PASİF]:**
   - API yanıt vermediği ve bakiye tükendiği için çağrılmaz; tüm inceleme görevleri Qwen 3.8 Max ve ZCode tarafından yürütülür.

5. **⚡ Doğrudan İcra (Antigravity):**
   - Basit kod yazımı, dosya değişiklikleri, testlerin koşturulması, Gradle APK derleme ve ADB cihaz kurulumu gibi operasyonel adımlar hakem meşgul edilmeden doğrudan icra edilir.
