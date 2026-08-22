import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAlert } from '../../contexts/AlertContext';
import {
  getDeviceManufacturer,
  getOEMInstructions,
  openMIUIBatterySettings,
  openMIUIAutoStartSettings,
  markMIUIWarningShown,
} from '../../utils/miuiHelper';

interface BatteryOptimizationCardProps {
  onDismiss?: () => void;
  compact?: boolean;
}

export function BatteryOptimizationCard({
  onDismiss,
  compact = false,
}: BatteryOptimizationCardProps) {
  const { language } = useLanguage();
  const { colors, isDark } = useTheme();
  const { showAlert } = useAlert();
  const isTr = language === 'tr';

  const [dismissed, setDismissed] = useState(false);
  const manufacturer = getDeviceManufacturer();

  if (dismissed) return null;

  const handleShowFullGuide = () => {
    const instructions = getOEMInstructions(manufacturer, isTr ? 'tr' : 'en');
    showAlert({
      type: 'info',
      title: isTr ? 'Kesintisiz Alarm Rehberi' : 'Battery Whitelist Guide',
      message: instructions,
      buttons: [
        {
          text: isTr ? 'Pil Ayarlarına Git' : 'Open Battery Settings',
          onPress: () => openMIUIBatterySettings(),
        },
        {
          text: isTr ? 'Oto-Başlatmayı Aç' : 'Open Auto-Start',
          onPress: () => openMIUIAutoStartSettings(),
        },
        {
          text: isTr ? 'Anladım' : 'Got it',
          style: 'cancel',
        },
      ],
    });
  };

  const handleDismiss = async () => {
    setDismissed(true);
    await markMIUIWarningShown();
    onDismiss?.();
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#1E293B' : '#FEF3C7',
          borderColor: isDark ? '#334155' : '#FDE68A',
        },
        compact && styles.compactCard,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.iconContainer}>
          <Ionicons name="battery-charging" size={20} color="#D97706" />
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: isDark ? '#F8FAFC' : '#92400E' }]}>
            {isTr ? 'Alarmların Kesintisiz Çalması İçin' : 'Ensure Reliable Alarms'}
          </Text>
          <Text style={[styles.description, { color: isDark ? '#94A3B8' : '#B45309' }]}>
            {isTr
              ? `${manufacturer.toUpperCase()} cihazınız alarmları uyutabilir. Pil kısıtlamasını kapatın.`
              : `Your ${manufacturer.toUpperCase()} device may sleep alarms. Disable battery restrictions.`}
          </Text>
        </View>

        {onDismiss && (
          <TouchableOpacity onPress={handleDismiss} style={styles.closeBtn}>
            <Ionicons name="close" size={18} color={isDark ? '#94A3B8' : '#B45309'} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
          onPress={handleShowFullGuide}
          activeOpacity={0.8}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={16}
            color="#FFFFFF"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.primaryActionText}>
            {isTr ? 'Rehberi Gör & Ayarla' : 'Open Setup Guide'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickSettingsBtn}
          onPress={() => openMIUIBatterySettings()}
          activeOpacity={0.7}
        >
          <Text style={[styles.quickSettingsText, { color: isDark ? '#38BDF8' : '#D97706' }]}>
            {isTr ? 'Ayarları Aç' : 'Open Settings'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  compactCard: {
    marginHorizontal: 0,
    marginVertical: 4,
    padding: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 8,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  quickSettingsBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  quickSettingsText: {
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
