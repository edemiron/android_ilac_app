/**
 * tokens.ts — Sprint 97.1 minimal design token katmanı.
 *
 * Sadece YENİ kod ve yeni Moti animasyonlu component'lerde kullanılır.
 * Mevcut hardcoded spacing/font değerlerine dokunulmaz (CLAUDE.md:
 * refactor = sıfır davranış değişimi).
 *
 * Renkler buraya konmaz — useTheme() / useAccent() zaten merkezi.
 */

export const spacing = {
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
  // Mevcut scale (geriye dönük uyumlu)
  body: 16,
  label: 14,
  caption: 12,
  title: 28,
  headline: 32,
  lineHeightBody: 24,
  lineHeightTitle: 36,
  // Sprint 102.1 — Clinical Clarity spec scale (Sprint 102.8'de ThemedText kullanır)
  headlineLg: 28, // 28/700/-0.4 letterSpacing — screen title
  headlineMd: 22, // 22/600/-0.2 — medication name on cards
  bodyLg: 16, // 16/400 — medication instructions
  bodyMd: 14, // 14/400 — secondary metadata
  labelMd: 14, // 14/500 — input labels
  labelSm: 12, // 12/500 — timestamps, dosage units
} as const;

export type TypographyKey = keyof typeof typography;

export const radius = {
  // Sprint 102.1 — Clinical Clarity spec (CC: sm=4, md=12, lg=16, xl=24, full=9999)
  sm: 4,    // subtle chip
  md: 12,   // button, input
  lg: 16,   // medication card, bottom sheet
  xl: 24,   // hero card, modal — CC hero radius
  pill: 999, // avatar
} as const;

export type Radius = keyof typeof radius;
