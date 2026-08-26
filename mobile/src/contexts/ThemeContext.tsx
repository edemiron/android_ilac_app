import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createScopedLogger } from '../utils/logger';
import { useAccent } from './AccentContext';

const log = createScopedLogger('ThemeContext');

// Modern Healthcare Renk Paleti - MD3 Tonal (WCAG AA+)
// Sprint 55: error rengi #B91C1C (Red 800) WCAG AAA 7.27:1
export const lightColors = {
  // Ana renkler - Google Stitch Clinical Modernity
  primary: '#0D9488', // Teal 600
  primaryDark: '#115E59', // Teal 800
  primaryLight: '#CCFBF1', // Teal 100
  primaryContainer: '#CCFBF1', // Teal 100
  onPrimaryContainer: '#0F766E', // Teal 700
  secondary: '#2563EB', // Royal Blue
  secondaryContainer: '#DBEAFE', // Blue 100
  accent: '#F43F5E', // Rose 500
  accentLight: '#FFE4E6', // Rose 100

  // Gradient renkler - Clinical Teal Gradient
  gradientStart: '#0D9488',
  gradientEnd: '#0F766E',

  // MD3 Surface (Google Stitch Slate 50)
  background: '#F8FAFC', // Slate 50
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#F8FAFC',
  surfaceContainer: '#F1F5F9', // Slate 100
  surfaceContainerHigh: '#E2E8F0', // Slate 200
  surfaceContainerHighest: '#CBD5E1', // Slate 300

  // Metin renkleri - High Contrast
  text: '#0F172A', // Slate 900
  textSecondary: '#64748B', // Slate 500
  textMuted: '#94A3B8', // Slate 400
  textOnPrimary: '#FFFFFF',

  // MD3 On-surface variants
  onSurface: '#0F172A',
  onSurfaceVariant: '#64748B',
  onSurfaceMuted: '#94A3B8',

  // Durum renkleri - Google Stitch Tokens
  success: '#10B981', // Emerald 500
  warning: '#F59E0B', // Amber 500
  error: '#EF4444', // Red 500
  info: '#2563EB', // Blue 600

  // MD3 Outline
  outline: '#94A3B8',
  outlineVariant: '#E2E8F0',

  // Sınır ve ayırıcı
  border: '#E2E8F0', // Slate 200
  borderFocused: '#0D9488', // Teal 600
  divider: '#F1F5F9', // Slate 100

  // Tab bar
  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  tabActive: '#0D9488',
  tabInactive: '#94A3B8',

  // Header
  header: '#FFFFFF',
  headerText: '#0F172A',

  // Input
  inputBackground: '#F8FAFC',
  inputBorder: '#E2E8F0',
  placeholder: '#94A3B8',

  // Özel
  overlay: 'rgba(15, 23, 42, 0.5)',
  shadow: 'rgba(15, 23, 42, 0.08)',

  // Kart arka plan renkleri (status)
  cardTaken: '#D1FAE5', // Emerald 100
  cardSkipped: '#FEF3C7', // Amber 100
  cardPending: '#FFFFFF',

  // MD3 Container tokens - Stitch Clinical Clarity
  warningContainer: '#FEF3C7', // Amber 100
  onWarningContainer: '#78350F', // Amber 900
  successContainer: '#D1FAE5', // Emerald 100
  onSuccessContainer: '#064E3B', // Emerald 900
  errorContainer: '#FEE2E2', // Red 100
  onErrorContainer: '#7F1D1D', // Red 900

  // MD3 Inverse + Fixed tokens
  inversePrimary: '#14B8A6',
  primaryFixed: '#0D9488',
  inverseOnSurface: '#F8FAFC',
  tertiaryContainer: '#CCFBF1',
  onTertiaryContainer: '#0F766E',

  // Gradient içi text/icon
  textOnGradient: '#FFFFFF',
  textOnGradientMuted: 'rgba(255, 255, 255, 0.92)',
  gradientTrackTint: 'rgba(255, 255, 255, 0.25)',
};

