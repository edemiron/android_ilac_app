/**
 * useOnboarding tests — Sprint 60.
 *
 * AsyncStorage persistence, slide state machine, complete/reset.
 */

import React from 'react';
import { Text } from 'react-native';
import { render, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  OnboardingProvider,
  useOnboarding,
  ONBOARDING_STORAGE_KEY,
  TOTAL_SLIDES,
} from '../../hooks/useOnboarding';

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
const mockedRemoveItem = AsyncStorage.removeItem as jest.MockedFunction<
  typeof AsyncStorage.removeItem
>;

interface Captured {
  isLoading: boolean;
  isCompleted: boolean;
  currentSlide: number;
  totalSlides: number;
  next: () => void;
  prev: () => void;
  goTo: (i: 0 | 1 | 2 | 3) => void;
  complete: () => Promise<void>;
  reset: () => Promise<void>;
}

const captureRef: { current: Captured | null } = { current: null };

function Capture() {
  const ctx = useOnboarding();
  captureRef.current = ctx;
  return <Text testID="captured">{String(ctx.currentSlide)}</Text>;
}

describe('useOnboarding', () => {
  beforeEach(() => {
    captureRef.current = null;
    jest.clearAllMocks();
  });

  it('default isCompleted=false, currentSlide=0', async () => {
    mockedGetItem.mockResolvedValueOnce(null);
    render(
      <OnboardingProvider>
        <Capture />
      </OnboardingProvider>
    );
    await waitFor(() => {
      expect(captureRef.current?.isLoading).toBe(false);
    });
    expect(captureRef.current?.isCompleted).toBe(false);
    expect(captureRef.current?.currentSlide).toBe(0);
    expect(captureRef.current?.totalSlides).toBe(TOTAL_SLIDES);
  });

  it('loads completed state from storage', async () => {
    mockedGetItem.mockResolvedValueOnce('true');
    render(
      <OnboardingProvider>
        <Capture />
      </OnboardingProvider>
    );
    await waitFor(() => {
      expect(captureRef.current?.isCompleted).toBe(true);
    });
  });

  it('next() increments currentSlide', async () => {
    mockedGetItem.mockResolvedValueOnce(null);
    render(
      <OnboardingProvider>
        <Capture />
      </OnboardingProvider>
    );
    await waitFor(() => {
      expect(captureRef.current?.isLoading).toBe(false);
    });

    act(() => {
      captureRef.current!.next();
    });
    expect(captureRef.current?.currentSlide).toBe(1);

    act(() => {
      captureRef.current!.next();
    });
    expect(captureRef.current?.currentSlide).toBe(2);
  });

  it('next() does not exceed totalSlides-1', async () => {
    mockedGetItem.mockResolvedValueOnce(null);
    render(
      <OnboardingProvider>
        <Capture />
      </OnboardingProvider>
    );
    await waitFor(() => {
      expect(captureRef.current?.isLoading).toBe(false);
    });

    for (let i = 0; i < 10; i++) {
      act(() => {
        captureRef.current!.next();
      });
    }
    expect(captureRef.current?.currentSlide).toBe(TOTAL_SLIDES - 1);
  });

  it('prev() decrements currentSlide, clamped to 0', async () => {
    mockedGetItem.mockResolvedValueOnce(null);
    render(
      <OnboardingProvider>
        <Capture />
      </OnboardingProvider>
    );
    await waitFor(() => {
      expect(captureRef.current?.isLoading).toBe(false);
    });

    act(() => {
      captureRef.current!.prev();
    });
    expect(captureRef.current?.currentSlide).toBe(0);
  });

  it('goTo() sets currentSlide', async () => {
    mockedGetItem.mockResolvedValueOnce(null);
    render(
      <OnboardingProvider>
        <Capture />
      </OnboardingProvider>
    );
    await waitFor(() => {
      expect(captureRef.current?.isLoading).toBe(false);
    });

    act(() => {
      captureRef.current!.goTo(2);
    });
    expect(captureRef.current?.currentSlide).toBe(2);
  });

  it('complete() persists to AsyncStorage and sets isCompleted', async () => {
    mockedGetItem.mockResolvedValueOnce(null);
    mockedSetItem.mockResolvedValueOnce();
    render(
      <OnboardingProvider>
        <Capture />
      </OnboardingProvider>
    );
    await waitFor(() => {
      expect(captureRef.current?.isLoading).toBe(false);
    });

    await act(async () => {
      await captureRef.current!.complete();
    });

    expect(mockedSetItem).toHaveBeenCalledWith(ONBOARDING_STORAGE_KEY, 'true');
    expect(captureRef.current?.isCompleted).toBe(true);
  });

  it('reset() removes from AsyncStorage and resets state', async () => {
    mockedGetItem.mockResolvedValueOnce('true');
    mockedRemoveItem.mockResolvedValueOnce();
    render(
      <OnboardingProvider>
        <Capture />
      </OnboardingProvider>
    );
    await waitFor(() => {
      expect(captureRef.current?.isCompleted).toBe(true);
    });

    await act(async () => {
      await captureRef.current!.reset();
    });

    expect(mockedRemoveItem).toHaveBeenCalledWith(ONBOARDING_STORAGE_KEY);
    expect(captureRef.current?.isCompleted).toBe(false);
    expect(captureRef.current?.currentSlide).toBe(0);
  });

  it('throws when useOnboarding used without Provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Capture />)).toThrow(
      /useOnboarding must be used within OnboardingProvider/
    );
    consoleError.mockRestore();
  });
});
