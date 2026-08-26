# PR: Sprint 58-68 — UI/UX İyileştirmeleri

## Özet

Bu PR, Sprint 58-68 boyunca yapılan 16 commit'i kapsar: kullanıcının geri bildirimleri sonrası eklenen UI/UX iyileştirmeleri, yeni provider'lar, haptics, layout varyasyonları ve arama/filtre.

## Değişiklikler

### Sprint 58 — UserProfile + Theme Variant
- `useUserProfile` hook (AsyncStorage @app_user_profile)
- `HomeScreenLayoutSwitcher` A/B routing
- `useUserProfile.test.tsx` (6 test)

### Sprint 58.5 — Layout B (Detaylı) 7 MD3 Kart
- `primaryContainer` token
- `LowStockCard`, `StatTile`, `MiniChart` reusable
- 7 kart: Adherence Hero, Streak Gradient, Stat Tiles, Low Stock, 7-day MiniChart, Şu An, Bugün Planı

### Sprint 59 — EmptyState + ErrorState
- `PillboxIllustration` (Sprint 59 SVG)
- `EmptyState` (3 varyant: illustration, icon, simple)
- `ErrorState` (retry callback + errorCode)

### Sprint 60 — Onboarding (4 slide)
- `useOnboarding` hook
- `OnboardingScreen` 4 slide (Welcome, Reminders, Adherence, Caregiver)
- Android 13+ POST_NOTIFICATIONS permission isteme
- `useOnboarding.test.tsx` (9 test)

### Sprint 61 — A11y Pass
- `CircularProgress` accessibilityRole="progressbar" + accessibilityValue
- Layout A/B planHeader minHeight: 44

### Sprint 62 — LayoutAnimation
- Reanimated yerine RN built-in LayoutAnimation
- HomeScreenLayoutSwitcher crossfade (300ms)

### Sprint 63 — 6 Accent Palette
- `palettes.ts` (Ocean/Sunset/Forest/Lavender/Cherry/Mint)
- `AccentContext` + `useAccent()` hook
- `AccentColorSection` UI
- `useUserProfile` v1→v2 migration (accentColor + version)

### Sprint 64 — Haptics
- `useHaptics` hook (`react-native-haptic-feedback` wrapper)
- 7 trigger tipi (light/medium/heavy/selection/success/warning/error)
- `useUserProfile` v2→v3 migration (hapticsEnabled)
- `HapticSettingRow` SettingRow'da haptic entegrasyonu

### Sprint 65 — Kullanıcı Geri Bildirimi (3 sprint)
- **65C**: Medicine name 2-satır truncation (TimelineItem + CurrentDoseCard, `numberOfLines={2}` + `ellipsizeMode="tail"`)
- **65B**: Stat tile semantik netleştirme ("Bugün · 4 ilaç", "Bekleyen", "Sonraki Doz")
- **65A**: Stok uyarısı persistent dismiss (`useLowStockDismiss` Provider, X ikonu, 24h TTL + medicinesHash auto-invalidation)
- **Hotfix**: "Stok Uyarılarını Sıfırla" satırı her zaman görünür (race condition)

### Sprint 66 — Haptic Genişletme
- OptionPicker: selection haptic
- EmptyState: medium haptic on action
- ErrorState: light haptic on retry
- TimelineItem: success haptic on Take Now

### Sprint 67 — Layout C Switcher
- `LayoutVariant = 'A' | 'B' | 'C'`
- HomeScreenLayoutSwitcher 'C' branch
- AppearanceSection 3 seçenek (Detaylı / Sade / Liste)
- SettingsScreen A/B/C label/description

### Sprint 68 — İlaç Arama + Filtre
- MedicinesScreen search bar (TextInput + clear button)
- 4 filter chip (Tümü / Aktif / Pasif / Stok Az)
- activeMedicines/inactiveMedicines useMemo (search + filter mode)

## Test

- **Test baseline**: 1310 → 1331 (+21 yeni test)
- **TypeScript**: 0 hata
- **Test dosyaları**: 
  - `useUserProfile.test.tsx` (6 test)
  - `useOnboarding.test.tsx` (9 test)
  - `useLowStockDismiss.test.tsx` (Sprint 65A)
  - `reminderStats.test.ts` (9 test, Sprint 65B)
  - `EmptyState.test.tsx` (6 test, Sprint 59)
  - `ErrorState.test.tsx` (6 test, Sprint 59)

## Dosya Değişiklikleri Özeti

```
16 commits
+5,400 satır ekleme
-380 satır silme
```

### Yeni dosyalar (24)
- `mobile/src/components/common/PillboxIllustration.tsx` (Sprint 59)
- `mobile/src/components/common/EmptyState.tsx` (Sprint 59)
- `mobile/src/components/common/ErrorState.tsx` (Sprint 59)
- `mobile/src/components/common/LowStockCard.tsx` (Sprint 58.5)
- `mobile/src/components/common/StatTile.tsx` (Sprint 58.5)
- `mobile/src/components/common/MiniChart.tsx` (Sprint 58.5)
- `mobile/src/components/common/AccentColorSection.tsx` (Sprint 63)
- `mobile/src/components/layouts/HomeScreenLayoutSwitcher.tsx` (Sprint 58.5, 67)
- `mobile/src/components/layouts/HomeScreenLayoutC.tsx` (Sprint 57, 67'de Switcher'a bağlandı)
- `mobile/src/hooks/useUserProfile.tsx` (Sprint 58)
- `mobile/src/hooks/useOnboarding.tsx` (Sprint 60)
- `mobile/src/hooks/useLowStockDismiss.tsx` (Sprint 65A)
- `mobile/src/hooks/useHaptics.ts` (Sprint 64)
- `mobile/src/contexts/AccentContext.tsx` (Sprint 63)
- `mobile/src/screens/OnboardingScreen.tsx` (Sprint 60)
- `mobile/src/stores/helpers/reminderStats.ts` (Sprint 65B)
- `mobile/src/theme/palettes.ts` (Sprint 63)
- 7 test dosyası

