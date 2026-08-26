/**
 * CaregiversList — Mevcut bakıcılar listesi, izinler, yetki düzenleme ve silme aksiyonu
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AvatarGroup } from '../../../components/common/AvatarGroup';
import type { CaregiverRelationship } from '../../../types';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface CaregiversListProps {
  caregivers: CaregiverRelationship[];
  isLoading: boolean;
  onRemoveCaregiver: (relationshipId: string, name: string) => void;
  onEditPermissions?: (caregiver: CaregiverRelationship) => void;
  colors: ThemeColors;
  isDark?: boolean;
  t: {
    caregiversTitle: string;
    unnamedCaregiver: string;
    noCaregivers: string;
    noCaregiversSubtitle: string;
    viewSchedule: string;
    viewHistory: string;
    receiveAlerts: string;
  };
}

export function CaregiversList({
  caregivers,
  isLoading,
  onRemoveCaregiver,
  onEditPermissions,
  colors,
  isDark = false,
  t,
}: CaregiversListProps) {
  const renderPermissions = (relationship: CaregiverRelationship) => {
    const perms = [];
    if (relationship.canReceiveAlerts) {
      perms.push({
        label: t.receiveAlerts,
        icon: 'notifications',
        bg: '#FEE2E2',
        color: '#DC2626',
      });
    }
    if (relationship.canViewSchedule) {
      perms.push({ label: t.viewSchedule, icon: 'calendar', bg: '#E0F2FE', color: '#0284C7' });
    }
    if (relationship.canViewHistory) {
      perms.push({ label: t.viewHistory, icon: 'analytics', bg: '#DCFCE7', color: '#16A34A' });
    }

    return (
      <View style={styles.permissionBadge}>
        {perms.map(p => (
          <View
            key={p.label}
            style={[
              styles.permissionTag,
              { backgroundColor: isDark ? colors.inputBackground : p.bg },
            ]}
          >
            <Ionicons name={p.icon as any} size={11} color={p.color} style={{ marginRight: 3 }} />
            <Text style={[styles.permissionText, { color: isDark ? colors.text : p.color }]}>
              {p.label}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.titleWithBadge}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.caregiversTitle}</Text>
          {caregivers.length > 0 && (
            <View style={[styles.countBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.countBadgeText, { color: colors.primary }]}>
                {caregivers.length}
              </Text>
            </View>
          )}
        </View>

        {caregivers.length > 0 && (
          <AvatarGroup
            items={caregivers.slice(0, 4).map(c => ({
              id: c.id,
              name: c.caregiverName || c.caregiverEmail || t.unnamedCaregiver,
            }))}
            maxVisible={4}
            size="sm"
            style={styles.caregiverAvatarGroup}
          />
        )}
      </View>

      {isLoading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : caregivers.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <View style={[styles.emptyIconWrapper, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="people-outline" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t.noCaregivers}</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            {t.noCaregiversSubtitle}
          </Text>
        </View>
      ) : (
        caregivers.map(caregiver => {
          const displayName =
            caregiver.caregiverName || caregiver.caregiverEmail || t.unnamedCaregiver;

          return (
            <View
              key={caregiver.id}
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  shadowColor: colors.shadow,
                },
              ]}
            >
              <View style={styles.caregiverItem}>
                <View style={[styles.avatarContainer, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="person" size={22} color={colors.primary} />
                  <View style={styles.onlineDot} />
                </View>

                <View style={styles.caregiverInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.caregiverName, { color: colors.text }]} numberOfLines={1}>
                      {displayName}
                    </Text>
                  </View>
                  {caregiver.caregiverEmail && caregiver.caregiverName && (
                    <Text
                      style={[styles.caregiverEmail, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {caregiver.caregiverEmail}
                    </Text>
                  )}
                  {renderPermissions(caregiver)}
                </View>

                <View style={styles.actionsColumn}>
                  {onEditPermissions && (
                    <TouchableOpacity
                      style={[
                        styles.editButton,
                        { backgroundColor: isDark ? colors.inputBackground : '#F1F5F9' },
                      ]}
                      onPress={() => onEditPermissions(caregiver)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="settings-outline" size={18} color={colors.text} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.removeButton, { backgroundColor: '#FEE2E2' }]}
                    onPress={() => onRemoveCaregiver(caregiver.id, displayName)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  caregiverAvatarGroup: {
    marginBottom: 0,
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
  caregiverItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#16A34A',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    position: 'absolute',
    bottom: -1,
    right: -1,
  },
  caregiverInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  caregiverName: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  caregiverEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  actionsColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionBadge: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  permissionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  permissionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyCard: {
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
});
