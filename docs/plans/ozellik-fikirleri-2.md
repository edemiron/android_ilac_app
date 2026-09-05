# Yeni Özellik Karşılaştırma Analizi

> **Tarih:** 2026-01-29
> **Proje:** İlaç Hatırlatıcı (Android)
> **Hedef Kitle:** Yaşlılar ve Kronik Hastalar

---

## Özellik Karşılaştırma Analizi

### MEVCUT (Tamamlanmış)

| Özellik | Durum | Dosya/Konum |
|---------|-------|-------------|
| İlaç adı girme (Manuel) | Tamamlandı | `AddMedicineScreen.tsx` |
| Dozaj bilgisi | Tamamlandı | `DosageInput.tsx` |
| İlaç formu seçimi | Tamamlandı | Medicine types |
| İlaç görseli (Kamera/Galeri) | Eksik | Yok |
| Günde X kere sıklık | Tamamlandı | `FrequencySelector.tsx` |
| Belirli günlerde | Eksik | Sadece frequency var |
| Kritik uyarılar (Sessiz modda çalan) | Tamamlandı | Notifee bypass DND |
| "Aç/Tok Karnına" uyarısı | Tamamlandı | `InstructionSelector.tsx` |
| "Aldım" butonu | Tamamlandı | `AlarmScreen.tsx`, `HomeScreen.tsx` |
| "Atla" butonu | Tamamlandı | Kayıt var, not yok |
| "Ertele" butonu | Tamamlandı | 5/10/15/30 dk seçenekleri |
| Günlük özet ekranı | Tamamlandı | `HomeScreen.tsx` |
| Stok takibi | Tamamlandı | `StockSection.tsx` |
| Yenileme uyarıları | Tamamlandı | `getLowStockMedicines` |
| Takvim görünümü | Eksik | Sadece istatistik grafikleri |
| Uyum raporu | Tamamlandı | `StatisticsScreen.tsx` |
| PDF raporu dışa aktarma | Tamamlandı | `pdfReportService.ts` |
| PIN/Biyometrik giriş | Eksik | Yok |
| Bulut yedeği | Tamamlandı | Firebase Firestore |
| Karanlık mod | Tamamlandı | `ThemeContext.tsx` |
| Büyük butonlar/yazılar | Kısmi | Kısmen var |
| Tam ekran alarm | Tamamlandı | `AlarmScreen.tsx` |
| Widget | Eksik | Yok |
| Kalıcı bildirim | Eksik | Yok |
| Bakıcı/Aile modu | Eksik | Yok |
| Sesli komut | Eksik | Yok |
| Text-to-Speech | Tamamlandı | `speech.ts` (mevcut ama sınırlı) |
| İlaç etkileşim kontrolü | Tamamlandı | `InteractionsScreen.tsx` |
| OCR/AI destekli giriş | Kısmi | AI search var, OCR yok |
| Barkod tarama | Tamamlandı | `BarcodeScannerScreen.tsx` |

---

## EKSİK ÖZELLİKLER (Öncelik Sırasına Göre)

### Kritik (İmza Özellikler)

| # | Özellik | Öncelik | Gerekçe |
|---|---------|---------|---------|
| 1 | **Bakıcı/Aile Modu** | Çok Yüksek | İmza özellik - yaşlılar için hayati |
| 2 | **Ana Ekran Widget** | Çok Yüksek | Android avantajı, uygulamayı açmadan görüntüleme |
| 3 | **Kalıcı Bildirim** | Yüksek | İlaç alınana kadar silinmeyen bildirim |
| 4 | **PIN/Biyometrik Kilit** | Yüksek | Sağlık verileri için güvenlik |

### UX İyileştirmeleri (Yaşlı Dostu)

| # | Özellik | Öncelik | Gerekçe |
|---|---------|---------|---------|
| 5 | **Sesli Komut ("İlacımı aldım")** | Yüksek | Elleri titreyenler için |
| 6 | **Gelişmiş TTS** | Yüksek | Alarm çaldığında ilaç adı söyleme |
| 7 | **Takvim Görünümü** | Orta | Geçmiş görselleştirme |
| 8 | **İlaç Görseli Ekleme** | Orta | Tanıma kolaylığı |

