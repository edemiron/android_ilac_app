/**
 * useSecurityGate tests — Sprint 7
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, user: null, isLoading: false }),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'tr', t: (k: string) => k }),
}));

jest.mock('../../utils/security', () => ({
  getSecuritySettings: jest.fn().mockResolvedValue(null),
  authenticateWithBiometrics: jest.fn().mockResolvedValue({ success: false }),
  verifyPin: jest.fn().mockResolvedValue({ success: false, error: 'Yanlış PIN' }),
  updateLastActiveTime: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

import { renderHook, act } from '@testing-library/react-native';
import { useSecurityGate } from '../../hooks/useSecurityGate';

describe('useSecurityGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sets securityCheckComplete=true when no security enabled', async () => {
    const { result } = renderHook(() => useSecurityGate());
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.securityCheckComplete).toBe(true);
  });

  it('starts with empty PIN and not showing entry', () => {
    const { result } = renderHook(() => useSecurityGate());
    expect(result.current.pinInput).toBe('');
    expect(result.current.showPinEntry).toBe(false);
  });

  it('updates pinInput via setter', () => {
    const { result } = renderHook(() => useSecurityGate());
    act(() => {
      result.current.setPinInput('1234');
    });
    expect(result.current.pinInput).toBe('1234');
  });

  it('handlePinCancel clears pin and hides entry', () => {
    const { result } = renderHook(() => useSecurityGate());
    act(() => {
      result.current.setPinInput('1234');
    });

    act(() => {
      result.current.handlePinCancel();
    });

    expect(result.current.pinInput).toBe('');
    expect(result.current.showPinEntry).toBe(false);
  });
});
