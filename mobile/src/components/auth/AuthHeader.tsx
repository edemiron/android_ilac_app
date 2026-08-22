/**
 * AuthHeader — Giriş / Kayıt Ekranları Üst Başlık & Logo
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ThemeColors } from '../../contexts/ThemeContext';

interface AuthHeaderProps {
  title: string;
  subtitle: string;
  colors: ThemeColors;
}

export function AuthHeader({ title, subtitle, colors }: AuthHeaderProps) {
  return (
    <View style={styles.header}>
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
