# 📋 Proje Çalışma Kuralları, Rol Dağılımı & Sürümleme Algoritması (AGENTS.md)

Bu dosya, **İlaç Hatırlatıcı** projesinde çalışan tüm yapay zeka ajanları (**Antigravity / Anti Agent** ve **ZCode GLM-5.3 Flash High**) için bağlayıcı ve **kalıcı (permanent memory)** çalışma standartlarını içerir.

---

## 🏛️ 1. Temel İş Bölümü İlkesi: "Beyin — El Ayrımı"

> **"Klinik doğruluk, karmaşık algoritmalar, güvenlik ve mimari karar → ZCode (GLM-5.3 Flash High)"**  
> **"Kod yazımı, dosya işlemleri, test icrası, Gradle derleme, ADB & cihaz kurulumu → Anti Agent (Antigravity)"**

### 🧠 ZCode (GLM-5.3 Flash High) Sorumlulukları:
1. **Klinik ve Farmakolojik Mantık:** TİTCK 18.000+ ilaç veri modeli, ilaç etkileşim matrisi, kaçırılan doz triyajı (Catch-up algoritması) ve Türkçe karakter invariant normalizasyonu.
2. **Alarm & OEM Koruma Mimarisi:** Android 14/15 `USE_EXACT_ALARM`, Doze Mode muafiyeti, Samsung / Xiaomi / Huawei pil kısıtlama kalkanı.
3. **Refakatçi & SOS Senkronizasyonu:** Firestore `onSnapshot` yarış durumları, FCM High Priority Data payload ve tekilleştirme (Collapse Key).
4. **Güvenlik & KVKK/HIPAA:** Firestore Security Rules, PIN/Biyometri doğrulama, Scoped Storage şifreli veri kasası.
5. **Hakem Kod İncelemesi (Code Review):** Antigravity'nin ürettiği kritik servisleri (`AlarmModule.kt`, `AlarmManager`, `FCMBridge`, `authService`) satır satır denetleme.
6. **Büyüme, Sürüm Stratejisi & ASO:** Paywall, Onboarding Quiz funnelleri, SemVer sürümleme kararları ve Play Store dönüşüm optimizasyonu.

### 🛡️ Anti Agent (Antigravity) Sorumlulukları:
1. **Kodlama & Refactoring:** ZCode'un tasarladığı mimari sözleşmelere göre React Native UI/UX, TypeScript servisleri ve Kotlin sınıflarını yazma/düzenleme.
2. **Test Yürütme:** Tüm Jest test paketlerini (180+ paket) ve 10.000 kullanıcı stres testini terminal üzerinden çalıştırma ve %100 geçmesini sağlama.
3. **Gradle Release APK Derleme:** Metro JS bundle ve `./gradlew assembleRelease` süreçlerini yönetme.
4. **Fiziksel Cihaz & ADB Dağıtımı:** Samsung Galaxy Tab S7 FE (`R52TB0HJREP`) ve Xiaomi (`43cebdf1`) cihazlara APK yükleme, ekran görüntüsü (`screencap`) alma ve canlı ön plan doğrulama.
5. **Arşiv, Changelog & Dokümantasyon:** Zorunlu teslimat protokolünü ve SemVer kurallarını eksiksiz uygulama.

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
