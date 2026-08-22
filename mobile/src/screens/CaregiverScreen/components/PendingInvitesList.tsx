/**
 * PendingInvitesList — Bekleyen bakıcı davetleri listesi
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { CaregiverInvite } from '../../../types';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface PendingInvitesListProps {
  pendingInvites: CaregiverInvite[];
  onOpenQR: (inviteCode: string) => void;
  onCancelInvite: (inviteCode: string) => void;
  colors: ThemeColors;
  language: string;
  title: string;
  expiresText: (date: string) => string;
}

export function PendingInvitesList({
  pendingInvites,
  onOpenQR,
  onCancelInvite,
  colors,
  language,
  title,
  expiresText,
}: PendingInvitesListProps) {
  if (pendingInvites.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {pendingInvites.map(invite => (
        <View
          key={invite.id}
          style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
        >
          <View style={styles.inviteItem}>
            <View style={styles.inviteInfo}>
              <Text style={[styles.inviteEmail, { color: colors.text }]}>
                {invite.caregiverEmail}
              </Text>
              <Text style={[styles.inviteCode, { color: colors.textSecondary }]}>
                {language === 'tr' ? 'Kod' : 'Code'}: {invite.id} • {expiresText(invite.expiresAt)}
              </Text>
            </View>
            <View style={styles.inviteActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onOpenQR(invite.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="qr-code" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onCancelInvite(invite.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
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
  inviteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inviteInfo: {
    flex: 1,
  },
  inviteEmail: {
    fontSize: 15,
    fontWeight: '500',
  },
  inviteCode: {
    fontSize: 14,
    marginTop: 2,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
});
