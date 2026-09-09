# 📐 8 Çapraz Fonksiyonel Uzman Ekip & "Tüm Açılır Menüler (Dropdown Inset Drawer)" Denetim Raporu

Bu belge, **İlaç Hatırlatıcı** uygulamasındaki tüm açılır menülerin (dropdown/pickers) tespitini ve **İçe Gömülü Çekmece Kapsülü (Indented Inset Drawer)** mimarisine dönüştürülme planını içerir.

---

## 🔍 1. Uygulamadaki Tüm Açılır Menülerin (Dropdown/Pickers) Tespiti

| No | Menü Adı | Bulunduğu Ekran | Eski Sorun | 2026 Çekmece Çözümü |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **🔊 Ses Seviyesi & Test** | `SettingsScreen` > Bildirimler | Alttaki satırlarla çakışıyordu. | `#F59E0B` Amber Inset Kapsül + `🔊 SEÇİLEBİLİR SES SEVİYELERİ` başlığı. |
| **2** | **🌐 Dil Seçimi (Language)** | `SettingsScreen` > Görünüm | Düz beyaz satır olarak akıyordu. | `#0284C7` Sky Blue Inset Kapsül + `🌐 KULLANILABİLİR DİLLER` başlığı. |
| **3** | **🎵 Alarm Melodisi Seçimi** | `SettingsScreen` > Bildirimler | Önceden düz akıyordu (Düzeltildi). | `#0D9488` Teal Inset Kapsül + `🎵 SEÇİLEBİLİR İLAÇ MELODİLERİ` başlığı. |
| **4** | **⏱️ Erteleme Süresi & Sayısı** | Bildirim / Hatırlatma Ayarları | Düz metin listesi. | `#8B5CF6` Purple Inset Kapsül + `⏱️ ERTELEME SEÇENEKLERİ` başlığı. |
| **5** | **🌙 Gece Modu & Çakışma Aralığı**| Gelişmiş Bildirim Ayarları | Düz metin listesi. | `#6366F1` Indigo Inset Kapsül + `🌙 ZAMAN ARALIĞI` başlığı. |

---

## 💎 2. Genel Açılır Menü (OptionPicker) Tasarım Standardı

Tüm açılır menülerde tek tip, premium standart uygulanacaktır:

1. **📦 İçe Doğru Girintili Kapsül (Indented Inset Box):**
   * Kenarlardan `12px` içe girintili, `16px` yumuşak köşeli ve `1.5px` renkli kenarlık.
2. **🏷️ Renkli Başlık Şeridi (Drawer Header):**
   * Her menünün kendi fonksiyonuna özel ikon ve renkli minik başlık şeridi (örn. `🌐 KULLANILABİLİR DİLLER`, `🔊 SES SEVİYESİ SEÇENEKLERİ`).
3. **✨ Aktif Seçim Vurgusu & Çift Dokunsal Geri Bildirim (Haptics):**
   * Seçili satırda renkli arka plan dolgusu ve sağda parlayan onay işareti (`✓`).

---

## 🚀 3. Onay & Uygulama Adımları

1. `mobile/src/components/settings/OptionPicker.tsx` bileşeni `title`, `icon` ve `tintColor` destekli genel Inset Kapsül mimarisine yükseltilecek.
2. `AppearanceSection.tsx` (Dil seçimi) ve `NotificationsSection.tsx` (Ses seviyesi seçimi) yeni başlık ve renklerle bağlanacak.
3. Testler, derleme ve telefona yükleme gerçekleştirilecek.
