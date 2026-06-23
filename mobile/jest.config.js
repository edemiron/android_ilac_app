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
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/src/__tests__/helpers/'],
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      // Mevcut olcum (2026-06): ~44% lines, ~32% branches, ~42% functions, ~44% statements
      // Threshold, mevcut coverage'nin biraz altinda tutulur ki yeni testler eklenirken
      // CI yanlislikla kirmaya baslamasin. Asil hedef: her sprint'te bu esikleri
      // kademeli olarak artirmak (sonraki sprint hedefi: lines 55, branches 45).
      branches: 28,
      functions: 38,
      lines: 40,
      statements: 40,
    },
  },
};
