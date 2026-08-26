# İlaç Hatırlatıcı — Tema Sistemi Rehberi (AI Ajan Tüketimi İçin)

> **Hedef kitle:** Bu doküman, projeyi ilk kez gören bir AI ajanın (Claude, GPT vb.) **5 dakikada** tema sistemini anlayıp yeni component'leri tutarlı şekilde yazabilmesi için yazılmıştır.
>
> **Kapsam:** Renkler, typography, spacing, radius, motion (Moti) token'ları, gradient pattern'leri, accent palette sistemi, dark mode, component pattern'leri, do/don't kuralları.
>
> **Versiyon:** v1.3.2 (Sprint 101 sonrası). Karol-inspired redesign + expo-linear-gradient migration dahil.

---

## 1. Mimari Genel Bakış

```
src/
├── contexts/
│   ├── ThemeContext.tsx        ← lightColors + darkColors + useTheme()
│   └── AccentContext.tsx       ← 6 accent palette + useAccent() (Sprint 63)
├── theme/
│   ├── palettes.ts             ← ACCENT_PALETTES (6 adet)
│   ├── tokens.ts               ← spacing, typography, radius (Sprint 97.1)
│   ├── moti-config.ts          ← motiTransitions (animasyon presetleri)
│   └── README.md               ← SVG ekran referansları
└── components/common/
    └── MotiPressable.tsx       ← TouchableOpacity drop-in (Sprint 97.1)
```

**Provider sırası (önemli — yanlış sıra kırılır):**

```
<UserProfileProvider>      ← profile.accentColor burada saklanır (AsyncStorage)
  └─ <AccentProvider>      ← palette = ACCENT_PALETTES[profile.accentColor]
      └─ <ThemeProvider>   ← colors.primary ← palette.darkPrimary/lightPrimary
          └─ <App>
```

> ⚠️ `ThemeProvider` `useAccent()` çağırır; `AccentProvider` ise `useUserProfile()` çağırır. Bu yüzden **AccentProvider mutlaka ThemeProvider'ın ÜSTÜNDE** olmalı (CLAUDE.md notu).

---

## 2. useTheme() API

```tsx
import { useTheme } from '../contexts/ThemeContext';

const { colors, isDark, theme, setTheme } = useTheme();
```

