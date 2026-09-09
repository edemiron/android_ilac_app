/**
 * oemShieldEngine unit tests
 */

jest.mock('react-native', () => {
  const alarmModule = {
    getOEMShieldInfo: jest.fn(),
    openOEMAutostartSettings: jest.fn(),
    openOEMBatterySettings: jest.fn(),
    openOEMPopupSettings: jest.fn(),
    requestIgnoreBatteryOptimizations: jest.fn(),
    isIgnoringBatteryOptimizations: jest.fn(),
    canScheduleExactAlarms: jest.fn(),
  };

  const platformConstants = {
    Manufacturer: 'xiaomi',
    Brand: 'xiaomi',
    Model: '24030PN60G',
  };

  return {
    Platform: { OS: 'android', Version: 34 },
    NativeModules: {
      AlarmModule: alarmModule,
      PlatformConstants: platformConstants,
    },
    Linking: {
      openSettings: jest.fn().mockResolvedValue(true),
      sendIntent: jest.fn().mockResolvedValue(true),
      openURL: jest.fn().mockResolvedValue(true),
    },
  };
});

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    getNotificationSettings: jest.fn().mockResolvedValue({
      authorizationStatus: 1,
      android: { alarm: 1, fullScreenIntent: 1 },
    }),
    getPowerManagerInfo: jest.fn().mockResolvedValue({ manufacturer: 'xiaomi', activity: null }),
    openNotificationSettings: jest.fn().mockResolvedValue(true),
    openAlarmPermissionSettings: jest.fn().mockResolvedValue(true),
    openBatteryOptimizationSettings: jest.fn().mockResolvedValue(true),
    openPowerManagerSettings: jest.fn().mockResolvedValue(true),
  },
  getNotificationSettings: jest.fn().mockResolvedValue({
    authorizationStatus: 1,
    android: { alarm: 1, fullScreenIntent: 1 },
  }),
  getPowerManagerInfo: jest.fn().mockResolvedValue({ manufacturer: 'xiaomi', activity: null }),
  openNotificationSettings: jest.fn().mockResolvedValue(true),
  openAlarmPermissionSettings: jest.fn().mockResolvedValue(true),
  openBatteryOptimizationSettings: jest.fn().mockResolvedValue(true),
  openPowerManagerSettings: jest.fn().mockResolvedValue(true),
  AuthorizationStatus: {
    AUTHORIZED: 1,
    DENIED: 0,
  },
  AndroidNotificationSetting: {
    ENABLED: 1,
    DISABLED: 0,
  },
}));

import { NativeModules } from 'react-native';
import notifee from '@notifee/react-native';
import {
  detectOEMShieldStatus,
  getOEMGuide,
  openOEMShieldSetting,
} from '../../utils/oemShieldEngine';

