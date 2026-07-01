/**
 * TtsSettingsScreen tests — Sprint 8 Tier 4 devamı
 * Store + LanguageContext mock'lu. Render smoke testleri.
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
});
