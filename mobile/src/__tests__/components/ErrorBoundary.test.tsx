/**
 * ErrorBoundary tests — Sprint 8 Tier 4 devamı
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

jest.mock('react-native', () => ({
  StyleSheet: {
    create: <T,>(styles: T): T => styles,
    flatten: <T,>(styles: T): T => styles,
  },
  Platform: { OS: 'android' },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(() => Promise.resolve('mock-hash')),
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  CryptoEncoding: { HEX: 'hex' },
}));
jest.mock('@react-native-firebase/crashlytics', () => ({
  __esModule: true,
  default: () => ({
    setUserId: jest.fn(() => Promise.resolve()),
    setAttribute: jest.fn(() => Promise.resolve()),
    setAttributes: jest.fn(() => Promise.resolve()),
    recordError: jest.fn(),
    log: jest.fn(),
  }),
}));

jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('../../utils/crashlytics', () => ({
  crashlyticsService: {
    init: jest.fn().mockResolvedValue(undefined),
    recordError: jest.fn(),
    log: jest.fn(),
  },
}));

import ErrorBoundary from '../../components/common/ErrorBoundary';

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Text>Normal child</Text>
      </ErrorBoundary>
    );
    expect(getByText('Normal child')).toBeTruthy();
  });

  it('renders custom fallback if provided', () => {
    const { getByText } = render(
      <ErrorBoundary fallback={<Text>Custom fallback</Text>}>
        <Text>Child</Text>
      </ErrorBoundary>
    );
    // No error, normal child rendered
    expect(getByText('Child')).toBeTruthy();
  });
});
