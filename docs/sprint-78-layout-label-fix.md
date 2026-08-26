# Sprint 78: Layout Etiket Düzeltme (İkinci Tur)

## Context

Sprint 77 sonrasi kullanici geri bildirimi:

> "sade ile detaylinin yerlerini degistir. cunku sade deyince detayli tema, detayli deyince sade tema cikiyor"

Sprint 77'de `getLayoutLabel` swap edilmişti (A=Sade, B=Detayli) ama Switcher'daki if/else henüz eski mapping'i koruyordu (A=LayoutA, B=LayoutB). Yani etiket/davranış uyumsuzluğu devam ediyordu.

## Sorun Analizi

Layout dosyaları:

- **`HomeScreenLayoutA.tsx`** (Sprint 69 sonrasi): CircularProgress + compact stat + streak — kompakt hero, "detayli" bilgi yogunlugu
- **`HomeScreenLayoutB.tsx`** (Sprint 58.5): 7 MD3 kart, her kart tek bilgi tasıyor — daha sade ama çok sayıda kart

Sprint 77 etiket: `A=Sade`, `B=Detayli`
Sprint 77 switcher: `if (layout === 'B') → LayoutB`, else → LayoutA

**Sonuc:** "Sade" sectiginde → A → kompakt hero (Detayli gorunum). "Detayli" sectiginde → B → 7 kart (Sade gorunum). Kullanici algisiyla ters.

## Cozum

Sprint 78: Switcher'daki render haritasını ters çevirdik, etiket anlamını yeniden tanımladık.

### 78.1 — Etiketleri ters çevirme

**Dosya:** `mobile/src/screens/SettingsScreen.tsx`

- `getLayoutLabel`: A → "Detayli", B → "Sade"
- `getLayoutDescription`: A → "Detayli bilgi, istatistik ve grafikler", B → "Buyuk butonlar, minimal bilgi"

### 78.2 — Switcher haritası ters çevirme

**Dosya:** `mobile/src/components/layouts/HomeScreenLayoutSwitcher.tsx`

- Onceki: `if (layout === 'B') → LayoutB`, else → LayoutA
- Yeni: `if (layout === 'A') → LayoutB`, else → LayoutA
- "A=Detayli" sectiginde LayoutB (7 kartli zengin), "B=Sade" sectiginde LayoutA (kompakt hero)

### 78.3 — JSDoc güncellemeleri

**Dosyalar:**

- `mobile/src/hooks/useUserProfile.tsx` — LayoutVariant doc: A=Detayli, B=Sade
- `mobile/src/components/layouts/HomeScreenLayoutSwitcher.tsx` — sprint referansi 58.5+62+78
- `mobile/src/components/layouts/HomeScreenLayoutA.tsx` — "(Sade / Compact)"

## Mapping (Final)

| layout | Etiket | Render | Davranis |
|--------|--------|--------|----------|
| 'A' | Detayli / Detailed | HomeScreenLayoutB (7 MD3 kart) | Zengin, istatistik ve grafikler |
| 'B' | Sade / Simple | HomeScreenLayoutA (compact hero) | Minimal, büyük butonlar |

## Dogrulama

- **TS**: 0 hata
- **Jest**: 1332/1332 (degismez)
- **Gradle**: BUILD SUCCESSFUL (4m 3s)
- **APK install**: Success (43cebdf1)

## Telefon Dogrulama

Ayarlar > Ana Sayfa Düzeni:

- **Detayli** secildiginde → 7 kartli zengin gorunum (CircularProgress, Streak, Stat Tiles, Mini Chart, vb.)
- **Sade** secildiginde → kompakt hero + su an + bugünün plani

Artık etiket ve davranis uyumlu.