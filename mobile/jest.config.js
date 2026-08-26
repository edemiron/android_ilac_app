module.exports = {
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest',
  },
  // ts-jest aktif: yeni test dosyalari icin `/** @jest-environment node */`
  // veya `ts-jest` config ekleyebiliriz. Babel-jest uyumsuzluk devam ederken
  // alternatif yaklasim: explicit type declaration ile test yaz (Sprint 43'te
  // kullandigimiz pattern).
  // Sprint 44.1: ts-jest eklendi (package.json), babel-jest fallback korundu.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@notifee/react-native|uuid|moti|react-native-reanimated|react-native-worklets|react-native-gesture-handler)',
  ],
  // Sprint 87A: react-native-svg ve svg-bagli component'leri stub'la — Babel'in
  // parse edemedigi node_modules'u test ortaminda bypass et.
  // Sprint 103.2: .woff2 font binary'leri Babel parser'da syntax error verir → stub'a map et.
  moduleNameMapper: {
    '^react-native-svg$': '<rootDir>/__mocks__/react-native-svg.js',
    '\\.woff2$': '<rootDir>/__mocks__/fileMock.js',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx|js)',
    '**/__tests__/**/*.spec.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/src/__tests__/helpers/',
    '<rootDir>/src/__tests__/mocks/',
  ],
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      // Sprint 8 Tier 4 devamı sonu (2026-07): %28.8 coverage. Threshold = current -3.
      // Sprint 8 son final: lines 60, branches 50, functions 55, statements 60 (hedef).
      branches: 16,
      functions: 27,
      lines: 28,
      statements: 28,
    },
  },
};
