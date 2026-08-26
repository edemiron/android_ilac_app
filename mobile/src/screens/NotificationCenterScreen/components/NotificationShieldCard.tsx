/**
 * NotificationShieldCard
 *
 * Canlı bildirim koruma kalkanı, izin rozetleri ve "Canlı Test Bildirimi Gönder" butonu.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { type PermissionStatus } from '../../../utils/notifications/permissions';

interface NotificationShieldCardProps {
  permissions: PermissionStatus | null;
  isShieldHealthy: boolean;
  isSendingTest: boolean;
  testSentMessage: string | null;
  onSendTest: () => void;
  onOpenPermissions: () => void;
}

export function NotificationShieldCard({
  permissions,
  isShieldHealthy,
  isSendingTest,
  testSentMessage,
  onSendTest,
  onOpenPermissions,
}: NotificationShieldCardProps) {
  const { isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isShieldHealthy ? (isDark ? '#0D9488' : '#14B8A6') : '#F59E0B',
        },
      ]}
    >
      {/* 1. Header Row: Shield Icon + Status Title */}
      <View style={styles.headerRow}>
        <View
          style={[
            styles.shieldIconBadge,
            {
              backgroundColor: isShieldHealthy
                ? 'rgba(20, 184, 166, 0.15)'
                : 'rgba(245, 158, 11, 0.15)',
            },
          ]}
        >
          <Ionicons
            name={isShieldHealthy ? 'shield-checkmark' : 'shield-half'}
            size={22}
            color={isShieldHealthy ? '#14B8A6' : '#F59E0B'}
          />
        </View>

        <View style={styles.headerTextContainer}>
          <Text style={[styles.title, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
            {isShieldHealthy ? 'Bildirim & Alarm Kalkanı Aktif' : 'Bazı İzinler İyileştirilmeli'}
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            {isShieldHealthy
              ? 'Telefonunuz alarmları kilit ekranında tam vaktinde çalmaya hazır.'
              : 'Xiaomi/Samsung pil kısıtlamaları alarmları geciktirebilir.'}
          </Text>
        </View>
      </View>

      {/* 2. Permission Badges Row */}
      <View style={styles.badgesRow}>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: permissions?.notifications
                ? 'rgba(16, 185, 129, 0.12)'
                : 'rgba(239, 68, 68, 0.12)',
            },
          ]}
        >
          <Ionicons
            name={permissions?.notifications ? 'checkmark-circle' : 'close-circle'}
            size={13}
            color={permissions?.notifications ? '#10B981' : '#EF4444'}
          />
          <Text
            style={[
              styles.badgeText,
              { color: permissions?.notifications ? '#10B981' : '#EF4444' },
            ]}
          >
            Bildirim İzni
          </Text>
        </View>

        <View
          style={[
            styles.badge,
            {
              backgroundColor: permissions?.exactAlarm
                ? 'rgba(16, 185, 129, 0.12)'
                : 'rgba(239, 68, 68, 0.12)',
            },
          ]}
        >
          <Ionicons
            name={permissions?.exactAlarm ? 'checkmark-circle' : 'close-circle'}
            size={13}
            color={permissions?.exactAlarm ? '#10B981' : '#EF4444'}
          />
          <Text
            style={[styles.badgeText, { color: permissions?.exactAlarm ? '#10B981' : '#EF4444' }]}
          >
            Tam Zamanlı Alarm
          </Text>
        </View>

        <View
          style={[
            styles.badge,
            {
              backgroundColor: permissions?.batteryOptimization
                ? 'rgba(16, 185, 129, 0.12)'
                : 'rgba(245, 158, 11, 0.12)',
            },
          ]}
        >
          <Ionicons
            name={permissions?.batteryOptimization ? 'checkmark-circle' : 'alert-circle'}
            size={13}
            color={permissions?.batteryOptimization ? '#10B981' : '#F59E0B'}
          />
          <Text
            style={[
              styles.badgeText,
              { color: permissions?.batteryOptimization ? '#10B981' : '#F59E0B' },
            ]}
          >
            Pil Koruması
          </Text>
        </View>
      </View>

      {/* 3. Action Row: Test Notification & Diagnostics Button */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.testButton, isSendingTest && styles.buttonDisabled]}
          onPress={onSendTest}
          disabled={isSendingTest}
          activeOpacity={0.8}
        >
          {isSendingTest ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="notifications" size={16} color="#FFFFFF" />
              <Text style={styles.testButtonText}>Canlı Test Bildirimi Gönder</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.diagnosticsButton,
            {
              backgroundColor: isDark ? '#334155' : '#F1F5F9',
            },
          ]}
          onPress={onOpenPermissions}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={16} color={isDark ? '#E2E8F0' : '#475569'} />
        </TouchableOpacity>
      </View>

      {/* 4. Live Toast Message */}
      {testSentMessage && (
        <View style={styles.toastContainer}>
          <Ionicons name="checkmark-done-circle" size={15} color="#0D9488" />
          <Text style={styles.toastText}>{testSentMessage}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  shieldIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    marginBottom: 14,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  testButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0D9488',
    paddingVertical: 10,
    borderRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  diagnosticsButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0D9488',
  },
});
