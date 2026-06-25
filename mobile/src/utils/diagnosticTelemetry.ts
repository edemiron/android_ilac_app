/**
 * Diagnostic telemetry — local-only event logger.
 *
 * NOT: Bu modül sadece local diagnostic içindir, dış servise gönderim YAPMAZ.
 * İleride Sentry/Firebase Crashlytics'e yönlendirilirse buradan yapılmalıdır.
 * Şu an sadece geliştirici console'una yazıyor (createScopedLogger).
 *
 * Kullanım: recordDiagnosticEvent({ scope, level, message, context })
 */

import { createScopedLogger } from './logger';

const log = createScopedLogger('DiagnosticTelemetry');

export type DiagnosticLevel = 'debug' | 'info' | 'warn' | 'error';

export interface DiagnosticEvent {
  scope: string;
  level: DiagnosticLevel;
  message: string;
  context?: Record<string, unknown>;
}

export function recordDiagnosticEvent(event: DiagnosticEvent): void {
  // Telemetry sadece local console'a yazıyor. Side effect-free (void dönüyor)
  // çağıran yerler `void recordDiagnosticEvent(...)` ile awaitable olmadan kullanır.
  const payload = {
    scope: event.scope,
    message: event.message,
    context: event.context,
  };

  switch (event.level) {
    case 'debug':
      log.debug(event.message, payload);
      break;
    case 'info':
      log.info(event.message, payload);
      break;
    case 'warn':
      log.warn(event.message, payload);
      break;
    case 'error':
      log.error(event.message, payload);
      break;
  }
}
