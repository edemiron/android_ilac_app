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
  body: 16,
  label: 14,
  caption: 12,
  title: 28,
  headline: 32,
  lineHeightBody: 24,
  lineHeightTitle: 36,
} as const;

export type TypographyKey = keyof typeof typography;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export type Radius = keyof typeof radius;
