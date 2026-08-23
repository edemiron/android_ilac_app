import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeFirestore, memoryLocalCache, Firestore } from 'firebase/firestore';
import { initializeAuth, getAuth, Auth, Persistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Firebase Auth React Native persistence için tip tanımı
// Firebase v12+ için getReactNativePersistence TypeScript'te eksik

const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};
import { createScopedLogger } from '../utils/logger';
import { initializeFirebaseAppCheck } from './appCheck';

const log = createScopedLogger('Firebase');

/**
 * Firebase config from app.json extra.firebase
 *
 * SECURITY NOTE: Firebase client credentials are meant to be public.
 * Security is enforced through:
 * 1. Firebase Security Rules (authentication required)
 * 2. App Check (attestation)
 * 3. API key restrictions (in Firebase Console)
 */
const expoConfig = Constants.expoConfig?.extra?.firebase;

const firebaseConfig = {
  apiKey: expoConfig?.apiKey || '',
  authDomain: expoConfig?.authDomain || '',
  projectId: expoConfig?.projectId || '',
  storageBucket: expoConfig?.storageBucket || '',
  messagingSenderId: expoConfig?.messagingSenderId || '',
  appId: expoConfig?.appId || '',
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
let dbInstance: Firestore;
try {
  if (typeof initializeFirestore === 'function') {
    dbInstance = initializeFirestore(app, {
      localCache: typeof memoryLocalCache === 'function' ? memoryLocalCache() : undefined,
    });
  } else {
    dbInstance = {} as Firestore;
  }
} catch (_e) {
  try {
    const { getFirestore } = require('firebase/firestore');
    dbInstance = getFirestore(app);
  } catch (_err) {
    dbInstance = {} as Firestore;
  }
}
export const db = dbInstance;

// Authentication - React Native için AsyncStorage persistence
let auth: Auth;

try {
  // İlk başlatmada persistence ile başlat
  const persistence =
    typeof getReactNativePersistence === 'function'
      ? getReactNativePersistence(AsyncStorage)
      : undefined;

  if (typeof initializeAuth === 'function') {
    auth = initializeAuth(app, {
      persistence,
    });
    log.debug('Auth initialized with AsyncStorage persistence');
  } else {
    auth = getAuth(app);
  }
} catch (error: unknown) {
  const firebaseError = error as { code?: string };
  if (firebaseError.code === 'auth/already-initialized') {
    // Auth zaten başlatılmış, mevcut instance'ı al
    try {
      auth = getAuth(app);
      log.debug('Auth already initialized, using existing instance');
    } catch (_e) {
      auth = {} as Auth;
    }
  } else {
    try {
      auth = getAuth(app);
    } catch (_err) {
      auth = {} as Auth;
    }
  }
}

export { auth };
export default app;
