/**
 * usePermissionsGate tests — Sprint 7
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePermissionsGate } from '../../hooks/usePermissionsGate';

describe('usePermissionsGate', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('starts with null (loading state)', () => {
    const { result } = renderHook(() => usePermissionsGate());
    expect(result.current.showPermissions).toBeNull();
  });

  it('shows permissions when AsyncStorage has no flag (first launch)', async () => {
    const { result } = renderHook(() => usePermissionsGate());

    // wait for effect
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.showPermissions).toBe(true);
  });

  it('hides permissions when AsyncStorage flag is true (already shown)', async () => {
    await AsyncStorage.setItem('@permissions_shown', 'true');
    const { result } = renderHook(() => usePermissionsGate());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.showPermissions).toBe(false);
  });

  it('handlePermissionsComplete sets flag to true and hides screen', async () => {
    const { result } = renderHook(() => usePermissionsGate());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.showPermissions).toBe(true);

    await act(async () => {
      await result.current.handlePermissionsComplete();
    });

    expect(result.current.showPermissions).toBe(false);

    // Verify AsyncStorage was set
    const stored = await AsyncStorage.getItem('@permissions_shown');
    expect(stored).toBe('true');
  });

  it('shows permissions when AsyncStorage flag is something other than "true"', async () => {
    await AsyncStorage.setItem('@permissions_shown', 'false');
    const { result } = renderHook(() => usePermissionsGate());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.showPermissions).toBe(true);
  });
});