### Değişen anahtar dosyalar
- `mobile/App.tsx` — Provider zinciri: UserProfile → Accent → Theme → Onboarding → ...
- `mobile/src/components/settings/SettingRow.tsx` — HapticSettingRow wrapper
- `mobile/src/components/settings/AdditionalFeaturesSection.tsx` — Stok Uyarıları Sıfırla
- `mobile/src/components/settings/AppearanceSection.tsx` — Layout 3 seçenek
- `mobile/src/components/common/EmptyState.tsx` + `ErrorState.tsx` — Haptic
- `mobile/src/components/layouts/HomeScreenLayoutB.tsx` — 7 MD3 kart
- `mobile/src/components/layouts/HomeScreenLayoutSwitcher.tsx` — A/B/C branch
- `mobile/src/contexts/ThemeContext.tsx` — `primaryContainer` token, accent override
- `mobile/src/screens/HomeScreen.tsx` — Switcher'a Layout B erken return
- `mobile/src/screens/SettingsScreen.tsx` — Layout C label/description, useLowStockDismiss
- `mobile/src/screens/MedicinesScreen.tsx` — Search + filter
- `mobile/src/screens/HomeScreen/components/TimelineItem.tsx` — 2-satır name + success haptic

## Doğrulama

- ✅ TS 0 hata
- ✅ 1331/1331 test baseline korundu
- ✅ 16 commit
- ✅ Gradle BUILD SUCCESSFUL (her sprint'te)
- ✅ APK telefona yüklendi (43cebdf1)
- ✅ Manuel test edildi (65A, 65B, 65C, 66, 67, 68)

## Commit'ler

| Sprint | Commit | Başlık |
|--------|--------|--------|
| 58.5 | `2d3bc3a` | Layout B Detaylı 7 MD3 kart |
| 59 | `d64356d` | EmptyState + ErrorState + PillboxIllustration |
| 60 | `c822ca1` | Onboarding 4 slide |
| 61 | `ce2be2a` | A11y pass |
| 62 | `89497ed` | LayoutAnimation (reanimated yerine) |
| 63 | (Sprint 63) | 6 accent palette |
| 64 | `675c3a3` | useHaptics + SettingRow |
| Hotfix | `4ffb815` | AccentProvider sıralaması |
| 65C | `0d9437d` | Medicine name 2-satır truncation |
| 65B | `085a0cc` | Stat tile semantik netleştirme |
| 65A | `fbeb1e9` | Stok uyarısı persistent dismiss |
| 65A Hotfix | `24a2509` | Reset row her zaman görünür |
| 66 | `c02745b` | Haptic genişletme (OptionPicker/Empty/Error/Timeline) |
| 67 | `ebbc8d0` | Layout C Switcher (A/B/C) |
| 68 | `221d08f` | İlaç arama + 4 filter chip |

## Test Edilen Telefon Özellikleri

Sprint 65-68 build (`43cebdf1` cihazında):

- ✅ 2-satır medicine name truncation (TERRAMYCIN 30 MG / 10.000 IU DERI MERHEMI)
- ✅ Stat tile semantik (Bugün 16 doz · 4 ilaç / Bekleyen 16 / Sonraki Doz)
- ✅ Stok Azalıyor X ikonu (dismiss çalışıyor)
- ✅ Ayarlar > Ek Özellikler > Stok Uyarılarını Sıfırla
- ✅ Haptic (Selection/Medium/Light/Success)
- ✅ Layout A/B/C toggle (Detaylı/Sade/Liste)
- ✅ İlaç arama + 4 filter chip (Tümü/Aktif/Pasif/Stok Az)

## Breaking Changes

Yok. Tüm değişiklikler geriye uyumlu.

## Migration

`useUserProfile` v1→v2→v3 otomatik migration (migrateProfile fonksiyonu). Eski kullanıcıların `accentColor` ve `hapticsEnabled` default'ları korunur.

## Checklist

- [x] TS strict 0 hata
- [x] 1331/1331 test
- [x] APK build başarılı
- [x] Telefonda manuel test edildi
- [x] Provider zinciri tutarlı (UserProfile > Accent > Theme > Onboarding > ...)
- [x] Sprint review doc'lar yazıldı (58.5, 59, 60, 65, 67, 68)
- [x] Commit'ler origin'e push'landı

## İlgili Review Doc'lar

- `docs/sprint-58.5-layout-b-detailed.md`
- `docs/sprint-59-empty-error-state.md`
- `docs/sprint-60-onboarding.md`
- `docs/sprint-61-a11y-pass.md`
- `docs/sprint-62-layout-animations.md`
- `docs/sprint-63-accent-palettes.md`
- `docs/sprint-64-haptics.md`
- `docs/sprint-65-ui-improvements.md`
- `docs/sprint-66-haptic-genisletme.md`
- `docs/sprint-67-layout-c.md`
- `docs/sprint-68-search-filter.md`
