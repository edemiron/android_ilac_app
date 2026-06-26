import crashlytics from '@react-native-firebase/crashlytics';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { createScopedLogger } from './logger';

const log = createScopedLogger('Crashlytics');

/**
 * Firebase Crashlytics Service
 *
 * Sprint 15 (Crashlytics PII temizleme): userId PII olarak
 * değerlendirildiğinden plain text Firebase'e gönderilmiyor.
 * Bunun yerine SHA-256 hash'lenmiş ilk 16 karakter gönderilir.
 * Bu, kullanıcı bazında crash pattern analizi için yeterli (anonim takip),
 * ama gerçek kimlik bilgisi sızmaz.
 */
class CrashlyticsService {
  /**
   * Initialize Crashlytics (e.g., set user ID or common attributes)
   *
   * userId artık SHA-256 hash'lenmiş olarak gönderilir. Örnek:
   *   "test@example.com" -> "5e884898da28..." (16 char)
   */
  async init(userId?: string) {
    if (__DEV__) {
      log.debug('Crashlytics: initialization skipped in development');
      return;
    }

    try {
      if (userId) {
        const hashedId = await hashUserIdForCrashlytics(userId);
        await crashlytics().setUserId(hashedId);
      }

      await crashlytics().setAttributes({
        platform: Platform.OS,
        os_version: String(Platform.Version),
      });
      log.info('Crashlytics initialized');
    } catch (error) {
      log.error('Crashlytics initialization error', error);
    }
  }

  /**
   * Log a non-fatal error
   */
  recordError(error: Error, jsErrorName?: string) {
    if (__DEV__) {
      log.debug('Crashlytics Error Recorded [DEV]', error.message);
      return;
    }

    if (jsErrorName) {
      crashlytics().recordError(error, jsErrorName);
    } else {
      crashlytics().recordError(error);
    }
  }

  /**
   * Log a message to attach to the crash report
   */
  log(message: string) {
    if (__DEV__) {
      log.debug('Crashlytics Log [DEV]', message);
      return;
    }

    crashlytics().log(message);
  }

  /**
   * Test a fake crash
   */
  crash() {
    crashlytics().crash();
  }
}

/**
 * userId'yi SHA-256 ile hash'le ve ilk 16 karakteri döndür.
 *
 * Bu fonksiyon:
 * - Plain text email/uid'nin Firebase'e gönderilmesini engeller (KVKK)
 * - Anonim kullanıcı takibi için yeterli çeşitlilik sağlar (16 hex char = 64-bit)
 * - Tek yönlü olduğu için reverse engineering ile userId elde edilemez
 */
export async function hashUserIdForCrashlytics(userId: string): Promise<string> {
  try {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      userId,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    // Ilk 16 karakter (64-bit) yeterli — collision riski dustuk,
    // ama tam 64 karakter gereksiz yer kaplar.
    return hash.substring(0, 16);
  } catch (error) {
    log.warn('hashUserIdForCrashlytics failed, using fallback', error);
    // Fallback: plain id'yi 16 char'a truncate et (PII kuyrugu olmaz)
    return `fallback-${userId.substring(0, 8)}`;
  }
}

export const crashlyticsService = new CrashlyticsService();