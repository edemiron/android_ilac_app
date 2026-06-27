module.exports = {
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@notifee/react-native|uuid)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: ['**/__tests__/**/*.(ts|tsx|js)', '**/*.(test|spec).(ts|tsx|js)'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/src/__tests__/helpers/',
    // Sprint 1: medicineStoreSelectors test'i mock zinciri sorunu var
    // (Platform.OS, expo-constants, expo-modules-core). Sprint 4 sonu
    // (slice composability) mock zinciri duzeltildikten sonra eklenir.
    '<rootDir>/src/__tests__/stores/medicineStoreSelectors.test.ts',
  ],
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      // Mevcut olcum (2026-06 Sprint 7 sonu): ~18% lines, ~9% branches, ~17% functions, ~18% statements.
      // Coverage dustuk cunku useShallow + zustand store helper fonksiyonlari
      // coverage'a dahil edilmiyor (mock'lanmamis davranis).
      // Threshold mevcut coverage'nin biraz altinda — CI yanlislikla kirmasin.
      // Hedef: Sprint 7+ ile %50+ line coverage (useAddMedicine, useBarcodeScanner
      // hook testleri, ekran testleri).
      branches: 8,
      functions: 16,
      lines: 17,
      statements: 17,
    },
  },
};
