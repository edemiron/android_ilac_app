# 🌟 GOOGLE STITCH UI & THEME GENERATION PROMPT SPECIFICATION

> **App Name:** İlaç Hatırlatıcı (Smart Medicine Reminder & Clinical Adherence Tracker)  
> **Platform Target:** iOS & Android (React Native / Modern Mobile)  
> **Design Philosophy:** *Clinical Modernity & Frictionless Simplicity* (Zero medical anxiety, high contrast, clean typography, dopamine-driven habit tracking).

---

## 🎨 1. MASTER DESIGN SYSTEM & COLOR TOKENS

### Color Palette (Tokens)
```json
{
  "theme": {
    "light": {
      "background": "#F8FAFC",
      "surface": "#FFFFFF",
      "surfaceElevated": "#FFFFFF",
      "border": "#E2E8F0",
      "borderFocused": "#0D9488",
      "primary": "#0D9488",
      "primaryLight": "#CCFBF1",
      "primaryDark": "#115E59",
      "accent": "#F43F5E",
      "accentLight": "#FFE4E6",
      "textPrimary": "#0F172A",
      "textSecondary": "#64748B",
      "textMuted": "#94A3B8",
      "status": {
        "taken": "#10B981",
        "takenBg": "#D1FAE5",
        "skipped": "#F59E0B",
        "skippedBg": "#FEF3C7",
        "missed": "#EF4444",
        "missedBg": "#FEE2E2"
      }
    },
    "dark": {
      "background": "#0F172A",
      "surface": "#1E293B",
      "surfaceElevated": "#334155",
      "border": "#334155",
      "borderFocused": "#14B8A6",
      "primary": "#14B8A6",
      "primaryLight": "#134E4A",
      "primaryDark": "#2DD4BF",
      "accent": "#FB7185",
      "accentLight": "#4C0519",
      "textPrimary": "#F8FAFC",
      "textSecondary": "#94A3B8",
      "textMuted": "#64748B",
      "status": {
        "taken": "#34D399",
        "takenBg": "#064E3B",
        "skipped": "#FBBF24",
        "skippedBg": "#78350F",
        "missed": "#F87171",
        "missedBg": "#7F1D1D"
      }
    }
  }
}
```

### Typography System (Tabular & Clinical Clarity)
* **Font Family:** `Plus Jakarta Sans`, `Inter`, sans-serif
* **Numeric Feature:** `font-variant-numeric: tabular-nums;` (Zero jitter for clock digits and countdowns)
* **Scale:**
  * **Display (Hero/Streak):** 32px / Bold (700) / Line-height: 40px
  * **Heading 1 (Screen Title):** 24px / Bold (700) / Line-height: 32px
  * **Heading 2 (Card Title):** 18px / SemiBold (600) / Line-height: 24px
  * **Body Large (Medicine Names):** 16px / SemiBold (600) / Line-height: 22px
  * **Body Regular (Instructions/Notes):** 14px / Regular (400) / Line-height: 20px
  * **Caption/Badges:** 12px / Medium (500) / Line-height: 16px

---

## 📱 2. CORE INTERACTIVE SCREENS & COMPONENT ARCHITECTURE

### Screen 1: Daily Medication Hub (Ana Ekran)
* **Top Header:**
  * Greeting ("Günaydın, Sarah 👋") + Profil Avatarı + Bildirim Zili.
  * **Dairesel Uyum İlerleme Halkası (Circular Adherence Ring):**
    * Orta kısım: `%75` (3 / 4 Alındı).
    * Canlı zümrüt yeşili gradient dolum.
* **Haftalık Tarih Şeridi (Weekly Date Strip):**
  * Yatay kaydırılabilir 7 günlük takvim hapları.
  * Seçili gün (`15 Çarşamba`) Primary Teal arka plan ve altındaki başarı durum noktaları (🟢🟢🟡).
* **Günün İlaç Kartları Listesi:**
  * **Kart Örneği (Lisinopril 10mg):**
    * Sol: İlaç Formu İkonu (Kapsül / Damla / Şurup rengine göre renkli arka plan).
    * Orta: İlaç Adı (`Lisinopril`), Dozaj (`10mg - 1 Tablet`), Talimat Rozeti (`Yemekten Sonra`).
    * Sağ: Saat Rozeti (`08:00`) + Durum Rozeti (`🟢 Alındı` / `⏰ Bekliyor`).
    * Hızlı Aksiyon: Sağa kaydırarak "Aldım", sola kaydırarak "Ertele / Neden Belirt".

