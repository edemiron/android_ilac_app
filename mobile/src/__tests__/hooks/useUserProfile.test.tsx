/**
 * useUserProfile tests — Sprint 58 + 77.
 *
 * Provider, default fallback, setLayout persistence, error guard ve
 * Layout C → A migration testleri.
 */

import React from 'react';
import { Text } from 'react-native';
import { render, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfileProvider, useUserProfile, LayoutVariant } from '../../hooks/useUserProfile';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const mockedGetItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
const mockedSetItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;

interface CapturedProfile {
  profile: ReturnType<typeof useUserProfile>['profile'];
  isLoading: boolean;
  setLayout: ReturnType<typeof useUserProfile>['setLayout'];
}

const captureRef: { current: CapturedProfile | null } = { current: null };

function CaptureComponent() {
  const ctx = useUserProfile();
  captureRef.current = ctx;
  return <Text testID="captured">{ctx.profile.layout}</Text>;
}

describe('useUserProfile', () => {
  beforeEach(() => {
    captureRef.current = null;
    jest.clearAllMocks();
  });

  it('default profile (A) when storage empty', async () => {
    mockedGetItem.mockResolvedValueOnce(null);
    mockedSetItem.mockResolvedValueOnce();

    render(
      <UserProfileProvider>
        <CaptureComponent />
      </UserProfileProvider>
    );

    await waitFor(() => {
      expect(captureRef.current?.isLoading).toBe(false);
    });

    expect(captureRef.current?.profile.layout).toBe('A');
    expect(captureRef.current?.profile.updatedAt).toBeTruthy();
  });

  it('loads saved profile B from storage', async () => {
    const savedProfile = JSON.stringify({ layout: 'B', updatedAt: '2026-07-11T10:00:00.000Z' });
    mockedGetItem.mockResolvedValueOnce(savedProfile);

    render(
      <UserProfileProvider>
        <CaptureComponent />
      </UserProfileProvider>
    );

    await waitFor(() => {
      expect(captureRef.current?.profile.layout).toBe('B');
    });
    expect(captureRef.current?.isLoading).toBe(false);
  });

  it('setLayout persists to AsyncStorage and updates state', async () => {
    mockedGetItem.mockResolvedValueOnce(null);
    mockedSetItem.mockResolvedValueOnce();

    render(
      <UserProfileProvider>
        <CaptureComponent />
      </UserProfileProvider>
    );

    await waitFor(() => {
      expect(captureRef.current?.isLoading).toBe(false);
    });

    await act(async () => {
      await captureRef.current!.setLayout('B');
    });

    expect(mockedSetItem).toHaveBeenCalledWith(
      '@app_user_profile',
      expect.stringContaining('"layout":"B"')
    );
    expect(captureRef.current?.profile.layout).toBe('B');
  });

  it('falls back to default when JSON parse fails', async () => {
    mockedGetItem.mockResolvedValueOnce('invalid json {');

    render(
      <UserProfileProvider>
        <CaptureComponent />
      </UserProfileProvider>
    );

    await waitFor(() => {
      expect(captureRef.current?.isLoading).toBe(false);
    });

    expect(captureRef.current?.profile.layout).toBe('A');
  });

  it('throws error when useUserProfile used without Provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<CaptureComponent />)).toThrow(
      /useUserProfile must be used within UserProfileProvider/
    );
    consoleError.mockRestore();
  });

  it('LayoutVariant type exports A and B values', () => {
    const a: LayoutVariant = 'A';
    const b: LayoutVariant = 'B';
    expect(a).toBe('A');
    expect(b).toBe('B');
  });

  it('Sprint 77: legacy layout C migrates to A', async () => {
    const legacyProfile = JSON.stringify({
      layout: 'C',
      accentColor: 'sunset',
      hapticsEnabled: false,
      version: 3,
      updatedAt: '2026-06-01T08:00:00.000Z',
    });
    mockedGetItem.mockResolvedValueOnce(legacyProfile);

    render(
      <UserProfileProvider>
        <CaptureComponent />
      </UserProfileProvider>
    );

    await waitFor(() => {
      expect(captureRef.current?.isLoading).toBe(false);
    });

    // 'C' → 'A' migration (sade)
    expect(captureRef.current?.profile.layout).toBe('A');
    // diğer alanlar korunmalı
    expect(captureRef.current?.profile.accentColor).toBe('sunset');
    expect(captureRef.current?.profile.hapticsEnabled).toBe(false);
  });
});
