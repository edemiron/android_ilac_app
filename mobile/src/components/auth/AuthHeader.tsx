/**
 * AuthHeader — Giriş / Kayıt Ekranları Üst Başlık & Logo
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { ThemeColors } from '../../contexts/ThemeContext';

interface AuthHeaderProps {
  title: string;
  subtitle: string;
  colors: ThemeColors;
  showBack?: boolean;
  onBack?: () => void;
}

export function AuthHeader({ title, subtitle, colors, showBack, onBack }: AuthHeaderProps) {
  return (
    <View style={styles.header}>
      {showBack && onBack && (
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.card }]}
          onPress={onBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Geri Dön"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
      )}
      <Text style={styles.logo}>💊</Text>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
    width: '100%',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logo: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
});
