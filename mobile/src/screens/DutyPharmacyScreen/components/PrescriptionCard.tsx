/**
 * PrescriptionCard — Reçete Kartı Bileşeni
 *
 * E-Reçete kodu, doktor & hastane bilgisi, kalan gün rozeti,
 * bağlı ilaçlar ve en yakın nöbetçi eczaneye hızlı erişim sağlar.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getPrescriptionStatus } from '../../../services/prescriptionService';
import type { Prescription } from '../../../types/prescription';
import type { Medicine } from '../../../types';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface PrescriptionCardProps {
  item: Prescription;
  allMedicines: Medicine[];
  onFindPharmacy: () => void;
  onEdit: (item: Prescription) => void;
  onDelete: (id: string) => void;
  colors: ThemeColors;
  isDark: boolean;
  isTr: boolean;
}

export function PrescriptionCard({
  item,
  allMedicines,
  onFindPharmacy,
  onEdit,
  onDelete,
  colors,
  isDark,
  isTr,
}: PrescriptionCardProps) {
  const statusInfo = getPrescriptionStatus(item.expiryDate);

  const linkedMedicines = (item.medicineIds || [])
    .map(id => allMedicines.find(m => m.id === id))
    .filter((m): m is Medicine => !!m);

  const confirmDelete = () => {
    Alert.alert(
      isTr ? 'Reçeteyi Sil' : 'Delete Prescription',
      isTr
        ? 'Bu reçeteyi ve hatırlatmalarını silmek istediğinize emin misiniz?'
        : 'Are you sure you want to delete this prescription?',
      [
        { text: isTr ? 'Vazgeç' : 'Cancel', style: 'cancel' },
        {
          text: isTr ? 'Sil' : 'Delete',
          style: 'destructive',
          onPress: () => onDelete(item.id),
        },
      ]
    );
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isDark ? '#334155' : '#E2E8F0',
        },
      ]}
    >
      {/* Header: Title & Expiry Badge */}
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
          {item.prescriptionCode ? (
            <View style={styles.codeRow}>
              <Ionicons name="barcode-outline" size={14} color={isDark ? '#38BDF8' : '#0284C7'} />
              <Text style={[styles.codeText, { color: isDark ? '#38BDF8' : '#0284C7' }]}>
                {item.prescriptionCode}
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: `${statusInfo.color}20`,
              borderColor: `${statusInfo.color}40`,
            },
          ]}
        >
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {isTr ? statusInfo.labelTr : statusInfo.labelEn}
          </Text>
        </View>
      </View>

      {/* Doctor & Hospital Details */}
      {(item.doctorName || item.hospitalName) && (
        <View style={styles.metaRow}>
          {item.doctorName ? (
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={13} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {item.doctorName}
              </Text>
            </View>
          ) : null}
          {item.hospitalName ? (
            <View style={styles.metaItem}>
              <Ionicons name="business-outline" size={13} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {item.hospitalName}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Dates Row */}
      <View style={styles.datesContainer}>
        <View style={styles.dateBlock}>
          <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
            {isTr ? 'Veriliş Tarihi' : 'Prescribed'}
          </Text>
          <Text style={[styles.dateValue, { color: colors.text }]}>{item.prescribedDate}</Text>
        </View>
        <View style={styles.dateBlock}>
          <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
            {isTr ? 'Bitiş Tarihi' : 'Expires'}
          </Text>
          <Text style={[styles.dateValue, { color: colors.text }]}>{item.expiryDate}</Text>
        </View>
      </View>

      {/* Linked Medicines */}
      {linkedMedicines.length > 0 && (
        <View style={styles.medicinesSection}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            {isTr ? 'Reçetedeki İlaçlar:' : 'Prescribed Medicines:'}
          </Text>
          <View style={styles.medicinesWrap}>
            {linkedMedicines.map(med => (
              <View
                key={med.id}
                style={[
                  styles.medicineChip,
                  {
                    backgroundColor: isDark ? 'rgba(45, 212, 191, 0.15)' : '#CCFBF1',
                  },
                ]}
              >
                <Text style={[styles.medicineChipText, { color: isDark ? '#2DD4BF' : '#0F766E' }]}>
                  💊 {med.name} {med.dosage ? `(${med.dosage})` : ''}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.findPharmacyBtn, { backgroundColor: '#0F766E' }]}
          onPress={onFindPharmacy}
          activeOpacity={0.8}
        >
          <Ionicons name="location" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.findPharmacyText}>
            {isTr ? 'Nöbetçi Eczaneden Al' : 'Find at Pharmacy'}
          </Text>
        </TouchableOpacity>

        <View style={styles.secondaryActions}>
          <TouchableOpacity
            style={[
              styles.iconBtn,
              { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9' },
            ]}
            onPress={() => onEdit(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.iconBtn,
              { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' },
            ]}
            onPress={confirmDelete}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  codeText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12.5,
  },
  datesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  dateBlock: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  medicinesSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11.5,
    marginBottom: 6,
  },
  medicinesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  medicineChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  medicineChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  findPharmacyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  findPharmacyText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
