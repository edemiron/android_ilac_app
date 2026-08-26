/**
 * ThemedText.test.tsx — Sprint 102.8
 * CC spec typography scale: 6 varyant, fontFamily, fontSize, fontWeight,
 * letterSpacing doğru değerlerde mi?
 */

import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  __esModule: true,
  View: 'View',
  Text: 'Text',
  StyleSheet: {
    create: <T,>(s: T): T => s,
    flatten: <T,>(s: T): T => s,
  },
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: { text: '#0F172A' },
    isDark: false,
  }),
}));

import { ThemedText, ThemedTextStyles } from '../../../components/common/ThemedText';

describe('ThemedText', () => {
  describe('variant styles (CC spec)', () => {
    it('headlineLg: 28/700/-0.4, HankenGroteskBold', () => {
      expect(ThemedTextStyles.headlineLg.fontSize).toBe(28);
      expect(ThemedTextStyles.headlineLg.fontWeight).toBe('700');
      expect(ThemedTextStyles.headlineLg.letterSpacing).toBe(-0.4);
      expect(ThemedTextStyles.headlineLg.fontFamily).toBe('HankenGroteskBold');
    });

    it('headlineMd: 22/600/-0.2, HankenGroteskSemiBold', () => {
      expect(ThemedTextStyles.headlineMd.fontSize).toBe(22);
      expect(ThemedTextStyles.headlineMd.fontWeight).toBe('600');
      expect(ThemedTextStyles.headlineMd.letterSpacing).toBe(-0.2);
      expect(ThemedTextStyles.headlineMd.fontFamily).toBe('HankenGroteskSemiBold');
    });

    it('bodyLg: 16/400, InterRegular', () => {
      expect(ThemedTextStyles.bodyLg.fontSize).toBe(16);
      expect(ThemedTextStyles.bodyLg.fontWeight).toBe('400');
      expect(ThemedTextStyles.bodyLg.fontFamily).toBe('InterRegular');
    });

    it('bodyMd: 14/400, InterRegular', () => {
      expect(ThemedTextStyles.bodyMd.fontSize).toBe(14);
      expect(ThemedTextStyles.bodyMd.fontWeight).toBe('400');
      expect(ThemedTextStyles.bodyMd.fontFamily).toBe('InterRegular');
    });

    it('labelMd: 14/500, InterMedium', () => {
      expect(ThemedTextStyles.labelMd.fontSize).toBe(14);
      expect(ThemedTextStyles.labelMd.fontWeight).toBe('500');
      expect(ThemedTextStyles.labelMd.fontFamily).toBe('InterMedium');
    });

    it('labelSm: 12/500, InterMedium', () => {
      expect(ThemedTextStyles.labelSm.fontSize).toBe(12);
      expect(ThemedTextStyles.labelSm.fontWeight).toBe('500');
      expect(ThemedTextStyles.labelSm.fontFamily).toBe('InterMedium');
    });
  });

  describe('render', () => {
    it('renders children', () => {
      const { getByText } = render(<ThemedText variant="bodyLg">İlaç adı</ThemedText>);
      expect(getByText('İlaç adı')).toBeTruthy();
    });

    it('numberOfLines prop aktarılır', () => {
      const { UNSAFE_root } = render(
        <ThemedText variant="headlineMd" numberOfLines={2}>
          Uzun başlık metni
        </ThemedText>
      );
      const text = UNSAFE_root.findByType('Text');
      expect(text.props.numberOfLines).toBe(2);
    });

    it('color override edilir', () => {
      const { UNSAFE_root } = render(
        <ThemedText variant="bodyLg" color="#FF6B6B">Özel renk</ThemedText>
      );
      const text = UNSAFE_root.findByType('Text');
      const flatStyle = Array.isArray(text.props.style)
        ? Object.assign({}, ...text.props.style.filter(Boolean))
        : text.props.style;
      expect(flatStyle.color).toBe('#FF6B6B');
    });

    it('color belirtilmezse theme.text kullanılır', () => {
      const { UNSAFE_root } = render(<ThemedText variant="bodyLg">Tema rengi</ThemedText>);
      const text = UNSAFE_root.findByType('Text');
      const flatStyle = Array.isArray(text.props.style)
        ? Object.assign({}, ...text.props.style.filter(Boolean))
        : text.props.style;
      expect(flatStyle.color).toBe('#0F172A');
    });
  });
});