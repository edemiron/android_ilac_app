/**
 * CaregiverPermissionsModal — Bakıcı İzin ve Yetki Yönetimi Modalı
 *
 * Granüler İzinler:
 * 1. Hayati Doz & Acil Bildirimler (SMS / Push)
 * 2. İlaç Takvimi Görüntüleme
 * 3. Tedavi & Doz Geçmişi İnceleme
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { CaregiverRelationship } from '../../../types';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface CaregiverPermissionsModalProps {
  visible: boolean;
  caregiver: CaregiverRelationship | null;
  onClose: () => void;
  onSave: (
    relationshipId: string,
    permissions: {
      canViewSchedule: boolean;
      canViewHistory: boolean;
      canReceiveAlerts: boolean;
    }
  ) => Promise<void>;
  colors: ThemeColors;
  isDark: boolean;
  language: string;
}

export function CaregiverPermissionsModal({
  visible,
  caregiver,
  onClose,
  onSave,
  colors,
  isDark,
  language,
}: CaregiverPermissionsModalProps) {
  const isTr = language === 'tr';

  const [canReceiveAlerts, setCanReceiveAlerts] = useState(true);
  const [canViewSchedule, setCanViewSchedule] = useState(true);
  const [canViewHistory, setCanViewHistory] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (caregiver) {
      setCanReceiveAlerts(caregiver.canReceiveAlerts ?? true);
      setCanViewSchedule(caregiver.canViewSchedule ?? true);
      setCanViewHistory(caregiver.canViewHistory ?? true);
    }
  }, [caregiver]);

  if (!caregiver) return null;

  const caregiverName =
    caregiver.caregiverName || caregiver.caregiverEmail || (isTr ? 'İsimsiz Bakıcı' : 'Caregiver');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(caregiver.id, {
        canReceiveAlerts,
        canViewSchedule,
        canViewHistory,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[styles.modalCard, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconWrapper, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.title, { color: colors.text }]}>
                {isTr ? 'Yetki ve İzin Yönetimi' : 'Permission Management'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {caregiverName}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* İzin Satırları */}
          <View style={styles.permissionsContainer}>
            {/* 1. Acil Bildirimler */}
            <View style={[styles.permRow, { borderColor: colors.border }]}>
              <View style={[styles.permIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="notifications" size={18} color="#DC2626" />
              </View>
              <View style={styles.permTextContainer}>
                <Text style={[styles.permTitle, { color: colors.text }]}>
                  {isTr ? 'Hayati Doz & Acil Uyarılar' : 'Critical Dose & Urgent Alerts'}
                </Text>
                <Text style={[styles.permDesc, { color: colors.textSecondary }]}>
                  {isTr
                    ? 'İlaç atlandığında veya acil durumda anında bildirim alır.'
                    : 'Receives instant notification when a dose is missed.'}
                </Text>
              </View>
              <Switch
                value={canReceiveAlerts}
                onValueChange={setCanReceiveAlerts}
                trackColor={{ false: '#CBD5E1', true: colors.primary + '80' }}
                thumbColor={canReceiveAlerts ? colors.primary : '#F1F5F9'}
              />
            </View>

            {/* 2. Takvim Görüntüleme */}
            <View style={[styles.permRow, { borderColor: colors.border }]}>
              <View style={[styles.permIcon, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="calendar" size={18} color="#0284C7" />
              </View>
              <View style={styles.permTextContainer}>
                <Text style={[styles.permTitle, { color: colors.text }]}>
                  {isTr ? 'İlaç Takvimini Görme' : 'View Medication Schedule'}
                </Text>
                <Text style={[styles.permDesc, { color: colors.textSecondary }]}>
                  {isTr
                    ? 'Haftalık ilaç saatlerini ve doz planını görüntüleyebilir.'
                    : 'Can view weekly medication schedule and dosage plan.'}
                </Text>
              </View>
              <Switch
                value={canViewSchedule}
                onValueChange={setCanViewSchedule}
                trackColor={{ false: '#CBD5E1', true: colors.primary + '80' }}
                thumbColor={canViewSchedule ? colors.primary : '#F1F5F9'}
              />
            </View>

            {/* 3. Tedavi Geçmişi */}
            <View style={[styles.permRow, { borderColor: colors.border }]}>
              <View style={[styles.permIcon, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="analytics" size={18} color="#16A34A" />
              </View>
              <View style={styles.permTextContainer}>
                <Text style={[styles.permTitle, { color: colors.text }]}>
                  {isTr ? 'Tedavi Geçmişi & Raporlar' : 'History & Compliance Reports'}
                </Text>
                <Text style={[styles.permDesc, { color: colors.textSecondary }]}>
                  {isTr
                    ? 'Alınan ve atlanan ilaçların geçmiş istatistiğini inceleyebilir.'
                    : 'Can review past medication adherence and logs.'}
                </Text>
              </View>
              <Switch
                value={canViewHistory}
                onValueChange={setCanViewHistory}
                trackColor={{ false: '#CBD5E1', true: colors.primary + '80' }}
                thumbColor={canViewHistory ? colors.primary : '#F1F5F9'}
              />
            </View>
          </View>

          {/* Aksiyon Butonları */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}
              onPress={onClose}
              disabled={isSaving}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                {isTr ? 'Vazgeç' : 'Cancel'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <Text style={[styles.saveButtonText, { color: colors.textOnPrimary }]}>
                  {isTr ? 'Yetkileri Kaydet' : 'Save Permissions'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 24,
    padding: 20,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  permissionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  permIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  permTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  permTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  permDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
