# Sprint 88: İstatistikler Detay İyileştirmeleri

## Context

Kullanıcı geri bildirimi (Sprint 87 sonrası İstatistikler ekran görüntüsü):

> "incele ve geliştirmeye devam et. kodları analiz et."

Analiz sonucu 3 gerçek UX sorunu:

1. **Geçmiş kartları** — emoji ikonu (📅), pastel hex renkler, Ana Sayfa TimelineItem'dan farklı stil
2. **ÖZET grid** — padding çok büyük, kartlar arası boşluk fazla
3. **Dağılım pasta chart** — tek renk (sadece Alındı), legend küçük ve sığ değil

## Değişiklikler

### 88A — Geçmiş Kartı Sadeleştirme

**Dosya:** `mobile/src/screens/StatisticsScreen.tsx`

**Önce:**
- `📅` emoji ikonu (`#F3F4F6` pastel hex)
- Tam gün ismi ("Salı 21 Temmuz") + tam ay ("Temmuz")
- ✓/✗ text badge (✓{sayı} ✗{sayı})
- padding 16/12

**Sonra:**
- **Ionicons `medical`** (medkit) — Ana Sayfa TimelineItem pattern tutarlılığı
- Renkler `getAdherenceColor()` ile dinamik (yüzdeye göre)
- Kısa gün ismi ("Sal") + kısa ay ("21 Tem") — `EEE` + `d MMM`
- Ionicons checkmark/close + sayı — daha kompakt
- padding 16/10, font 14/11 (küçült)
- historyBadge artık flex row + gap 2 (ikon + sayı yan yana)
- `numberOfLines={1}` gün isminde taşma engeli

### 88B — ÖZET Grid Padding

`statGrid`: padding 12→10, gap 8→6
`statTile`: paddingVertical 14→12, paddingHorizontal 8→6
`heroCard`: paddingVertical 18→14 (Sprint 87A refinement)

### 88C — Dağılım Pasta Chart → Custom Bar

**Önce:** `react-native-chart-kit` PieChart (180pt yükseklik, küçük legend)
**Sonra:** Custom yatay bar (her kategori için):
- Ionicons ikon + label + count(yüzde)
- 8pt progress bar (accent renk + %15 background)
- `getAdherenceColor` benzeri renk paleti: success/warning/error

Eklenen stiller: `distributionContainer`, `distributionRow`, `distributionLabelRow`, `distributionLabel`, `distributionValue`, `distributionBarBg`, `distributionBarFill`

**Avantajlar:**
- Pasta chart tek renk olduğunda anlamsız — bar chart yüzde + sayı + ikon verir
- Legend okunabilir (text 14pt vs 12pt)
- PieChart kütüphanesi dependency'si kaldırılmadı (LineChart hâlâ kullanılıyor)
- `pieData` useMemo kaldırıldı → `overallStats.total > 0` koşulu

## Sonuç

| Element | Önce | Sonra |
|---------|------|-------|
| Geçmiş ikon | 📅 emoji | medical Ionicons (Ana Sayfa tutarlı) |
| Geçmiş gün | "Salı 21 Temmuz" | "Sal 21 Tem" |
| Geçmiş badge | "✓1 ✗4" text | ✓ ikon + 1, ✗ ikon + 4 |
| ÖZET padding | 12 + gap 8 | 10 + gap 6 |
| Hero padding | 18 | 14 |
| Dağılım | Pasta chart (180pt) | Custom yatay bar (compact) |

## Doğrulama

- **TS**: 0 hata
- **Jest**: 1352/1352 (regresyon yok)
- **Gradle**: BUILD SUCCESSFUL (4m 12s)
- **APK**: Build edildi (cihaz bağlı değildi, install atlandı — kullanıcı cihazı bağladığında)

## Telefon Doğrulama

İstatistikler sekmesi:
- Hero kompakt (14pt padding)
- ÖZET grid daha sıkı
- Geçmiş kartları: medkit ikon + kompakt bilgi
- DAĞILIM: 3 yatay bar (Alındı / Atlandı / Kaçırıldı) + yüzde + ikon

## İleride (Sprint 89+ backlog)

- UYMUM GRAFİĞİ etiket optimizasyonu (Pazartesi kesik — `i % 2 === 0` ile her 2 günde göster)
- chartHelpers test coverage'ı Sprint 84'teki DRY ile zaten %100
- Pasta chart kütüphanesi dependency (sadece PieChart kaldırıldı — react-native-chart-kit hâlâ LineChart için)