# 📋 Proje Çalışma Kuralları, Rol Dağılımı & Sürümleme Algoritması (AGENTS.md)

Bu dosya, **İlaç Hatırlatıcı** projesinde çalışan tüm yapay zeka ajanları (**Antigravity / Anti Agent** ve **ZCode GLM-5.3 Flash High**) için bağlayıcı ve **kalıcı (permanent memory)** çalışma standartlarını içerir.

---

## 🏛️ 1. Temel İş Bölümü İlkesi: "Altın Üçgen — Kusursuz Kod, Klinik Güvenlik & İcraat Formülü"

> **"En hatasız kod; Qwen 3.8 Max'in algoritma, mantık ve tip mimarisini kurguladığı; ZCode'un Android/Klinik kurallarını denetlediği; Anti Agent'ın IDE'ye döküp testlerle mühürlediği koddur."**

### 🧠 Aktif Hakem Heyeti Sorumlulukları (Uzmanlık Matrisi):

1. **⚡ Qwen 3.8 Max (Qwen CLI — High Reasoning / 1M Context) — Baş Mimar, Kodlama Otoritesi & Baş Denetçi:**
   - **Saf Kodlama & Algoritma Tasarımı:** Karmaşık veri yapıları, tip güvenliği (Strict TypeScript / Kotlin), tasarım desenleri (Design Patterns) ve derin refactoring planları.
   - **1M Token Bağlam Analizi (983k window):** Tüm depo bağımlılıklarını tek seferde inceleme, bellek sızıntıları (memory leaks), karmaşık state makineleri ve asenkron yarış durumları (race conditions) denetimi.
   - **Nihai Kod Onayı:** Kod kalitesi, temiz kod (Clean Code) standartları ve güvenlik açıklarında baş onay mercii.
   - **İcra Aracı:** Yerel Qwen CLI (`scripts/ask_qwen.ps1` veya `qwen` CLI).

2. **🧠 ZCode (GLM-5.3 Flash High) — Klinik Mantık & Android Sistem Uzmanı:**
   - **Klinik İş Kuralları:** TİTCK 18.000+ ilaç veri modeli, ilaç-ilaç / ilaç-besin etkileşim matrisi, kaçırılan doz triyajı (Catch-up algoritması) ve Türkçe invariant normalizasyon.
   - **Android Çekirdek Kalkanı:** Android 14/15 `USE_EXACT_ALARM`, Doze Mode muafiyeti, Samsung / Xiaomi / Huawei pil kısıtlama kalkanı, DirectBoot DE ve WakeLock mimarisi.
   - **Bulut & Refakatçi Senkronizasyonu:** Refakatçi & SOS senkronizasyonu, Firestore `onSnapshot` yarış durumları, FCM High Priority Data payload standartları.

### 💤 Pasif / Rezerv Heyet Üyesi:
3. **Claude Opus 5 (High Effort) — [PASİF / API BAKİYESİ YETERSİZ]:**
   - Anthropic API tarafında bakiye/kredi tükenmesi (HTTP 400) sebebiyle heyet çağrılarından çıkarılmış ve pasife alınmıştır.
   - Tüm sorumlulukları Qwen 3.8 Max ve ZCode'a devredilmiştir. API kredisi yenilenene kadar devre dışıdır.

### 🛡️ Anti Agent (Antigravity) Sorumlulukları (İcracı Mühendis & Operasyon Lideri):
1. **Akıllı Yönlendirme (Orchestration):** Gelen her görevin içeriğine göre Qwen 3.8 Max, ZCode veya Çift Hakem heyetini otomatik koordine etme.
2. **Uçtan Uca Kodlama:** Hakem heyetinin onayladığı mimari sözleşmelere göre React Native UI/UX, TypeScript servisleri ve Kotlin sınıflarını doğrudan dosyalara yazma.
3. **Test Yürütme:** Tüm Jest test paketlerini (180+ paket) ve 10.000 kullanıcı stres testini terminal üzerinden çalıştırma ve %100 geçmesini sağlama.
4. **Gradle Release APK Derleme:** Metro JS bundle ve `./gradlew assembleRelease` süreçlerini yönetme.
5. **Fiziksel Cihaz & ADB Dağıtımı:** Samsung Galaxy Tab S7 FE (`R52TB0HJREP`) ve Xiaomi (`43cebdf1`) cihazlara APK yükleme, ekran görüntüsü (`screencap`) alma ve canlı ön plan doğrulama.
6. **Arşiv, Changelog & Dokümantasyon:** Zorunlu teslimat protokolünü ve SemVer kurallarını eksiksiz uygulama.

