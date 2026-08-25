/**
 * CaregiverGuestNotice — Misafir Modu Bilgilendirme Kartı
 *
 * Aile ve Bakıcı Takibinin canlı bulut senkronizasyonu gerektirdiğini
 * ve Google/E-posta ile oturum açılması gerektiğini kullanıcıya zarif bir şekilde bildirir.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface CaregiverGuestNoticeProps {
  colors: ThemeColors;
  isDark: boolean;
  language: string;
  onGoogleSignIn?: () => void;
  onSignIn?: () => void;
  isGoogleAvailable?: boolean;
}

export function CaregiverGuestNotice({
  colors,
  isDark,
  language,
  onGoogleSignIn,
  onSignIn,
  isGoogleAvailable = true,
}: CaregiverGuestNoticeProps) {
  const isTr = language === 'tr';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(234, 179, 8, 0.12)' : '#FEF9C3',
          borderColor: isDark ? 'rgba(234, 179, 8, 0.3)' : '#FDE047',
        },
      ]}
    >
      <View style={styles.contentRow}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: isDark ? 'rgba(234, 179, 8, 0.2)' : '#FEF08A' },
          ]}
        >
          <Ionicons name="cloud-offline-outline" size={22} color={isDark ? '#FACC15' : '#CA8A04'} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: isDark ? '#FEF08A' : '#854D0E' }]}>
            {isTr ? 'Canlı Takip İçin Oturum Açın' : 'Sign in for Live Tracking'}
          </Text>
          <Text style={[styles.description, { color: isDark ? '#E2E8F0' : '#713F12' }]}>
            {isTr
              ? 'Aile & Bakıcı Takibi hasta ve bakıcı arasındaki ilaç verilerini bulut üzerinden anlık eşitler. Devam etmek için hesabınıza giriş yapın.'
              : 'Family & Caregiver tracking syncs medication logs in real-time via the cloud. Please sign in to connect.'}
          </Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        {onGoogleSignIn && isGoogleAvailable && (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: isDark ? '#EAB308' : '#CA8A04' }]}
            onPress={onGoogleSignIn}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-google" size={17} color="#FFFFFF" style={styles.buttonIcon} />
            <Text style={styles.primaryButtonText}>
              {isTr ? 'Google ile Giriş Yap' : 'Sign in with Google'}
            </Text>
          </TouchableOpacity>
        )}

        {onSignIn && (
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              {
                borderColor: isDark ? 'rgba(234, 179, 8, 0.4)' : '#CA8A04',
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
              },
            ]}
            onPress={onSignIn}
            activeOpacity={0.8}
          >
            <Ionicons
              name="mail-outline"
              size={17}
              color={isDark ? '#FEF08A' : '#854D0E'}
              style={styles.buttonIcon}
            />
            <Text style={[styles.secondaryButtonText, { color: isDark ? '#FEF08A' : '#854D0E' }]}>
              {isTr ? 'E-posta / Ayarlar' : 'Email / Settings'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  description: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  buttonIcon: {
    marginRight: 6,
  },
});
