import { initializeApp, getApps } from 'firebase/app';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { 
  initializeAuth, 
  getAuth,
  Auth,
  getReactNativePersistence,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase yapılandırması
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyAKUg-0PsR-awOb-b3RjyrDo9UmNfsD45A",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "ilachatirlatici-15a71.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "ilachatirlatici-15a71",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "ilachatirlatici-15a71.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "506876057044",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:506876057044:android:5d2d26ddbe32c8c4d53241",
};

// Firebase uygulamasını başlat (zaten varsa tekrar başlatma)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

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
  console.log('Firebase Auth initialized with AsyncStorage persistence');
} catch (error: any) {
  if (error.code === 'auth/already-initialized') {
    // Auth zaten başlatılmış, mevcut instance'ı al
    // NOT: Bu durumda persistence zaten ayarlanmış olmalı
    auth = getAuth(app);
    console.log('Firebase Auth already initialized, using existing instance');
  } else {
    console.error('Firebase Auth initialization error:', error);
    // Hata durumunda getAuth dene - ama persistence olmayabilir!
    auth = getAuth(app);
  }
}

export { auth };
export default app;
