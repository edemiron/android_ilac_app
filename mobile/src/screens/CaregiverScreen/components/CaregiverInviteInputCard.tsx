/**
 * CaregiverInviteInputCard — E-posta ile bakıcı daveti gönderme kartı
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface CaregiverInviteInputCardProps {
  email: string;
  onChangeEmail: (text: string) => void;
  onInvite: () => void;
  isCreating: boolean;
  colors: ThemeColors;
  title: string;
  placeholder: string;
}

export function CaregiverInviteInputCard({
  email,
  onChangeEmail,
  onInvite,
  isCreating,
  colors,
  title,
  placeholder,
}: CaregiverInviteInputCardProps) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
        <View style={styles.inviteSection}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBackground,
                color: colors.text,
              },
            ]}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={onChangeEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.inviteButton, { backgroundColor: colors.primary }]}
            onPress={onInvite}
            disabled={isCreating || !email.trim()}
          >
            {isCreating ? (
              <ActivityIndicator size="small" color={colors.textOnPrimary} />
            ) : (
              <Ionicons name="person-add" size={24} color={colors.textOnPrimary} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inviteSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  inviteButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
