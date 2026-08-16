import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';
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
 * Firebase config from app.config.json extra.firebase
 * (@expo/config app.config.json'u app.json'dan once okur — tek kaynak odur)
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
