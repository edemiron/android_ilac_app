import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AuthUser,
  subscribeToAuthChanges,
  loginWithEmail,
  registerWithEmail,
  logout as authLogout,
  resetPassword as authResetPassword,
  loginWithGoogle,
  signOutFromGoogle,
  updateUserDisplayName,
} from '../services/authService';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Config from 'react-native-config';
import { useMedicineStore } from '../stores/medicineStore';
import { migrateCaregiverRelationshipIds } from '../services/caregiverService';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('AuthContext');

// Google Sign-In yapılandırması (Firebase Project OAuth Client)
GoogleSignin.configure({
  webClientId:
    Config.GOOGLE_WEB_CLIENT_ID ||
    '506876057044-a1dse18hnemqnceocge898ejfp6q8sra.apps.googleusercontent.com',
});

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loginWithGoogleProvider: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  isGoogleAvailable: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleAvailable, setIsGoogleAvailable] = useState(false);
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Auth durumu değişikliklerini dinle
    const unsubscribe = subscribeToAuthChanges(async authUser => {
      const newUserId = authUser?.uid || null;
      const previousUserId = previousUserIdRef.current;

      if (newUserId) {
        await AsyncStorage.removeItem('@guest_session');
        // Kullanıcı giriş yaptı
        if (previousUserId !== null && previousUserId !== newUserId) {
          // Farklı bir kullanıcı giriş yaptı - önce store'u temizle (async)
          log.debug('Farklı kullanıcı, store temizleniyor');
          useMedicineStore
            .getState()
            .clearAllData()
            .catch((error: Error) => {
              log.error('Store temizleme hatasi', error);
            });
        }

        // userId'yi set et
        useMedicineStore.getState().setUserId(newUserId);

        // PERFORMANCE: Firebase sync'i ARKA PLANDA yap (sadece gerçek kullanıcılar için)
        if (newUserId !== 'guest_local_user') {
          // v1.7.4: yeni Firestore kuralları erişimi deterministik kimlikli
          // ilişki dokümanından okuyor; bu sürümden önce kurulmuş rastgele
          // kimlikli ilişkileri taşı, yoksa bakıcı hastanın verisini göremez.
          void migrateCaregiverRelationshipIds(newUserId).catch((err: unknown) => {
            log.warn('Bakici iliski kimligi migrasyonu atlandi', err);
          });

          log.debug('Firebase sync başlatılıyor (background)', { userId: newUserId });
          useMedicineStore
            .getState()
            .syncFromCloud()
            .then(() => {
              const medicines = useMedicineStore.getState().medicines;
              log.debug('Sync tamamlandı', { medicineCount: medicines.length });
            })
            .catch((err: unknown) => {
              const errorMessage = err instanceof Error ? err.message : 'Unknown error';
              log.error('Sync hatası', new Error(errorMessage));
            });
        }

        previousUserIdRef.current = newUserId;
        setUser(authUser);
      } else {
        // Firebase user null, check if guest session exists
        const isGuest = await AsyncStorage.getItem('@guest_session');
        if (isGuest === 'true') {
          const savedGuestName = await AsyncStorage.getItem('@guest_display_name');
          const guestUser: AuthUser = {
            uid: 'guest_local_user',
            email: null,
            displayName: savedGuestName || 'Misafir Kullanıcı',
            photoURL: null,
          };
          useMedicineStore.getState().setUserId('guest_local_user');
          previousUserIdRef.current = 'guest_local_user';
          setUser(guestUser);
        } else {
          previousUserIdRef.current = null;
          setUser(null);
        }
      }

      setIsLoading(false); // UI hemen gösterilir, sync arka planda devam eder
    });

    // Google Play Services kontrolü
    checkGooglePlayServices();

    return () => unsubscribe();
  }, []);

  const checkGooglePlayServices = async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      setIsGoogleAvailable(true);
    } catch (err) {
      log.debug('Google Play Services not available', { error: err });
      setIsGoogleAvailable(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);
      await loginWithEmail(email, password);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Giriş hatası';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, displayName?: string) => {
    try {
      setError(null);
      setIsLoading(true);
      const authUser = await registerWithEmail(email, password, displayName);
      // Register sonrası user state'i hemen güncelle (displayName'in görünmesi için)
      setUser(authUser);
      previousUserIdRef.current = authUser.uid;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Kayıt hatası';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await AsyncStorage.removeItem('@guest_session');
      // Önce local store'u temizle (KRİTİK: başka kullanıcının verileri görünmesin)
      await useMedicineStore.getState().clearAllData();
      // Google oturumunu kapat
      await signOutFromGoogle();
      // Sonra Firebase'den çıkış yap
      await authLogout();
      setUser(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Çıkış hatası';
      setError(errorMessage);
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      await authResetPassword(email);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Şifre sıfırlama hatası';
      setError(errorMessage);
      throw err;
    }
  };

  const clearError = () => setError(null);

  const loginWithGoogleProvider = async () => {
    try {
      setError(null);
      setIsLoading(true);

      // Misafir oturumunu temizle (Google ile giriş yapılıyorsa misafir değildir)
      await AsyncStorage.removeItem('@guest_session');

      // Google Play Services kontrolü
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Google Sign-In
      const userInfo = await GoogleSignin.signIn();
      log.debug('Google Sign-In result received', { hasData: !!userInfo.data });

      const rawUserInfo = userInfo as any;
      const idToken = rawUserInfo?.data?.idToken || rawUserInfo?.idToken;
      log.debug('ID Token status', { exists: !!idToken });

      if (idToken) {
        // Firebase'e giriş yap
        await loginWithGoogle(idToken);
      } else {
        throw new Error(
          'Google ID token alınamadı. Lütfen webClientId yapılandırmasını kontrol edin.'
        );
      }
    } catch (err: unknown) {
      const errorObj = err as { code?: string | number; message?: string };
      log.debug('Google Sign-In Error', { code: errorObj.code, message: errorObj.message });

      if (errorObj.code === statusCodes.SIGN_IN_CANCELLED) {
        // Kullanıcı iptal etti
        setError(null);
        throw new Error('SIGN_IN_CANCELLED');
      } else if (errorObj.code === statusCodes.IN_PROGRESS) {
        setError('Giriş işlemi devam ediyor...');
        throw new Error('Giriş işlemi devam ediyor...');
      } else if (errorObj.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        const msg = 'Google Play Services kullanılamıyor';
        setError(msg);
        throw new Error(msg);
      } else if (errorObj.code === '10' || errorObj.code === 10) {
        // DEVELOPER_ERROR - SHA-1 veya package name uyuşmazlığı
        const msg = 'Google yapılandırma hatası. SHA-1 veya package name kontrol edin.';
        setError(msg);
        throw new Error(msg);
      } else {
        const msg = errorObj.message || 'Google ile giriş başarısız';
        setError(msg);
        throw new Error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateDisplayName = async (newDisplayName: string) => {
    try {
      setError(null);
      const trimmed = newDisplayName.trim();
      if (!trimmed) {
        throw new Error('Kullanıcı adı boş olamaz.');
      }

      if (user?.uid === 'guest_local_user') {
        await AsyncStorage.setItem('@guest_display_name', trimmed);
        setUser(prev => (prev ? { ...prev, displayName: trimmed } : null));
        return;
      }

      const updatedUser = await updateUserDisplayName(trimmed);
      setUser(updatedUser);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'İsim güncellenemedi';
      setError(errorMessage);
      throw err;
    }
  };

  const loginAsGuest = async () => {
    try {
      setError(null);
      setIsLoading(true);
      await AsyncStorage.setItem('@guest_session', 'true');
      const savedGuestName = await AsyncStorage.getItem('@guest_display_name');
      const guestUser: AuthUser = {
        uid: 'guest_local_user',
        email: null,
        displayName: savedGuestName || 'Misafir Kullanıcı',
        photoURL: null,
      };
      setUser(guestUser);
      previousUserIdRef.current = guestUser.uid;
      useMedicineStore.getState().setUserId(guestUser.uid);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Misafir girişi hatası';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        updateDisplayName,
        logout,
        resetPassword,
        loginWithGoogleProvider,
        loginAsGuest,
        isGoogleAvailable,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
