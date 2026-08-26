# Sprint 86: Pre-existing TS Hata Düzeltme

## Context

Sprint 84 doğrulama raporunda belirtilen pre-existing TS hata:

```
src/__tests__/screens/MedicinesScreen.helpers.test.ts(21,3): error TS2561
Object literal may only specify known properties, but 'onPrimary' does not exist in type 'ThemeColors'
```

Sprint 82'de oluşturduğum `mockColors` objesinde ThemeColors tipinde olmayan alanlar vardı:
- `onPrimary` (yok — tipte `textOnPrimary` var)
- `surfaceVariant`, `borderLight` (yok)

Sprint 82'de TS check farklı bir cwd'de çalıştırıldığı için sorun görünmedi, Sprint 84 ana cwd'de TS çalıştırınca ortaya çıktı.

## Düzeltme

**Dosya:** `mobile/src/__tests__/screens/MedicinesScreen.helpers.test.ts`

Tam ThemeColors objesi yerine sadece helper'ların kullandığı renkleri içeren minimal mock + `as unknown as ThemeColors` cast:

```ts
const mockColors = {
  primary: '#0D9488',
  primaryContainer: '#CCFBF1',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  error: '#B91C1C',
  warning: '#B45309',
  success: '#059669',
} as unknown as ThemeColors;
```

Helper'lar yalnızca bu renklere bakıyor:
- `getExpiryColor`: textMuted, error, warning, success
- `getStockColor`: textMuted, error, warning
- `isFutureTime`: renk kullanmıyor (sadece zaman karşılaştırma)

Cast yaklaşımı ThemeColors tipinin gelecekte büyümesi durumunda testleri kırmadan devam etmesini sağlar.

## Doğrulama

- **TS**: 0 hata ✓
- **Jest**: 1354/1354 (Sprint 82'deki 22 helper testi hâlâ geçiyor)
- **Gradle**: BUILD SUCCESSFUL (1m 39s)
- **APK install**: Success (43cebdf1)

## PR Güncellemesi

Sprint 86 commit'i PR #5'e (Sprint 77-84) push'lanacak. PR description'da test count delta değişmez (1331 → 1354), sadece pre-existing TS fix eklendi.