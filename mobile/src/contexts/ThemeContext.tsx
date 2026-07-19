import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createScopedLogger } from '../utils/logger';
import { useAccent } from './AccentContext';

const log = createScopedLogger('ThemeContext');

// Modern Healthcare Renk Paleti - MD3 Tonal (WCAG AA+)
// Sprint 55: error rengi #B91C1C (Red 800) WCAG AAA 7.27:1
export const lightColors = {
  // Ana renkler - Vibrant Teal + Deep Blue
  primary: '#0D9488', // Vibrant Teal
  primaryDark: '#0F766E', // Dark Teal
  primaryLight: '#14B8A6', // Light Teal
  primaryContainer: '#CCFBF1', // Teal 100 - Sprint 58.5 tonlu kartlar için
  onPrimaryContainer: '#0F766E', // Teal 700 - WCAG AA
  secondary: '#2563EB', // Royal Blue
  secondaryContainer: '#DBEAFE', // Blue 100
  accent: '#7C3AED', // Vibrant Purple

  // Gradient renkler - Premium Feel
  gradientStart: '#0D9488', // Teal
  gradientEnd: '#0891B2', // Cyan

  // MD3 Surface (Sprint 55) - elevasyon skalası
  background: '#F8FAFC', // Soft Gray-Blue
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  surfaceContainerLowest: '#FFFFFF', // MD3 elevation 0
  surfaceContainerLow: '#F8FAFC', // MD3 elevation 1
  surfaceContainer: '#F1F5F9', // MD3 elevation 2
  surfaceContainerHigh: '#E2E8F0', // MD3 elevation 3
  surfaceContainerHighest: '#CBD5E1', // MD3 elevation 4

  // Metin renkleri - High Contrast (WCAG AAA)
  text: '#0F172A', // Slate 900 - 16.84:1
  textSecondary: '#475569', // Slate 600 - 7.55:1
  textMuted: '#94A3B8', // Slate 400 - 3.55:1 (18pt+ only)
  textOnPrimary: '#FFFFFF',

  // MD3 On-surface variants
  onSurface: '#0F172A',
  onSurfaceVariant: '#475569',
  onSurfaceMuted: '#94A3B8',

  // Durum renkleri - WCAG AA+
  success: '#059669', // Emerald 600 - 4.62:1
  warning: '#B45309', // Amber 700 - 4.62:1 (was #D97706 borderline)
  error: '#B91C1C', // Red 800 - 7.27:1 AAA (was #DC2626 4.83:1)
  info: '#2563EB', // Blue 600

  // MD3 Outline (Sprint 55)
  outline: '#94A3B8',
  outlineVariant: '#E2E8F0',

  // Sınır ve ayırıcı
  border: '#E2E8F0', // Slate 200
  divider: '#F1F5F9', // Slate 100

  // Tab bar - Clean White
  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  tabActive: '#0D9488', // Primary
  tabInactive: '#94A3B8', // Slate 400

  // Header
  header: '#FFFFFF',
  headerText: '#0F172A',

  // Input - Subtle Background
  inputBackground: '#F8FAFC', // Matches background
  inputBorder: '#CBD5E1', // Slate 300 - More visible
  placeholder: '#94A3B8',

  // Özel
  overlay: 'rgba(15, 23, 42, 0.5)', // Slate 900 with opacity
  shadow: 'rgba(15, 23, 42, 0.08)',

  // Kart arka plan renkleri (status) - Soft Tints
  cardTaken: '#D1FAE5', // Emerald 100
  cardSkipped: '#FEE2E2', // Red 100
  cardPending: '#FFFFFF',
};

