/**
 * CaregiverQuickShareBar — Çok Kanallı Hızlı Davet Çubuğu
 *
 * WhatsApp, SMS/Sistem Paylaşımı ve Canlı QR Kod hızlı erişim butonları.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface CaregiverQuickShareBarProps {
  onWhatsAppShare: () => void;
  onNativeShare: () => void;
  onShowQR: () => void;
  colors: ThemeColors;
  isDark: boolean;
  language: string;
}

export function CaregiverQuickShareBar({
  onWhatsAppShare,
  onNativeShare,
  onShowQR,
  colors,
  isDark,
  language,
}: CaregiverQuickShareBarProps) {
  const isTr = language === 'tr';

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {isTr ? '⚡ Hızlı Davet Kanalları' : '⚡ Quick Invite Channels'}
      </Text>

      <View style={styles.buttonsRow}>
        {/* WhatsApp Butonu */}
        <TouchableOpacity
          style={[styles.quickButton, { backgroundColor: '#25D366' }]}
          onPress={onWhatsAppShare}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
          <Text style={styles.quickButtonText}>WhatsApp</Text>
        </TouchableOpacity>

        {/* SMS / Sistem Paylaşım Butonu */}
        <TouchableOpacity
          style={[styles.quickButton, { backgroundColor: isDark ? '#334155' : '#475569' }]}
          onPress={onNativeShare}
          activeOpacity={0.8}
        >
          <Ionicons name="share-social" size={20} color="#FFFFFF" />
          <Text style={styles.quickButtonText}>{isTr ? 'SMS / Paylaş' : 'Share / SMS'}</Text>
        </TouchableOpacity>

        {/* QR Kod Butonu */}
        <TouchableOpacity
          style={[styles.quickButton, { backgroundColor: colors.primary }]}
          onPress={onShowQR}
          activeOpacity={0.8}
        >
          <Ionicons name="qr-code" size={20} color={colors.textOnPrimary} />
          <Text style={[styles.quickButtonText, { color: colors.textOnPrimary }]}>
            {isTr ? 'QR Kod' : 'QR Code'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  quickButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
