/**
 * UserAvatar — Sprint 104.4 (Karol-style HomeScreen modernization).
 *
 * Karol hedef: Header'da sag ust kullanim avatar (gradyen icinde initials).
 *
 * Davranis:
 * - Initials only (photoURL AuthContext extend 105+'da — 8+ provider bagimli risk).
 * - displayName trim + split(/\s+/); first + last word bas harfleri (uppercase).
 * - Undefined ise '?' placeholder.
 * - MotiView mount scale 0.8 → 1 spring (FAB ile cakismaz, yavás giriş).
 */

import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useTheme } from '../../../contexts/ThemeContext';
import { motiTransitions } from '../../../theme/moti-config';

interface UserAvatarProps {
  displayName?: string;
  size?: number;
}

export function UserAvatar({ displayName, size = 36 }: UserAvatarProps) {
  const { colors } = useTheme();

  const initials = useMemo(() => {
    if (!displayName || displayName.trim().length === 0) return '?';
    const parts = displayName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }, [displayName]);

  return (
    <MotiView
      from={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={motiTransitions.expressive}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.gradientTrackTint,
          borderColor: '#FFFFFF',
        },
      ]}
      testID="user-avatar"
      accessibilityRole="image"
      accessibilityLabel={`Profil avatar ${initials}`}
    >
      <Text
        style={[
          styles.initials,
          { color: '#FFFFFF', fontSize: Math.round(size * 0.4) },
        ]}
      >
        {initials}
      </Text>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  initials: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
