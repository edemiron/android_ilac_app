/**
 * RegisterScreen — Yeni Kullanıcı Kayıt Ekranı
 *
 * Design Pattern: Presenter Pattern / Declarative View
 * Tüm form durumları, validasyonlar, parola kontrolü ve Google/E-posta ile kayıt
 * `useRegisterController` Presenter Hook'una aktarılmıştır.
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
import { useRegisterController } from './RegisterScreen/hooks/useRegisterController';

export default function RegisterScreen() {
  const {
    navigation,
    colors,
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
    handleRegister,
    loginWithGoogleProvider,
  } = useRegisterController();

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
          <AuthHeader
            title={t.title}
            subtitle={t.subtitle}
            colors={colors}
            showBack={Boolean(navigation?.canGoBack?.())}
            onBack={() => navigation?.goBack?.()}
          />

          {/* 2. Form Alanı */}
          <View style={styles.form}>
            <AuthErrorBanner error={error} colors={colors} />

            <AuthInput
              label={t.name}
              value={name}
              onChangeText={setName}
              placeholder="Adınız Soyadınız"
              autoCapitalize="words"
              colors={colors}
            />

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

            <AuthInput
              label={t.confirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              isPassword
              showPassword={showPassword}
              onToggleShowPassword={() => setShowPassword(!showPassword)}
              colors={colors}
            />

            {/* Kayıt Ol Butonu */}
            <TouchableOpacity
              style={[styles.registerButton, { backgroundColor: colors.primary }]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.registerButtonText}>{t.register}</Text>
              )}
            </TouchableOpacity>

            {/* Sosyal Giriş Butonları (Google ile Kayıt) */}
            <SocialAuthButtons
              onGoogleAuth={loginWithGoogleProvider}
              googleButtonText={t.googleRegister}
              orText={t.or}
              isLoading={isLoading}
              colors={colors}
            />
          </View>

          {/* 3. Giriş Yap Yönlendirmesi */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              {t.hasAccount}{' '}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login' as never)}
              activeOpacity={0.7}
            >
              <Text style={[styles.loginText, { color: colors.primary }]}>{t.login}</Text>
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
  registerButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  registerButtonText: {
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
  loginText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
