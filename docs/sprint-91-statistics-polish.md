# Sprint 91: İstatistikler Polish (Kullanıcı Feedback)

## Context

Kullanıcı Sprint 87-89 sonrası İstatistikler ekran görüntüsü paylaştı. 4 gözlem:

1. **Hero "0 en iyi seri"** — streak 0 ise boş satır gereksiz görünüyor
2. **Dağılım "Atlandı 4 (100%)"** — sadece atlandı varsa misleading (100% atlanan değil, 4 dozun hepsi atlandı)
3. **Uymum grafiği tek nokta** — 0% lineChart veri dağılımı çok sığ
4. **Boş durum** — 0 değerler için net geri bildirim eksik

## Değişiklikler

### 91A — Hero Streak Filtresi

**Dosya:** `mobile/src/screens/StatisticsScreen.tsx`

- `currentStreak > 0 &&` koşulu zaten vardı
- **`bestStreak > 0 &&` koşulu eklendi** — "0 en iyi" satırı artık hidden

### 91B — Dağılım Değer Formatı

**Önce:** `4 (100%)` (misleading)
**Sonra:**
- `0` → `—` (boş)
- `100%` → `Hepsi` / `All` (Türkçe/İngilizce)
- Diğer → `4 (100%)` (aynı)

`displayValue` ternari eklendi, `{item.count} (({pct}%))` yerine `{displayValue}` kullanılıyor.

## Korunmayan (Backlog)

- **91C**: Geçmiş kartında 0% durum gizleme — sprint 88 zaten `dayHasData` koşuluyla kontrol ediyor, ek değişiklik gerekmedi
- **91D**: Uymum grafiği 0% line dağılımı — chart-kit kütüphanesinin `linejoinType: 'round'` eklemek görsel iyileştirme sağlar, ancak scope creep. Sprint 92+ backlog

## Atlanan İyileştirmeler

- **Cumulative vs Period**: Sprint 88C'de yatay bar zaten eklenmişti, Sprint 91'de sadece değer formatı polish
- **Streak sıfır UX**: Daha derin tasarım değişikliği gerekir, sprint 92+ backlog

## Doğrulama

- **TS**: 0 hata
- **Jest**: 1352/1352 (regresyon yok)
- **Gradle**: BUILD SUCCESSFUL (3m 27s)
- **APK install**: Success (43cebdf1)

## Telefon Doğrulama

Cihaz bağlandığında İstatistikler ekranında:
- Hero: "0 en iyi" satırı artık görünmüyor (sadece current streak > 0 ise görünür)
- Dağılım:
  - Alındı 0 → "—"
  - Atlandı 4 → "Hepsi"
  - Kaçırıldı 0 → "—"

## PR Güncelleme

Sprint 91 PR #5'e (Sprint 77-88) push edilir, otomatik güncellenir. PR description Sprint 92+ içinde toplu güncellenecek.