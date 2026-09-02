/**
 * MissedDoseTriageModal.tsx — Kaçırılan Doz Klinik Rehberlik Modalı (Sprint 104)
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MissedDoseEvaluation } from '../../utils/clinicalSafetyEngine';

interface MissedDoseTriageModalProps {
  visible: boolean;
  onClose: () => void;
  evaluation: MissedDoseEvaluation;
  language: 'tr' | 'en';
}

export function MissedDoseTriageModal({
  visible,
  onClose,
  evaluation,
  language,
}: MissedDoseTriageModalProps) {
  const isTakeNow = evaluation.action === 'TAKE_NOW';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={[styles.iconBox, { backgroundColor: isTakeNow ? '#ECFDF5' : '#FEF2F2' }]}>
              <Ionicons
                name={isTakeNow ? 'checkmark-circle' : 'alert-circle'}
                size={32}
                color={isTakeNow ? '#059669' : '#DC2626'}
              />
            </View>
            <Text style={styles.title}>
              {language === 'tr' ? evaluation.titleTr : evaluation.titleEn}
            </Text>
          </View>

          <Text style={styles.description}>
            {language === 'tr' ? evaluation.descriptionTr : evaluation.descriptionEn}
          </Text>

          <View
            style={[
              styles.tipBox,
              {
                backgroundColor: isTakeNow ? '#F0FDF4' : '#FFF1F2',
                borderColor: isTakeNow ? '#BBF7D0' : '#FECDD3',
              },
            ]}
          >
            <Text style={[styles.tipText, { color: isTakeNow ? '#166534' : '#9F1239' }]}>
              {language === 'tr' ? evaluation.safetyTipTr : evaluation.safetyTipEn}
            </Text>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.closeBtnText}>
              {language === 'tr' ? 'Tamam, Anladım' : 'Okay, Understood'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 14,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 16,
  },
  tipBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 18,
  },
  tipText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  closeBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
