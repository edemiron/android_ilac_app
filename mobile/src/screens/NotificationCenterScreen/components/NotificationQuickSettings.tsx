/**
 * NotificationQuickSettings
 *
 * TTS ve Alarm Melodisi ayarlarına hızlı erişim kartı.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';

interface NotificationQuickSettingsProps {
  onNavigateTts: () => void;
  onNavigateSettings: () => void;
  onNavigatePermissions: () => void;
}

export function NotificationQuickSettings({
  onNavigateTts,
  onNavigateSettings,
  onNavigatePermissions,
}: NotificationQuickSettingsProps) {
  const { isDark } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
        HIZLI BİLDİRİM & SES KISAYOLLARI
      </Text>

      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderColor: isDark ? '#334155' : '#E2E8F0',
          },
        ]}
      >
        {/* 1. Sesli Okuma (TTS) */}
        <TouchableOpacity style={styles.row} onPress={onNavigateTts} activeOpacity={0.7}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(13, 148, 136, 0.12)' }]}>
            <Ionicons name="mic-outline" size={18} color="#0D9488" />
          </View>
          <View style={styles.rowContent}>
            <Text style={[styles.rowTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              Sesli Bildirimler (TTS)
            </Text>
            <Text style={[styles.rowSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Konuşma hızı, ses tonu ve duyuru ayarları
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={isDark ? '#64748B' : '#94A3B8'} />
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />

        {/* 2. Alarm Melodisi & Ses Düzeyi */}
        <TouchableOpacity style={styles.row} onPress={onNavigateSettings} activeOpacity={0.7}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(2, 132, 199, 0.12)' }]}>
            <Ionicons name="musical-notes-outline" size={18} color="#0284C7" />
          </View>
          <View style={styles.rowContent}>
            <Text style={[styles.rowTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              Alarm Melodisi & Ses Düzeyi
            </Text>
            <Text style={[styles.rowSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Kritik hatırlatıcı sesleri ve erteleme süresi
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={isDark ? '#64748B' : '#94A3B8'} />
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]} />

        {/* 3. İzin & Teşhis Kalkanı */}
        <TouchableOpacity style={styles.row} onPress={onNavigatePermissions} activeOpacity={0.7}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#D97706" />
          </View>
          <View style={styles.rowContent}>
            <Text style={[styles.rowTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              Detaylı İzin & Teşhis Raporu
            </Text>
            <Text style={[styles.rowSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              Kilit ekranı, MIUI ve pil muafiyeti rehberi
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={isDark ? '#64748B' : '#94A3B8'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginLeft: 62,
  },
});
