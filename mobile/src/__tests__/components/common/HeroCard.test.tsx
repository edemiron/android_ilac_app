/**
 * HeroCard.test.tsx — Sprint 107.1
 *
 * Coverage: render title/subtitle, variant gradient mapping, icon container,
 * badge slot, dismissible button, onPress callback, children slot, a11y label.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
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
  TouchableOpacity: 'TouchableOpacity',
  Platform: { OS: 'android' },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      gradientStart: '#0D9488',
      gradientEnd: '#0EA5E9',
      primaryDark: '#6B7CDF',
      textOnGradient: '#FFFFFF',
      textOnGradientMuted: 'rgba(255,255,255,0.7)',
      surface: '#FFFFFF',
      background: '#F8FAFC',
    },
    isDark: false,
  }),
}));

import { HeroCard } from '../../../components/common/HeroCard';

describe('HeroCard', () => {
  it('renders title', () => {
    const { getByText } = render(<HeroCard title="Premium'a Geçin" />);
    expect(getByText("Premium'a Geçin")).toBeTruthy();
  });

  it('renders subtitle when provided', () => {
    const { getByText } = render(
      <HeroCard title="Başlık" subtitle="Alt başlık metni" />
    );
    expect(getByText('Alt başlık metni')).toBeTruthy();
  });

  it('omits subtitle when not provided', () => {
    const { queryByText } = render(<HeroCard title="Sadece başlık" />);
    expect(queryByText('Alt başlık metni')).toBeNull();
  });

  it('renders premium gradient colors when variant=premium', () => {
    const { UNSAFE_root } = render(<HeroCard variant="premium" title="Premium" />);
    const gradient = UNSAFE_root.findByType('LinearGradient');
    // LinearGradient colors prop: first color gold
    expect(gradient.props.colors[0]).toBe('#FFD700');
    expect(gradient.props.colors[1]).toBe('#FFA500');
  });

  it('renders accent gradient colors when variant=free (default)', () => {
    const { UNSAFE_root } = render(<HeroCard title="Free" />);
    const gradient = UNSAFE_root.findByType('LinearGradient');
    expect(gradient.props.colors[0]).toBe('#0D9488');
    expect(gradient.props.colors[1]).toBe('#0EA5E9');
  });

  it('renders warning gradient colors when variant=warning', () => {
    const { UNSAFE_root } = render(<HeroCard variant="warning" title="Uyarı" />);
    const gradient = UNSAFE_root.findByType('LinearGradient');
    expect(gradient.props.colors[0]).toBe('#F59E0B');
  });

  it('renders success gradient colors when variant=success', () => {
    const { UNSAFE_root } = render(<HeroCard variant="success" title="Başarı" />);
    const gradient = UNSAFE_root.findByType('LinearGradient');
    expect(gradient.props.colors[0]).toBe('#10B981');
  });

  it('renders icon when provided', () => {
    const { UNSAFE_root } = render(
      <HeroCard title="Test" icon={<View testID="custom-icon" />} />
    );
    // Icon slot testID ile bulunur — custom icon render olduğunu doğrular
    expect(UNSAFE_root.findByProps({ testID: 'custom-icon' })).toBeTruthy();
  });

  it('renders badge slot', () => {
    const { getByText } = render(
      <HeroCard
        title="Test"
        badge={<Text>YENİ</Text>}
      />
    );
    expect(getByText('YENİ')).toBeTruthy();
  });

  it('renders dismiss button when dismissible=true', () => {
    const { UNSAFE_root } = render(
      <HeroCard title="Test" dismissible onDismiss={() => {}} />
    );
    const ionIcons = UNSAFE_root.findAllByType('Ionicons');
    // icon container IconBadge YOK, sadece dismiss close icon var
    expect(ionIcons.length).toBeGreaterThan(0);
  });

  it('calls onDismiss callback when dismiss button pressed', () => {
    const onDismiss = jest.fn();
    const { UNSAFE_root } = render(
      <HeroCard title="Test" dismissible onDismiss={onDismiss} />
    );
    // Dismiss button: TouchableOpacity (son TouchableOpacity — title'ı span etmeyen)
    const touchables = UNSAFE_root.findAllByType('TouchableOpacity');
    // onPress HeroCard'a değil dismiss'a bağlı — son touchable dismiss
    const dismissBtn = touchables[touchables.length - 1];
    fireEvent.press(dismissBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders onPress as TouchableOpacity wrapper when onPress provided', () => {
    const onPress = jest.fn();
    const { UNSAFE_root } = render(
      <HeroCard title="Tıkla" onPress={onPress} />
    );
    // Tıklanabilir: TouchableOpacity container
    const touchables = UNSAFE_root.findAllByType('TouchableOpacity');
    expect(touchables.length).toBeGreaterThan(0);
    // Container touchable onPress trigger
    fireEvent.press(touchables[0]);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders children slot below subtitle', () => {
    const { getByText } = render(
      <HeroCard title="Test" subtitle="Alt">
        <Text>Progress: 75%</Text>
      </HeroCard>
    );
    expect(getByText('Progress: 75%')).toBeTruthy();
  });

  it('uses title as fallback accessibility label when not provided', () => {
    const { UNSAFE_root } = render(<HeroCard title="Erişilebilir başlık" />);
    const card = UNSAFE_root.findByType('View');
    expect(card.props.accessibilityLabel).toBe('Erişilebilir başlık');
  });

  it('uses explicit accessibilityLabel when provided', () => {
    const { UNSAFE_root } = render(
      <HeroCard title="Başlık" accessibilityLabel="Özel etiket" />
    );
    const card = UNSAFE_root.findByType('View');
    expect(card.props.accessibilityLabel).toBe('Özel etiket');
  });
});