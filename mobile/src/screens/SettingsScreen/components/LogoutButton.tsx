/**
 * LogoutButton — Oturumu Kapat / Giriş Yap Alt Butonu
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface LogoutButtonProps {
  user: { email?: string | null } | null;
  onLogout: () => void;
  language: string;
  isDark?: boolean;
}

export function LogoutButton({ user, onLogout, language, isDark = false }: LogoutButtonProps) {
  const isTr = language === 'tr';

  return (
    <View style={styles.logoutContainer}>
      <TouchableOpacity
        style={[
          styles.logoutButton,
          {
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
            borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.20)',
          },
        ]}
        onPress={onLogout}
        activeOpacity={0.75}
      >
        <Ionicons name="log-out-outline" size={18} color="#EF4444" />
        <Text style={styles.logoutText}>
          {user
            ? isTr
              ? 'Oturumu Güvenli Kapat'
              : 'Sign Out'
            : isTr
              ? 'Giriş Yap / Kaydol'
              : 'Sign In / Register'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  logoutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
});
