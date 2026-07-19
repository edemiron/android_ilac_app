/**
 * services/types testleri — ServiceResult discriminated union ve
 * error helper'lar.
 */

import {
  ok,
  err,
  toServiceError,
  isOfflineError,
  withServiceResult,
  type ServiceResult,
} from '../../services/types';

describe('ok / err', () => {
  it('ok creates success result with data', () => {
    const result = ok({ id: 'med-1' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.id).toBe('med-1');
  });

  it('err creates failure result with error', () => {
    const result = err('AUTH_REQUIRED', 'login first');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('AUTH_REQUIRED');
      expect(result.error.message).toBe('login first');
      expect(result.error.userMessage).toBe('login first');
    }
  });

  it('err preserves cause for debugging', () => {
    const cause = new Error('underlying');
    const result = err('API_ERROR', 'api down', { cause });
    if (!result.ok) expect(result.error.cause).toBe(cause);
  });

  it('err allows custom userMessage', () => {
    const result = err('AUTH_FAILED', 'technical msg', {
      userMessage: 'Lütfen tekrar giriş yapın',
    });
    if (!result.ok) expect(result.error.userMessage).toBe('Lütfen tekrar giriş yapın');
  });
});

describe('toServiceError', () => {
  it('converts Error instance', () => {
    const result = toServiceError(new Error('boom'));
    expect(result.message).toBe('boom');
    expect(result.code).toBe('UNKNOWN');
  });

  it('converts string error', () => {
    const result = toServiceError('plain fail');
    expect(result.message).toBe('plain fail');
    expect(result.code).toBe('UNKNOWN');
  });

  it('uses fallback code when provided', () => {
    const result = toServiceError(new Error('x'), 'TIMEOUT');
    expect(result.code).toBe('TIMEOUT');
  });

  it('handles unknown types', () => {
    const result = toServiceError({ random: 'object' });
    expect(result.message).toBe('Bilinmeyen hata');
  });

  it('handles null/undefined', () => {
    expect(toServiceError(null).message).toBe('Bilinmeyen hata');
    expect(toServiceError(undefined).message).toBe('Bilinmeyen hata');
  });
});

describe('isOfflineError', () => {
  it('detects "network" in error message', () => {
    expect(isOfflineError(new Error('Network request failed'))).toBe(true);
  });

  it('detects Turkish "bağlantı" in error message', () => {
    expect(isOfflineError(new Error('İnternet bağlantısı yok'))).toBe(true);
  });

  it('detects "connection"', () => {
    expect(isOfflineError(new Error('Connection reset'))).toBe(true);
  });

  it('returns false for non-offline errors', () => {
    expect(isOfflineError(new Error('Permission denied'))).toBe(false);
  });

  it('returns false for non-Error values', () => {
    expect(isOfflineError('string')).toBe(false);
    expect(isOfflineError(null)).toBe(false);
    expect(isOfflineError({})).toBe(false);
  });
});

describe('withServiceResult', () => {
  it('wraps successful async result as ok', async () => {
    const result: ServiceResult<number> = await withServiceResult(async () => 42);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(42);
  });

  it('wraps thrown error as err', async () => {
    const result = await withServiceResult(async () => {
      throw new Error('boom');
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('boom');
      expect(result.error.code).toBe('UNKNOWN');
    }
  });

  it('maps offline errors to NETWORK_OFFLINE', async () => {
    const result = await withServiceResult(async () => {
      throw new Error('Network request failed');
    });
    if (!result.ok) {
      expect(result.error.code).toBe('NETWORK_OFFLINE');
    }
  });

  it('uses custom errorCode when provided and not offline', async () => {
    const result = await withServiceResult(
      async () => {
        throw new Error('Permission denied');
      },
      { errorCode: 'AUTH_REQUIRED' }
    );
    if (!result.ok) {
      expect(result.error.code).toBe('AUTH_REQUIRED');
    }
  });

  it('preserves error as cause', async () => {
    const cause = new Error('underlying');
    const result = await withServiceResult(async () => {
      throw cause;
    });
    if (!result.ok) {
      expect(result.error.cause).toBe(cause);
    }
  });
});