describe('oemShieldEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectOEMShieldStatus', () => {
    it('detects Xiaomi device correctly', async () => {
      NativeModules.AlarmModule.getOEMShieldInfo.mockResolvedValue({
        manufacturer: 'xiaomi',
        brand: 'xiaomi',
        model: '24030PN60G',
        sdkVersion: 34,
        isIgnoringBattery: true,
        canScheduleExactAlarms: true,
      });

      const status = await detectOEMShieldStatus();

      expect(status.oem).toBe('xiaomi');
      expect(status.hasCustomOEMShield).toBe(true);
      expect(status.notifications).toBe(true);
      expect(status.exactAlarm).toBe(true);
      expect(status.fullScreenIntent).toBe(true);
    });

    it('detects Samsung device correctly', async () => {
      NativeModules.AlarmModule.getOEMShieldInfo.mockResolvedValue({
        manufacturer: 'samsung',
        brand: 'samsung',
        model: 'SM_T733',
        sdkVersion: 34,
        isIgnoringBattery: false,
        canScheduleExactAlarms: true,
      });

      const status = await detectOEMShieldStatus();

      expect(status.oem).toBe('samsung');
      expect(status.hasCustomOEMShield).toBe(true);
    });

    it('detects Huawei device correctly', async () => {
      NativeModules.AlarmModule.getOEMShieldInfo.mockResolvedValue({
        manufacturer: 'huawei',
        brand: 'huawei',
        model: 'P30 Pro',
        sdkVersion: 29,
        isIgnoringBattery: true,
        canScheduleExactAlarms: true,
      });

      const status = await detectOEMShieldStatus();

      expect(status.oem).toBe('huawei');
      expect(status.hasCustomOEMShield).toBe(true);
    });

    it('detects Oppo and Vivo devices correctly', async () => {
      NativeModules.AlarmModule.getOEMShieldInfo.mockResolvedValue({
        manufacturer: 'oppo',
        brand: 'oppo',
        model: 'Find X5',
        sdkVersion: 33,
      });

      const oppoStatus = await detectOEMShieldStatus();
      expect(oppoStatus.oem).toBe('oppo');

      NativeModules.AlarmModule.getOEMShieldInfo.mockResolvedValue({
        manufacturer: 'vivo',
        brand: 'vivo',
        model: 'X90',
        sdkVersion: 33,
      });

      const vivoStatus = await detectOEMShieldStatus();
      expect(vivoStatus.oem).toBe('vivo');
    });

    it('returns generic for Google Pixel or standard device', async () => {
      NativeModules.AlarmModule.getOEMShieldInfo.mockResolvedValue({
        manufacturer: 'google',
        brand: 'google',
        model: 'Pixel 8',
        sdkVersion: 34,
      });

      const status = await detectOEMShieldStatus();
      expect(status.oem).toBe('pixel');
      expect(status.hasCustomOEMShield).toBe(false);
    });
  });

  describe('getOEMGuide', () => {
    it('returns customized steps for Samsung in Turkish', () => {
      const guide = getOEMGuide('samsung', 'tr');
      expect(guide.oemName).toBe('Samsung');
      expect(guide.steps.length).toBeGreaterThanOrEqual(2);
      expect(guide.steps[0].title).toContain('Kısıtlanmamış');
    });

    it('returns customized steps for Xiaomi in Turkish and English', () => {
      const guideTr = getOEMGuide('xiaomi', 'tr');
      expect(guideTr.oemName).toContain('Xiaomi');
      expect(guideTr.steps.some(s => s.actionType === 'autostart')).toBe(true);
      expect(guideTr.steps.some(s => s.actionType === 'popup')).toBe(true);

      const guideEn = getOEMGuide('xiaomi', 'en');
      expect(guideEn.summary).toContain('Xiaomi');
      expect(guideEn.steps.some(s => s.title.includes('Auto-start'))).toBe(true);
    });

    it('returns valid guides for Huawei, Oppo, Vivo, OnePlus and Generic', () => {
      expect(getOEMGuide('huawei', 'tr').steps.length).toBeGreaterThan(0);
      expect(getOEMGuide('oppo', 'tr').steps.length).toBeGreaterThan(0);
      expect(getOEMGuide('vivo', 'tr').steps.length).toBeGreaterThan(0);
      expect(getOEMGuide('oneplus', 'tr').steps.length).toBeGreaterThan(0);
      expect(getOEMGuide('generic', 'tr').steps.length).toBeGreaterThan(0);
    });
  });

  describe('openOEMShieldSetting', () => {
    it('dispatches autostart to native AlarmModule if available', async () => {
      NativeModules.AlarmModule.openOEMAutostartSettings.mockResolvedValue(true);

      const result = await openOEMShieldSetting('autostart');
      expect(result).toBe(true);
      expect(NativeModules.AlarmModule.openOEMAutostartSettings).toHaveBeenCalled();
    });

    it('dispatches battery to native requestIgnoreBatteryOptimizations', async () => {
      NativeModules.AlarmModule.requestIgnoreBatteryOptimizations.mockResolvedValue(true);

      const result = await openOEMShieldSetting('battery');
      expect(result).toBe(true);
      expect(NativeModules.AlarmModule.requestIgnoreBatteryOptimizations).toHaveBeenCalled();
    });

    it('dispatches exact_alarm and notifications to notifee methods', async () => {
      await openOEMShieldSetting('exact_alarm');
      expect(notifee.openAlarmPermissionSettings).toHaveBeenCalled();

      await openOEMShieldSetting('notification');
      expect(notifee.openNotificationSettings).toHaveBeenCalled();
    });
  });

  // NOT: 10 saniyelik donanim test alarmi artik oemShieldEngine'de degil,
  // tek kaynak olan utils/notifications/testAlarm.ts icinde
  // (runLockScreenAlarmTest). Testi testAlarm.test.ts dosyasinda.
});
