import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Renk paleti
export const lightColors = {
  // Ana renkler
  primary: '#4ECDC4',
  primaryDark: '#3DBDB5',
  secondary: '#FF6B6B',
  accent: '#45B7D1',
  
  // Arka plan renkleri
  background: '#F8F9FA',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  
  // Metin renkleri
  text: '#1A1A2E',
  textSecondary: '#666666',
  textMuted: '#999999',
  textOnPrimary: '#FFFFFF',
  
  // Durum renkleri
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  info: '#2196F3',
  
  // Sınır ve ayırıcı
  border: '#E0E0E0',
  divider: '#F0F0F0',
  
  // Tab bar
  tabBar: '#FFFFFF',
  tabBarBorder: '#F0F0F0',
  tabActive: '#4ECDC4',
  tabInactive: '#999999',
  
  // Header
  header: '#FFFFFF',
  headerText: '#1A1A2E',
  
  // Input
  inputBackground: '#F5F5F5',
  inputBorder: '#E0E0E0',
  placeholder: '#999999',
  
  // Özel
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

export const darkColors = {
  // Ana renkler
  primary: '#4ECDC4',
  primaryDark: '#3DBDB5',
  secondary: '#FF6B6B',
  accent: '#45B7D1',
  
  // Arka plan renkleri
  background: '#121212',
  surface: '#1E1E1E',
  card: '#252525',
  
  // Metin renkleri
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textMuted: '#808080',
  textOnPrimary: '#FFFFFF',
  
  // Durum renkleri
  success: '#66BB6A',
  warning: '#FFCA28',
  error: '#EF5350',
  info: '#42A5F5',
  
  // Sınır ve ayırıcı
  border: '#333333',
  divider: '#2A2A2A',
  
  // Tab bar
  tabBar: '#1E1E1E',
  tabBarBorder: '#333333',
  tabActive: '#4ECDC4',
  tabInactive: '#808080',
  
  // Header
  header: '#1E1E1E',
  headerText: '#FFFFFF',
  
  // Input
  inputBackground: '#2A2A2A',
  inputBorder: '#404040',
  placeholder: '#808080',
  
  // Özel
  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: 'rgba(0, 0, 0, 0.3)',
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
      console.error('Tema yüklenemedi:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const setTheme = async (newTheme: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      setThemeState(newTheme);
    } catch (error) {
      console.error('Tema kaydedilemedi:', error);
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
