/**
 * themeMock.test.ts — Sprint 102.6
 *
 * createThemeMock factory'sinin tüm 53 token'ı doğru döndürdüğünü verify eder.
 * Yeni token eklendikçe (Sprint 102.1+) bu test başarısız olur → factory güncellenir.
 */

import { createThemeMock, mockUseTheme } from '../helpers/themeMock';
import { lightColors } from '../../contexts/ThemeContext';

describe('themeMock factory', () => {
  describe('createThemeMock (light default)', () => {
    it('lightColors ile aynı token setini döndürür', () => {
      const mock = createThemeMock();
      expect(Object.keys(mock).sort()).toEqual(Object.keys(lightColors).sort());
    });

    it('Sprint 102.1 — 14 yeni MD3 container token mevcut', () => {
      const mock = createThemeMock();
      expect(mock.warningContainer).toBe('#FEF3C7');
      expect(mock.onWarningContainer).toBe('#78350F');
      expect(mock.successContainer).toBe('#D1FAE5');
      expect(mock.onSuccessContainer).toBe('#064E3B');
      expect(mock.errorContainer).toBe('#FEE2E2');
      expect(mock.onErrorContainer).toBe('#7F1D1D');
      expect(mock.inversePrimary).toBe('#14B8A6');
      expect(mock.primaryFixed).toBe('#0D9488');
      expect(mock.inverseOnSurface).toBe('#F8FAFC');
      expect(mock.tertiaryContainer).toBe('#CCFBF1');
      expect(mock.onTertiaryContainer).toBe('#0F766E');
      expect(mock.textOnGradient).toBe('#FFFFFF');
      expect(mock.textOnGradientMuted).toBe('rgba(255, 255, 255, 0.92)');
      expect(mock.gradientTrackTint).toBe('rgba(255, 255, 255, 0.25)');
    });

    it('mevcut token korunur (geriye dönük uyumluluk)', () => {
      const mock = createThemeMock();
      expect(mock.primary).toBe('#0D9488');
      expect(mock.primaryContainer).toBe('#CCFBF1');
      expect(mock.secondary).toBe('#2563EB');
      expect(mock.text).toBe('#0F172A');
      expect(mock.success).toBe('#10B981');
      expect(mock.cardTaken).toBe('#D1FAE5');
    });
  });

  describe('createThemeMock (dark mode)', () => {
    it('darkColors baz alınır', () => {
      const mock = createThemeMock({}, true);
      expect(mock.background).toBe('#0F172A');
      expect(mock.text).toBe('#F8FAFC');
      expect(mock.warningContainer).toBe('#78350F');
      expect(mock.errorContainer).toBe('#7F1D1D');
    });

    it('dark mode gradient token (textOnGradient, gradientTrackTint)', () => {
      const mock = createThemeMock({}, true);
      expect(mock.textOnGradient).toBe('#FFFFFF');
      expect(mock.gradientTrackTint).toBe('rgba(255, 255, 255, 0.2)');
    });
  });

  describe('overrides', () => {
    it('override edilmiş token döner', () => {
      const mock = createThemeMock({ primary: '#F97316' });
      expect(mock.primary).toBe('#F97316');
      // override edilmemiş token korunur
      expect(mock.primaryContainer).toBe('#CCFBF1');
    });

    it('birden fazla override birlikte çalışır', () => {
      const mock = createThemeMock({
        primary: '#0EA5E9',
        background: '#FAFAFA',
        warningContainer: '#FCD34D',
      });
      expect(mock.primary).toBe('#0EA5E9');
      expect(mock.background).toBe('#FAFAFA');
      expect(mock.warningContainer).toBe('#FCD34D');
    });
  });

  describe('mockUseTheme', () => {
    it('useTheme() return shape: { colors, isDark }', () => {
      const result = mockUseTheme();
      expect(result).toHaveProperty('colors');
      expect(result).toHaveProperty('isDark');
      expect(result.isDark).toBe(false);
    });

    it('isDark=true ile dark mode mocklanır', () => {
      const result = mockUseTheme({}, true);
      expect(result.isDark).toBe(true);
      expect(result.colors.background).toBe('#0F172A');
    });
  });
});
