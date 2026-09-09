/**
 * useRegisterController — RegisterScreen Presenter Hook
 *
 * Design Pattern: Presenter / Controller
 * Kayıt formu durumu, validasyonlar, e-posta/şifre kaydı ve Google ile kayıt
 * akışlarını UI bileşeninden izole eder.
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

export function useRegisterController() {
  const navigation = useNavigation<NavigationProp>();
  const { register, loginWithGoogleProvider, isGoogleAvailable, isLoading, error, clearError } =
    useAuth();
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const { showError } = useAlert();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const t = {
    title: language === 'tr' ? 'Hesap Oluştur' : 'Create Account',
    subtitle:
      language === 'tr'
        ? 'Verilerinizi güvenle saklayın ve senkronize edin'
        : 'Securely store and sync your data',
    name: language === 'tr' ? 'Ad Soyad' : 'Full Name',
    email: language === 'tr' ? 'E-posta' : 'Email',
    password: language === 'tr' ? 'Şifre' : 'Password',
    confirmPassword: language === 'tr' ? 'Şifre Tekrar' : 'Confirm Password',
    register: language === 'tr' ? 'Kayıt Ol' : 'Register',
    googleRegister: language === 'tr' ? 'Google ile Kayıt Ol' : 'Sign up with Google',
    or: language === 'tr' ? 'veya' : 'or',
    hasAccount: language === 'tr' ? 'Zaten hesabınız var mı?' : 'Already have an account?',
    login: language === 'tr' ? 'Giriş Yap' : 'Login',
    passwordMismatch: language === 'tr' ? 'Şifreler eşleşmiyor.' : 'Passwords do not match.',
    fillAll: language === 'tr' ? 'Lütfen tüm alanları doldurun.' : 'Please fill all fields.',
    passwordMin:
      language === 'tr'
        ? 'Şifre en az 6 karakter olmalıdır.'
        : 'Password must be at least 6 characters.',
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      showError(language === 'tr' ? 'Hata' : 'Error', t.fillAll);
      return;
    }

    if (password.length < 6) {
      showError(language === 'tr' ? 'Hata' : 'Error', t.passwordMin);
      return;
    }

    if (password !== confirmPassword) {
      showError(language === 'tr' ? 'Hata' : 'Error', t.passwordMismatch);
      return;
    }

    try {
      clearError();
      await register(email.trim(), password, name.trim());
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch {
      // Hata AuthContext'te zaten set ediliyor
    }
  };

  return {
    navigation,
    colors,
    isDark,
    language,
    t,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    isLoading,
    error,
    isGoogleAvailable,
    handleRegister,
    loginWithGoogleProvider,
  };
}
