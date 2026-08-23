# 🏛️ 8 Çapraz Fonksiyonel Uzman Ekip & "Ayarlar" Ekranı Yeniden Doğuş Manifestosu

Bu belge, **İlaç Hatırlatıcı** uygulamasının **Ayarlar (SettingsScreen)** sayfasını dünya standartlarında (Apple iOS Settings, Linear, Material 3 Expressive) bir kullanıcı deneyimine kavuşturmak üzere görevlendirilen **8 Çapraz Fonksiyonel Uzman Ekip**'in mimari analizini ve revizyon planını içerir.

---

## 👥 1. Çapraz Fonksiyonel Ekiplerin Değerlendirmesi

| Ekip | Tespit Edilen Eksiklik | 2026 Modern Çözüm |
| :--- | :--- | :--- |
| **🎯 Ürün & Yönetim (Product)** | 10 parçaya bölünmüş uzun ve yorucu kart yığını. | Mantıksal 5 ana Inset Gruba (Hesap, Bildirim, Görünüm, Sağlık Araçları, Destek) toplama. |
| **🎨 Tasarım (UX/UI)** | Düz beyaz kutular, çakışan e-posta metinleri, sıradan switch'ler. | Cam efektli (Glassmorphic) Degrade Profil Kartı, 3D Squircle Degrade İkonlar, mikro rozetler. |
| **💻 Yazılım Geliştirme (Dev)** | Modüler Presenter / Inset Group pattern mimarisi. | 60/120 FPS akıcı geçişler, tüm ayar tıklamalarında dokunsal titreşim (Haptic Feedback). |
| **🧪 Kalite Güvence (QA)** | 152 test paketinin kırılmadan %100 kapsamayla çalışması. | Tüm anahtarların (Switch) ve navigasyon yönlendirmelerinin uçtan uca doğrulanması. |
| **🛡️ Siber Güvenlik (SecOps)** | PIN ve Biyometrik kilit kontrollerinin dağınık olması. | "Güvenlik & Biyometri" başlığı altında güçlü kriptografik kilit yönetimi. |
| **☁️ DevOps & Bulut** | Senkronizasyon durumunun belirsizliği. | Profil kartında canlı yeşil "Bulut Eşitlemesi Aktif" rozeti. |
| **🧠 Veri & Yapay Zeka (AI)** | İlaç etkileşimi ve akıllı araçların gömülü kalması. | "Sağlık Araçları & Klinik Veri" grubu altında ön plana çıkarma. |
| **🛠️ Destek & Bakım (Ops)** | SSS ve iletişim bilgilerinin zayıflığı. | Şık "Yardım & Hakkında" kartı ile tek tıkla geri bildirim. |

---

## 💎 2. Yeni "Ayarlar" Ekranı Mimari Tasarımı

```
┌──────────────────────────────────────────────────────────┐
│  ✨ 1. HERO PROFİL & BULUT SENKRONİZASYON KARTI           │
│  ┌────────────────────────────────────────────────────┐  │
│  │   [ 👤 ENES DEMİR ]       ⭐ PREMIUM ÜYE (Ömür Boyu)│  │
│  │   edemiron@gmail.com      🟢 Bulut Senkronize Edildi│  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  👤 2. HESAP & GÜVENLİK (Account & Security)             │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 👤 Hesap Bilgileri            edemiron@gmail.com > │  │
│  │ 🔒 Güvenlik PIN & Biyometri   Parmak İzi Aktif   > │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  🔔 3. BİLDİRİMLER & SESLER (Alarms & Audio)             │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 🎵 Alarm Sesi & Melodi        Soft Chime (%%70)   > │  │
│  │ ⚡ Kritik Hatırlatıcılar      [Sessiz Modda Çal 🔘]│  │
│  │ 👥 Aile & Bakıcı Takibi       1 Bakıcı Bağlı     > │  │
│  │ 🗣️ Sesli Asistan (TTS)        İlaç İsimlerini Oku > │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  🎨 4. GÖRÜNÜM & KİŞİSELLEŞTİRME (Appearance)            │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 🌓 Tema Tercihi               [ Açık | Koyu | Oto ]│  │
│  │ 🎨 Klinik Vurgu Rengi         🔵 🟠 🟢 🟣 🔴 🔘    │  │
│  │ 🌐 Uygulama Dili              Türkçe             > │  │
│  │ 👓 Kolay Mod (Büyük Yazı)     [Büyük Fontlar     ⚪]│  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  🛡️ 5. SAĞLIK ARAÇLARI & VERİ (Health Tools & Data)      │
│  ┌────────────────────────────────────────────────────┐  │
│  │ ☁️ Veri Yedekleme & Dışa Aktar JSON & Cloud      > │  │
│  │ 🏥 Nöbetçi Eczaneler           Haritada Bul      > │  │
│  │ 🧪 İlaç Etkileşim Kontrolü     Çapraz Analiz     > │  │
│  │ 📋 Doktor PDF Raporu           Klinik Döküm      > │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ℹ️ 6. YARDIM & HAKKINDA (Support & About)               │
│  ┌────────────────────────────────────────────────────┐  │
│  │ ❓ Sıkça Sorulan Sorular      Kullanım Rehberi   > │  │
│  │ 🩺 Sürüm & Geliştirici Ekip   v1.3.5 (Build 42)  > │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  🛠️ 7. GELİŞTİRİCİ TEST LABORATUVARI (Katlanabilir/Dev) │
│  🚪 8. OTURUMU GÜVENLİ KAPAT                            │
└──────────────────────────────────────────────────────────┘
```
