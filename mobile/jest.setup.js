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

// Mock Firebase Crashlytics
jest.mock('@react-native-firebase/crashlytics', () => {
  const mockInstance = {
    setUserId: jest.fn(() => Promise.resolve()),
    setAttribute: jest.fn(() => Promise.resolve()),
    setAttributes: jest.fn(() => Promise.resolve()),
    recordError: jest.fn(),
    log: jest.fn(),
    crash: jest.fn(),
  };

  return () => mockInstance;
});

// Mock react-native-haptic-feedback
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

const mockTts = {
  speak: jest.fn(),
  stop: jest.fn(),
  setDefaultLanguage: jest.fn(),
  setDefaultRate: jest.fn(),
  setDefaultPitch: jest.fn(),
  voices: jest.fn(() => Promise.resolve([])),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  removeAllListeners: jest.fn(),
};

// Mock react-native-tts
jest.mock('react-native-tts', () => ({
  ...mockTts,
}));

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

// Mock expo-secure-store
jest.mock('expo-secure-store', () => {
  const AsyncStorage =
    require('@react-native-async-storage/async-storage').default ??
    require('@react-native-async-storage/async-storage');

  return {
    getItemAsync: jest.fn(key => AsyncStorage.getItem(key)),
    setItemAsync: jest.fn((key, value) => AsyncStorage.setItem(key, value)),
    deleteItemAsync: jest.fn(key => AsyncStorage.removeItem(key)),
  };
});

jest.mock('expo-file-system', () => ({
  File: class MockFile {
    uri: string;
    type: string;

    constructor(...uris) {
      this.uri = String(uris[0] ?? 'file:///mock-file.jpg');
      this.type = 'image/jpeg';
    }

    async bytes() {
      return new Uint8Array([1, 2, 3, 4]);
    }
  },
  Paths: {
    cache: { uri: 'file:///mock-cache/' },
    document: { uri: 'file:///mock-document/' },
  },
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///mock-document/',
  getInfoAsync: jest.fn(async uri => ({
    exists: true,
    isDirectory: false,
    uri,
  })),
  copyAsync: jest.fn(async () => undefined),
  makeDirectoryAsync: jest.fn(async () => undefined),
  deleteAsync: jest.fn(async () => undefined),
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

// react-native-safe-area-context native module; jsdom ortaminda yuklenmez
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const SafeAreaView = ({ children, ...props }) =>
    React.createElement('View', props, children);
  return {
    SafeAreaView,
    SafeAreaProvider: ({ children }) => children,
    SafeAreaInsetsContext: {
      Consumer: ({ children }) => children({ insets: { top: 0, bottom: 0, left: 0, right: 0 } }),
      Provider: ({ children }) => children,
    },
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

// react-native-screens native bridge (stack navigator tarafindan kullanilir)
jest.mock('react-native-screens', () => {
  const actual = jest.requireActual('react-native-screens');
  return {
    ...actual,
    enableScreens: jest.fn(),
  };
});
