# Sprint 77: Layout Sadelestirme (Liste Kaldirildi)

## Context

Kullanici geri bildirimi (Screenshot 4 — Ayarlar):

> "1-detayli / 2-sade / 3-liste — sanki sectigim tema ile islevi arasinda bir fark var gibi.
> sanki detayli olan sade, sade olan detayli gibi geliyor. liste secili olan temann ne farki var anlamadim.
> liste olani kaldiralim. sade ve detayli diye iki tema yeterli."

3 sorun:

1. **Isimlendirme ters** — Etiket "Detayli" olan Layout A sade gorunuyor, "Sade" olan Layout B 7 kartli detayli gorunuyor
2. **Layout C (Liste) anlamsiz** — Kullanici fark goremiyor
3. **Migration gerekli** — Eski Layout C kullananlar icin graceful fallback

---

## Degisiklikler

### 77.1 — Layout türü 3 → 2

**Dosya:** `mobile/src/hooks/useUserProfile.tsx`

- `LayoutVariant = 'A' | 'B' | 'C'` → `LayoutVariant = 'A' | 'B'`
- `normalizeLayout(value: unknown): LayoutVariant` pure helper eklendi (`'B' ? 'B' : 'A'`)
- `migrateProfile` her migration branch'inde `layout: normalizeLayout(parsed.layout)` cagiriror (C → A)

### 77.2 — HomeScreenLayoutC silindi

**Silinen dosya:** `mobile/src/components/layouts/HomeScreenLayoutC.tsx` (~160 satir)

### 77.3 — Switcher sadelesitildi

**Dosya:** `mobile/src/components/layouts/HomeScreenLayoutSwitcher.tsx`

- `HomeScreenLayoutC` import kaldirildi
- `if (profile.layout === 'C')` branch silindi
- Fallthrough default = Layout A (sade)

### 77.4 — AppearanceSection 2 secenek

**Dosya:** `mobile/src/components/settings/AppearanceSection.tsx`

- `<OptionPicker>` `options={['A', 'B', 'C']}` → `options={['A', 'B']}`

### 77.5 — Etiket Tersine Cevirme

**Dosya:** `mobile/src/screens/SettingsScreen.tsx:192-217`

- `getLayoutLabel` swap: 'A' → 'Sade'/'Simple', 'B' → 'Detayli'/'Detailed' (Liste kaldirildi)
- `getLayoutDescription` swap: 'A' → "Buyuk butonlar, yaslilar icin ideal", 'B' → "Detayli bilgi, gencler icin ideal"

### 77.6 — Yeni migration testi

**Dosya:** `mobile/src/__tests__/hooks/useUserProfile.test.tsx`

- "Sprint 77: legacy layout C migrates to A" testi eklendi
- v3 profile `{layout: 'C', ...}` → A'ya migrate olur, diger alanlar (accent, haptics) korunur

---

## Migration Davranisi

| Eski Layout | Yeni Layout | Aciklama |
|-------------|-------------|----------|
| 'A' | 'A' | Sade (degismez) |
| 'B' | 'B' | Detayli (degismez) |
| 'C' | 'A' | Liste kaldirildi, sade'ye fallback |
| undefined/garbage | 'A' | Unknown → default |

---

## Dogrulama

- **TS**: 0 hata
- **Jest**: 1332/1332 passed (1 yeni migration testi)
- **Gradle**: BUILD SUCCESSFUL (1m 39s)
- **APK install**: Success (device 43cebdf1)

---

## Telefon Dogrulama

- **Ayarlar > Ana Sayfa Duzeni**: Artik 2 secenek (Sade / Detayli)
- **Sade (Layout A)**: Hero + 3 stat tile + seriler — sade, yasli icin uygun
- **Detayli (Layout B)**: 7 MD3 karti — daha fazla bilgi, genc icin uygun
- **Etiket-davranis uyumu**: Artik "Sade" sade gorunuyor, "Detayli" detayli gorunuyor
