// Define __DEV__ for React Native
global.__DEV__ = true;

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Notifee
jest.mock('@notifee/react-native', () => ({
  createChannel: jest.fn(),
  displayNotification: jest.fn(),
  cancelNotification: jest.fn(),
  cancelAllNotifications: jest.fn(),
  createTriggerNotification: jest.fn(),
  getTriggerNotificationIds: jest.fn(() => Promise.resolve([])),
  AndroidImportance: {
    HIGH: 4,
    DEFAULT: 3,
  },
  AndroidVisibility: {
    PUBLIC: 1,
  },
  TriggerType: {
    TIMESTAMP: 0,
  },
  AlarmType: {
    SET_ALARM_CLOCK: 0,
  },
}));

// Mock react-native-haptic-feedback
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

// Mock react-native-tts
jest.mock('react-native-tts', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  setDefaultLanguage: jest.fn(),
  setDefaultRate: jest.fn(),
  setDefaultPitch: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock react-native-html-to-pdf
jest.mock('react-native-html-to-pdf', () => ({
  generatePDF: jest.fn(() => Promise.resolve({ filePath: '/mock/path/report.pdf' })),
}));

// Mock react-native-share
jest.mock('react-native-share', () => ({
  open: jest.fn(() => Promise.resolve()),
}));

// Mock expo-local-authentication
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([1])),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(() => Promise.resolve('mock-hash')),
  getRandomBytesAsync: jest.fn(() => Promise.resolve(new Uint8Array([1, 2, 3, 4]))),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA256',
    SHA512: 'SHA512',
  },
  CryptoEncoding: {
    HEX: 'hex',
    BASE64: 'base64',
  },
}));

// Silence console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
