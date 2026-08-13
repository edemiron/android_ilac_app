/**
 * ListSection.test.tsx — Sprint 107.2
 *
 * Coverage: variant render (settings/list/stats/home/plain), title/subtitle/icon/trailing
 * slots, children rendering, inset override, elevation level.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';

jest.mock('react-native', () => ({
  __esModule: true,
  View: 'View',
  Text: 'Text',
  StyleSheet: {
    create: <T,>(s: T): T => s,
    flatten: <T,>(s: T): T => s,
    hairlineWidth: 1,
  },
  Platform: { OS: 'android' },
}));

jest.mock('moti', () => ({
  MotiView: 'MotiView',
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      card: '#FFFFFF',
      primary: '#0D9488',
      textSecondary: '#64748B',
      text: '#0F172A',
      textMuted: '#94A3B8',
    },
    isDark: false,
  }),
}));

import { ListSection } from '../../../components/common/ListSection';

describe('ListSection', () => {
  it('renders title', () => {
    const { getByText } = render(
      <ListSection title="BAKICILAR">
        <></>
      </ListSection>
    );
    expect(getByText('BAKICILAR')).toBeTruthy();
  });

  it('renders subtitle when provided', () => {
    const { getByText } = render(
      <ListSection title="Test" subtitle="Alt başlık">
        <></>
      </ListSection>
    );
    expect(getByText('Alt başlık')).toBeTruthy();
  });

  it('omits title when not provided', () => {
    const { queryByText } = render(
      <ListSection subtitle="Sadece subtitle">
        <></>
      </ListSection>
    );
    expect(queryByText('Sadece subtitle')).toBeTruthy();
  });

  it('renders icon slot', () => {
    const { UNSAFE_root } = render(
      <ListSection title="Test" icon={<View testID="custom-icon" />}>
        <></>
      </ListSection>
    );
    expect(UNSAFE_root.findByProps({ testID: 'custom-icon' })).toBeTruthy();
  });

  it('renders trailing slot', () => {
    const { UNSAFE_root } = render(
      <ListSection title="Test" trailing={<View testID="custom-trailing" />}>
        <></>
      </ListSection>
    );
    expect(UNSAFE_root.findByProps({ testID: 'custom-trailing' })).toBeTruthy();
  });

  it('renders children', () => {
    const { getByText } = render(
      <ListSection title="Test">
        <Text>Satır 1</Text>
        <Text>Satır 2</Text>
      </ListSection>
    );
    expect(getByText('Satır 1')).toBeTruthy();
    expect(getByText('Satır 2')).toBeTruthy();
  });

  it('settings variant: title uppercase styling (fontSize 13)', () => {
    const { UNSAFE_root } = render(
      <ListSection variant="settings" title="BAKICILAR">
        <></>
      </ListSection>
    );
    const titleText = UNSAFE_root.findByProps({ children: 'BAKICILAR' });
    const flatStyle = Array.isArray(titleText.props.style)
      ? Object.assign({}, ...titleText.props.style.flat())
      : titleText.props.style;
    expect(flatStyle.fontSize).toBe(13);
  });

  it('list variant: title larger fontSize (17)', () => {
    const { UNSAFE_root } = render(
      <ListSection variant="list" title="BUGÜNÜN DOZLARI">
        <></>
      </ListSection>
    );
    const titleText = UNSAFE_root.findByProps({ children: 'BUGÜNÜN DOZLARI' });
    const flatStyle = Array.isArray(titleText.props.style)
      ? Object.assign({}, ...titleText.props.style.flat())
      : titleText.props.style;
    expect(flatStyle.fontSize).toBe(17);
  });

  it('home variant: renders MotiView wrapper', () => {
    const { UNSAFE_root } = render(
      <ListSection variant="home" title="BUGÜN">
        <></>
      </ListSection>
    );
    const moti = UNSAFE_root.findByType('MotiView');
    expect(moti).toBeTruthy();
  });

  it('plain variant: no card styling (no borderRadius marginTop)', () => {
    const { UNSAFE_root } = render(
      <ListSection variant="plain" title="Düz wrapper">
        <></>
      </ListSection>
    );
    // Plain variant: no cardMargin (marginTop: 16) applied
    const view = UNSAFE_root.findByType('View');
    // styles array should not include cardMargin
    const flattenedStyle = Array.isArray(view.props.style)
      ? Object.assign({}, ...view.props.style.flat())
      : view.props.style;
    expect(flattenedStyle?.marginTop).not.toBe(16);
  });

  it('inset=none: removes card margins', () => {
    const { UNSAFE_root } = render(
      <ListSection inset="none" title="Test">
        <></>
      </ListSection>
    );
    const view = UNSAFE_root.findByType('View');
    const flattenedStyle = Array.isArray(view.props.style)
      ? Object.assign({}, ...view.props.style.flat())
      : view.props.style;
    expect(flattenedStyle?.marginTop).toBe(0);
  });

  it('elevation=2: applies level2 elevation (shadowOpacity 0.08)', () => {
    const { UNSAFE_root } = render(
      <ListSection elevation={2} title="Test">
        <></>
      </ListSection>
    );
    const view = UNSAFE_root.findByType('View');
    const flattenedStyle = Array.isArray(view.props.style)
      ? Object.assign({}, ...view.props.style.flat())
      : view.props.style;
    expect(flattenedStyle?.shadowOpacity).toBe(0.08);
  });
});