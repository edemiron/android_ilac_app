/**
 * Services — ortak error ve result tipleri.
 *
 * Sprint 4.3: services/ standart error handling.
 * Tum Service fonksiyonlari ServiceResult<T> donebilir — success/error
 * discriminated union. Caller'lar tur guvenli erisim saglar.
 */

export type ServiceErrorCode =
  | 'NETWORK_OFFLINE'
  | 'AUTH_REQUIRED'
  | 'AUTH_FAILED'
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'RATE_LIMIT'
  | 'API_ERROR'
  | 'PARSE_ERROR'
  | 'STORAGE_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface ServiceError {
  code: ServiceErrorCode;
  message: string;
  /** Orijinal hata objesi (debug icin). */
  cause?: unknown;
  /** Kullaniciya gosterilebilecek lokalize mesaj. */
  userMessage?: string;
}

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: ServiceError };

/**
 * Convenience — service basarili donusu.
 */
export function ok<T>(data: T): ServiceResult<T> {
  return { ok: true, data };
}

/**
 * Convenience — service hata donusu.
 */
export function err<T = never>(
  code: ServiceErrorCode,
  message: string,
  options: { cause?: unknown; userMessage?: string } = {}
): ServiceResult<T> {
  return {
    ok: false,
    error: { code, message, cause: options.cause, userMessage: options.userMessage ?? message },
  };
}

/**
 * Bilinmeyen bir hatayi ServiceError'a normalize et.
 * Error instance'i ise .message kullanilir, aksi halde string'e cevrilir.
 */
export function toServiceError(
  error: unknown,
  fallbackCode: ServiceErrorCode = 'UNKNOWN'
): ServiceError {
  if (error instanceof Error) {
    return {
      code: fallbackCode,
      message: error.message,
      cause: error,
    };
  }
  if (typeof error === 'string') {
    return { code: fallbackCode, message: error };
  }
  return { code: fallbackCode, message: 'Bilinmeyen hata' };
}

/**
 * Offline/network hatasini tespit et.
 */
export function isOfflineError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('offline') ||
    msg.includes('internet') ||
    msg.includes('bağlantı') ||
    msg.includes('connection')
  );
}

/**
 * Async wrapper — herhangi bir fonksiyonu ServiceResult<T> donusune cevir.
 * Hata olursa toServiceError ile normalize eder.
 *
 * Ornek:
 *   const fetchUser = withServiceResult(async (id: string) => {
 *     const r = await fetch(`/users/${id}`);
 *     return r.json();
 *   });
 *
 *   const result = await fetchUser('med-1');
 *   if (result.ok) console.log(result.data);
 */
export async function withServiceResult<T>(
  fn: () => Promise<T>,
  options: { errorCode?: ServiceErrorCode } = {}
): Promise<ServiceResult<T>> {
  try {
    const data = await fn();
    return ok(data);
  } catch (error) {
    const fallbackCode = isOfflineError(error)
      ? 'NETWORK_OFFLINE'
      : (options.errorCode ?? 'UNKNOWN');
    return err<T>(fallbackCode, error instanceof Error ? error.message : 'Bilinmeyen hata', {
      cause: error,
    });
  }
}
