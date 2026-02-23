import crashlytics from '@react-native-firebase/crashlytics';
import { Platform } from 'react-native';

/**
 * Firebase Crashlytics Service
 */
class CrashlyticsService {
  /**
   * Initialize Crashlytics (e.g., set user ID or common attributes)
   */
  async init(userId?: string) {
    if (__DEV__) {
      console.log('Crashlytics: initialization skipped in development');
      return;
    }
    
    try {
      if (userId) {
        await crashlytics().setUserId(userId);
      }
      
      await crashlytics().setAttributes({
        platform: Platform.OS,
        os_version: String(Platform.Version),
      });
      console.log('Crashlytics initialized.');
    } catch (error) {
      console.error('Crashlytics initialization error:', error);
    }
  }

  /**
   * Log a non-fatal error
   */
  recordError(error: Error, jsErrorName?: string) {
    if (__DEV__) {
      console.log('Crashlytics Error Recorded [DEV]:', error.message);
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
      console.log('Crashlytics Log [DEV]:', message);
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

export const crashlyticsService = new CrashlyticsService();
