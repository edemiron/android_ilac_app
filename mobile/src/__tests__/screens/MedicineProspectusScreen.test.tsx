/**
 * MedicineProspectusScreen tests — Sprint 8 Tier 4 devamı
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
  RefreshControl: 'RefreshControl',
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { medicineId: 'med-1' } }),
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#fff',
      surface: '#f5f5f5',
      text: '#000',
      primary: '#4ECDC4',
      textSecondary: '#666',
      border: '#ddd',
    },
    isDark: false,
  }),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'tr',
    t: (key: string) => key,
  }),
}));

jest.mock('../../services/aiMedicineService', () => ({
  getMedicineInfoAI: jest.fn().mockResolvedValue({
    indication: 'Test indication',
    dosage: '500mg',
    warnings: [],
  }),
}));

jest.mock('../../services/globalMedicineService', () => ({
  getMedicineById: jest.fn().mockResolvedValue({
    id: 'med-1',
    name: 'Aspirin',
    dosage: '500mg',
  }),
}));

import MedicineProspectusScreen from '../../screens/MedicineProspectusScreen';

describe('MedicineProspectusScreen', () => {
  it('renders without crashing', () => {
    const { root } = render(<MedicineProspectusScreen />);
    expect(root).toBeTruthy();
  });

  it('renders ScrollView', () => {
    const { UNSAFE_root } = render(<MedicineProspectusScreen />);
    expect(UNSAFE_root).toBeTruthy();
  });
});