---

### Screen 2: Dual-Divider Wheel Time Picker (Çarklı Saat Seçici)
* **Yapı:**
  * İki bağımsız döner tumbler sütun (Sol: Saat `0-23`, Sağ: Dakika `00-59`).
* **Seçili Alan Çizgi Tasarımı:**
  * Seçili merkez değerin üstünde ve altında tam paralel 1.5px yatay bölücü çizgiler.
* **Tipografik Hiyerarşi:**
  ```text
        9            56
       10            57
   ───────────   ───────────   <- Üst Bölücü Çizgi
       11            58        <- 30px / 700 Bold / Koyu Metin
   ───────────   ───────────   <- Alt Bölücü Çizgi
       12            59
       13            00
  ```
* **Modal Çekmecesi:**
  * Sol üst: "İptal", Orta: "Saat Seçin", Sağ üst: "Tamam" (Teal Vurgu Butonu).

---

### Screen 3: Smart Add Medicine & Cross-Drug Interaction Warning
* **Alanlar:**
  * İlaç Adı Girişi (Akıllı Türkçe İlaç Veritabanı Otomatik Tamamlama).
  * 📷 Kamera ile Kutu Barkodu Tarama Butonu.
  * Dozaj & Form Seçici (Tablet, Kapsül, Şurup, Damla, İğne, Merhem).
  * Kullanım Planı: *Her Gün*, *Belirli Günler*, *Aralıklı Günler (2 günde 1)*, *Döngü (21 gün iç / 7 gün ara)*.
* **⚠️ Canlı Klinik İlaç Etkileşim Uyarısı (Drug Interaction Banner):**
  * Kullanıcı adı yazarken dolaptaki diğer ilaçlarla çakışma tespit edilirse (Örn: *Aspirin + Warfarin*):
    * Kırmızı / Kehribar renkli uyarı kartı belirir:
      👉 *"⚠️ Yüksek Riskli İlaç Etkileşimi: Bu ilaç mevcut Aspirin tedavinizle birlikte kanama riskini artırabilir. Doktorunuza danışınız."*

---

### Screen 4: Monthly Adherence Calendar & Doctor PDF Export
* **Aylık Takvim Görünümü:**
  * Geçmiş aylara ve günlere ait grid matrisi.
  * Gün rozetleri:
    * 🟢 Tam Uyum (%100 tüm ilaçlar zamanında alındı)
    * 🟡 Kısmi Uyum (Bazı dozlar atlandı / ertelendi)
    * 🔴 Kaçırıldı (Doz alınmadı)
* **Seçili Gün Doz Detay Çekmecesi:**
  * Alınma saati, dozu ve atlama gerekçesi (Örn: *"Mide bulantısı yaptı"*).
* **Alt Aksiyon Butonu:**
  * 📑 **"Resmi Doktor PDF Raporu Oluştur & Paylaş"** (Klinik onaylı, grafikli ve ilaç listeli A4 çıktısı).

---

### Screen 5: Caregiver Alerts & Duty Pharmacy Finder
* **Bakıcı Bildirim Modülü (Caregiver Sync):**
  * Hasta ilacını aldığında veya geciktirdiğinde uzaktaki aile bireyine giden anlık push bildirim simülasyonu.
* **Nöbetçi Eczane Bulucu (Duty Pharmacy Finder):**
  * İl / İlçe filtreli liste.
  * 🟢 **Açık / Nöbetçi** durum göstergesi.
  * 📞 **"Hemen Ara"** (`tel:...`) ve 📍 **"Haritada Yol Tarifi"** (`maps:...`) butonları.

---

## ⚡ 3. UI/UX ETKİLEŞİM & MİKRO-ANİMASYON KURALLARI

1. **Dopamin & Başarı Hissi:**
   * Bir ilaç alındığında kart üzerinde hafif yeşil dalgalanma ve dairesel onay animasyonu (`Spring physics`).
2. **Erişilebilirlik (A11y):**
   * Minimum dokunma alanı (Touch Target): `48x48 dp`.
   * Karanlık modda saf siyah (`#000000`) yerine göz yormayan derin arduvaz (`#0F172A`) tonları.
3. **Akıcı Dokunmatik Geri Bildirim:**
   * Çarklı saat seçici kaydırılırken her bir rakam değişiminde hafif haptik titreşim (`selection haptic`).
