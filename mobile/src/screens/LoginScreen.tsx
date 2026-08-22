/**
 * LoginScreen — Kullanıcı Giriş Ekranı
 *
 * Design Pattern: Presenter Pattern / Declarative View
 * Tüm form durumları, validasyonlar, Google/Misafir girişi ve şifre sıfırlama
 * `useLoginController` Presenter Hook'una aktarılmıştır.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Alt Bileşenler (Modular UI)
import { AuthHeader } from '../components/auth/AuthHeader';
import { AuthInput } from '../components/auth/AuthInput';
import { AuthErrorBanner } from '../components/auth/AuthErrorBanner';
import { SocialAuthButtons } from '../components/auth/SocialAuthButtons';

// Presenter Hook
import { useLoginController } from './LoginScreen/hooks/useLoginController';

export default function LoginScreen() {
  const {
    navigation,
    colors,
    t,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    isLoading,
    error,
    handleLogin,
    handleForgotPassword,
    loginWithGoogleProvider,
    loginAsGuest,
  } = useLoginController();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Başlık & Logo */}
          <AuthHeader title={t.title} subtitle={t.subtitle} colors={colors} />

          {/* 2. Form Alanı */}
          <View style={styles.form}>
            <AuthErrorBanner error={error} colors={colors} />

            <AuthInput
              label={t.email}
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@email.com"
              keyboardType="email-address"
              colors={colors}
            />

            <AuthInput
              label={t.password}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              isPassword
              showPassword={showPassword}
              onToggleShowPassword={() => setShowPassword(!showPassword)}
              colors={colors}
            />

            {/* Şifremi Unuttum */}
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={handleForgotPassword}
              activeOpacity={0.7}
            >
              <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
                {t.forgotPassword}
              </Text>
            </TouchableOpacity>

            {/* Giriş Yap Butonu */}
            <TouchableOpacity
              testID="login-button"
              style={[styles.loginButton, { backgroundColor: colors.primary }]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>{t.login}</Text>
              )}
            </TouchableOpacity>

            {/* Sosyal Giriş Butonları (Google & Misafir) */}
            <SocialAuthButtons
              onGoogleAuth={loginWithGoogleProvider}
              onGuestLogin={loginAsGuest}
              googleButtonText={t.googleLogin}
              guestButtonText={t.guestLogin}
              orText={t.or}
              isLoading={isLoading}
              colors={colors}
            />
          </View>

          {/* 3. Kayıt Ol Yönlendirmesi */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>{t.noAccount} </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register' as never)}
              activeOpacity={0.7}
            >
              <Text style={[styles.registerText, { color: colors.primary }]}>{t.register}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  form: {
    width: '100%',
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
  },
  registerText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
