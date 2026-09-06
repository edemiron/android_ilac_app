# 📋 Proje Çalışma Kuralları, Rol Dağılımı & Sürümleme Algoritması (AGENTS.md)

Bu dosya, **İlaç Hatırlatıcı** projesinde çalışan tüm yapay zeka ajanları (**Antigravity / Anti Agent** ve **ZCode GLM-5.3 Flash High**) için bağlayıcı ve **kalıcı (permanent memory)** çalışma standartlarını içerir.

---

## 🏛️ 1. Temel İş Bölümü İlkesi: "Beyin — El Ayrımı & Çift Hakem Heyeti"

> **"Klinik doğruluk, karmaşık algoritmalar, güvenlik ve mimari karar → Hakem Heyeti (ZCode GLM-5.3 High & Claude Opus 5 High)"**  
> **"Kod yazımı, dosya işlemleri, test icrası, Gradle derleme, ADB & cihaz kurulumu → Anti Agent (Antigravity)"**

### 🧠 Hakem Heyeti Sorumlulukları:
1. **ZCode (GLM-5.3 Flash High) — Birincil Klinik & Android Mimarı:**
   - TİTCK 18.000+ ilaç veri modeli, ilaç etkileşim matrisi, kaçırılan doz triyajı (Catch-up algoritması) ve Türkçe invariant normalizasyon.
   - Android 14/15 `USE_EXACT_ALARM`, Doze Mode muafiyeti, Samsung / Xiaomi / Huawei pil kısıtlama kalkanı.
   - Refakatçi & SOS senkronizasyonu, Firestore `onSnapshot` yarış durumları, FCM High Priority Data payload.
2. **Claude Opus 5 (High Effort) — Bağımsız Üst Hakem & Baş Denetçi:**
   - 1 Milyon token bağlam analizi, karmaşık mimari refactoring ve tasarım kalıpları.
   - Derin güvenlik ve zafiyet analizi, bellek sızıntıları, karmaşık eşzamanlılık (concurrency) sorunları.
   - Çapraz hakemlik (ZCode kararlarının bağımsız doğrulanması ve ikinci görüş).

### 🛡️ Anti Agent (Antigravity) Sorumlulukları:
1. **Akıllı Yönlendirme (Orchestration):** Gelen her sorunun içeriğine göre ZCode, Claude Opus 5 veya Çift Hakem heyetini otomatik seçip koordine etme.
2. **Kodlama & Refactoring:** Hakem heyetinin onayladığı mimari sözleşmelere göre React Native UI/UX, TypeScript servisleri ve Kotlin sınıflarını yazma/düzenleme.
3. **Test Yürütme:** Tüm Jest test paketlerini (180+ paket) ve 10.000 kullanıcı stres testini terminal üzerinden çalıştırma ve %100 geçmesini sağlama.
4. **Gradle Release APK Derleme:** Metro JS bundle ve `./gradlew assembleRelease` süreçlerini yönetme.
5. **Fiziksel Cihaz & ADB Dağıtımı:** Samsung Galaxy Tab S7 FE (`R52TB0HJREP`) ve Xiaomi (`43cebdf1`) cihazlara APK yükleme, ekran görüntüsü (`screencap`) alma ve canlı ön plan doğrulama.
6. **Arşiv, Changelog & Dokümantasyon:** Zorunlu teslimat protokolünü ve SemVer kurallarını eksiksiz uygulama.

---

## 🔄 2. Zorunlu İdeal Görev Döngüsü (Standard Operating Procedure)

Herhangi bir geliştirme, hata düzeltmesi veya yeni özellik talebinde **aşağıdaki 7 adımlı döngü eksiksiz uygulanır**:

```
[1. Adım: Mimari & Strateji]  -> ZCode (GLM-5.3) mimari planı, SemVer sürüm türünü (Patch/Minor/Major) ve edge-case analizini çıkarır.
[2. Adım: Kodlama & Düzenleme] -> Anti Agent (Antigravity) kaynak kodları yazar, refactoring yapar.
[3. Adım: Test & Doğrulama]    -> Anti Agent (Antigravity) npm test (180+ paket) ve stres testlerini çalıştırır.
[4. Adım: Hakem Kod İnceleme]  -> ZCode (GLM-5.3) kodları inceler, güvenlik ve mantık onayını verir.
[5. Adım: Release Derleme]     -> versionCode +1 artırılır, versionName güncellenir ve Gradle assembleRelease ile APK derlenir.
[6. Adım: Cihaz Kurulumu]      -> Anti Agent (Antigravity) ADB ile fiziksel tablet/telefona kurar ve canlı ekranı doğrular.
[7. Adım: Arşiv & Raporlama]   -> CHANGELOG.md ve docs/archive/ güncellenir, Play Store 'Neler Yeni?' notu yazılır ve ekip raporu sunulur.
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

1. **🧠 ZCode (GLM-5.3 Flash High) Alanı:**
   - Android 14/15 `USE_EXACT_ALARM`, Doze Mode, OEM (Samsung, Xiaomi, Huawei) pil kısıtlama mekanizmaları.
   - TİTCK ilaç veri tabanı, ilaç-ilaç/ilaç-besin etkileşimleri, kaçırılan doz triyajı (Catch-up algoritması).
   - Refakatçi/Hasta Firestore `onSnapshot` yarış durumları, FCM High Priority veri bildirimleri.

2. **👑 Claude Opus 5 (High Effort) Alanı:**
   - Büyük çaplı mimari tasarımlar, derin kod refactoring stratejileri.
   - Derin güvenlik ve yetkilendirme denetimleri, bellek sızıntıları (memory leaks), karmaşık asenkron durumlar.
   - Alternatif kütüphane ve mimari desen (design pattern) karşılaştırmaları.

3. **⚖️ Çift Hakem Heyeti (Konsensüs) Alanı:**
   - Kırıcı değişiklikler (Breaking Changes / MAJOR SemVer), veritabanı şema migrasyonları veya projenin çekirdek çalışma yapısını değiştiren radikal kararlar.
   - Her iki hakemin görüşü ayrı ayrı alınır, ortak riskler sentezlenir ve kullanıcıya tek konsensüs raporu sunulur.

4. **⚡ Doğrudan İcra (Antigravity):**
   - Basit kod yazımı, dosya değişiklikleri, testlerin koşturulması, Gradle APK derleme ve ADB cihaz kurulumu gibi operasyonel adımlar hakem meşgul edilmeden doğrudan icra edilir.

