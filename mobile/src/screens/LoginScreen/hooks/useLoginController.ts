/**
 * useLoginController — LoginScreen Presenter Hook
 *
 * Design Pattern: Presenter / Controller
 * Form durumu, validasyon, e-posta/şifre girişi, Google Sign-In, şifre sıfırlama
 * ve misafir girişi işlemlerini UI bileşeninden izole eder.
 */

import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useAlert } from '../../../contexts/AlertContext';
import type { RootStackParamList } from '../../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function useLoginController() {
  const navigation = useNavigation<NavigationProp>();
  const {
    login,
    resetPassword,
    loginWithGoogleProvider,
    loginAsGuest,
    isGoogleAvailable,
    isLoading,
    error,
    clearError,
  } = useAuth();
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const { showError, showInfo, showSuccess } = useAlert();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const t = {
    title: language === 'tr' ? 'Giriş Yap' : 'Login',
    subtitle:
      language === 'tr'
        ? 'Verileriniz güvenli bir şekilde senkronize edilecek'
        : 'Your data will be securely synced',
    email: language === 'tr' ? 'E-posta' : 'Email',
    password: language === 'tr' ? 'Şifre' : 'Password',
    login: language === 'tr' ? 'Giriş Yap' : 'Login',
    googleLogin: language === 'tr' ? 'Google ile Giriş Yap' : 'Sign in with Google',
    guestLogin:
      language === 'tr'
        ? '👤 Giriş Yapmadan Devam Et (Misafir / Test)'
        : '👤 Continue without Account (Guest / Test)',
    or: language === 'tr' ? 'veya' : 'or',
    forgotPassword: language === 'tr' ? 'Şifremi Unuttum' : 'Forgot Password',
    noAccount: language === 'tr' ? 'Hesabınız yok mu?' : "Don't have an account?",
    register: language === 'tr' ? 'Kayıt Ol' : 'Register',
    resetSent:
      language === 'tr'
        ? 'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.'
        : 'Password reset link sent to your email.',
    enterEmail:
      language === 'tr' ? 'Lütfen e-posta adresinizi girin.' : 'Please enter your email address.',
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showError(
        language === 'tr' ? 'Hata' : 'Error',
        language === 'tr' ? 'Lütfen tüm alanları doldurun.' : 'Please fill all fields.'
      );
      return;
    }

    try {
      clearError();
      await login(email.trim(), password);
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch {
      // Hata AuthContext'te zaten set ediliyor
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      showInfo(language === 'tr' ? 'Bilgi' : 'Info', t.enterEmail);
      return;
    }

    try {
      await resetPassword(email.trim());
      showSuccess(language === 'tr' ? 'Başarılı' : 'Success', t.resetSent);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      showError(language === 'tr' ? 'Hata' : 'Error', errorMessage);
    }
  };

  return {
    navigation,
    colors,
    isDark,
    language,
    t,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    isLoading,
    error,
    isGoogleAvailable,
    handleLogin,
    handleForgotPassword,
    loginWithGoogleProvider,
    loginAsGuest,
  };
}
