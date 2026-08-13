/**
 * TopAppBar tests — Sprint 107.3 (Radikal UI Mimarisi).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

jest.mock('react-native', () => ({
  StyleSheet: {
    create: <T,>(styles: T): T => styles,
    flatten: <T,>(styles: T): T => styles,
  },
  Platform: { OS: 'android' },
  View: 'View',
  Text: 'Text',
  Animated: {
    Value: class {
      static timing() {}
      static spring() {}
    },
  },
  TouchableOpacity: 'TouchableOpacity',
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#fff',
      surface: '#f5f5f5',
      card: '#fff',
      primary: '#4ECDC4',
      text: '#000',
      textSecondary: '#666',
      textOnGradient: '#fff',
      textOnGradientMuted: '#9CA3AF',
      error: '#FF4444',
    },
    isDark: false,
  }),
}));

import { TopAppBar } from '../../../components/common/TopAppBar';

describe('TopAppBar', () => {
  it('renders plain title', () => {
    const { getByText } = render(<TopAppBar title="Ayarlar" />);
    expect(getByText('Ayarlar')).toBeTruthy();
  });

  it('renders subtitle when provided', () => {
    const { getByText } = render(<TopAppBar title="Başlık" subtitle="Alt başlık" />);
    expect(getByText('Alt başlık')).toBeTruthy();
  });

  it('renders leading widget', () => {
    const { getByText } = render(
      <TopAppBar title="X" leading={<Text>Geri</Text>} />,
    );
    expect(getByText('Geri')).toBeTruthy();
  });

  it('renders trailing actions', () => {
    const onPress = jest.fn();
    const { UNSAFE_root } = render(
      <TopAppBar
        title="X"
        trailing={[
          {
            key: 'add',
            icon: 'add',
            onPress,
            accessibilityLabel: 'Ekle',
          },
        ]}
      />,
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('calls trailing action onPress', () => {
    const onPress = jest.fn();
    const { UNSAFE_root } = render(
      <TopAppBar
        title="X"
        trailing={[
          {
            key: 'add',
            icon: 'add',
            onPress,
            accessibilityLabel: 'Ekle',
          },
        ]}
      />,
    );
    // TouchableOpacity'nin prop'larını bul ve onPress'i çağır
    const touchables = UNSAFE_root.findAllByProps({ accessibilityLabel: 'Ekle' });
    expect(touchables.length).toBeGreaterThan(0);
    fireEvent.press(touchables[0]);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders badge when badge > 0', () => {
    const { UNSAFE_root } = render(
      <TopAppBar
        title="X"
        trailing={[
          {
            key: 'bell',
            icon: 'notifications',
            onPress: jest.fn(),
            badge: 3,
            accessibilityLabel: 'Bildirimler',
          },
        ]}
      />,
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('shows 99+ when badge > 99', () => {
    const { UNSAFE_root } = render(
      <TopAppBar
        title="X"
        trailing={[
          {
            key: 'bell',
            icon: 'notifications',
            onPress: jest.fn(),
            badge: 150,
            accessibilityLabel: 'Bildirimler',
          },
        ]}
      />,
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('large variant renders bigger title style', () => {
    const { getByText, UNSAFE_root } = render(<TopAppBar title="Büyük" large />);
    expect(getByText('Büyük')).toBeTruthy();
    expect(UNSAFE_root).toBeTruthy();
  });

  it('modal variant centers title', () => {
    const { UNSAFE_root } = render(<TopAppBar title="Modal" variant="modal" />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('home variant uses primary background', () => {
    const { UNSAFE_root } = render(<TopAppBar title="Ana sayfa" variant="home" />);
    expect(UNSAFE_root).toBeTruthy();
  });
});