| Alan | Tip | Açıklama |
|---|---|---|
| `colors` | `ThemeColors` | Aktif moda göre `lightColors` veya `darkColors` + accent override |
| `isDark` | `boolean` | `true` ise `colors = darkColors` (accent dahil) |
| `theme` | `'light' \| 'dark' \| 'system'` | Kullanıcının seçtiği mod (AsyncStorage'da) |
| `setTheme(t)` | `(t) => Promise<void>` | Mod değiştirir + AsyncStorage'a yazar |

**`setTheme` async** — UI'ı bloklamamak için `await` zorunlu değil.

---

## 3. Renk Paleti — Light Mode

`mobile/src/contexts/ThemeContext.tsx:11-85` — **Modern Healthcare, MD3 Tonal, WCAG AA+**

### 3.1 Ana renkler (default: Mint accent)

| Token | Hex | Tailwind eşdeğeri | Kullanım |
|---|---|---|---|
| `primary` | `#0D9488` | Teal 600 | Butonlar, aktif tab, linkler |
| `primaryDark` | `#0F766E` | Teal 700 | Press state, hover |
| `primaryLight` | `#14B8A6` | Teal 500 | Tint, secondary CTA |
| `primaryContainer` | `#CCFBF1` | Teal 100 | Tonlu kart arka planı |
| `onPrimaryContainer` | `#0F766E` | Teal 700 | primaryContainer üzerinde metin (WCAG AA) |
| `secondary` | `#2563EB` | Blue 600 | İkincil CTA, info |
| `secondaryContainer` | `#DBEAFE` | Blue 100 | secondary tonlu kart |
| `accent` | `#7C3AED` | Violet 600 | Vurgular (nadir) |

### 3.2 Gradient renkler (Sprint 101 — expo-linear-gradient)

| Token | Hex | Kullanım |
|---|---|---|
| `gradientStart` | `#0D9488` (Teal) | Hero header + TrustBadge başlangıç |
| `gradientEnd` | `#0891B2` (Cyan) | Hero header + TrustBadge bitiş |

> ⚠️ **CRITICAL:** `<LinearGradient>` için **mutlaka `expo-linear-gradient`** kullanın (`react-native-linear-gradient` Fabric/newArch ile uyumsuz — render olmuyor). Import named export: `import { LinearGradient } from 'expo-linear-gradient';`. TypeScript: `colors` prop'u `readonly [ColorValue, ColorValue, ...]` istiyor → `as const` modifier gerekli (örn. `[a, b] as const`).

### 3.3 MD3 Surface elevasyon skalası (Sprint 55)

| Token | Hex | MD3 elevation | Kullanım |
|---|---|---|---|
| `background` | `#F8FAFC` | n/a | Ekran arka planı |
| `surface` | `#FFFFFF` | 0 | Düz kart |
| `surfaceContainerLowest` | `#FFFFFF` | 0 | En düşük elevasyon |
| `surfaceContainerLow` | `#F8FAFC` | 1 | Hafif kart gölge |
| `surfaceContainer` | `#F1F5F9` | 2 | Orta kart |
| `surfaceContainerHigh` | `#E2E8F0` | 3 | Yüksek kart |
| `surfaceContainerHighest` | `#CBD5E1` | 4 | En yüksek kart |
| `card` / `cardElevated` | `#FFFFFF` | - | Legacy alias |

### 3.4 Metin renkleri (WCAG AAA — text üzerinde background'a göre)

| Token | Hex | Kontrast | Kullanım |
|---|---|---|---|
| `text` | `#0F172A` | 16.84:1 AAA | Birincil metin |
| `textSecondary` | `#475569` | 7.55:1 AAA | İkincil metin, açıklama |
| `textMuted` | `#94A3B8` | 3.55:1 (sadece 18pt+) | Disabled, placeholder |
| `textOnPrimary` | `#FFFFFF` | - | Primary renkli arka plan üzerinde metin |

**MD3 alias:** `onSurface`, `onSurfaceVariant`, `onSurfaceMuted` → yukarıdaki ile aynı.

### 3.5 Durum renkleri (WCAG AA+)

| Token | Hex | Kontrast | Kullanım |
|---|---|---|---|
| `success` | `#059669` (Emerald 600) | 4.62:1 | Taken, onay, başarı |
| `warning` | `#B45309` (Amber 700) | 4.62:1 | Pending, uyarı, dikkat |
| `error` | `#B91C1C` (Red 800) | 7.27:1 AAA | Skipped, hata, silme |
| `info` | `#2563EB` (Blue 600) | - | Bilgi, link |

> ⚠️ `warning` eskiden `#D97706` (borderline AA) idi — Sprint 55'te `#B45309`'a yükseltildi. Yeni renk AA geçer.

### 3.6 Sınır, ayırıcı, gölge

| Token | Hex | Kullanım |
|---|---|---|
| `outline` | `#94A3B8` | MD3 outline, focus ring |
| `outlineVariant` | `#E2E8F0` | MD3 subtle outline |
| `border` | `#E2E8F0` (Slate 200) | Kart sınırı, divider |
| `divider` | `#F1F5F9` (Slate 100) | Liste ayraç |
| `overlay` | `rgba(15, 23, 42, 0.5)` | Modal arka plan |
| `shadow` | `rgba(15, 23, 42, 0.08)` | Kart gölge (elevation 1-2) |

### 3.7 Tab bar, header, input

| Token | Hex | Kullanım |
|---|---|---|
| `tabBar` | `#FFFFFF` | Bottom tab bar arka plan |
| `tabBarBorder` | `#E2E8F0` | Tab bar üst sınır |
| `tabActive` | `#0D9488` (=primary) | Aktif tab ikon/text |
| `tabInactive` | `#94A3B8` | Pasif tab ikon/text |
| `header` | `#FFFFFF` | Header arka plan |
| `headerText` | `#0F172A` | Header metin |
| `inputBackground` | `#F8FAFC` | TextInput arka plan |
| `inputBorder` | `#CBD5E1` (Slate 300) | TextInput border (görünür) |
| `placeholder` | `#94A3B8` | TextInput placeholder |

### 3.8 Status kart arka planları (soft tints)

| Token | Hex | Kullanım |
|---|---|---|
| `cardTaken` | `#D1FAE5` (Emerald 100) | Taken doz kartı |
| `cardSkipped` | `#FEE2E2` (Red 100) | Skipped doz kartı |
| `cardPending` | `#FFFFFF` | Pending doz kartı (nötr) |

---

## 4. Renk Paleti — Dark Mode

`mobile/src/contexts/ThemeContext.tsx:87-161` — **OLED-friendly, MD3 Tonal, WCAG AA+**

> Kullanıcı paleti (özel dark mode seçimi Sprint 55). Background `#0B0D14` AMOLED-friendly.

### 4.1 Ana renkler (accent override burada devreye girer)

| Token | Hex | Kullanım |
|---|---|---|
| `primary` | `#8B9CFF` (Soft mor-mavi) | Buton, aktif tab |
| `primaryDark` | `#6B7CDF` | Press state |
| `primaryLight` | `#ABB8FF` | Tint |
| `primaryContainer` | `#1F2A4D` | Tonlu kart |
| `onPrimaryContainer` | `#ABB8FF` | primaryContainer metin |
| `secondary` | `#5EE6FF` (Cyan) | İkincil CTA |
| `accent` | `#D0A6FF` (Açık mor) | Tertiary |

### 4.2 Gradient renkler

| Token | Hex |
|---|---|
| `gradientStart` | `#8B9CFF` (lila) |
| `gradientEnd` | `#5EE6FF` (cyan) |

### 4.3 MD3 Surface

| Token | Hex |
|---|---|
| `background` | `#0B0D14` (OLED) |
| `surface` | `#121625` |
| `card` | `#1A2035` |
| `cardElevated` | `#232840` |
| `surfaceContainerLowest` | `#0B0D14` |
| `surfaceContainerLow` | `#121625` |
| `surfaceContainer` | `#1A2035` |
| `surfaceContainerHigh` | `#232840` |
| `surfaceContainerHighest` | `#2B3354` |

### 4.4 Metin (WCAG AAA)

| Token | Hex | Kontrast |
|---|---|---|
| `text` | `#E9ECFF` | 17.2:1 |
| `textSecondary` | `#88C0E6` | 10.5:1 |
| `textMuted` | `#6B8AAA` | - |
| `textOnPrimary` | `#10163A` | - |

### 4.5 Durum renkleri

| Token | Hex |
|---|---|
| `success` | `#34D399` |
| `warning` | `#FCD34D` |
| `error` | `#FB7185` |
| `info` | `#60A5FA` |

### 4.6 Özel

| Token | Hex |
|---|---|
| `overlay` | `rgba(11, 13, 20, 0.9)` |
| `shadow` | `rgba(139, 156, 255, 0.15)` (primary glow) |
| `cardTaken` | `#1A3D2E` |
| `cardSkipped` | `#3D1A2A` |
| `cardPending` | `#1A2035` |

---

## 5. Accent Palette Sistemi (Sprint 63)

Kullanıcı Settings'ten **6 accent renk** arasından seçer. Seçim `profile.accentColor`'da saklanır (Firestore + AsyncStorage). `AccentProvider` → `ACCENT_PALETTES[id]` → `ThemeProvider`'a inject edilir → `colors.primary` değişir.

**6 palette** (`mobile/src/theme/palettes.ts`):

| ID | İsim (TR/EN) | lightPrimary | darkPrimary | Preview |
|---|---|---|---|---|
| `ocean` | Okyanus / Ocean | `#0EA5E9` (Sky 500) | `#38BDF8` (Sky 400) | `#0EA5E9` |
| `sunset` | Gün Batımı / Sunset | `#F97316` (Orange 500) | `#FB923C` (Orange 400) | `#F97316` |
| `forest` | Orman / Forest | `#059669` (Emerald 600) | `#34D399` (Emerald 400) | `#059669` |
| `lavender` | Lavanta / Lavender | `#8B5CF6` (Violet 500) | `#A78BFA` (Violet 400) | `#8B5CF6` |
| `cherry` | Kiraz / Cherry | `#E11D48` (Rose 600) | `#FB7185` (Rose 400) | `#E11D48` |
| `mint` | Nane / Mint (default) | `#14B8A6` (Teal 500) | `#2DD4BF` (Teal 400) | `#14B8A6` |

**`ThemeProvider` injection** (`ThemeContext.tsx:218-224`):
```ts
const colors = {
  ...baseColors,                                            // light veya dark palette
  primary:       isDark ? palette.darkPrimary : palette.lightPrimary,
  primaryDark:   isDark ? palette.darkPrimary : palette.lightPrimary,
  primaryLight:  palette.lightPrimary,
};
```

> Accent sadece `primary`, `primaryDark`, `primaryLight`'ı override eder. Gradient (`gradientStart`/`gradientEnd`) **accent'ten etkilenmez** — sabit kalır.

---

## 6. Typography

`mobile/src/theme/tokens.ts:23-31` — minimal token set (Sprint 97.1):

```ts
export const typography = {
  body:          16,
  label:         14,
  caption:       12,
  title:         28,
  headline:      32,
  lineHeightBody: 24,
  lineHeightTitle: 36,
} as const;
```

> ⚠️ **CLAUDE.md notu:** Bu token'lar **YALNIZCA yeni yazılan component'lerde** kullanılır. Mevcut hardcoded font değerlerine dokunulmaz (refactor = sıfır davranış değişimi).

### 6.1 Pratik font kuralları (gözlemlenmiş pattern)

| Kullanım | Boyut | Weight | letterSpacing |
|---|---|---|---|
| Hero greeting (24pt bold) | 24 | 700 | -0.4 |
| Greeting subtitle | 13 | normal | 0 |
| Section başlık (uppercase) | 13 | 700 | 0.5 |
| StatsGrid value | 24 | 700 | -0.5 |
| StatsGrid label | 12 | 500 | 0 |
| Body | 14-16 | 400-500 | 0 |
| Caption | 12 | 400 | 0 |
| TrustBadge line | 10 | 800 | 0.6 |
| CurrentDoseCard status pill | 12 | 700 | 0.5 |

**Tipografi renk seçimi:**
- Primary başlık metin: `colors.text`
- Secondary: `colors.textSecondary`
- Disabled/placeholder: `colors.textMuted` (18pt+ olmalı, AA alt sınır)
- Primary renkli arka plan üzerinde: `colors.textOnPrimary`

---

## 7. Spacing

`mobile/src/theme/tokens.ts:11-19` (Sprint 97.1):

```ts
export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
} as const;
```

**Tipik kullanım:**

| Layout | Değer |
|---|---|
| Card margin (horizontal) | `spacing.lg` (16) |
| Card padding | `spacing.lg` veya `spacing.xl` (16-20) |
| Grid gap | `spacing.md` (12) |
| Section margin (vertical) | `spacing.xxl` (24) |
| ListItem padding (vertical) | `spacing.md` (12) |
| Inline icon gap | `spacing.sm` (8) |

---

## 8. Radius

`mobile/src/theme/tokens.ts:35-41`:

```ts
export const radius = {
  sm:    8,    // pill button, küçük kart
  md:    12,   // kart, input
  lg:    16,   // büyük kart, hero
  xl:    20,   // hero card (Karol pattern)
  pill:  999,  // avatar (size/2 ile aynı)
} as const;
```

**Avatar pattern:** `borderRadius: size / 2` (pill ile aynı görünür, daha deterministic).

---

## 9. Motion (Moti) Token'ları

`mobile/src/theme/moti-config.ts` — **renk YOK**, sadece timing/spring presetleri:

| Preset | Tip | Parametre | Kullanım |
|---|---|---|---|
| `press` | timing | duration 150 | MotiPressable default scale |
| `quick` | timing | duration 180 | Modal fade, mount enter |
| `standard` | timing | duration 260 | Slide, list reorder, mount fade |
| `expressive` | spring | damping 16, stiffness 180, mass 0.8 | Emoji pop-in, success checkmark |
| `successSnappy` | spring | damping 14, stiffness 220, mass 0.6 | "İlacı aldım" checkmark |
| `loop` | timing | duration 800, loop + repeatReverse | Skeleton shimmer, pulse |

**Import:**
```tsx
import { motiTransitions } from '../../theme/moti-config';
<MotiView transition={motiTransitions.standard} from={{...}} animate={{...}} />
```

> ⚠️ **Renk/stil token'ları moti-config'e KONMAZ** — `useTheme()` ile component içinde çekilir. Aksi halde dark mode + accent override bozulur.

---

## 10. Gradient Pattern'i (Sprint 101 fix)

`<LinearGradient>` artık `expo-linear-gradient`'tan named export ile gelir. **TypeScript `colors` prop'u `readonly tuple` istiyor** → `as const` modifier gerekli.

### 10.1 Canonical pattern (Header + TrustBadge)

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../contexts/ThemeContext';

const { colors, isDark } = useTheme();

const gradientColors = isDark
  ? ([colors.primaryDark ?? '#6B7CDF', colors.gradientEnd] as const)
  : ([colors.gradientStart, colors.gradientEnd] as const);

return (
  <LinearGradient
    colors={gradientColors}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.heroCard}
  >
    {/* children */}
  </LinearGradient>
);
```

### 10.2 Test mock pattern'i (named export obj factory)

`__tests__/components/home/*.test.tsx` dosyalarında:

```tsx
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));
```

> ⚠️ Eski pattern `() => 'LinearGradient'` (default export) **artık çalışmıyor**. Obje factory gerekli.

### 10.3 Bilinen kontrat

- `gradientStart` (light: `#0D9488` Teal, dark: `#8B9CFF` Lila) → accent'ten etkilenmez
- `gradientEnd` (light: `#0891B2` Cyan, dark: `#5EE6FF` Açık cyan) → accent'ten etkilenmez
- Açı: `start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}` (sol-üstten sağ-alta diagonal)
- Hiçbir zaman `gradientStart` accent'ten türetilmez (sabit kalır — Karol pattern)

---

## 11. Component Pattern'leri (Sprint 97-101)

### 11.1 MotiPressable (Sprint 97.1 — TouchableOpacity drop-in)

```tsx
import { MotiPressable } from '../../components/common/MotiPressable';

<MotiPressable
  onPress={handlePress}
  onPressHaptic="success"     // default 'light', false = haptic yok
  scaleTo={0.95}               // default 0.97, 1 = no-op
  accessibilityRole="button"
>
  <Text>Bas</Text>
</MotiPressable>
```

**Haptic tipleri** (`useHaptics`): `'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error'`.

### 11.2 IconBadge (Sprint 98 — Karol 36×36 circular)

```tsx
import { IconBadge } from './IconBadge';

<IconBadge
  name="calendar-outline"           // Ionicons name
  color={colors.primary}            // foreground
  backgroundColor={colors.primary + '15'}  // %8 alpha tint (optional)
  size={36}                        // default 36
  iconSize={18}                    // default 18
/>
```

**%15 alpha pattern:** `medicine.color + '25'` (MedicineAvatar için, %15 alpha tint). Hex 8-digit alpha hex kullanılır.

### 11.3 MedicineAvatar (Sprint 98 — harf avatar)

```tsx
import { MedicineAvatar } from './MedicineAvatar';

<MedicineAvatar
  name="Parol"
  color="#F87171"                  // ilaç rengi (medicine.color)
  size={44}                        // default 44
  isCompleted={false}              // true → opacity 0.55
  imageUri={medicine.imageUri}     // varsa Image gösterir (parity)
/>
```

**Avatar davranışı:**
- `imageUri` varsa → `<Image>` (borderRadius = size/2)
- Yoksa → colored circle (%15 alpha tint) + ilk harf + ilaç rengi metin
- Pop-in: `motiTransitions.expressive` (scale 0.8 → 1, opacity 0 → 1)

### 11.4 SectionHeader (Sprint 98 — Karol pattern)

```tsx
import { SectionHeader } from './SectionHeader';

<SectionHeader
  title="Bugünün Dozları"          // uppercase style'da
  icon="💊"                         // optional emoji
  onSeeAll={() => navigate('X')}   // optional, görünürse "Tümü ›" link
  seeAllLabel="Tümü"                // override (default TR/EN auto)
/>
```

### 11.5 TrustBadge (Sprint 98 — floating ANLIK · SESSİZ · GÜVENLİ)

```tsx
import { TrustBadge } from './TrustBadge';

<TrustBadge
  bottom={100}                     // default 100
  right={16}                       // default 16
/>
```

**Position:** `position: absolute, zIndex: 5`. FAB ile çakışma olmaması için **bottom 96-100, right 16** standart.

### 11.6 Mount animation pattern (Sprint 100)

Tüm Karol redesign component'leri mount'ta yumuşak giriş yapar:

```tsx
import { MotiView } from 'moti';
import { motiTransitions } from '../../../theme/moti-config';

<MotiView
  from={{ opacity: 0, translateY: 6 }}
  animate={{ opacity: 1, translateY: 0 }}
  transition={{ ...motiTransitions.standard, delay: index * 50 }}  // stagger
>
  {children}
</MotiView>
```

**Stagger:** liste elemanlarında `delay: index * 50` (50ms aralık, 4-6 öğe için yeterli).

---

## 12. Yeni Component Eklerken Kontrol Listesi

Ajan olarak yeni bir component yazacaksanız:

- [ ] **Renk:** `useTheme()` üzerinden `colors.X` — hardcoded hex **yok**
- [ ] **Dark mode:** Aydınlık + karanlık modda **görsel olarak test edilmeli** (`adb shell setprop persist.sys.theme dark/light`)
- [ ] **Accent:** Mint, Lavender, Cherry, Ocean, Sunset, Forest accent'leri ile test — `primary`, `primaryDark`, `primaryLight` accent'ten gelir, **diğer renkler sabit**
- [ ] **WCAG AA:** Metin/arkaplan kontrast oranı **≥ 4.5:1** (normal), **≥ 3:1** (18pt+)
- [ ] **Spacing:** Hardcoded piksel yerine `spacing.x` token'ı (sadece yeni component'lerde)
- [ ] **Radius:** `radius.x` token'ı (avatar hariç — `size/2` kullan)
- [ ] **Press feedback:** `MotiPressable` veya kendi `<Pressable>` + `motiTransitions.press` scale animasyonu
- [ ] **Gradient:** `<LinearGradient colors={...} as const />` (TypeScript hatası için gerekli)
- [ ] **Mount animation:** Karmaşık component'lerde `MotiView from/animate` ile yumuşak giriş
- [ ] **Accessibility:** `accessibilityRole`, `accessibilityLabel`, `accessibilityHint` — sadece dokunulabilir yüzeylerde değil, image/header gibi öğelerde de
- [ ] **Haptic:** Önemli aksiyonlarda `useHaptics().trigger('success' | 'warning' | 'error' | 'selection')`
- [ ] **Test:** Component test'inde `jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }))` (named export obj factory)
- [ ] **Dil:** Metin `useLanguage()` üzerinden TR/EN çeviri desteklemeli
- [ ] **Reduced motion:** İleride ayrı sprint — şu an zorunlu değil

---

## 13. Do / Don't

### ✅ Do

- `useTheme()` ve `useAccent()` hook'larını kullan
- Spacing/radius/moti token'larını kullan (yeni component'lerde)
- `<MotiPressable>` ile basılabilir yüzeyler
- Gradient için `expo-linear-gradient` named import + `as const`
- `accessibilityRole` + `accessibilityLabel` her interaktif öğede
- WCAG AA kontrast oranı testleri
- Mount animasyonları için `MotiView` + `motiTransitions`
- `useHaptics` ile tactile feedback
- Yeni component testlerinde `expo-linear-gradient` named export obj factory

### ❌ Don't

- Hardcoded hex renk (`color: '#0D9488'` doğrudan — `colors.primary` kullan)
- `react-native-linear-gradient` (Fabric ile uyumsuz — **render olmuyor**)
- Default export: `import LinearGradient from 'expo-linear-gradient'` (yanlış — named export)
- `colors.primary` gradient'te (gradientStart/End kullan, accent'ten etkilenmez)
- `[a, b]` tuple modifier olmadan `<LinearGradient colors={...} />` (TS error)
- `motiTransitions` içine renk ekleme (sadece timing)
- Spacing değerlerini `tokens.ts`'e koymadan kullan (eski kodlarda OK, yeni kodda token kullan)
- `TouchableOpacity activeOpacity` yeni component'lerde (MotiPressable kullan)
- `imageUri` olan ilaçlarda sadece harf avatar (parity korunmalı)
- Coverage threshold'unu düşürme (CLAUDE.md: `current - 5%` kuralı)

---

## 14. Hızlı Referans — Tipik Component Şablonu

```tsx
/**
 * MyComponent.tsx — Sprint XX.
 *
 * [1-2 satır açıklama — ne yapar, nerede kullanılır]
 */

