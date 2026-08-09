/**
 * themeMock.ts — Sprint 102.6
 *
 * 18 test dosyasının lokal useTheme() mock'unu DRY yapan tek factory.
 * Yeni token eklendikçe (Sprint 102.1 — 12 MD3 container token) SADECE
 * bu dosyaya ekleme yapılır; 18 test otomatik güncel kalır.
 *
 * Kullanım:
 *   jest.mock('../../contexts/ThemeContext', () => ({
 *     useTheme: () => mockUseTheme(),
 *   }));
 *
 * Veya override ile:
 *   jest.mock('../../contexts/ThemeContext', () => ({
 *     useTheme: () => mockUseTheme({ primary: '#F97316' }, true),
 *   }));
 */

import { lightColors, darkColors, type ThemeColors } from '../../contexts/ThemeContext';

/**
 * createThemeMock — tek factory, tüm token'ları döndürür.
 * Default: light mode + CC mint palette (#14B8A6 primary).
 *
 * @param overrides - Belirli token'ları override etmek için
 * @param isDark - true ise darkColors baz alınır
 */
export const createThemeMock = (
  overrides?: Partial<ThemeColors>,
  isDark = false
): ThemeColors => {
  const base = isDark ? darkColors : lightColors;
  return {
    ...base,
    ...(overrides ?? {}),
    // Sprint 102.1 — Yeni 14 MD3 container token default'ları
    // (lightColors/darkColors zaten içeriyor, ama explicit bridge)
    warningContainer: overrides?.warningContainer ?? base.warningContainer,
    onWarningContainer: overrides?.onWarningContainer ?? base.onWarningContainer,
    successContainer: overrides?.successContainer ?? base.successContainer,
    onSuccessContainer: overrides?.onSuccessContainer ?? base.onSuccessContainer,
    errorContainer: overrides?.errorContainer ?? base.errorContainer,
    onErrorContainer: overrides?.onErrorContainer ?? base.onErrorContainer,
    inversePrimary: overrides?.inversePrimary ?? base.inversePrimary,
    primaryFixed: overrides?.primaryFixed ?? base.primaryFixed,
    inverseOnSurface: overrides?.inverseOnSurface ?? base.inverseOnSurface,
    tertiaryContainer: overrides?.tertiaryContainer ?? base.tertiaryContainer,
    onTertiaryContainer: overrides?.onTertiaryContainer ?? base.onTertiaryContainer,
    textOnGradient: overrides?.textOnGradient ?? base.textOnGradient,
    textOnGradientMuted: overrides?.textOnGradientMuted ?? base.textOnGradientMuted,
    gradientTrackTint: overrides?.gradientTrackTint ?? base.gradientTrackTint,
  };
};

/**
 * mockUseTheme — useTheme() hook'unun mock return objesi.
 * Testlerde en yaygın kullanım.
 */
export const mockUseTheme = (
  overrides?: Partial<ThemeColors>,
  isDark = false
) => ({
  colors: createThemeMock(overrides, isDark),
  isDark,
});