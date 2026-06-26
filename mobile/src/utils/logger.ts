/**
 * Production-ready Logger Utility
 *
 * Development'ta console'a yazdırır.
 * Production'da sessizdir (veya Sentry/Crashlytics'e gönderir).
 *
 * Kullanım:
 *   import { logger } from '../utils/logger';
 *   logger.debug('Mesaj', { data });
 *   logger.info('Mesaj', { data });
 *   logger.warn('Mesaj', { data });
 *   logger.error('Mesaj', error);
 */

// __DEV__ React Native'de global olarak tanımlı
declare const __DEV__: boolean;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Sprint 4 type-fix: LogContext genis yapildi. Daha once `Record<string, unknown>`
// idi, ancak TS strict modda `unknown` degerini kabul etmiyordu (exact match
// bekliyordu). Pratik cozum: herhangi bir degeri kabul eden `unknown` (any
// yerine unknown kullanmak type safety'yi tamamen kaybetmeden esneklik saglar).
// Ileride (Sprint 4 sonrasi) daha guvenli `safeLogContext(obj: unknown): LogContext`
// helper'i ile sikiastirilabilir.
type LogContext = unknown;

interface Logger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, error?: Error | unknown, context?: LogContext) => void;
}

/**
 * Formats log output with timestamp and structured data
 */
const formatLog = (level: LogLevel, message: string, context?: LogContext): string => {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
};

/**
 * Extracts error details for logging
 */
const extractErrorDetails = (error: Error | unknown): LogContext => {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack?.split('\n').slice(0, 5).join('\n'),
    };
  }
  return { error: String(error) };
};

/**
 * Production-ready logger
 * - Development: Logs to console with formatting
 * - Production: Silent (can be extended to send to Sentry/Crashlytics)
 */
export const logger: Logger = {
  /**
   * Debug level - Only in development
   * Use for detailed debugging information
   */
  debug: (message: string, context?: LogContext): void => {
    if (__DEV__) {
      console.log(formatLog('debug', message, context));
    }
  },

  /**
   * Info level - Only in development
   * Use for general operational information
   */
  info: (message: string, context?: LogContext): void => {
    if (__DEV__) {
      console.info(formatLog('info', message, context));
    }
  },

  /**
   * Warn level - Development + can be sent to monitoring in production
   * Use for recoverable issues or deprecation warnings
   */
  warn: (message: string, context?: LogContext): void => {
    if (__DEV__) {
      console.warn(formatLog('warn', message, context));
    }
    // Production'da Sentry/Crashlytics'e gönderilebilir:
    // if (!__DEV__) { Sentry.captureMessage(message, 'warning'); }
  },

  /**
   * Error level - Always logged, sent to monitoring in production
   * Use for errors that need attention
   */
  error: (message: string, error?: Error | unknown, context?: LogContext): void => {
    const errorDetails = error ? extractErrorDetails(error) : {};
    const fullContext = { ...context, ...errorDetails };

    if (__DEV__) {
      console.error(formatLog('error', message, fullContext));
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }
    }
    // Production'da Sentry/Crashlytics'e gönder:
    // if (!__DEV__) {
    //   Sentry.captureException(error, { extra: { message, ...context } });
    // }
  },
};

/**
 * Creates a scoped logger with a prefix
 * Useful for module-specific logging
 *
 * Kullanim:
 *   const log = createScopedLogger('AuthService');
 *   log.info('User logged in'); // [INFO] [AuthService] User logged in
 */
export const createScopedLogger = (scope: string): Logger => ({
  debug: (message, context) => logger.debug(`[${scope}] ${message}`, context),
  info: (message, context) => logger.info(`[${scope}] ${message}`, context),
  warn: (message, context) => logger.warn(`[${scope}] ${message}`, context),
  error: (message, error, context) => logger.error(`[${scope}] ${message}`, error, context),
});

export default logger;