export const darkColors = {
  // Ana renkler - Kullanıcı paleti
  primary: '#8B9CFF', // Soft mor-mavi
  primaryDark: '#6B7CDF', // Koyu mor-mavi
  primaryLight: '#ABB8FF', // Açık mor-mavi
  primaryContainer: '#1F2A4D', // Koyu mor-mavi container - Sprint 58.5
  onPrimaryContainer: '#ABB8FF', // Açık mor-mavi - WCAG AA
  secondary: '#5EE6FF', // Cyan
  secondaryContainer: '#0E2A3A', // Koyu cyan container
  accent: '#D0A6FF', // Açık mor (Tertiary)

  // Gradient renkler
  gradientStart: '#8B9CFF',
  gradientEnd: '#5EE6FF',

  // MD3 Surface (Sprint 55) - elevasyon skalası
  background: '#0B0D14', // OLED-friendly background
  surface: '#121625',
  card: '#1A2035', // Surface Variant
  cardElevated: '#232840', // Biraz daha açık
  surfaceContainerLowest: '#0B0D14', // MD3 elevation 0
  surfaceContainerLow: '#121625', // MD3 elevation 1
  surfaceContainer: '#1A2035', // MD3 elevation 2
  surfaceContainerHigh: '#232840', // MD3 elevation 3
  surfaceContainerHighest: '#2B3354', // MD3 elevation 4

  // Metin renkleri - WCAG AAA
  text: '#E9ECFF', // Text Primary - 17.2:1 AAA
  textSecondary: '#88C0E6', // Text Secondary - 10.5:1 AAA
  textMuted: '#6B8AAA', // Daha soluk
  textOnPrimary: '#10163A', // On Primary

  // MD3 On-surface variants
  onSurface: '#E9ECFF',
  onSurfaceVariant: '#88C0E6',
  onSurfaceMuted: '#6B8AAA',

  // Durum renkleri - Kullanıcı paleti
  success: '#34D399', // Success
  warning: '#FCD34D', // Amber 300 - WCAG AA
  error: '#FB7185', // Error
  info: '#60A5FA', // Info

  // MD3 Outline
  outline: '#6B8AAA',
  outlineVariant: '#2B3354',

  // Sınır ve ayırıcı - Kullanıcı paleti
  border: '#2B3354', // Outline/Divider
  divider: '#2B3354',

  // Tab bar
  tabBar: '#0B0D14', // Background ile aynı
  tabBarBorder: '#2B3354',
  tabActive: '#8B9CFF', // Primary
  tabInactive: '#6B8AAA',

  // Header
  header: '#121625', // Surface
  headerText: '#E9ECFF', // Text Primary

  // Input
  inputBackground: '#1A2035', // Surface Variant
  inputBorder: '#2B3354', // Outline/Divider
  placeholder: '#6B8AAA',

  // Özel
  overlay: 'rgba(11, 13, 20, 0.9)',
  shadow: 'rgba(139, 156, 255, 0.15)', // Primary glow

  // Kart arka plan renkleri (status)
  cardTaken: '#1A3D2E', // Yeşil tonlu
  cardSkipped: '#3D1A2A', // Kırmızı tonlu
  cardPending: '#1A2035', // Surface Variant
};

export type ThemeColors = typeof lightColors;
export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@app_theme';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // AsyncStorage'dan tema yükle
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeState(savedTheme as ThemeMode);
      }
    } catch (error) {
      log.error('Tema yuklenemedi', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const setTheme = async (newTheme: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      setThemeState(newTheme);
    } catch (error) {
      log.error('Tema kaydedilemedi', error);
    }
  };

  // Gerçek karanlık mod durumunu hesapla
  const isDark = theme === 'system' ? systemColorScheme === 'dark' : theme === 'dark';

  // Sprint 63: Accent palette'ten primary rengi al
  const { palette } = useAccent();
  const baseColors = isDark ? darkColors : lightColors;
  const colors = {
    ...baseColors,
    primary: isDark ? palette.darkPrimary : palette.lightPrimary,
    primaryDark: isDark ? palette.darkPrimary : palette.lightPrimary,
    primaryLight: isDark ? palette.lightPrimary : palette.lightPrimary,
  };

  if (!isLoaded) {
    return null; // veya loading spinner
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Tema bazlı stil oluşturma yardımcısı
export function createThemedStyles<T extends object>(
  styleCreator: (colors: ThemeColors, isDark: boolean) => T
) {
  return (colors: ThemeColors, isDark: boolean) => styleCreator(colors, isDark);
}
