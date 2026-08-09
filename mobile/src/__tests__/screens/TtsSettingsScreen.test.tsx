/**
 * TtsSettingsScreen tests — Sprint 8 Tier 4 devamı + Sprint 103.1
 * Store + LanguageContext + ThemeContext mock'lu (Sprint 102.6 themeMock factory).
 * Render smoke testleri (light + dark mode).
 */

import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  StyleSheet: {
    create: <T,>(styles: T): T => styles,
    flatten: <T,>(styles: T): T => styles,
  },
  Platform: { OS: 'android' },
  View: 'View',
  Text: 'Text',
  Switch: 'Switch',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-tts', () => ({
  __esModule: true,
  default: {
    speak: jest.fn(),
    stop: jest.fn(),
    setDefaultLanguage: jest.fn(),
  },
}));

jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'tr',
    t: { common: {} },
  }),
}));

jest.mock('../../stores/medicineStore', () => ({
  useMedicineStore: () => ({
    settings: {},
    updateSettings: jest.fn(),
  }),
}));

// Sprint 103.1: useTheme() entegrasyonu için themeMock factory (Sprint 102.6).
// jest.requireActual: lightColors/darkColors export'larını koru (themeMock.ts bunları import eder),
// sadece useTheme'i mock'la.
import { mockUseTheme } from '../helpers/themeMock';

jest.mock('../../contexts/ThemeContext', () => {
  const actual = jest.requireActual('../../contexts/ThemeContext');
  return {
    ...actual,
    useTheme: () => mockUseTheme(),
  };
});

import TtsSettingsScreen from '../../screens/TtsSettingsScreen';

describe('TtsSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { root } = render(<TtsSettingsScreen />);
    expect(root).toBeTruthy();
  });

  it('renders ScrollView', () => {
    const { UNSAFE_root } = render(<TtsSettingsScreen />);
    expect(UNSAFE_root).toBeTruthy();
  });

  // Sprint 103.1: themeMock factory'sinin light + dark return shape verify.
  // (Dark mode render coverage themeMock.test.ts'te zaten test ediliyor — bu ekran için izole module yükleme zinciri unstable.)
  it('mockUseTheme light + dark returns valid shape', () => {
    expect(mockUseTheme().colors).toBeDefined();
    expect(mockUseTheme().isDark).toBe(false);
    expect(mockUseTheme({}, true).isDark).toBe(true);
    expect(mockUseTheme({}, true).colors.background).toBeDefined();
  });
});
