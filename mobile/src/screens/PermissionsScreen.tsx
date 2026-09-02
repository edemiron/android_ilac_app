/**
 * PermissionsScreen — Sistem İzinleri & Donanım Optimizasyonu Ekranı
 *
 * Design Pattern: Presenter Pattern / Declarative View
 * Tüm Android izin durum kontrolleri, izin talepleri ve Evrensel OEM Kalkanı
 * `usePermissionsController` Presenter Hook'una devredilmiştir.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

// Alt Bileşenler (Modular UI)
import { PermissionsHeader } from './PermissionsScreen/components/PermissionsHeader';
import { PermissionItemRow } from './PermissionsScreen/components/PermissionItemRow';
import { PermissionsInfoBox } from './PermissionsScreen/components/PermissionsInfoBox';
import { PermissionsActionButtons } from './PermissionsScreen/components/PermissionsActionButtons';
import { OEMShieldCard } from './PermissionsScreen/components/OEMShieldCard';

// Presenter Hook
import { usePermissionsController } from './PermissionsScreen/hooks/usePermissionsController';

interface PermissionsScreenProps {
  onComplete?: () => void;
}

export default function PermissionsScreen({ onComplete }: PermissionsScreenProps) {
  const navigation = useNavigation<any>();
  const {
    colors,
    isDark,
    language,
    permissions,
    oemShieldStatus,
    oemGuide,
    isLoading,
    isRequesting,
    isTestingAlarm,
    testAlarmScheduled,
    allPermissionsGranted,
    handleRequestNotifications,
    handleRequestExactAlarm,
    handleRequestBatteryOptimization,
    handleOpenNotificationSettings,
    handleOpenFullScreenIntentSettings,
    handleOpenPowerManagerSettings,
    handleOpenOEMSetting,
    handleStartAlarmTest,
  } = usePermissionsController();

  const handleCompleteOrBack =
    onComplete ||
    (() => {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Main');
      }
    });

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Başlık & Açıklama */}
        <PermissionsHeader
          colors={colors}
          language={language}
          onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        />

        {/* 2. Cihaz Koruma Kalkanı & Canlı Donanım Alarm Testi (OEM Shield Card) */}
        {Platform.OS === 'android' && oemGuide && (
          <OEMShieldCard
            oemShieldStatus={oemShieldStatus}
            oemGuide={oemGuide}
            colors={colors}
            isDark={isDark}
            language={language}
            isTestingAlarm={isTestingAlarm}
            testAlarmScheduled={testAlarmScheduled}
            onPressStepAction={handleOpenOEMSetting}
            onStartAlarmTest={handleStartAlarmTest}
          />
        )}

        {/* 3. Temel Sistem İzinleri Listesi Konteyneri */}
        <View style={[styles.permissionsContainer, { backgroundColor: colors.card }]}>
          {/* Bildirim İzni */}
          <PermissionItemRow
            iconName="notifications-outline"
            iconColor={permissions?.notifications ? '#10B981' : '#EF4444'}
            title={language === 'tr' ? 'Bildirimler' : 'Notifications'}
            description={
              language === 'tr'
                ? 'İlaç saati geldiğinde sizi uyarmak için'
                : "To alert you when it's time for medication"
            }
            isGranted={Boolean(permissions?.notifications)}
            actionText={language === 'tr' ? 'İzin Ver' : 'Allow'}
            onPressAction={handleRequestNotifications}
            disabled={isRequesting}
            colors={colors}
          />

          {/* Kesin Alarm İzni (Android 12+) */}
          {Platform.OS === 'android' && (
            <PermissionItemRow
              iconName="alarm-outline"
              iconColor={permissions?.exactAlarm ? '#10B981' : '#F59E0B'}
              title={language === 'tr' ? 'Kesin Alarm' : 'Exact Alarm'}
              description={
                language === 'tr'
                  ? 'Alarmların tam zamanında çalması için'
                  : 'For alarms to trigger at exact times'
              }
              isGranted={Boolean(permissions?.exactAlarm)}
              actionText={language === 'tr' ? 'Ayarla' : 'Set'}
              onPressAction={handleRequestExactAlarm}
              colors={colors}
            />
          )}

          {/* Tam Ekran Bildirim İzni (Android 14+) */}
          {Platform.OS === 'android' && Platform.Version >= 34 && (
            <PermissionItemRow
              iconName="expand-outline"
              iconColor={permissions?.fullScreenIntent ? '#10B981' : '#EF4444'}
              title={language === 'tr' ? 'Tam Ekran Bildirim' : 'Full Screen Notifications'}
              description={
                language === 'tr'
                  ? 'İlaç saatinde tam ekran alarm göstermek için (kritik)'
                  : 'To show full screen alarm at medication time (critical)'
              }
              isGranted={Boolean(permissions?.fullScreenIntent)}
              actionText={language === 'tr' ? 'Ayarla' : 'Set'}
              onPressAction={handleOpenFullScreenIntentSettings}
              colors={colors}
            />
          )}

          {/* Pil Optimizasyonu (Kritik) */}
          {Platform.OS === 'android' && (
            <PermissionItemRow
              iconName="battery-charging-outline"
              iconColor={permissions?.batteryOptimization ? '#10B981' : '#EF4444'}
              title={language === 'tr' ? 'Pil Optimizasyonu' : 'Battery Optimization'}
              description={
                language === 'tr'
                  ? 'Arka planda alarm çalması için KRİTİK (kapalı olmalı)'
                  : 'CRITICAL for background alarms (must be disabled)'
              }
              isGranted={Boolean(permissions?.batteryOptimization)}
              actionText={language === 'tr' ? 'Ayarla' : 'Set'}
              onPressAction={handleRequestBatteryOptimization}
              colors={colors}
            />
          )}

          {/* Bildirim Kanalı Ayarları */}
          <PermissionItemRow
            iconName="settings-outline"
            iconColor="#3B82F6"
            title={language === 'tr' ? 'Bildirim Ayarları' : 'Notification Settings'}
            description={
              language === 'tr'
                ? 'Sessiz modda bile ses çalması için "İlaç Alarmları" kanalını kontrol edin'
                : 'Check "Medicine Alarms" channel to play sound even in silent mode'
            }
            isGranted={false}
            actionText={language === 'tr' ? 'Aç' : 'Open'}
            onPressAction={handleOpenNotificationSettings}
            isOptional
            colors={colors}
          />
        </View>

        {/* 4. Bilgilendirme Kutusu */}
        <PermissionsInfoBox colors={colors} language={language} />

        {/* 5. Devam Et & Şimdilik Atla Butonları */}
        <PermissionsActionButtons
          allPermissionsGranted={allPermissionsGranted}
          onComplete={handleCompleteOrBack}
          colors={colors}
          language={language}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 24,
  },
  permissionsContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
});
