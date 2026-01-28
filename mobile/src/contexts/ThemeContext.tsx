import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('ThemeContext');

// Modern Healthcare Renk Paleti - Premium Light Theme
export const lightColors = {
  // Ana renkler - Vibrant Teal + Deep Blue
  primary: '#0D9488',           // Vibrant Teal
  primaryDark: '#0F766E',       // Dark Teal
  primaryLight: '#14B8A6',      // Light Teal
  secondary: '#2563EB',         // Royal Blue
  accent: '#7C3AED',            // Vibrant Purple

  // Gradient renkler - Premium Feel
  gradientStart: '#0D9488',     // Teal
  gradientEnd: '#0891B2',       // Cyan

  // Arka plan renkleri - Clean & Crisp
  background: '#F8FAFC',        // Soft Gray-Blue
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',

  // Metin renkleri - High Contrast
  text: '#0F172A',              // Slate 900 - More contrast
  textSecondary: '#475569',     // Slate 600
  textMuted: '#94A3B8',         // Slate 400
  textOnPrimary: '#FFFFFF',

  // Durum renkleri - Vibrant & Clear
  success: '#059669',           // Emerald 600
  warning: '#D97706',           // Amber 600
  error: '#DC2626',             // Red 600
  info: '#2563EB',              // Blue 600

  // Sınır ve ayırıcı
  border: '#E2E8F0',            // Slate 200
  divider: '#F1F5F9',           // Slate 100

  // Tab bar - Clean White
  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  tabActive: '#0D9488',         // Primary
  tabInactive: '#94A3B8',       // Slate 400

  // Header
  header: '#FFFFFF',
  headerText: '#0F172A',

  // Input - Subtle Background
  inputBackground: '#F8FAFC',   // Matches background
  inputBorder: '#CBD5E1',       // Slate 300 - More visible
  placeholder: '#94A3B8',

  // Özel
  overlay: 'rgba(15, 23, 42, 0.5)',  // Slate 900 with opacity
  shadow: 'rgba(15, 23, 42, 0.08)',

  // Kart arka plan renkleri (status) - Soft Tints
  cardTaken: '#D1FAE5',         // Emerald 100
  cardSkipped: '#FEE2E2',       // Red 100
  cardPending: '#FFFFFF',
};

export const darkColors = {
  // Ana renkler - Kullanıcı paleti
  primary: '#8B9CFF',           // Soft mor-mavi
  primaryDark: '#6B7CDF',       // Koyu mor-mavi
  primaryLight: '#ABB8FF',      // Açık mor-mavi
  secondary: '#5EE6FF',         // Cyan
  accent: '#D0A6FF',            // Açık mor (Tertiary)

  // Gradient renkler
  gradientStart: '#8B9CFF',
  gradientEnd: '#5EE6FF',

  // Arka plan renkleri - Kullanıcı paleti
  background: '#0B0D14',        // Background
  surface: '#121625',           // Surface
  card: '#1A2035',              // Surface Variant
  cardElevated: '#232840',      // Biraz daha açık

  // Metin renkleri - Kullanıcı paleti
  text: '#E9ECFF',              // Text Primary
  textSecondary: '#88C0E6',     // Text Secondary
  textMuted: '#6B8AAA',         // Daha soluk
  textOnPrimary: '#10163A',     // On Primary

  // Durum renkleri - Kullanıcı paleti
  success: '#34D399',           // Success
  warning: '#F59E0B',           // Warning
  error: '#FB7185',             // Error
  info: '#60A5FA',              // Info

  // Sınır ve ayırıcı - Kullanıcı paleti
  border: '#2B3354',            // Outline/Divider
  divider: '#2B3354',

  // Tab bar
  tabBar: '#0B0D14',            // Background ile aynı
  tabBarBorder: '#2B3354',
  tabActive: '#8B9CFF',         // Primary
  tabInactive: '#6B8AAA',

  // Header
  header: '#121625',            // Surface
  headerText: '#E9ECFF',        // Text Primary

  // Input
  inputBackground: '#1A2035',   // Surface Variant
  inputBorder: '#2B3354',       // Outline/Divider
  placeholder: '#6B8AAA',

  // Özel
  overlay: 'rgba(11, 13, 20, 0.9)',
  shadow: 'rgba(139, 156, 255, 0.15)',  // Primary glow

  // Kart arka plan renkleri (status)
  cardTaken: '#1A3D2E',         // Yeşil tonlu
  cardSkipped: '#3D1A2A',       // Kırmızı tonlu
  cardPending: '#1A2035',       // Surface Variant
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
  const isDark = theme === 'system' 
    ? systemColorScheme === 'dark' 
    : theme === 'dark';

  const colors = isDark ? darkColors : lightColors;

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
