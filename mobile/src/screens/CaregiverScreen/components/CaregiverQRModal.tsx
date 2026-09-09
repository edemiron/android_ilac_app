/**
 * CaregiverQRModal — Davet QR kodu ve Paylaşım modalı
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';
import { ModalSheet } from '../../../components/common/ModalSheet';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface CaregiverQRModalProps {
  visible: boolean;
  onClose: () => void;
  currentInviteCode: string | null;
  qrCodeData: string | null;
  onShareInvite: () => void;
  colors: ThemeColors;
  t: {
    shareInvite: string;
    qrSubtitle: string;
  };
}

export function CaregiverQRModal({
  visible,
  onClose,
  currentInviteCode,
  qrCodeData,
  onShareInvite,
  colors,
  t,
}: CaregiverQRModalProps) {
  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      showCloseButton
      actions={
        currentInviteCode ? (
          <TouchableOpacity
            style={[styles.shareButton, { backgroundColor: colors.primary }]}
            onPress={onShareInvite}
          >
            <Ionicons name="share-outline" size={20} color={colors.textOnPrimary} />
            <Text style={[styles.shareButtonText, { color: colors.textOnPrimary }]}>
              {t.shareInvite}
            </Text>
          </TouchableOpacity>
        ) : null
      }
    >
      {currentInviteCode && (
        <View style={styles.modalContent}>
          <QRCode
            value={qrCodeData || currentInviteCode}
            size={200}
            color={colors.text}
            backgroundColor="transparent"
          />
          <Text style={[styles.inviteCodeText, { color: colors.text }]}>{currentInviteCode}</Text>
          <Text style={[styles.qrSubtitle, { color: colors.textSecondary }]}>{t.qrSubtitle}</Text>
        </View>
      )}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  inviteCodeText: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 4,
    marginTop: 16,
    marginBottom: 8,
  },
  qrSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
