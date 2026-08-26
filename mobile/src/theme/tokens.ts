/**
 * tokens.ts — Sprint 97.1 minimal design token katmanı.
 *
 * Sadece YENİ kod ve yeni Moti animasyonlu component'lerde kullanılır.
 * Mevcut hardcoded spacing/font değerlerine dokunulmaz (CLAUDE.md:
 * refactor = sıfır davranış değişimi).
 *
 * Renkler buraya konmaz — useTheme() / useAccent() zaten merkezi.
 *
 * Sprint 106.1 — Life360 arayüz kalıbı uyumu:
 * - Radius scale iOS continuous look'a göre küçültüldü (4→8, 12→10, 16→14, 24→20)
 * - Spacing scale'e xxs=2 eklendi (touch target inset)
 * - Elevation token block eklendi (level0/1/2 — iOS-style subtle shadow)
 * - Typography FLATTEN ertelendi (106.3'te Pill ile birlikte yapılacak)
 */

export const spacing = {
  xxs: 2, // YENİ — Sprint 106.1 — touch target inset
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export type Spacing = keyof typeof spacing;

export const typography = {
  // Sprint 102.1 — Clinical Clarity spec scale (KORUNUR — geriye uyumluluk)
  body: 16,
  label: 14,
  caption: 12,
  title: 28,
  headline: 32,
  lineHeightBody: 24,
  lineHeightTitle: 36,
  // Sprint 102.1 — Clinical Clarity spec scale (KORUNUR)
  headlineLg: 28, // 28/700/-0.4 letterSpacing — screen title
  headlineMd: 22, // 22/600/-0.2 — medication name on cards
  bodyLg: 16, // 16/400 — medication instructions
  bodyMd: 14, // 14/400 — secondary metadata
  labelMd: 14, // 14/500 — input labels
  labelSm: 12, // 12/500 — timestamps, dosage units
} as const;

export type TypographyKey = keyof typeof typography;

export const radius = {
  // Sprint 106.1 — Life360 continuous look (iOS-style subtle radius)
  xs: 6, // YENİ — small chip / inline badge
  sm: 8, // 4 → 8 (daha yumuşak, subtle chip)
  md: 10, // 12 → 10 (iOS button feel)
  lg: 14, // 16 → 14 (card default — Life360 continuous)
  xl: 20, // 24 → 20 (hero card / modal)
  pill: 999, // avatar
} as const;

export type Radius = keyof typeof radius;

export const elevation = {
  // Sprint 106.1 — iOS-style subtle hairlines + 2-tier card shadow
  level0: {
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  level1: {
    // hairline divider / subtle pressed state
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  level2: {
    // card default — Life360 subtle elevation
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
} as const;

export type Elevation = keyof typeof elevation;
