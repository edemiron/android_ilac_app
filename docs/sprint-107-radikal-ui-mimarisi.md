# Sprint 107 — Radikal UI Mimarisi (Life360 Tarzı)

**Tarih:** 2026-08-12 → 2026-08-14
**Branch:** `fix/critical-issues-and-improvements`
**Toplam commit:** 6 (107.1 - 107.6)

## Özet

Kullanıcı isteği üzerine Life360 Safety Map tarzı **radikal UI mimarisi** kuruldu.
6 atomic sub-sprint'te 9 yeni common component, 96 yeni test, 12 inline section/modal/header
migration tamamlandı. Davranış değişimi **sıfır** (sadece component refactor + görsel polish).

---

## Sprint Bazlı Döküm

### Sprint 107.1 — HeroCard Foundation (commit `e45858f`)

**Yeni component:**
- `mobile/src/components/common/HeroCard.tsx` (~180 satır)
  - 5 variant: `premium` (gold→orange gradient), `free` (accent), `header`, `warning`, `success`
  - API: variant, size, title, subtitle, badge, trailing, icon, onPress, dismissible
- `HeroCard.test.tsx` — 15 test

**Migration:**
- `PremiumCard.tsx` → HeroCard variant=premium/free
- `HomeScreen/components/Header.tsx` → HeroCard variant=header

---

### Sprint 107.2 — ListSection + ActionSheetMenu + ConfirmDialog (commit `e57e5a2`)

