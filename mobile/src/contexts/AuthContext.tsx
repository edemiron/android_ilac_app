import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import {
  AuthUser,
  subscribeToAuthChanges,
  loginWithEmail,
  registerWithEmail,
  logout as authLogout,
  resetPassword as authResetPassword,
  loginWithGoogle,
} from '../services/authService';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useMedicineStore } from '../stores/medicineStore';

// Google Sign-In yapılandırması (Firebase Project OAuth Client)
GoogleSignin.configure({
  webClientId: '506876057044-a1dse18hnemqnceocge898ejfp6q8sra.apps.googleusercontent.com',
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
    const unsubscribe = subscribeToAuthChanges(async (authUser) => {
      const newUserId = authUser?.uid || null;
      const previousUserId = previousUserIdRef.current;
      
      if (newUserId) {
        // Kullanıcı giriş yaptı
        if (previousUserId !== null && previousUserId !== newUserId) {
          // Farklı bir kullanıcı giriş yaptı - önce store'u temizle
          console.log('Farklı kullanıcı, store temizleniyor...');
          useMedicineStore.getState().clearAllData();
        }
        
        // userId'yi set et ve Firebase'den verileri indir
        useMedicineStore.getState().setUserId(newUserId);
        console.log('Firebase sync başlatılıyor, userId:', newUserId);
        
        try {
          await useMedicineStore.getState().syncFromCloud();
          const medicines = useMedicineStore.getState().medicines;
          console.log('Sync tamamlandı, ilaç sayısı:', medicines.length);
        } catch (err: any) {
          console.error('Sync hatası:', err.message);
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
      console.log('Google Play Services not available:', err);
      setIsGoogleAvailable(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);
      await loginWithEmail(email, password);
    } catch (err: any) {
      setError(err.message);
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
    } catch (err: any) {
      setError(err.message);
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
      // Sonra Firebase'den çıkış yap
      await authLogout();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      await authResetPassword(email);
    } catch (err: any) {
      setError(err.message);
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
      console.log('Google Sign-In Result:', JSON.stringify(userInfo, null, 2));
      
      const idToken = userInfo.data?.idToken;
      console.log('ID Token:', idToken ? 'EXISTS' : 'NULL');

      if (idToken) {
        // Firebase'e giriş yap
        await loginWithGoogle(idToken);
      } else {
        throw new Error('Google ID token alınamadı. Lütfen webClientId yapılandırmasını kontrol edin.');
      }
    } catch (err: any) {
      console.log('Google Sign-In Error:', err.code, err.message);
      
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // Kullanıcı iptal etti
        setError(null);
      } else if (err.code === statusCodes.IN_PROGRESS) {
        setError('Giriş işlemi devam ediyor...');
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services kullanılamıyor');
      } else if (err.code === '10' || err.code === 10) {
        // DEVELOPER_ERROR - SHA-1 veya package name uyuşmazlığı
        setError('Google yapılandırma hatası. SHA-1 veya package name kontrol edin.');
      } else {
        setError(err.message || 'Google ile giriş başarısız');
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
