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
}

export function LogoutButton({ user, onLogout, language }: LogoutButtonProps) {
  return (
    <View style={styles.logoutContainer}>
      <TouchableOpacity style={styles.logoutButton} onPress={onLogout} activeOpacity={0.75}>
        <Ionicons name="log-out-outline" size={20} color="#DC2626" />
        <Text style={styles.logoutText}>
          {user
            ? language === 'tr'
              ? 'Oturumu Kapat'
              : 'Sign Out'
            : language === 'tr'
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
    marginTop: 24,
    marginBottom: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
