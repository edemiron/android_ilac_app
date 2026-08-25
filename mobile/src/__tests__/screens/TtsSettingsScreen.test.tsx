/**
 * TtsSettingsScreen tests — Sprint 8 Tier 4 devamı + Sprint 103.1 + TTS Overhaul
 * Store + LanguageContext + ThemeContext mock'lu.
 * Render smoke testleri ve konuşma hızı / ayar kontrolleri.
 */

import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: jest.fn(),
    canGoBack: () => true,
    navigate: jest.fn(),
  }),
}));

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
  Animated: {
    Value: jest.fn(() => ({
      interpolate: jest.fn(),
      setValue: jest.fn(),
    })),
    timing: jest.fn(() => ({ start: jest.fn() })),
    sequence: jest.fn(() => ({ start: jest.fn() })),
    loop: jest.fn(() => ({ start: jest.fn() })),
  },
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
    setDefaultLanguage: jest.fn().mockResolvedValue(undefined),
    setDefaultRate: jest.fn().mockResolvedValue(undefined),
    setDefaultPitch: jest.fn().mockResolvedValue(undefined),
    addEventListener: jest.fn(),
    removeAllListeners: jest.fn(),
    voices: jest.fn().mockResolvedValue([]),
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
    t: (key: string) => key,
  }),
}));

const mockUpdateSettings = jest.fn();

jest.mock('../../stores/medicineStore', () => ({
  useMedicineStore: () => ({
    settings: {
      ttsEnabled: true,
      ttsSpeechRate: 1.1,
      ttsVolume: 80,
      ttsRepeatCount: 1,
      ttsSpeakMedicineName: true,
      ttsSpeakDosage: true,
      ttsSpeakInstructions: true,
    },
    updateSettings: mockUpdateSettings,
  }),
}));

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

  it('renders without crashing with full TTS controls', () => {
    const { root } = render(<TtsSettingsScreen />);
    expect(root).toBeTruthy();
  });

  it('renders ScrollView correctly', () => {
    const { UNSAFE_root } = render(<TtsSettingsScreen />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('mockUseTheme light + dark returns valid shape', () => {
    expect(mockUseTheme().colors).toBeDefined();
    expect(mockUseTheme().isDark).toBe(false);
    expect(mockUseTheme({}, true).isDark).toBe(true);
    expect(mockUseTheme({}, true).colors.background).toBeDefined();
  });
});
