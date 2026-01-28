import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import {
  initializeAuth,
  getAuth,
  Auth,
  Persistence,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';

// Firebase Auth React Native persistence için tip tanımı
// Firebase v12+ için getReactNativePersistence TypeScript'te eksik
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};
import { createScopedLogger } from '../utils/logger';
import { initializeFirebaseAppCheck } from './appCheck';

const log = createScopedLogger('Firebase');

/**
 * Gets Firebase config from environment variables via react-native-config.
 *
 * SECURITY NOTE: Firebase client credentials are meant to be public.
 * Security is enforced through:
 * 1. Firebase Security Rules (authentication required)
 * 2. App Check (attestation)
 * 3. API key restrictions (in Firebase Console)
 */
const getConfig = (envKey: string): string => {
  const value = Config[envKey];
  if (!value) {
    throw new Error(`Missing Firebase config: ${envKey}. Check .env file.`);
  }
  return value;
};

const firebaseConfig = {
  apiKey: getConfig('FIREBASE_API_KEY'),
  authDomain: getConfig('FIREBASE_AUTH_DOMAIN'),
  projectId: getConfig('FIREBASE_PROJECT_ID'),
  storageBucket: getConfig('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getConfig('FIREBASE_MESSAGING_SENDER_ID'),
  appId: getConfig('FIREBASE_APP_ID'),
};

// Firebase uygulamasini baslat (zaten varsa tekrar baslatma)
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  // Initialize App Check after Firebase app is created
  initializeFirebaseAppCheck(app);
  log.debug('Firebase app initialized with App Check');
} else {
  app = getApps()[0];
  log.debug('Using existing Firebase app instance');
}

// Firestore veritabanı - memory cache ile (React Native uyumlu)
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
});

// Authentication - React Native için AsyncStorage persistence
let auth: Auth;

try {
  // İlk başlatmada persistence ile başlat
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
  log.debug('Auth initialized with AsyncStorage persistence');
} catch (error: unknown) {
  const firebaseError = error as { code?: string };
  if (firebaseError.code === 'auth/already-initialized') {
    // Auth zaten başlatılmış, mevcut instance'ı al
    // NOT: Bu durumda persistence zaten ayarlanmış olmalı
    auth = getAuth(app);
    log.debug('Auth already initialized, using existing instance');
  } else {
    log.error('Auth initialization error', error);
    // Hata durumunda getAuth dene - ama persistence olmayabilir!
    auth = getAuth(app);
  }
}

export { auth };
export default app;
