import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAlert } from '../contexts/AlertContext';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export default function RegisterScreen() {
  const navigation = useNavigation<NavigationProp>();
  // eslint-disable-next-line unused-imports/no-unused-vars
  const { register, loginWithGoogleProvider, isGoogleAvailable, isLoading, error, clearError } =
    useAuth();
  const { colors } = useTheme();
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
    // Validasyonlar
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
    } catch {
      // Hata AuthContext'te zaten set ediliyor
    }
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>💊</Text>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.subtitle}>{t.subtitle}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t.name}</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={language === 'tr' ? 'Adınız Soyadınız' : 'Your Name'}
                placeholderTextColor={colors.placeholder}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t.email}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@email.com"
                placeholderTextColor={colors.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t.password}</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.placeholder}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t.confirmPassword}</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.placeholder}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.registerButtonText}>{t.register}</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t.or}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign-In Button */}
            <TouchableOpacity
              style={[styles.googleButton, isLoading && styles.registerButtonDisabled]}
              onPress={loginWithGoogleProvider}
              disabled={isLoading}
            >
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleButtonText}>{t.googleRegister}</Text>
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{t.hasAccount} </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>{t.login}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      padding: 24,
      justifyContent: 'center',
    },
    header: {
      alignItems: 'center',
      marginBottom: 32,
    },
    logo: {
      fontSize: 64,
      marginBottom: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    form: {
      marginBottom: 24,
    },
    errorBox: {
      backgroundColor: colors.error + '15',
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.error + '30',
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      textAlign: 'center',
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    passwordInput: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
    },
    eyeButton: {
      padding: 12,
    },
    eyeIcon: {
      fontSize: 20,
    },
    registerButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    registerButtonDisabled: {
      opacity: 0.7,
    },
    registerButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 20,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      marginHorizontal: 16,
      color: colors.textSecondary,
      fontSize: 14,
    },
    googleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    googleIcon: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#4285F4',
      marginRight: 10,
    },
    googleButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '500',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    footerText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    loginLink: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '600',
    },
  });
