/**
 * usePermissionsController — PermissionsScreen Presenter Hook
 *
 * Design Pattern: Presenter / Controller
 * Bildirim, kesin alarm, pil tasarrufu muafiyeti ve OEM izin
 * sorgulama ve ayarlar yönlendirmelerini UI bileşeninden izole eder.
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
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);

  const checkPermissions = useCallback(async () => {
    setIsLoading(true);
    const status = await checkAllPermissions();
    setPermissions(status);
    setIsLoading(false);
  }, []);

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
    isLoading,
    isRequesting,
    allPermissionsGranted,
    checkPermissions,
    handleRequestNotifications,
    handleRequestExactAlarm,
    handleRequestBatteryOptimization,
    handleOpenNotificationSettings,
    handleOpenFullScreenIntentSettings,
    handleOpenPowerManagerSettings,
  };
}