import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { MotiView } from 'moti';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { MotiPressable } from '../../components/common/MotiPressable';
import { motiTransitions } from '../../theme/moti-config';

export interface MyComponentProps {
  /** ... */
  style?: StyleProp<ViewStyle>;
}

export function MyComponent({ style }: MyComponentProps) {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();

  return (
    <MotiView
      from={{ opacity: 0, translateY: 6 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={motiTransitions.standard}
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }, style]}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        {language === 'tr' ? 'Başlık' : 'Title'}
      </Text>
      <MotiPressable onPress={() => {}} style={styles.button}>
        <Text style={[styles.buttonText, { color: colors.primary }]}>
          Tıkla
        </Text>
      </MotiPressable>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,                          // spacing.lg
    borderRadius: 16,                     // radius.lg
    borderWidth: 1,
    gap: 8,                               // spacing.sm
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  button: {
    paddingVertical: 12,                  // spacing.md
    paddingHorizontal: 16,                // spacing.lg
    borderRadius: 12,                     // radius.md
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
```

---

## 15. Sık Sorulan Hatalar

| Hata | Çözüm |
|---|---|
| `<LinearGradient>` beyaz render | `react-native-linear-gradient` kullanma — `expo-linear-gradient`'e geç (Sprint 101) |
| TrustBadge / Hero gradient görünmüyor | Aynı kök neden — `expo-linear-gradient` named import |
| TypeScript: `string[] is not assignable to readonly tuple` | `colors={[a, b] as const}` ekle |
| Jest mock: `LinearGradient is not a function` | Mock factory obj olmalı: `{ LinearGradient: 'LinearGradient' }` (default export değil) |
| `useTheme must be used within a ThemeProvider` | Component, ThemeProvider altında değil — provider sırasını kontrol et (App.tsx) |
| `useAccent must be used within AccentProvider` | Aynı — AccentProvider ThemeProvider'ın ÜSTÜNDE olmalı |
| Dark mode'da metin okunmuyor | `textMuted` (#94A3B8) kullanma 18pt altı — `textSecondary` veya `text` kullan |
| Gradient accent ile değişmiyor | **Beklenen davranış** — `gradientStart`/`End` accent'ten bağımsız (Karol pattern) |
| MotiView animasyon uygulanmıyor | `from` + `animate` aynı property'leri içermeli; `transition` doğru preset olmalı |
| Reanimated 4 + worklets sürüm hatası | `react-native-worklets` 0.5-0.8 arasında olmalı; `newArchEnabled=true` gradle.properties'te |

---

## 16. İlgili Dokümanlar

- [mobile/src/theme/README.md](mobile/src/theme/README.md) — SVG ekran referansları + eski paleti
- [mobile/src/theme/palettes.ts](mobile/src/theme/palettes.ts) — 6 accent palette
- [mobile/src/theme/tokens.ts](mobile/src/theme/tokens.ts) — spacing/typography/radius token'ları
- [mobile/src/theme/moti-config.ts](mobile/src/theme/moti-config.ts) — animasyon presetleri
- [mobile/src/contexts/ThemeContext.tsx](mobile/src/contexts/ThemeContext.tsx) — renk paleti + provider
- [mobile/src/contexts/AccentContext.tsx](mobile/src/contexts/AccentContext.tsx) — accent provider
- [mobile/src/components/common/MotiPressable.tsx](mobile/src/components/common/MotiPressable.tsx) — press feedback
- [CLAUDE.md](../CLAUDE.md) — sprint pattern, coverage disiplini
- [ARCHITECTURE.md](../ARCHITECTURE.md) — genel mimari, state, notification pipeline
- `mobile/src/screens/HomeScreen/components/` — Karol redesign component'leri (Header, StatsGrid, SectionHeader, MedicineAvatar, IconBadge, TrustBadge)
- `mobile/src/hooks/useHaptics.ts` — 7 haptic tipi
- `mobile/app.config.json` — Expo plugin zinciri, statusBar, theme mode
- `mobile/.env.example` — env şablonu

---

**Hazırlayan:** Sprint 101 sonrası, expo-linear-gradient migration ile beraber yeniden yapılandırıldı.
**Versiyon geçmişi:** v1.0 (Sprint 63 accent), v1.1 (Sprint 97.1 tokens/moti), v1.2 (Sprint 98 Karol), v1.3 (Sprint 101 gradient fix).
