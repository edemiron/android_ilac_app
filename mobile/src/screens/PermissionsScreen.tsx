import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  checkAllPermissions,
  requestNotificationPermissions,
  requestExactAlarmPermission,
  requestBatteryOptimizationPermission,
  openDndSettings,
  openNotificationSettings,
} from '../utils/notifications';

interface PermissionsScreenProps {
  onComplete: () => void;
}

interface PermissionStatus {
  notifications: boolean;
  exactAlarm: boolean;
  batteryOptimization: boolean;
  dnd: boolean;
  fullScreenIntent: boolean;
}

export default function PermissionsScreen({ onComplete }: PermissionsScreenProps) {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const [permissions, setPermissions] = useState<PermissionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);

  const checkPermissions = async () => {
    setIsLoading(true);
    const status = await checkAllPermissions();
    setPermissions(status);
    setIsLoading(false);
  };

  useEffect(() => {
    checkPermissions();
  }, []);

  const handleRequestNotifications = async () => {
    setIsRequesting(true);
    await requestNotificationPermissions();
    await checkPermissions();
    setIsRequesting(false);
  };

  const handleRequestExactAlarm = async () => {
    await requestExactAlarmPermission();
    // Ayarlardan döndükten sonra kontrol et
    setTimeout(checkPermissions, 1000);
  };

  const handleRequestBatteryOptimization = async () => {
    await requestBatteryOptimizationPermission();
    setTimeout(checkPermissions, 1000);
  };

  const handleOpenDndSettings = async () => {
    await openDndSettings();
    setTimeout(checkPermissions, 1000);
  };

  const handleOpenNotificationSettings = async () => {
    await openNotificationSettings();
    setTimeout(checkPermissions, 1000);
  };

  const allPermissionsGranted = permissions && 
    permissions.notifications && 
    permissions.exactAlarm;

  const styles = createStyles(colors);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="notifications" size={48} color={colors.primary} />
          </View>
          <Text style={styles.title}>
            {language === 'tr' ? 'İzinler Gerekli' : 'Permissions Required'}
          </Text>
          <Text style={styles.subtitle}>
            {language === 'tr' 
              ? 'İlaç hatırlatmalarının düzgün çalışması için aşağıdaki izinlere ihtiyacımız var.'
              : 'We need the following permissions for medication reminders to work properly.'}
          </Text>
        </View>

        {/* Permission Items */}
        <View style={styles.permissionsContainer}>
          {/* Bildirim İzni */}
          <View style={styles.permissionItem}>
            <View style={styles.permissionInfo}>
              <View style={[styles.permissionIcon, { backgroundColor: permissions?.notifications ? '#10B98120' : '#EF444420' }]}>
                <Ionicons 
                  name={permissions?.notifications ? "checkmark-circle" : "notifications-outline"} 
                  size={24} 
                  color={permissions?.notifications ? '#10B981' : '#EF4444'} 
                />
              </View>
              <View style={styles.permissionText}>
                <Text style={styles.permissionTitle}>
                  {language === 'tr' ? 'Bildirimler' : 'Notifications'}
                </Text>
                <Text style={styles.permissionDescription}>
                  {language === 'tr' 
                    ? 'İlaç saati geldiğinde sizi uyarmak için' 
                    : 'To alert you when it\'s time for medication'}
                </Text>
              </View>
            </View>
            {!permissions?.notifications && (
              <TouchableOpacity 
                style={styles.permissionButton}
                onPress={handleRequestNotifications}
                disabled={isRequesting}
              >
                <Text style={styles.permissionButtonText}>
                  {language === 'tr' ? 'İzin Ver' : 'Allow'}
                </Text>
              </TouchableOpacity>
            )}
            {permissions?.notifications && (
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            )}
          </View>

          {/* Kesin Alarm İzni (Android 12+) */}
          {Platform.OS === 'android' && (
            <View style={styles.permissionItem}>
              <View style={styles.permissionInfo}>
                <View style={[styles.permissionIcon, { backgroundColor: permissions?.exactAlarm ? '#10B98120' : '#F59E0B20' }]}>
                  <Ionicons 
                    name={permissions?.exactAlarm ? "checkmark-circle" : "alarm-outline"} 
                    size={24} 
                    color={permissions?.exactAlarm ? '#10B981' : '#F59E0B'} 
                  />
                </View>
                <View style={styles.permissionText}>
                  <Text style={styles.permissionTitle}>
                    {language === 'tr' ? 'Kesin Alarm' : 'Exact Alarm'}
                  </Text>
                  <Text style={styles.permissionDescription}>
                    {language === 'tr' 
                      ? 'Alarmların tam zamanında çalması için' 
                      : 'For alarms to trigger at exact times'}
                  </Text>
                </View>
              </View>
              {!permissions?.exactAlarm && (
                <TouchableOpacity 
                  style={styles.permissionButton}
                  onPress={handleRequestExactAlarm}
                >
                  <Text style={styles.permissionButtonText}>
                    {language === 'tr' ? 'Ayarla' : 'Set'}
                  </Text>
                </TouchableOpacity>
              )}
              {permissions?.exactAlarm && (
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              )}
            </View>
          )}

          {/* Pil Optimizasyonu (Opsiyonel) */}
          {Platform.OS === 'android' && (
            <View style={styles.permissionItem}>
              <View style={styles.permissionInfo}>
                <View style={[styles.permissionIcon, { backgroundColor: permissions?.batteryOptimization ? '#10B98120' : '#6366F120' }]}>
                  <Ionicons 
                    name={permissions?.batteryOptimization ? "checkmark-circle" : "battery-charging-outline"} 
                    size={24} 
                    color={permissions?.batteryOptimization ? '#10B981' : '#6366F1'} 
                  />
                </View>
                <View style={styles.permissionText}>
                  <Text style={styles.permissionTitle}>
                    {language === 'tr' ? 'Pil Optimizasyonu' : 'Battery Optimization'}
                  </Text>
                  <Text style={styles.permissionDescription}>
                    {language === 'tr' 
                      ? 'Arka planda çalışmaya devam etmek için (önerilen)' 
                      : 'To keep running in background (recommended)'}
                  </Text>
                </View>
              </View>
              {!permissions?.batteryOptimization && (
                <TouchableOpacity 
                  style={[styles.permissionButton, styles.optionalButton]}
                  onPress={handleRequestBatteryOptimization}
                >
                  <Text style={[styles.permissionButtonText, { color: colors.primary }]}>
                    {language === 'tr' ? 'Ayarla' : 'Set'}
                  </Text>
                </TouchableOpacity>
              )}
              {permissions?.batteryOptimization && (
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              )}
            </View>
          )}

          {/* Bildirim Kanalı Ayarları */}
          <View style={styles.permissionItem}>
            <View style={styles.permissionInfo}>
              <View style={[styles.permissionIcon, { backgroundColor: '#3B82F620' }]}>
                <Ionicons name="settings-outline" size={24} color="#3B82F6" />
              </View>
              <View style={styles.permissionText}>
                <Text style={styles.permissionTitle}>
                  {language === 'tr' ? 'Bildirim Ayarları' : 'Notification Settings'}
                </Text>
                <Text style={styles.permissionDescription}>
                  {language === 'tr' 
                    ? 'Sessiz modda bile ses çalması için "İlaç Alarmları" kanalını kontrol edin' 
                    : 'Check "Medicine Alarms" channel to play sound even in silent mode'}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.permissionButton, styles.optionalButton]}
              onPress={handleOpenNotificationSettings}
            >
              <Text style={[styles.permissionButtonText, { color: colors.primary }]}>
                {language === 'tr' ? 'Aç' : 'Open'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            {language === 'tr' 
              ? 'Bu izinler sadece ilaç hatırlatmaları için kullanılır. Verileriniz güvende.'
              : 'These permissions are only used for medication reminders. Your data is safe.'}
          </Text>
        </View>

        {/* Continue Button */}
        <TouchableOpacity 
          style={[
            styles.continueButton,
            !allPermissionsGranted && styles.continueButtonDisabled
          ]}
          onPress={onComplete}
          disabled={!allPermissionsGranted}
        >
          <Text style={styles.continueButtonText}>
            {allPermissionsGranted 
              ? (language === 'tr' ? 'Devam Et' : 'Continue')
              : (language === 'tr' ? 'Lütfen izinleri verin' : 'Please grant permissions')}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Skip Option */}
        <TouchableOpacity style={styles.skipButton} onPress={onComplete}>
          <Text style={styles.skipButtonText}>
            {language === 'tr' ? 'Şimdilik Atla' : 'Skip for now'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionsContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  permissionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  permissionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  permissionText: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  permissionDescription: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  optionalButton: {
    backgroundColor: colors.primary + '20',
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 12,
    lineHeight: 18,
  },
  continueButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  continueButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  skipButton: {
    alignItems: 'center',
    padding: 12,
  },
  skipButtonText: {
    fontSize: 15,
    color: colors.textMuted,
  },
});