export const darkColors = {
  // Ana renkler - Google Stitch Clinical Modernity
  primary: '#14B8A6', // Teal 500
  primaryDark: '#2DD4BF', // Teal 400
  primaryLight: '#134E4A', // Teal 900
  primaryContainer: '#134E4A', // Teal 900
  onPrimaryContainer: '#5EEAD4', // Teal 300
  secondary: '#38BDF8', // Sky 400
  secondaryContainer: '#0C4A6E', // Sky 900
  accent: '#FB7185', // Rose 400
  accentLight: '#4C0519', // Rose 950

  // Gradient renkler - Clinical Teal Gradient
  gradientStart: '#14B8A6',
  gradientEnd: '#0D9488',

  // MD3 Surface (Google Stitch Slate Palette)
  background: '#0F172A', // Slate 900
  surface: '#1E293B', // Slate 800
  card: '#1E293B', // Slate 800
  cardElevated: '#334155', // Slate 700
  surfaceContainerLowest: '#0F172A', // Slate 900
  surfaceContainerLow: '#1E293B', // Slate 800
  surfaceContainer: '#1E293B', // Slate 800
  surfaceContainerHigh: '#334155', // Slate 700
  surfaceContainerHighest: '#475569', // Slate 600

  // Metin renkleri - High Contrast
  text: '#F8FAFC', // Slate 50
  textSecondary: '#94A3B8', // Slate 400
  textMuted: '#64748B', // Slate 500
  textOnPrimary: '#0F172A',

  // MD3 On-surface variants
  onSurface: '#F8FAFC',
  onSurfaceVariant: '#94A3B8',
  onSurfaceMuted: '#64748B',

  // Durum renkleri - Google Stitch Tokens
  success: '#34D399', // Emerald 400
  warning: '#FBBF24', // Amber 400
  error: '#F87171', // Red 400
  info: '#38BDF8', // Sky 400

  // MD3 Outline
  outline: '#64748B',
  outlineVariant: '#334155',

  // Sınır ve ayırıcı
  border: '#334155', // Slate 700
  borderFocused: '#14B8A6', // Teal 500
  divider: '#334155',

  // Tab bar
  tabBar: '#0F172A',
  tabBarBorder: '#334155',
  tabActive: '#14B8A6',
  tabInactive: '#64748B',

  // Header
  header: '#0F172A',
  headerText: '#F8FAFC',

  // Input
  inputBackground: '#1E293B',
  inputBorder: '#334155',
  placeholder: '#64748B',

  // Özel
  overlay: 'rgba(15, 23, 42, 0.8)',
  shadow: 'rgba(20, 184, 166, 0.15)',

  // Kart arka plan renkleri (status)
  cardTaken: '#064E3B', // Emerald 900
  cardSkipped: '#78350F', // Amber 900
  cardPending: '#1E293B',

  // MD3 Container tokens - Stitch Clinical Clarity
  warningContainer: '#78350F', // Amber 900
  onWarningContainer: '#FBBF24', // Amber 400
  successContainer: '#064E3B', // Emerald 900
  onSuccessContainer: '#34D399', // Emerald 400
  errorContainer: '#7F1D1D', // Red 900
  onErrorContainer: '#F87171', // Red 400

  // MD3 Inverse + Fixed tokens
  inversePrimary: '#0D9488',
  primaryFixed: '#14B8A6',
  inverseOnSurface: '#0F172A',
  tertiaryContainer: '#134E4A',
  onTertiaryContainer: '#5EEAD4',

  // Gradient içi text/icon
  textOnGradient: '#FFFFFF',
  textOnGradientMuted: 'rgba(255, 255, 255, 0.9)',
  gradientTrackTint: 'rgba(255, 255, 255, 0.2)',
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
