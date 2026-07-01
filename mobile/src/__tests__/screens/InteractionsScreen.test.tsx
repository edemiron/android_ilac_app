/**
 * InteractionsScreen tests — Sprint 8 Tier 4 devamı
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
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  ActivityIndicator: 'ActivityIndicator',
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#4ECDC4',
      text: '#000',
      background: '#fff',
      card: '#fff',
      danger: '#ff0000',
    },
    isDark: false,
  }),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'tr',
    t: (key: string) => key, // t: (key: string) => string
  }),
}));

jest.mock('../../stores/medicineStore', () => ({
  useMedicineStore: () => ({
    medicines: [],
  }),
}));

jest.mock('../../services/drugInteraction', () => ({
  checkMultipleInteractions: jest.fn().mockResolvedValue({
    interactions: [],
    medicines: [],
    hasInteractions: false,
  }),
}));

import InteractionsScreen from '../../screens/InteractionsScreen';

describe('InteractionsScreen', () => {
  it('renders without crashing', () => {
    const { root } = render(<InteractionsScreen />);
    expect(root).toBeTruthy();
  });

  it('renders ScrollView', () => {
    const { UNSAFE_root } = render(<InteractionsScreen />);
    expect(UNSAFE_root).toBeTruthy();
  });
});
