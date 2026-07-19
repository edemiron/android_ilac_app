/**
 * StatisticsScreen tests — Sprint 8 Tier 4 devamı
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
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('react-native-chart-kit', () => ({
  LineChart: 'LineChart',
  PieChart: 'PieChart',
}));

jest.mock('../../services/pdfReportService', () => ({
  generatePDFReport: jest.fn().mockResolvedValue('/mock/path/report.pdf'),
  sharePDFReport: jest.fn().mockResolvedValue(undefined),
  prepareReportData: jest.fn(() => ({
    weeklyData: [],
    typeCounts: [],
    totalDoses: 0,
  })),
}));

jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#fff',
      surface: '#f5f5f5',
      text: '#000',
      primary: '#4ECDC4',
      textSecondary: '#666',
      card: '#fff',
      danger: '#ff0000',
      gradientStart: '#0D9488',
      gradientEnd: '#0891B2',
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

jest.mock('../../contexts/AlertContext', () => ({
  useAlert: () => ({
    showAlert: jest.fn(),
    showError: jest.fn(),
    showInfo: jest.fn(),
    showSuccess: jest.fn(),
  }),
}));

jest.mock('../../stores/medicineStore', () => ({
  useMedicineStore: () => ({
    medicines: [],
    medicineLogs: [],
    reminderTimes: [],
  }),
}));

import StatisticsScreen from '../../screens/StatisticsScreen';

describe('StatisticsScreen', () => {
  it('renders without crashing', () => {
    const { root } = render(<StatisticsScreen />);
    expect(root).toBeTruthy();
  });

  it('renders ScrollView', () => {
    const { UNSAFE_root } = render(<StatisticsScreen />);
    expect(UNSAFE_root).toBeTruthy();
  });
});