---

## 🔄 2. Optimize Edilmiş 7 Adımlı Altın Görev Döngüsü

Herhangi bir geliştirme, hata düzeltmesi veya yeni özellik talebinde **aşağıdaki 7 adımlı optimize döngü eksiksiz uygulanır**:

```
[1. Adım: Mimari & Algoritma] -> Qwen 3.8 Max veri yapısını, tipleri ve refactor planını kurar; ZCode Android/klinik kısıtlarını belirler.
[2. Adım: Kodlama & Düzenleme]-> Anti Agent (Antigravity) onaylanan planı React Native, TS ve Kotlin kodlarına döker.
[3. Adım: Test & Doğrulama]   -> Anti Agent (Antigravity) npm test (180+ paket) ve 10.000 kullanıcı stres testini çalıştırır.
[4. Adım: Çift Hakem İnceleme]-> Qwen 3.8 Max kod kalitesi/güvenlik/tip onayını, ZCode Android/klinik onayını verir (Çift Onay).
[5. Adım: Release Derleme]    -> versionCode +1 artırılır, versionName güncellenir ve Gradle assembleRelease ile APK derlenir.
[6. Adım: Canlı Cihaz Dağıtımı]-> Anti Agent (Antigravity) ADB ile fiziksel tablet/telefona kurar ve canlı ekranı doğrular.
[7. Adım: Arşiv & Raporlama]  -> CHANGELOG.md ve docs/archive/ güncellenir, Play Store 'Neler Yeni?' notu yazılır ve ekip raporu sunulur.
```

---

## 📐 3. Profesyonel Sürüm Yükseltme & Değişiklik Yönetim Algoritması (SemVer)

Mobil projemizde sürüm yükseltmeleri **Semantic Versioning (SemVer: `MAJOR.MINOR.PATCH`)** ve **Keep a Changelog** standardına göre otomatik yürütülür:

### 1. Sürüm Numaralandırma Karar Ağacı
* 🔴 **MAJOR (X.0.0 — Kırıcı/Radikal Değişiklik):**
  - Geriye dönük uyumluluğun bozulduğu durumlar.
  - Firestore / SQLite şema değişimleri (zorunlu migrasyon).
  - Komple UI redesign / yeni altyapı geçişi.
  - *Örnek:* `1.6.0` ➔ `2.0.0`
* 🟡 **MINOR (1.X.0 — Yeni Özellik / Modül Paketi):**
  - Geriye dönük uyumlu yeni özellikler ve modüller (AI Reçete Okuma, PDF Doktor Raporu, Refakatçi Canlı Takip).
  - *Örnek:* `1.5.0` ➔ `1.6.0`
* 🟢 **PATCH (1.6.X — Hata Düzeltmesi / Bakım / Hotfix):**
  - Mevcut işlevlerdeki hata düzeltmeleri (alarm kapatma, UI kayması, ses optimizasyonu, küçük metin düzeltmeleri).
  - *Örnek:* `1.6.0` ➔ `1.6.1`

### 2. Platform Sürüm Eşleşmesi
* **Android `versionName`:** Kullanıcının ve mağazanın gördüğü SemVer metni (`"1.6.0"`, `"1.6.1"`). `package.json` ve `android/app/build.gradle` içinde tutulur.
* **Android `versionCode`:** Google Play için her yüklemede +1 artan zorunlu tamsayı (`45` ➔ `46`).
* **Conventional Commits:** `<type>(<scope>): <subject>` formatı (`feat:`, `fix:`, `perf:`, `refactor:`, `docs:`, `chore:`).

