/**
 * ThemeContext tests — Sprint 8
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native', () => ({
  useColorScheme: () => 'light',
  Platform: { OS: 'android' },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
}));

jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('../../contexts/AccentContext', () => ({
  useAccent: () => ({
    palette: {
      id: 'mint',
      nameTr: 'Nane',
      nameEn: 'Mint',
      lightPrimary: '#14B8A6',
      darkPrimary: '#2DD4BF',
      preview: '#14B8A6',
    },
  }),
}));

import React from 'react';
import { Text } from 'react-native';
import { render, act } from '@testing-library/react-native';
import { ThemeProvider, useTheme, lightColors, darkColors } from '../../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

type TestThemeData = { theme: string; isDark: boolean; colors: { primary: string } };

const TestComponent = () => {
  const { theme, isDark, colors, setTheme } = useTheme();
  return (
    <>
      <Text testID="theme-value">{theme}</Text>
      <Text testID="isDark-value">{String(isDark)}</Text>
      <Text testID="primary-color">{colors.primary}</Text>
      <Text testID="set-theme-button" onPress={() => setTheme('dark')}>
        Set Dark
      </Text>
    </>
  );
};

// Test component that uses ref to expose values
const TestComponentWithRef = ({
  ref,
}: {
  ref: React.MutableRefObject<{
    theme: string;
    isDark: boolean;
    colors: { primary: string };
  } | null>;
}) => {
  const themeData = useTheme();
  ref.current = themeData;
  return null;
};

describe('ThemeContext', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('provides default theme as system', async () => {
    const ref = { current: null };
    render(
      <ThemeProvider>
        <TestComponentWithRef ref={ref} />
      </ThemeProvider>
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect((ref.current as TestThemeData | null)?.theme).toBe('system');
  });

  it('computes isDark=false when system is light', async () => {
    const ref = { current: null };
    render(
      <ThemeProvider>
        <TestComponentWithRef ref={ref} />
      </ThemeProvider>
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect((ref.current as TestThemeData | null)?.isDark).toBe(false);
  });

  it('provides light colors by default', async () => {
    const ref = { current: null };
    render(
      <ThemeProvider>
        <TestComponentWithRef ref={ref} />
      </ThemeProvider>
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect((ref.current as TestThemeData | null)?.colors.primary).toBe('#14B8A6'); // mint accent light
  });

  it('throws error when useTheme is used outside ThemeProvider', () => {
    // Suppress console.error for this expected error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useTheme must be used within a ThemeProvider');

    consoleErrorSpy.mockRestore();
  });

  it('exports lightColors and darkColors', () => {
    expect(lightColors.primary).toBeDefined();
    expect(darkColors.primary).toBeDefined();
    expect(lightColors.primary).not.toBe(darkColors.primary);
  });
});
