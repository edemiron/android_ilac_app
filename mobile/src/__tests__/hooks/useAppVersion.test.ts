/**
 * useAppVersion tests — Sprint 7
 */

jest.mock('react-native', () => ({
  Platform: { OS: 'android', Version: 33 },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { nativeAppVersion: null, nativeBuildVersion: null },
}));

jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { renderHook } from '@testing-library/react-native';
import { useAppVersion, getAppVersion, getVersionCode } from '../../hooks/useAppVersion';

describe('useAppVersion', () => {
  it('returns version config synchronously', () => {
    const { result } = renderHook(() => useAppVersion());
    expect(result.current.versionName).toBeDefined();
    expect(result.current.fullVersion).toContain(result.current.versionName);
  });

  it('does not crash with async native fetch on Android', () => {
    const { result } = renderHook(() => useAppVersion());
    expect(result.current).toBeDefined();
  });
});

describe('getAppVersion', () => {
  it('returns string version', () => {
    expect(typeof getAppVersion()).toBe('string');
  });
});

describe('getVersionCode', () => {
  it('returns numeric version code', () => {
    expect(typeof getVersionCode()).toBe('number');
  });
});
