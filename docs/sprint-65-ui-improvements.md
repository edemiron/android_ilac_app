# Sprint 65: 3 UI İyileştirmesi — Kullanıcı Geri Bildirimi Sonrası

## Context

Kullanıcı, telefondaki uygulamadan 4 ekran görüntüsü paylaştı (Layout A / Detaylı — ana sayfa + ilaçlarım listesi). Üç gözlem:

1. **Stok uyarısı kapatılamıyor** — "Stok Azalıyor!" kartı her açılışta tekrar tekrar görünüyordu. Kullanıcı dismiss edebilmeli; 24 saat sonra yeni gün kontrolü için otomatik geri gelmeli.
2. **Stat tile semantik tutarsızlığı** — 3-stat tile "Bugün 7" (toplam doz) ile "Sonraki: 08:00 Parol" (tek doz) çakışıyordu. Kullanıcı "1 ilaç mı kaldı?" diye soruyordu. Etiket netliği gerekiyordu.
3. **Medicine name truncation** — Uzun isimler (TERRAMYCIN 30 MG / 10.000 IU DERI MERHEMI) tek satırda kesiliyordu. İki satır okunabilirdi.

**Korunan baseline:**
- 1310/1310 test, 0 TS hatası
- Provider zinciri: `UserProfileProvider > AccentProvider > ThemeProvider > ...`
- Sprint 64 haptic pattern (SettingRow'da var)

**Sıralama: 65C → 65B → 65A** (küçükten büyüğe, kolay geri alma imkânı).

**Hotfix:** Sprint 65A commit'i sonrası "Stok Uyarılarını Sıfırla" satırı görünmüyordu. Fix sonrası prop her zaman geçiliyor (`fbeb1e9`).

---

## Sprint 65C — Medicine Name Truncation Fix (en küçük)

**Commit:** `0d9437d`

**Hedef:** Uzun ilaç isimleri tek satır yerine 2 satırda, ellipsis ile kesilsin.

**Değişen dosyalar:**
- `mobile/src/screens/HomeScreen/components/TimelineItem.tsx` — `numberOfLines={1}` → `numberOfLines={2}` + `ellipsizeMode="tail"` + `lineHeight: 20` (medicineName style, 15pt fontSize).
- `mobile/src/screens/HomeScreen/components/CurrentDoseCard.tsx` — aynı fix, `lineHeight: 22` (18pt fontSize).

**Referans pattern:** `mobile/src/screens/MedicinesScreen/components/MedicineRow.tsx:196` (zaten 2-satır).

**Telefon doğrulama:**
"TERRAMYCIN 30 MG / 10.000 IU DERI MERHEMI" artık 2 satırda görünüyor.

---

## Sprint 65B — Stat Tile Semantik Netleştirme

**Commit:** `085a0cc`

**Hedef:** "Bugün 7" / "Sonraki 1" tutarsızlığını etiket + semantik netleştirmeyle gider.

**Yeni dosyalar:**
- `mobile/src/stores/helpers/reminderStats.ts` (YENİ, ~60 satır) — `getUniqueMedicineCount` ve `getUniqueMedicineTakenCount` pure helper'lar. Set-based deduplication. Edge case'ler (boş id, undefined stockCount).

**Yeni test:**
- `mobile/src/__tests__/stores/helpers/reminderStats.test.ts` (YENİ, ~75 satır) — 9 unit test.

**Değişen dosyalar:**
- `mobile/src/screens/HomeScreen.tsx` — useMemo'ya `uniqueMedicineCount` eklendi; tile label'ları:
  - "Bugün" → **"Bugün · 4 ilaç"** (toplam doz + benzersiz ilaç)
  - "Kalan" → **"Bekleyen"** (Türkçe net isim)
  - "Sonraki:" → **"Sonraki Doz:"** (tek doz semantiği net)

**Telefon doğrulama:**
- "Bugün 16 doz · 4 ilaç" (eski "Bugün 16")
- "Alındı 10"
- "Bekleyen 6" (eski "Kalan")
- "Sonraki Doz: 21:00 · TERRAMYCIN..." (eski "Sonraki:")

---

## Sprint 65A — Stok Uyarısı Persistent Dismiss (büyük)

**Commit:** `fbeb1e9`
**Hotfix:** `24a2509`

**Hedef:** "Stok Azalıyor!" kartında close (X) ikonu; 24 saat sonra otomatik geri gel; stok değişirse (medicineHash) hemen geri gel; Settings > Ek Özellikler > manuel sıfırlama.

### Yeni dosyalar

- **`mobile/src/hooks/useLowStockDismiss.tsx`** (~150 satır, YENİ) — `LowStockDismissProvider` + `useLowStockDismiss()` hook. `useOnboarding.tsx` pattern'i.
- Schema: `AsyncStorage @low_stock_dismissed → { dismissedAt: ISO, medicinesHash: string }`.
- 24 saat TTL (`LOW_STOCK_DISMISS_TTL_MS = 24 * 60 * 60 * 1000`).
- `computeLowStockHash(items)` — `id:stockCount` formatında stable hash (sıralı).
- API: `checkDismissed(hash)`, `dismiss(hash)`, `reset()`, `isDismissed`, `isLoading`.

### Değişen dosyalar

- **`mobile/src/components/common/LowStockCard.tsx`** — `onDismiss?: () => void` prop + close-circle (X) ikonu (top:8, right:8, hitSlop 12pt).
- **`mobile/src/screens/HomeScreen.tsx`** — inline Stok Uyarısı JSX'i → `<LowStockCard onDismiss={...} />` + `useLowStockDismiss` hook + `lowStockHash` useMemo. Eski `lowStockCard`/`lowStockContent`/etc style'ları kaldırıldı (DRY).
- **`mobile/App.tsx`** — `LowStockDismissProvider` zincirde (ThemeProvider ve OnboardingProvider arası).
- **`mobile/src/components/settings/AdditionalFeaturesSection.tsx`** — `onResetLowStockPress?: () => void` prop + Yeni `SettingRow` ("Stok Uyarılarını Sıfırla", `refresh-circle-outline` ikonu).
- **`mobile/src/screens/SettingsScreen.tsx`** — `useLowStockDismiss` + `handleResetLowStock` callback + `useAlert.showInfo` toast.

### Hotfix: Sprint 65A ek özellikler'de reset row yok

**Commit:** `24a2509`

**Sorun:** "Stok Uyarılarını Sıfırla" satırı Settings'te görünmüyordu.

**Kök neden:** SettingsScreen ilk mount'unda Provider AsyncStorage'dan henüz yüklenmediği için `isDismissed=false` → prop `undefined` → `{onResetLowStockPress && ...}` koşulu row'u gizliyordu. Race condition.

**Çözüm:** Prop her zaman geçiliyor. Handle'da `isLowStockDismissed` durumuna göre toast mesajı:
- dismiss edilmiş → reset + "Stok Uyarıları Sıfırlandı"
- dismiss edilmemiş → no-op + "Zaten Aktif"

---

## Toplam Etki (Sprint 65)

| Metrik | Değer |
|--------|-------|
| Commit sayısı (65 + hotfix) | 4 |
| Yeni dosya | 2 (`reminderStats.ts`, `useLowStockDismiss.tsx`) |
| Test eklenen | 9 (`reminderStats.test.ts`) |
| Test baseline delta | 1310 → 1319 (helper testleri sonrası hotfix sonrası 1331) |
| Production baseline | 1331/1333, 0 TS hatası |
| APK | 98 MB, telefona yüklendi (43cebdf1) |
| Provider chain delta | `LowStockDismissProvider` eklendi (OnboardingProvider seviyesi) |

---

## Telefon Doğrulama Özeti

**65C** ✓ TERRAMYCIN 2 satırda gösterildi
**65B** ✓ "Bugün 16 doz · 4 ilaç" + "Bekleyen" + "Sonraki Doz:" görüldü
**65A** ✓ Kullanıcı X'e bastı → kart kayboldu; Settings > reset row hotfix sonrası erişilebilir
**Accent rengi** ✓ Ocean (mavi) seçildi, primary renkler değişti

---

## Sprint 66+ Yol Haritası (Plan)

| Sprint | Kapsam |
|--------|--------|
| 66 | Haptic genişletme (OptionPicker, EmptyState, ErrorState, TimelineItem) |
| 67 | Layout C Switcher entegrasyonu (A/B/C seçimi) |
| 68 | İlaç arama + filtre (MedicinesScreen search bar + filter chips) |
| 69 | Caregiver bildirim geliştirmesi (zengin notification, deep link) |
| 70 | Empty state + Loading skeleton polish |

## Sprint 66 Plan Detay

| Sub-sprint | Component | Haptic Tipi | Tetikleyici |
|------------|-----------|-------------|-------------|
| 66A | `OptionPicker.tsx` | `selection` | Option seçildiğinde |
| 66B | `EmptyState.tsx` | `medium` | Action butonuna basıldığında |
| 66B | `ErrorState.tsx` | `error` | Retry butonuna basıldığında |
| 66C | `TimelineItem.tsx` | `success` | "Aldım" eylemi başarılı olduğunda |
| 66D | `CurrentDoseCard.tsx` | `success` / `warning` | Take / Skip callback'leri |

Tüm Sprint 65 review doc `docs/sprint-65-ui-improvements.md`'a yazıldı.
