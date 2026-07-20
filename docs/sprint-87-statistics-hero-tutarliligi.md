# Sprint 87: İstatistikler Ekranı — Ana Sayfa Tutarlılığı

## Context

Kullanıcı geri bildirimi (İstatistikler ekran görüntüsü):

> "bu kısmı incele ve geliştir. tasarımı ana sayfadan farklı geliyor.
> aynı tasarım mantığında olsun"

İstatistikler ekranı farklı bir tasarım dili kullanıyordu:
- LinearGradient renkli kart (Ana Sayfa'da yok)
- 5 ayrı stack satır (Ana Sayfa'da 3 stat tile)
- StatRow component ile emoji + pastel hex (Ana Sayfa'da Ionicons + accent renkleri)

## Sprint 87 Değişiklikleri

### 87A — Hero Tutarlılığı

**Dosya:** `mobile/src/screens/StatisticsScreen.tsx`

**Önce:** LinearGradient renkli kart + emoji + "tamamlandı" + "Harika gidiyorsun! 🎉"

**Sonra:** Ana Sayfa `HomeScreenLayoutA` hero pattern'i:
- `CircularProgress` (72pt, strokeWidth 8) — primary renk dinamik (`getAdherenceColor`)
- Başlık: "X/Y doz tamamlandı" (TR) / "X/Y doses completed" (EN)
- Alt başlık: "Son 7/30 günde" (seçili dönem bilgisi)
- Alt istatistikler: 🔥 mevcut seri + 🔥 en iyi seri

**Eklenen stiller:** `heroCard`, `heroText`, `heroTitle`, `heroSubtitle`, `heroStatsRow`, `heroStat`, `heroStatText`

**Silinen stiller:** `adherenceCard`, `adherenceContent`, `adherenceIconBox`, `adherenceIconEmoji`, `adherenceTextContainer`, `adherenceTitle`, `adherenceSubtitle`, `adherenceValue`

### 87B — Özet Grid

**Önce:** 5 ayrı `<StatRow>` (Alındı/Atlandı/Kaçırıldı/Ardışık/En İyi)

**Sonra:** 2x2 grid (Alındı/Atlandı/Kaçırıldı/Toplam) — Ana Sayfa stat tile tutarlılığı
- Her tile: Ionicons (checkmark/circle vb.) + büyük sayı + küçük label
- `surfaceContainerLow` arka plan (MD3 elevation 1)
- Seriler zaten 87A hero'da gösteriliyor, burada toplam yer aldı

**Eklenen stiller:** `statGrid` (flex-wrap gap 8), `statTile` (48% flexBasis), `statTileIcon` (36pt daire), `statTileValue` (22pt), `statTileLabel` (12pt)

**Silinen import:** `StatRow` (artık kullanılmıyor)

### Test Fix (test tarafı)

**Dosya:** `mobile/src/__tests__/screens/StatisticsScreen.test.tsx`

Sprint 87A'da CircularProgress import ettiğim için test'in `react-native-svg` mock'una ihtiyaç var. LinearGradient kaldırıldığı için ilgili mock da silindi.

## Sonuç (Önce → Sonra)

| Element | Önce | Sonra |
|---------|------|-------|
| Hero kart | LinearGradient + emoji + 🎉 | CircularProgress + metin + seri bilgileri |
| Özet bölümü | 5 satır stack | 2x2 grid |
| Seri bilgisi | ÖZET'te ayrı satır | Hero'da entegre |
| Toplam doz | Yok | ÖZET grid 4. tile |

Ana Sayfa ile **aynı tasarım dili**:
- CircularProgress aynı
- Stat tile layout benzer
- Ionicons + accent renkler (pastel hex yerine)
- Border-bottom ile kart ayrımı (LinearGradient yerine)

## Doğrulama

- **TS**: 0 hata
- **Jest**: 1354/1354 (Sprint 87 test fix dahil, regresyon yok)
- **Gradle**: BUILD SUCCESSFUL (1m 34s)
- **APK install**: Success (43cebdf1)

## Telefon Doğrulama

İstatistikler sekmesi:
- Hero: CircularProgress + "X/Y doz tamamlandı" + seri bilgileri
- ÖZET: 2x2 grid (Alındı / Atlandı / Kaçırıldı / Toplam)
- Dönem seçimi (Haftalık/Aylık) korundu
- PDF Rapor Oluştur butonu korundu
- Uyum Grafiği + Dağılım + Geçmiş korundu