/**
 * usePermissionsController — PermissionsScreen Presenter Hook
 *
 * Design Pattern: Presenter / Controller
 * Bildirim, kesin alarm, pil tasarrufu muafiyeti ve Evrensel OEM Kalkanı
 * kontrollerini ve ayar yönlendirmelerini koordine eder.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
  checkAllPermissions,
  requestNotificationPermissions,
  requestExactAlarmPermission,
  requestBatteryOptimizationPermission,
  openNotificationSettings,
  openFullScreenIntentSettings,
  openPowerManagerSettings,
} from '../../../utils/notifications';
import {
  detectOEMShieldStatus,
  getOEMGuide,
  openOEMShieldSetting,
  OEMShieldStatus,
  OEMShieldGuide,
} from '../../../utils/oemShieldEngine';
import { runLockScreenAlarmTest } from '../../../utils/notifications/testAlarm';

export interface PermissionStatus {
  notifications: boolean;
  exactAlarm: boolean;
  batteryOptimization: boolean;
  dnd: boolean;
  fullScreenIntent: boolean;
  powerManagerRestricted: boolean;
  manufacturer: string | null;
}

export function usePermissionsController() {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const [permissions, setPermissions] = useState<PermissionStatus | null>(null);
  const [oemShieldStatus, setOemShieldStatus] = useState<OEMShieldStatus | null>(null);
  const [oemGuide, setOemGuide] = useState<OEMShieldGuide | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isTestingAlarm, setIsTestingAlarm] = useState(false);
  const [testAlarmScheduled, setTestAlarmScheduled] = useState(false);

  const checkPermissions = useCallback(async () => {
    setIsLoading(true);
    const [status, oemStatus] = await Promise.all([checkAllPermissions(), detectOEMShieldStatus()]);

    setPermissions(status);
    setOemShieldStatus(oemStatus);
    setOemGuide(getOEMGuide(oemStatus.oem, language));
    setIsLoading(false);
  }, [language]);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  const handleRequestNotifications = async () => {
    setIsRequesting(true);
    await requestNotificationPermissions();
    await checkPermissions();
    setIsRequesting(false);
  };

  const handleRequestExactAlarm = async () => {
    await requestExactAlarmPermission();
    setTimeout(checkPermissions, 1000);
  };

  const handleRequestBatteryOptimization = async () => {
    await requestBatteryOptimizationPermission();
    setTimeout(checkPermissions, 1000);
  };

  const handleOpenNotificationSettings = async () => {
    await openNotificationSettings();
    setTimeout(checkPermissions, 1000);
  };

  const handleOpenFullScreenIntentSettings = async () => {
    await openFullScreenIntentSettings();
    setTimeout(checkPermissions, 1000);
  };

  const handleOpenPowerManagerSettings = async () => {
    await openPowerManagerSettings();
    setTimeout(checkPermissions, 1000);
  };

  const handleOpenOEMSetting = async (
    actionType: 'autostart' | 'battery' | 'popup' | 'exact_alarm' | 'notification' | 'fullscreen'
  ) => {
    await openOEMShieldSetting(actionType);
    setTimeout(checkPermissions, 1000);
  };

  const handleStartAlarmTest = async () => {
    try {
      setIsTestingAlarm(true);
      // Tek kaynak: ayarlar motor tarafından store'dan okunur.
      await runLockScreenAlarmTest({ seconds: 10, language: language === 'tr' ? 'tr' : 'en' });
      setTestAlarmScheduled(true);
      setTimeout(() => {
        setIsTestingAlarm(false);
      }, 12000);
    } catch (_e) {
      setIsTestingAlarm(false);
    }
  };

  const allPermissionsGranted = Boolean(
    permissions &&
    permissions.notifications &&
    permissions.exactAlarm &&
    permissions.batteryOptimization
  );

  return {
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
    checkPermissions,
    handleRequestNotifications,
    handleRequestExactAlarm,
    handleRequestBatteryOptimization,
    handleOpenNotificationSettings,
    handleOpenFullScreenIntentSettings,
    handleOpenPowerManagerSettings,
    handleOpenOEMSetting,
    handleStartAlarmTest,
  };
}