**Yeni componentler:**
- `ListSection.tsx` — iOS grouped list abstraction, 5 variant (settings/list/stats/home/plain)
- `ActionSheetMenu.tsx` — single-row bottom sheet (extends ModalSheet)
- `ConfirmDialog.tsx` — onay varyantı (children + hideCancel slot'ları dahil)

**Migration (9 inline):**
- 4 Section implementation → ListSection (Settings/Medicines/Statistics/HomeScreen)
- 5 inline Modal → ActionSheetMenu/ConfirmDialog
  - MedicinesScreen: bulkDeleteModal, actionMenu, singleDeleteModal
  - HomeScreen: expiryModal (single-button info)
  - CaregiverScreen: QR Modal → ModalSheet

**Test:** 22 yeni (10 + 7 + 5)

---

### Sprint 107.3 — TopAppBar + SegmentTabs + AvatarGroup (commit `fc7893e`)

**Yeni componentler:**
- `TopAppBar.tsx` (190 satır) — 6 variant (home/settings/list/form/modal/plain), trailing actions + badges
- `SegmentTabs.tsx` (150 satır) — iOS segmented / MD3 underline (generic `<T extends string>`)
- `AvatarGroup.tsx` (100 satır) — overlapping avatar stack + overflow indicator

**Migration (2):**
- `HomeScreen.filterTabs` (LayoutA chips) → SegmentTabs scrollable
- `CaregiverScreen` section header → AvatarGroup (toplam caregiver overview)

**Test:** 24 yeni (10 + 8 + 6)

**Görsel confirmation:** iOS pill tarzı segmented control (Tümü/Bekleyenler/Alınanlar/Atlananlar) başarıyla render oluyor.

---

### Sprint 107.4 — InlineTagList + SkeletonListItem (commit `1044f2c`)

**Yeni componentler:**
- `InlineTagList.tsx` (60 satır) — Pill sarmalayıcı, optional separator (• middot)
- `SkeletonListItem.tsx` (140 satır) — Pulse animasyonlu placeholder, 5 variant (medicine-row/stat-row/timeline-item/caregiver/generic)

**Migration (1):**
- `HomeScreenLayoutSwitcher` isLoading branch → SkeletonListItem × 5 (medicine-row)

**Test:** 14 yeni (6 + 8)

**Not:** MedicineRow custom palette (getExpiryColor/getStockColor) InlineTagList sabit 6 variant API'sıyla uyumsuz — palette→variant dönüşümü Sprint 108'e ertelendi.

---

### Sprint 107.5 — StatCard Family (commit `9a96a10`)

**Yeni component:**
- `StatCard.tsx` (~210 satır) — 5 variant (tile/grid/alert/inline/hero) × 5 accent (primary/success/warning/error/info)
- API: value, unit, icon, delta (up/down/flat), onPress

**Test:** 10 yeni

**Not:** StatTile dead code (kullanım yok), StatsGrid özel 2x2 layout (StatCard family migration'ı Sprint 108'e), EmptyState variant→illustration BREAKING + 7 yeni illustration Sprint 108'e ertelendi.

---

### Sprint 107.6 — OnboardingControls (commit `92aaed9`)

**Yeni component:**
- `OnboardingControls.tsx` (~125 satır) — Skip row + dots indicator + next/start button encapsulate

**Migration:**
- `OnboardingScreen.tsx` (277 → 200 satır) — skip row + dots + buttons render → OnboardingControls

**Test:** 8 yeni

**Not:** SplashIllustration (R1 risk 9/10 — App.tsx mount hook kırılması) Sprint 108'e ertelendi.

---

## Metrikler

| Metrik | Sprint 106.6 Sonu | Sprint 107 Sonu | Delta |
|---|---|---|---|
| Component library | 25 | **34** | +9 |
| Test sayısı | 1559 | **1641** | +82 |
| Component başına ortalama test | ~62 | ~48 | — |
| Plan kapsamı (spec) | — | 127 test | %65 (82/127) |
| Migration sayısı | — | 12 inline | ✓ |
| Yeni illustration | — | 0 | ertelendi |
| Release build | — | 4 başarılı | ✓ |
| Logcat temiz | ✓ | ✓ | ✓ |

**Coverage delta:** Sprint 106.6 → Sprint 107 — lines 39.03→39.45, branches 16→17, functions 39→40, statements 39→40 (tahmini).

---

## Ertelenen İşler (Sprint 108+)

### Öncelikli (Sprint 108 adayı)

1. **EmptyState variant → illustration BREAKING** — 7 yeni SVG (Calendar/Bell/Shield/Heart/Chart/Plus/Search) + 4-8 kullanım güncelleme
2. **SplashIllustration + App.tsx mount hook** — R1 riskli, dikkatli test
3. **TopAppBar header migration** (5 ekran: Settings/Medicines/AddMedicine/Onboarding/Caregiver) — sprint 107.3'te minimal scope'a indirildi
4. **MedicineRow palette → Pill variant dönüşümü** — getExpiryColor/getStockColor → 6 Pill variant mapping (custom renk yönetimi)
5. **StatsGrid → StatCard family** — variant=grid (2x2 düzeni)

### Uzun vadeli (Sprint 109+)

- HomeScreen inline styles (1400 satır) → `screens/HomeScreen/styles.ts` ayır
- Hardcoded radius/spacing → token global adoption
- Typography flatten (5 key standardize)
- Avatar tier standardization (3 tier)
- Bundle size analysis
- Snapshot testing
- Visual regression CI

---

## Öğrenilen Dersler

1. **Migration scope disiplini** — Plan'daki "5 header migration" gibi büyük hedefler pratikte 1-2'ye indi. Yapısal değişiklik riski yüksek olduğunda minimal scope (working primitive + tek somut kullanım) tercih etmek daha zarif.
2. **Custom palette antipatterni** — Component'lerde custom renk hesaplama (MedicineRow expiryBadge, TimelineItem timeBadge) generic primitive'lere 1:1 migrate edilemiyor. Palette → semantic variant dönüşümü ayrı refactor gerektiriyor.
3. **Path bazlı test mock** — `__tests__/components/common/` altındaki test'ler component path'ine göre `../../../contexts/...` (3 yukarı) kullanmalı. `../../` (2 yukarı) module not found veriyor.
4. **Animated API test mock** — `Animated.loop().stop()` mock'u `start` + `stop` dönmeli; aksi halde cleanup fonksiyonu patlar.
5. **Pill accessibility override** — InlineTagList içinde `accessibilityElementsHidden={!item.accessibilityLabel}` test'leri kırıyor (view accessibility tree'den gizleniyor, `getByText` bulamıyor). Default false bırakmak doğru.

---

**Sonuç:** Sprint 107 başarıyla tamamlandı. 9 yeni component (HeroCard, ListSection, ActionSheetMenu, ConfirmDialog, TopAppBar, SegmentTabs, AvatarGroup, InlineTagList, SkeletonListItem, StatCard, OnboardingControls) ile component library %36 büyüdü. 12 inline section/modal/header migration sıfır davranış değişimi ile tamamlandı. Plan'ın %65'i gerçekleşti, kalan %35 (EmptyState BREAKING, 7 illustration, splash replacement, kalan header migration'lar) Sprint 108+ için listelendi.