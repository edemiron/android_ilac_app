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
  onShareInvite?: (inviteCode: string) => void;
  colors: ThemeColors;
  isDark?: boolean;
  language: string;
  title: string;
  expiresText: (date: string) => string;
}

export function PendingInvitesList({
  pendingInvites,
  onOpenQR,
  onCancelInvite,
  onShareInvite,
  colors,
  isDark = false,
  language,
  title,
  expiresText,
}: PendingInvitesListProps) {
  if (pendingInvites.length === 0) return null;

  const isTr = language === 'tr';

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
          <Text style={[styles.badgeText, { color: '#D97706' }]}>
            {pendingInvites.length} {isTr ? 'Bekliyor' : 'Pending'}
          </Text>
        </View>
      </View>

      {pendingInvites.map(invite => (
        <View
          key={invite.id}
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: '#FDE68A',
              shadowColor: colors.shadow,
            },
          ]}
        >
          <View style={styles.inviteItem}>
            <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="time-outline" size={22} color="#D97706" />
            </View>

            <View style={styles.inviteInfo}>
              <Text style={[styles.inviteEmail, { color: colors.text }]} numberOfLines={1}>
                {invite.caregiverEmail || (isTr ? 'Açık Davet Kodu' : 'Open Invite Code')}
              </Text>
              <View style={styles.codeRow}>
                <View
                  style={[
                    styles.codePill,
                    { backgroundColor: isDark ? colors.inputBackground : '#F1F5F9' },
                  ]}
                >
                  <Text style={[styles.codeText, { color: colors.primary }]}>{invite.id}</Text>
                </View>
                <Text style={[styles.expiresText, { color: colors.textSecondary }]}>
                  {expiresText(invite.expiresAt)}
                </Text>
              </View>
            </View>

            <View style={styles.inviteActions}>
              {onShareInvite && (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: isDark ? colors.inputBackground : '#F1F5F9' },
                  ]}
                  onPress={() => onShareInvite(invite.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="share-social" size={18} color={colors.primary} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: isDark ? colors.inputBackground : '#F1F5F9' },
                ]}
                onPress={() => onOpenQR(invite.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="qr-code" size={18} color={colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#FEE2E2' }]}
                onPress={() => onCancelInvite(invite.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={18} color="#DC2626" />
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
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  inviteItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  inviteInfo: {
    flex: 1,
  },
  inviteEmail: {
    fontSize: 14,
    fontWeight: '600',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  codePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  expiresText: {
    fontSize: 11,
  },
  inviteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