### Zamanlama İyileştirmeleri

| # | Özellik | Öncelik | Gerekçe |
|---|---------|---------|---------|
| 9 | **Belirli Günlerde** | Orta | Haftanın belirli günleri |
| 10 | **X Saatte Bir** | Orta | 8 saatte bir gibi |
| 11 | **Atlama Nedeni Notu** | Düşük | Neden atlandı kaydı |

---

## Özet

**Tamamlanma Oranı:** ~65%

### Güçlü Yönler
- Temel ilaç yönetimi tam
- Bildirim sistemi güçlü (Notifee)
- AI/Barkod arama var
- İlaç etkileşimi mevcut
- PDF rapor var
- Bulut senkronizasyon var

### Kritik Eksikler
1. **Bakıcı/Aile Modu** - Bu olmadan "İmza Uygulama" olmaz
2. **Widget** - Android'in en büyük avantajı
3. **Güvenlik (PIN/Biyometrik)** - Sağlık verileri için şart
4. **Sesli Etkileşim** - Yaşlılar için önemli

---

## Bakıcı/Aile Modu Detaylı Tasarım

### Kullanıcı Rolleri
- **Ana Kullanıcı (Hasta):** İlaçlarını takip eden kişi
- **Bakıcı/Aile:** Uzaktan izleme ve yönetim yetkisi olan kişi

### Temel Özellikler
1. **Davet Sistemi:** Ana kullanıcı, bakıcıyı davet eder (e-posta veya kod ile)
2. **İzleme:** Bakıcı, hastanın ilaç alma durumunu gerçek zamanlı görebilir
3. **Uyarı:** İlaç belirli süre içinde alınmazsa bakıcıya bildirim gider
4. **Uzaktan Yönetim:** Bakıcı, hastanın ilaçlarını ekleyebilir/düzenleyebilir

### Teknik Gereksinimler
- Firebase Firestore: Kullanıcılar arası veri paylaşımı
- Cloud Functions: Gecikme bildirimleri için
- Yetki sistemi: Okuma/yazma izinleri

---

## Widget Detaylı Tasarım

### Widget Tipleri
1. **Küçük Widget (2x2):** Sıradaki ilaç ve saat
2. **Orta Widget (4x2):** Bugünkü tüm ilaçlar listesi
3. **Büyük Widget (4x4):** Detaylı görünüm + hızlı aksiyonlar

### Teknik Gereksinimler
- React Native için: `react-native-android-widget` veya native modül
- Veri senkronizasyonu: AsyncStorage'dan widget'a
- Güncelleme sıklığı: Her 15 dakikada bir veya ilaç değişikliğinde

---

## Uygulama Yol Haritası

### Faz 1: Temel İyileştirmeler (2 Hafta)
- [ ] Kalıcı bildirim
- [ ] Gelişmiş TTS (alarm sırasında ilaç adı söyleme)
- [ ] Atlama nedeni notu

### Faz 2: Güvenlik (1 Hafta)
- [ ] PIN kilidi
- [ ] Biyometrik giriş (parmak izi/yüz tanıma)

### Faz 3: İmza Özellikler (3-4 Hafta)
- [ ] Bakıcı/Aile Modu tasarımı
- [ ] Firebase Cloud Functions entegrasyonu
- [ ] Davet ve yetki sistemi
- [ ] Bakıcı dashboard'u

### Faz 4: Android Avantajları (2 Hafta)
- [ ] Ana ekran widget'ı (küçük)
- [ ] Ana ekran widget'ı (orta)
- [ ] Widget güncelleme mantığı

### Faz 5: Gelişmiş Özellikler (2 Hafta)
- [ ] Sesli komut entegrasyonu
- [ ] Takvim görünümü
- [ ] İlaç görseli ekleme
- [ ] Belirli günlerde zamanlama