---

## 📦 4. Her Görev Sonrası Zorunlu Teslimat Protokolü

1. **📝 Merkezi `CHANGELOG.md` Güncellemesi:**
   - Kök dizindeki `CHANGELOG.md` dosyasına yeni sürüm başlığı (`[X.Y.Z] - YYYY-MM-DD`) altında `Added`, `Changed`, `Fixed`, `Security` bölümleri eklenir.

2. **📦 Sürüm & Arşiv Kaydı (`docs/archive/`):**
   - `docs/archive/vX.X.X_YYYY-MM-DD_HH-mm_konu-basligi.md` arşiv dosyası oluşturulur.
   - `docs/archive/ARCHIVE_INDEX.md` tablosu en üstten güncellenir.

3. **📱 Güncel APK'nın Dosyaya Kaydedilmesi:**
   - Derlenen release APK dosyası ana dizine (`app-release.apk`, `IlacHatirlatici_vX.X.X_release.apk`) ve `apk/` klasörüne kopyalanır.

4. **✨ Google Play Store "Neler Yeni?" Notu & Ortak Ekip Raporu:**
   - Rapor içerisinde kullanıcılara/hastalara yönelik anlaşılır 3-5 maddelik mağaza sürüm notu sunulur.
   - Anti Agent ve ZCode'un icra ettiği adımlar şeffafça listelenir.

---

## 🤖 5. Akıllı Hakem Yönlendirme Protokolü (Otomatik Hakem Triage)

Kullanıcı model veya hakem belirtmeksizin bir soru sorduğunda ya da görev verdiğinde, **Antigravity (Anti Agent)** konunun mahiyetine göre hakemi otomatik seçer ve yanıtında seçilen hakemi açıkça belirtir:

1. **⚡ Qwen 3.8 Max (Qwen CLI High Reasoning / 1M Context) Alanı:**
   - *(Claude Opus 5'in devredilen tüm üst hakemlik alanları dahil)*
   - Saf kodlama, karmaşık algoritmalar, katı tip mimarisi (TypeScript/Kotlin) ve mimari refactoring.
   - 1 Milyon token bağlam analizi (983k window), derin güvenlik ve yetkilendirme analizleri.
   - Bellek sızıntıları (memory leaks), karmaşık state makineleri ve asenkron yarış durumları (race conditions).
   - Çapraz hakemlik ve kod incelemesinde (Code Review) nihai kod kalitesi onayı (`scripts/ask_qwen.ps1`).

2. **🧠 ZCode (GLM-5.3 Flash High) Alanı:**
   - Android 14/15 `USE_EXACT_ALARM`, Doze Mode, OEM (Samsung, Xiaomi, Huawei) pil kısıtlama mekanizmaları.
   - TİTCK ilaç veri tabanı, ilaç-ilaç/ilaç-besin etkileşimleri, kaçırılan doz triyajı (Catch-up algoritması).
   - Refakatçi/Hasta Firestore `onSnapshot` yarış durumları, FCM High Priority veri bildirimleri.

3. **⚖️ Çift Hakem Konsensüsü (Qwen 3.8 Max & ZCode):**
   - Kırıcı değişiklikler (Breaking Changes / MAJOR SemVer), veritabanı şema migrasyonları veya projenin çekirdek mimarisini değiştiren radikal kararlar.
   - Qwen 3.8 Max ve ZCode görüşleri ayrı ayrı alınır, sentezlenir ve kullanıcıya tek konsensüs raporu sunulur.

4. **💤 Claude Opus 5 (High Effort) — [PASİF]:**
   - API yanıt vermediği ve bakiye tükendiği için çağrılmaz; tüm inceleme görevleri Qwen 3.8 Max ve ZCode tarafından yürütülür.

5. **⚡ Doğrudan İcra (Antigravity):**
   - Basit kod yazımı, dosya değişiklikleri, testlerin koşturulması, Gradle APK derleme ve ADB cihaz kurulumu gibi operasyonel adımlar hakem meşgul edilmeden doğrudan icra edilir.

