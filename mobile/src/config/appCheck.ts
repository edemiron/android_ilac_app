/**
 * Firebase App Check Configuration
 *
 * App Check adds an additional layer of security to Firebase services by
 * verifying that requests originate from your authentic app. This helps
 * protect your backend resources from abuse.
 *
 * IMPORTANT: Client-side Firebase credentials (API keys, project IDs) are
 * designed to be public. Security is enforced through:
 * 1. Firebase Security Rules (Firestore, Storage, etc.)
 * 2. App Check attestation (this module)
 * 3. API key restrictions in Firebase Console
 *
 * Setup Requirements:
 * 1. Enable App Check in Firebase Console
 * 2. Register your app with reCAPTCHA Enterprise (for web builds)
 * 3. For Android: Use Play Integrity or SafetyNet provider
 * 4. For debug builds: Enable debug provider in Firebase Console
 */

import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { FirebaseApp } from 'firebase/app';
import { Platform } from 'react-native';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('AppCheck');

/**
 * Debug token for development/testing environments.
 * This token should be registered in Firebase Console under:
 * Project Settings > App Check > Apps > Manage debug tokens
 *
 * SECURITY WARNING: Never use debug tokens in production builds.
 * The __DEV__ check ensures this only runs in development.
 */
const DEBUG_TOKEN = process.env.EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN;

/**
 * ReCAPTCHA Enterprise site key for web builds.
 * Obtain this from Google Cloud Console > reCAPTCHA Enterprise.
 */
const RECAPTCHA_SITE_KEY = process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY;

/**
 * Determines if the current environment is development.
 * In Expo, __DEV__ is true during development builds.
 */
declare const __DEV__: boolean;
const isDevelopment = typeof __DEV__ !== 'undefined' && __DEV__;

/**
 * Initializes Firebase App Check for the given Firebase app instance.
 *
 * App Check behavior varies by platform:
 * - Web: Uses reCAPTCHA Enterprise for attestation
 * - Android/iOS: Currently using debug provider in development
 *
 * Note: For production Android builds, consider migrating to
 * @react-native-firebase/app-check with Play Integrity provider
 * for stronger attestation. The Firebase JS SDK's App Check has
 * limited native mobile support.
 *
 * @param app - The initialized Firebase app instance
 */
export function initializeFirebaseAppCheck(app: FirebaseApp): void {
  try {
    if (Platform.OS === 'web') {
      initializeWebAppCheck(app);
    } else {
      initializeMobileAppCheck(app);
    }
  } catch (error) {
    log.error('App Check initialization failed', error);
    // App Check failure should not block app startup
    // The app will still work but requests may be rejected by
    // Firestore rules that require App Check tokens
  }
}

/**
 * Initializes App Check for web platform using reCAPTCHA Enterprise.
 */
function initializeWebAppCheck(app: FirebaseApp): void {
  if (!RECAPTCHA_SITE_KEY) {
    log.warn('EXPO_PUBLIC_RECAPTCHA_SITE_KEY not configured. App Check disabled for web.');
    return;
  }

  // Enable debug mode in development for web
  if (isDevelopment && DEBUG_TOKEN) {
    // Debug token API for development only - self is the web global object
    (globalThis as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN = DEBUG_TOKEN;
    log.debug('App Check debug mode enabled for web development');
  }

  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });

  log.debug('App Check initialized for web with reCAPTCHA Enterprise');
}

/**
 * Initializes App Check for mobile platforms (Android/iOS).
 *
 * IMPORTANT LIMITATION: Firebase JS SDK's App Check does not support
 * native mobile attestation providers (Play Integrity, DeviceCheck).
 * For production mobile apps, you should consider:
 *
 * 1. Using @react-native-firebase/app-check (requires ejecting from Expo)
 * 2. Implementing a custom attestation provider
 * 3. Relying on Firestore Security Rules for protection
 *
 * In development, we use debug tokens which must be registered in
 * Firebase Console.
 */
function initializeMobileAppCheck(_app: FirebaseApp): void {
  if (isDevelopment && DEBUG_TOKEN) {
    // Debug provider for development builds
    // The debug token must be registered in Firebase Console
    log.debug('Mobile App Check: Using debug provider for development');

    // For React Native, we need to set the debug token globally
    // This works with Firebase JS SDK in debug mode
    if (typeof globalThis !== 'undefined') {
      (globalThis as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN = DEBUG_TOKEN;
    }

    // Note: Full App Check initialization for mobile with debug provider
    // would require additional setup. For now, we log the limitation.
    log.warn(
      'Mobile App Check: Full attestation requires @react-native-firebase/app-check. ' +
        'Currently relying on Firestore Security Rules for protection.'
    );
    return;
  }

  // Production mobile builds
  log.warn(
    'Mobile App Check: Native attestation not available with Firebase JS SDK. ' +
      'Security relies on Firestore Rules and API key restrictions.'
  );
}

/**
 * Security best practices documentation for this project:
 *
 * 1. FIRESTORE SECURITY RULES (Primary Protection)
 *    - All user data requires authentication
 *    - Users can only access their own data
 *    - See firestore.rules in project root
 *
 * 2. API KEY RESTRICTIONS (Firebase Console)
 *    - Restrict API key to specific apps (package name/bundle ID)
 *    - Enable only required APIs (Firestore, Auth)
 *    - Set up application restrictions (Android SHA, iOS bundle)
 *
 * 3. APP CHECK (Additional Layer)
 *    - Provides attestation that requests come from your app
 *    - Not a replacement for Security Rules
 *    - Limited mobile support with Firebase JS SDK
 *
 * 4. MONITORING
 *    - Enable Firebase App Check metrics
 *    - Monitor for unauthorized access attempts
 *    - Set up alerts for unusual patterns
 */
