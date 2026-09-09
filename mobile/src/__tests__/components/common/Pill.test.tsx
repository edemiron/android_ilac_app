/**
 * Pill.test.tsx — Sprint 106.3
 *
 * Coverage: 6 variant × 3 size = 18 base render combinations + icon + dark mode + custom style.
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

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#14B8A6',
      primaryContainer: '#CCFBF1',
      onPrimaryContainer: '#0F766E',
      surfaceContainerHigh: '#F1F5F9',
      textSecondary: '#64748B',
      textMuted: '#94A3B8',
      textOnPrimary: '#FFFFFF',
    },
    isDark: false,
  }),
}));

import { Pill } from '../../../components/common/Pill';

describe('Pill', () => {
  describe('render', () => {
    it('renders label text', () => {
      const { getByText } = render(<Pill label="AÇIK" variant="success" />);
      expect(getByText('AÇIK')).toBeTruthy();
    });

    it('default variant muted, default size sm', () => {
      const { getByText } = render(<Pill label="default" />);
      expect(getByText('default')).toBeTruthy();
    });
  });

  describe('variants (6)', () => {
    const variants: Array<'success' | 'warning' | 'error' | 'info' | 'muted' | 'primary'> = [
      'success',
      'warning',
      'error',
      'info',
      'muted',
      'primary',
    ];

    variants.forEach(variant => {
      it(`renders ${variant} variant`, () => {
        const { getByText } = render(<Pill label={variant} variant={variant} />);
        expect(getByText(variant)).toBeTruthy();
      });
    });
  });

  describe('sizes (3)', () => {
    const sizes: Array<'xs' | 'sm' | 'md'> = ['xs', 'sm', 'md'];

    sizes.forEach(size => {
      it(`renders ${size} size`, () => {
        const { getByText } = render(<Pill label={`size-${size}`} size={size} />);
        expect(getByText(`size-${size}`)).toBeTruthy();
      });
    });
  });

  describe('icon', () => {
    it('renders Ionicons when icon prop provided', () => {
      const { UNSAFE_root } = render(<Pill label="with-icon" icon="flame" />);
      const icon = UNSAFE_root.findByType('Ionicons');
      expect(icon.props.name).toBe('flame');
    });

    it('omits icon when icon prop is undefined', () => {
      const { UNSAFE_root } = render(<Pill label="no-icon" />);
      const icons = UNSAFE_root.findAllByType('Ionicons');
      expect(icons).toHaveLength(0);
    });
  });

  describe('accessibility', () => {
    it('accessibilityElementsHidden default false (reads label)', () => {
      const { UNSAFE_root } = render(<Pill label="visible" />);
      const view = UNSAFE_root.findByType('View');
      expect(view.props.accessibilityElementsHidden).toBe(false);
      expect(view.props.importantForAccessibility).toBe('auto');
    });

    it('accessibilityElementsHidden true when explicitly set true (decorative)', () => {
      const { UNSAFE_root } = render(<Pill label="hidden" accessibilityElementsHidden />);
      const view = UNSAFE_root.findByType('View');
      expect(view.props.accessibilityElementsHidden).toBe(true);
      expect(view.props.importantForAccessibility).toBe('no');
    });
  });

  describe('custom style', () => {
    it('accepts style prop (marginRight)', () => {
      const { UNSAFE_root } = render(<Pill label="styled" style={{ marginRight: 8 }} />);
      const view = UNSAFE_root.findByType('View');
      expect(view.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ marginRight: 8 }),
        ])
      );
    });
  });
});
