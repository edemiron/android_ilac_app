/**
 * SectionHeader tests — Sprint 98 Karol-inspired redesign.
 *
 * Section basligi + "Tümü >" link davranisi:
 * - Sadece baslik render edilir (onSeeAll yok)
 * - onSeeAll callback verildiginde link gorunur ve tiklanabilir
 * - seeAllLabel override calisir
 * - Ikon (icon prop) verildiginde render edilir
 * - Erişilebilirlik rolleri (link)
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: {
    create: <T,>(s: T): T => s,
    flatten: <T,>(s: T): T => s,
  },
}));

jest.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'tr',
    setLanguage: jest.fn(),
  }),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#4ECDC4',
      text: '#1A1A2E',
      textMuted: '#666666',
    },
    isDark: false,
  }),
}));

import { SectionHeader } from '../../../screens/HomeScreen/components/SectionHeader';

describe('SectionHeader', () => {
  it('renders title without see-all link when onSeeAll is not provided', () => {
    const { queryByText } = render(<SectionHeader title="Bugünün Planı" />);
    expect(queryByText('Bugünün Planı')).toBeTruthy();
    expect(queryByText(/Tümü/)).toBeNull();
  });

  it('renders see-all link with default "Tümü" label (tr)', () => {
    const onSeeAll = jest.fn();
    const { getByText } = render(
      <SectionHeader title="Bugünün Planı" onSeeAll={onSeeAll} />
    );
    const link = getByText(/Tümü/);
    expect(link).toBeTruthy();
    fireEvent.press(link);
    expect(onSeeAll).toHaveBeenCalledTimes(1);
  });

  it('uses custom seeAllLabel when provided', () => {
    const onSeeAll = jest.fn();
    const { getByText } = render(
      <SectionHeader
        title="Adherence"
        onSeeAll={onSeeAll}
        seeAllLabel="Detaylar"
      />
    );
    const link = getByText(/Detaylar/);
    expect(link).toBeTruthy();
    fireEvent.press(link);
    expect(onSeeAll).toHaveBeenCalledTimes(1);
  });

  it('renders icon when icon prop is provided', () => {
    const { queryByText } = render(<SectionHeader title="Bugün" icon="💊" />);
    expect(queryByText('💊')).toBeTruthy();
    expect(queryByText('Bugün')).toBeTruthy();
  });

  it('does not render icon element when icon is omitted', () => {
    // Icon Text element yok; sadece title var
    const { UNSAFE_root } = render(<SectionHeader title="Bugun" />);
    expect(UNSAFE_root.findAllByType('Text')).toHaveLength(1);
  });

  it('does not render link or icon when both are omitted (minimal section)', () => {
    const { UNSAFE_root } = render(<SectionHeader title="Baslik" />);
    // Sadece 1 Text olmali (title); icon Text'i ve TouchableOpacity yok
    expect(UNSAFE_root.findAllByType('Text')).toHaveLength(1);
    expect(UNSAFE_root.findAllByProps({ accessibilityRole: 'link' })).toHaveLength(0);
  });

  it('sets accessibilityRole="link" on see-all TouchableOpacity', () => {
    const onSeeAll = jest.fn();
    const { UNSAFE_root } = render(
      <SectionHeader title="Bugünün Planı" onSeeAll={onSeeAll} />
    );
    const link = UNSAFE_root.findByProps({ accessibilityRole: 'link' });
    expect(link.props.accessibilityLabel).toContain('Bugünün Planı');
    expect(link.props.accessibilityLabel).toContain('Tümü');
  });

  it('does not set link role when onSeeAll is omitted', () => {
    const { UNSAFE_root } = render(<SectionHeader title="Sadece Baslik" />);
    expect(UNSAFE_root.findAllByProps({ accessibilityRole: 'link' })).toHaveLength(0);
  });
});
