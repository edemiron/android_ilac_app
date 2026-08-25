/**
 * CaregiverPatientsList — Takip Edilen Hastalar ve Yakınlar Listesi
 *
 * 2026 Modern Bakıcı Sağlık Takip Paneli:
 * - Bağlı hasta kartları, izin rozetleri ve canlı durum
 * - Takipten ayrılma / kaldırma aksiyonları
 * - Zengin boş durum (Empty State) tasarımı
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { PatientInfo } from '../../../types';
import type { ThemeColors } from '../../../contexts/ThemeContext';
import { CaregiverPatientDetailModal } from './CaregiverPatientDetailModal';

interface CaregiverPatientsListProps {
  patients: PatientInfo[];
  isLoading: boolean;
  onRemovePatient: (relationshipId: string, name: string) => void;
  colors: ThemeColors;
  isDark?: boolean;
  language: string;
}

export function CaregiverPatientsList({
  patients,
  isLoading,
  onRemovePatient,
  colors,
  isDark = false,
  language,
}: CaregiverPatientsListProps) {
  const isTr = language === 'tr';
  const [selectedPatient, setSelectedPatient] = useState<PatientInfo | null>(null);

  const renderPermissions = (patient: PatientInfo) => {
    const perms = [];
    if (patient.canReceiveAlerts) {
      perms.push({
        label: isTr ? 'Acil Bildirim' : 'Alerts',
        icon: 'notifications',
        bg: '#FEE2E2',
        color: '#DC2626',
      });
    }
    if (patient.canViewSchedule) {
      perms.push({
        label: isTr ? 'Takvim' : 'Schedule',
        icon: 'calendar',
        bg: '#E0F2FE',
        color: '#0284C7',
      });
    }
    if (patient.canViewHistory) {
      perms.push({
        label: isTr ? 'Geçmiş' : 'History',
        icon: 'analytics',
        bg: '#DCFCE7',
        color: '#16A34A',
      });
    }

    if (perms.length === 0) {
      perms.push({
        label: isTr ? 'Tam Yetki' : 'Full Access',
        icon: 'checkmark-circle',
        bg: '#E0E7FF',
        color: '#4F46E5',
      });
    }

    return (
      <View style={styles.permissionBadgeContainer}>
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

  const getInitials = (name: string) => {
    if (!name) return 'H';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.titleWithBadge}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {isTr ? 'Takip Ettiğim Kişiler' : 'Patients I Care For'}
          </Text>
          {patients.length > 0 && (
            <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.countBadgeText}>{patients.length}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Yükleniyor Durumu */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {isTr ? 'Hasta kayıtları getiriliyor...' : 'Loading patient records...'}
          </Text>
        </View>
      ) : patients.length === 0 ? (
        /* Boş Durum */
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: colors.card,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            },
          ]}
        >
          <View style={[styles.emptyIconCircle, { backgroundColor: `${colors.primary}18` }]}>
            <Ionicons name="people-outline" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {isTr ? 'Henüz Takip Ettiğiniz Bir Yakınınız Yok' : 'No Patients Connected Yet'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {isTr
              ? 'Yukarıdaki alana yakınınızın verdiği 6 haneli davet kodunu girerek veya QR kodunu okutarak hastanızı anında koruma çemberinize ekleyebilirsiniz.'
              : 'Enter the 6-character code or scan QR above to start monitoring your loved one.'}
          </Text>
        </View>
      ) : (
        /* Hasta Listesi */
        <View style={styles.list}>
          {patients.map(patient => {
            const patientName = patient.name || (isTr ? 'Kayıtlı Hasta' : 'Patient');
            const initials = getInitials(patientName);

            return (
              <TouchableOpacity
                key={patient.relationshipId}
                style={[
                  styles.patientCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                    shadowColor: colors.shadow,
                  },
                ]}
                onPress={() => setSelectedPatient(patient)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`${patientName} ilaç takibi detayları`}
              >
                {/* Sol Yeşil Sağlık Çubuğu */}
                <View style={styles.statusAccentBar} />

                <View style={styles.cardContent}>
                  {/* Üst Kısım: Avatar + İsim + Ayrıl Butonu */}
                  <View style={styles.cardHeader}>
                    <View style={[styles.avatar, { backgroundColor: `${colors.primary}20` }]}>
                      <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
                    </View>

                    <View style={styles.patientInfo}>
                      <View style={styles.nameRow}>
                        <Text
                          style={[styles.patientName, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {patientName}
                        </Text>
                        <View style={styles.liveBadge}>
                          <View style={styles.liveDot} />
                          <Text style={styles.liveBadgeText}>{isTr ? 'CANLI TAKİP' : 'LIVE'}</Text>
                        </View>
                      </View>
                      {patient.email && (
                        <Text
                          style={[styles.patientEmail, { color: colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {patient.email}
                        </Text>
                      )}
                    </View>

                    {/* Takipten Ayrıl Butonu */}
                    <TouchableOpacity
                      style={[
                        styles.removeButton,
                        {
                          backgroundColor: isDark ? colors.inputBackground : '#FEE2E2',
                        },
                      ]}
                      onPress={e => {
                        e.stopPropagation();
                        onRemovePatient(patient.relationshipId, patientName);
                      }}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={isTr ? 'Takipten Ayrıl' : 'Stop Tracking'}
                    >
                      <Ionicons name="log-out-outline" size={17} color="#DC2626" />
                    </TouchableOpacity>
                  </View>

                  {/* İzinler Satırı */}
                  {renderPermissions(patient)}

                  {/* Güvence Açıklaması & İlaç Programı Köprüsü */}
                  <View
                    style={[
                      styles.patientFooter,
                      {
                        borderTopColor: isDark
                          ? 'rgba(255, 255, 255, 0.06)'
                          : 'rgba(0, 0, 0, 0.04)',
                      },
                    ]}
                  >
                    <View style={styles.footerLeft}>
                      <Ionicons name="notifications-circle" size={16} color="#16A34A" />
                      <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                        {isTr
                          ? 'Kritik saatler ve canlı uyarılar bu cihaza iletilir.'
                          : 'Live updates delivered to this device.'}
                      </Text>
                    </View>
                    <View style={styles.viewDetailBadge}>
                      <Text style={[styles.viewDetailText, { color: colors.primary }]}>
                        {isTr ? 'İlaçları Gör ›' : 'View Meds ›'}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Hasta Detay & Canlı İlaç Takip Modalı */}
      <CaregiverPatientDetailModal
        visible={!!selectedPatient}
        patient={selectedPatient}
        onClose={() => setSelectedPatient(null)}
        colors={colors}
        isDark={isDark}
        language={language}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  list: {
    gap: 12,
  },
  patientCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statusAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4.5,
    backgroundColor: '#16A34A',
  },
  cardContent: {
    padding: 14,
    paddingLeft: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  patientInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#16A34A',
  },
  liveBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.3,
  },
  patientEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionBadgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
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
  patientFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  footerText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 15,
  },
  viewDetailBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
  },
  viewDetailText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
});
