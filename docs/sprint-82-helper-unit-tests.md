# Sprint 82: Helper Unit Testleri + Refactor

## Context

Sprint 81'de MedicineRow.tsx icinde 3 inline pure helper eklenmisti:
- getExpiryColor (Sprint 81A — SKT akıllı renk)
- getStockColor (Sprint 81B — Stok badge rengi)
- isFutureTime (Sprint 81C — Saat chip zaman bazlı renk)

Bu helper'lar:
- **Test edilemezdi** — MedicineRow.tsx içinde private function olarak yaşıyorlardı
- **DRY ihlali** — gelecekte başka component'ler de aynı mantığı gerektirebilir

Sprint 82: helper'ları `helpers.ts`'e taşı, export et, comprehensive unit test yaz.

## Değişiklikler

### 82.1 — Helper Extraction

**Dosya:** `mobile/src/screens/MedicinesScreen/helpers.ts`

3 yeni export eklendi (her biri JSDoc'lu, pure):
- `getExpiryColor(expiryDate, reminderDays, colors)` — 4 seviye renk paleti (expired/expiring/medium/far)
- `getStockColor(stockCount, threshold, colors)` — 3 variant (critical/low/ok) + variant field
- `isFutureTime(time)` — HH:MM string karşılaştırma

`MedicineRow.tsx`'ten bu 3 helper'ın inline tanımları **silindi**, import ile kullanılıyor.

### 82.2 — Comprehensive Tests

**Dosya:** `mobile/src/__tests__/screens/MedicinesScreen.helpers.test.ts`

22 yeni test eklendi (3 describe bloğu):

**getExpiryColor** (8 test):
- undefined → muted
- past date → error (kırmızı)
- within reminderDays → warning
- default reminder when undefined
- 30-90 gün → success (yeşil)
- > 90 gün → muted
- invalid date string → muted (graceful)
- colors.warning undefined → fallback #F59E0B

**getStockColor** (9 test):
- stockCount undefined → null
- below threshold → critical
- threshold boundary → critical
- between threshold and 2x → low
- 2x threshold boundary → low
- above 2x → ok
- default threshold 5 when undefined
- zero stock → critical
- warning undefined → fallback #F59E0B

**isFutureTime** (5 test):
- 1 saat gelecek → true
- 1 saat geçmiş → false
- string comparison correctness
- edge case 23:59 vs 00:00
- boolean return type guarantee

## Sonuç

| Metric | Önce | Sonra |
|--------|------|-------|
| Helpers.ts export sayısı | 4 | 7 |
| Test sayısı (MedicinesScreen.helpers) | 16 | 38 |
| Toplam test | 1332 | 1354 |
| Helper lokasyonu | MedicineRow inline | helpers.ts (DRY) |

## Doğrulama

- **TS**: 0 hata
- **Jest**: 1354/1354 (22 yeni test, hepsi geçti)
- **Gradle**: BUILD SUCCESSFUL (1m 40s)
- **APK install**: Success (43cebdf1)

## Telefon Doğrulama

Sprint 81 davranışı değişmedi — helper'lar aynı sonucu üretiyor, sadece lokasyonları değişti. Görsel davranış aynı (SKT renkleri, stok badge, saat chip zaman bazlı renk).

## İleride (Sprint 83+ backlog)

- TimelineItem.tsx da `getExpiryColor` ve `getStockColor` kullanabilir (DRY genişletme)
- Sprint 81 helper'ları DRY refactor fırsatı: birden fazla component'te tekrar
- Component test'ler (MedicineRow render testi)