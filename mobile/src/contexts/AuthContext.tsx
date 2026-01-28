import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import {
  AuthUser,
  subscribeToAuthChanges,
  loginWithEmail,
  registerWithEmail,
  logout as authLogout,
  resetPassword as authResetPassword,
  loginWithGoogle,
  signOutFromGoogle,
} from '../services/authService';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Config from 'react-native-config';
import { useMedicineStore } from '../stores/medicineStore';
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
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loginWithGoogleProvider: () => Promise<void>;
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
        // Kullanıcı giriş yaptı
        if (previousUserId !== null && previousUserId !== newUserId) {
          // Farklı bir kullanıcı giriş yaptı - önce store'u temizle
          log.debug('Farklı kullanıcı, store temizleniyor');
          useMedicineStore.getState().clearAllData();
        }

        // userId'yi set et ve Firebase'den verileri indir
        useMedicineStore.getState().setUserId(newUserId);
        log.debug('Firebase sync başlatılıyor', { userId: newUserId });

        try {
          await useMedicineStore.getState().syncFromCloud();
          const medicines = useMedicineStore.getState().medicines;
          log.debug('Sync tamamlandı', { medicineCount: medicines.length });
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          log.error('Sync hatası', new Error(errorMessage));
        }
      }

      previousUserIdRef.current = newUserId;
      setUser(authUser);
      setIsLoading(false);
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
      // Önce local store'u temizle (KRİTİK: başka kullanıcının verileri görünmesin)
      useMedicineStore.getState().clearAllData();
      // Google oturumunu kapat
      await signOutFromGoogle();
      // Sonra Firebase'den çıkış yap
      await authLogout();
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

      // Google Play Services kontrolü
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Google Sign-In
      const userInfo = await GoogleSignin.signIn();
      log.debug('Google Sign-In result received', { hasData: !!userInfo.data });

      const idToken = userInfo.data?.idToken;
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
      } else if (errorObj.code === statusCodes.IN_PROGRESS) {
        setError('Giriş işlemi devam ediyor...');
      } else if (errorObj.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services kullanılamıyor');
      } else if (errorObj.code === '10' || errorObj.code === 10) {
        // DEVELOPER_ERROR - SHA-1 veya package name uyuşmazlığı
        setError('Google yapılandırma hatası. SHA-1 veya package name kontrol edin.');
      } else {
        setError(errorObj.message || 'Google ile giriş başarısız');
      }
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
        logout,
        resetPassword,
        loginWithGoogleProvider,
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
