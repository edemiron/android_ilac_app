/**
 * useLowStockDismiss tests — Sprint 65A.
 *
 * AsyncStorage persistence, 24h TTL, hash auto-invalidation, reset.
 */

import React from 'react';
import { Text } from 'react-native';
import { render, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LowStockDismissProvider,
  useLowStockDismiss,
  LOW_STOCK_DISMISS_KEY,
  LOW_STOCK_DISMISS_TTL_MS,
  computeLowStockHash,
} from '../../hooks/useLowStockDismiss';

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

const mockedGetItem = AsyncStorage.getItem as any;
const mockedSetItem = AsyncStorage.setItem as any;
const mockedRemoveItem = AsyncStorage.removeItem as any;

interface Captured {
  isLoading: boolean;
  isDismissed: boolean;
  dismissedAt: string | null;
  checkDismissed: (h: string) => boolean;
  dismiss: (h: string) => Promise<void>;
  reset: () => Promise<void>;
}

const captureRef: any = { current: null };

function Capture() {
  const ctx = useLowStockDismiss();
  captureRef.current = ctx;
  return <Text testID="captured">{String(ctx.isDismissed)}</Text>;
}

describe('useLowStockDismiss', () => {
  beforeEach(() => {
    captureRef.current = null;
    jest.clearAllMocks();
  });

  describe('computeLowStockHash', () => {
    it('returns empty string for empty array', () => {
      expect(computeLowStockHash([])).toBe('');
    });

    it('produces stable hash regardless of order', () => {
      const a = computeLowStockHash([{ id: 'm1', stockCount: 5 }, { id: 'm2', stockCount: 3 }]);
      const b = computeLowStockHash([{ id: 'm2', stockCount: 3 }, { id: 'm1', stockCount: 5 }]);
      expect(a).toBe(b);
    });

    it('hash changes when stockCount changes', () => {
      const a = computeLowStockHash([{ id: 'm1', stockCount: 5 }]);
      const b = computeLowStockHash([{ id: 'm1', stockCount: 4 }]);
      expect(a).not.toBe(b);
    });

    it('treats undefined stockCount as 0', () => {
      const a = computeLowStockHash([{ id: 'm1' }]);
      const b = computeLowStockHash([{ id: 'm1', stockCount: 0 }]);
      expect(a).toBe(b);
    });
  });

  describe('Provider default state', () => {
    it('isDismissed=false, dismissedAt=null when storage empty', async () => {
      mockedGetItem.mockResolvedValueOnce(null);
      render(
        <LowStockDismissProvider>
          <Capture />
        </LowStockDismissProvider>
      );
      await waitFor(() => {
        expect(captureRef.current?.isLoading).toBe(false);
      });
      expect(captureRef.current?.isDismissed).toBe(false);
      expect(captureRef.current?.dismissedAt).toBeNull();
    });

    it('loads saved state from storage', async () => {
      const savedState = {
        dismissedAt: new Date().toISOString(),
        medicinesHash: 'm1:5|m2:3',
      };
      mockedGetItem.mockResolvedValueOnce(JSON.stringify(savedState));
      render(
        <LowStockDismissProvider>
          <Capture />
        </LowStockDismissProvider>
      );
      await waitFor(() => {
        expect(captureRef.current?.isLoading).toBe(false);
      });
      expect(captureRef.current?.isDismissed).toBe(true);
    });
  });

  describe('dismiss()', () => {
    it('persists state to AsyncStorage and sets dismissedAt', async () => {
      mockedGetItem.mockResolvedValueOnce(null);
      mockedSetItem.mockResolvedValueOnce();
      render(
        <LowStockDismissProvider>
          <Capture />
        </LowStockDismissProvider>
      );
      await waitFor(() => {
        expect(captureRef.current?.isLoading).toBe(false);
      });

      await act(async () => {
        await captureRef.current!.dismiss('m1:5');
      });

      expect(mockedSetItem).toHaveBeenCalledWith(
        LOW_STOCK_DISMISS_KEY,
        expect.stringContaining('"medicinesHash":"m1:5"')
      );
      expect(captureRef.current?.dismissedAt).not.toBeNull();
    });
  });

  describe('reset()', () => {
    it('removes state from AsyncStorage and clears dismissedAt', async () => {
      const savedState = {
        dismissedAt: new Date().toISOString(),
        medicinesHash: 'm1:5',
      };
      mockedGetItem.mockResolvedValueOnce(JSON.stringify(savedState));
      mockedRemoveItem.mockResolvedValueOnce();
      render(
        <LowStockDismissProvider>
          <Capture />
        </LowStockDismissProvider>
      );
      await waitFor(() => {
        expect(captureRef.current?.isDismissed).toBe(true);
      });

      await act(async () => {
        await captureRef.current!.reset();
      });

      expect(mockedRemoveItem).toHaveBeenCalledWith(LOW_STOCK_DISMISS_KEY);
      expect(captureRef.current?.dismissedAt).toBeNull();
    });
  });

  describe('checkDismissed() with TTL + hash', () => {
    it('returns true if hash matches and within TTL', async () => {
      const savedState = {
        dismissedAt: new Date().toISOString(),
        medicinesHash: 'm1:5',
      };
      mockedGetItem.mockResolvedValueOnce(JSON.stringify(savedState));
      render(
        <LowStockDismissProvider>
          <Capture />
        </LowStockDismissProvider>
      );
      await waitFor(() => {
        expect(captureRef.current?.isLoading).toBe(false);
      });

      expect(captureRef.current!.checkDismissed('m1:5')).toBe(true);
    });

    it('returns false if hash differs (stock changed)', async () => {
      const savedState = {
        dismissedAt: new Date().toISOString(),
        medicinesHash: 'm1:5',
      };
      mockedGetItem.mockResolvedValueOnce(JSON.stringify(savedState));
      render(
        <LowStockDismissProvider>
          <Capture />
        </LowStockDismissProvider>
      );
      await waitFor(() => {
        expect(captureRef.current?.isLoading).toBe(false);
      });

      expect(captureRef.current!.checkDismissed('m1:4')).toBe(false);
    });

    it('returns false if older than 24h TTL', async () => {
      const expiredAt = new Date(Date.now() - LOW_STOCK_DISMISS_TTL_MS - 1000).toISOString();
      const savedState = {
        dismissedAt: expiredAt,
        medicinesHash: 'm1:5',
      };
      mockedGetItem.mockResolvedValueOnce(JSON.stringify(savedState));
      render(
        <LowStockDismissProvider>
          <Capture />
        </LowStockDismissProvider>
      );
      await waitFor(() => {
        expect(captureRef.current?.isLoading).toBe(false);
      });

      // checkDismissed: hash match ama TTL geçmiş → false
      expect(captureRef.current!.checkDismissed('m1:5')).toBe(false);
      // Provider isDismissed: false (auto-expired)
      expect(captureRef.current?.isDismissed).toBe(false);
    });
  });

  it('throws when useLowStockDismiss used without Provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Capture />)).toThrow(
      /useLowStockDismiss must be used within LowStockDismissProvider/
    );
    consoleError.mockRestore();
  });
});
