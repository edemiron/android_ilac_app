/**
 * CaregiversList — Mevcut bakıcılar listesi, izinler, silme aksiyonu ve boş durum
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
  colors: ThemeColors;
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
  colors,
  t,
}: CaregiversListProps) {
  const renderPermissions = (relationship: CaregiverRelationship) => {
    const permissions = [];
    if (relationship.canViewSchedule) permissions.push(t.viewSchedule);
    if (relationship.canViewHistory) permissions.push(t.viewHistory);
    if (relationship.canReceiveAlerts) permissions.push(t.receiveAlerts);

    return (
      <View style={styles.permissionBadge}>
        {permissions.map(p => (
          <View key={p} style={[styles.permissionTag, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.permissionText, { color: colors.primary }]}>{p}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.caregiversTitle}</Text>
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
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t.noCaregivers}</Text>
          <Text
            style={[styles.emptyText, { color: colors.textSecondary, fontSize: 14, marginTop: 4 }]}
          >
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
              style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
            >
              <View style={styles.caregiverItem}>
                <View style={[styles.avatarContainer, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="person" size={22} color={colors.primary} />
                </View>
                <View style={styles.caregiverInfo}>
                  <Text style={[styles.caregiverName, { color: colors.text }]}>{displayName}</Text>
                  {renderPermissions(caregiver)}
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => onRemoveCaregiver(caregiver.id, displayName)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
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
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  caregiverAvatarGroup: {
    marginBottom: 8,
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
  caregiverItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caregiverInfo: {
    flex: 1,
    marginLeft: 12,
  },
  caregiverName: {
    fontSize: 16,
    fontWeight: '500',
  },
  removeButton: {
    padding: 8,
  },
  permissionBadge: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  permissionTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  permissionText: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
