/**
 * `src/domain/settingsScope.ts` sozlesme testleri.
 *
 * Kilitlenen uretim hatasi (v1.7.9): `updateSettings` degisen alanlari
 * kosulsuz `syncSettingsToCloud`a veriyordu — GUVENLIK alanlari dahil. PIN
 * hash'i buluta ve oradan DIGER CIHAZA yaziliyordu: telefonda PIN kuran
 * kullanicinin tableti de ayni PIN ile kilitleniyordu.
 */

import {
  DEVICE_LOCAL_SETTING_KEYS,
  isDeviceLocalSettingKey,
  stripDeviceLocalSettings,
  stripDeviceLocalSettingsFromCloud,
  findLeakedDeviceLocalKeys,
} from '../../domain/settingsScope';

describe('DEVICE_LOCAL_SETTING_KEYS', () => {
  it('PIN, biyometrik, kilit suresi ve son aktiflik zamanini kapsar', () => {
    expect([...DEVICE_LOCAL_SETTING_KEYS].sort()).toEqual(
      ['biometricsEnabled', 'lastActiveTime', 'lockTimeout', 'securityPin', 'securityType'].sort()
    );
  });

  it('senkronlanmasi GEREKEN ayarlari kapsamaz', () => {
    for (const key of ['wakeUpTime', 'sleepTime', 'language', 'maxSnoozeCount', 'snoozeDuration']) {
      expect(isDeviceLocalSettingKey(key)).toBe(false);
    }
  });
});

describe('stripDeviceLocalSettings — YUKLEME tarafi', () => {
  it('PIN HASH BULUTA GIDEN YUKTEN CIKARILIR', () => {
    const payload = stripDeviceLocalSettings({
      wakeUpTime: '08:00',
      securityPin: 'sha256-hash',
      securityType: 'pin',
    });

    expect(payload).toEqual({ wakeUpTime: '08:00' });
    expect('securityPin' in payload).toBe(false);
  });

  it('biyometrik ve kilit suresi de cikarilir (cihaza ozgu)', () => {
    const payload = stripDeviceLocalSettings({
      biometricsEnabled: true,
      lockTimeout: 5,
      lastActiveTime: '2026-09-03T00:00:00.000Z',
      language: 'tr',
    });
    expect(payload).toEqual({ language: 'tr' });
  });

  it('senkronlanacak alan kalmazsa BOS nesne doner (yazma yapilmamali)', () => {
    expect(stripDeviceLocalSettings({ securityPin: 'x', lockTimeout: 1 })).toEqual({});
  });

  it('bos/bozuk girdide patlamaz', () => {
    expect(stripDeviceLocalSettings({})).toEqual({});
    expect(stripDeviceLocalSettings(null as unknown as Record<string, unknown>)).toEqual({});
  });
});

describe('stripDeviceLocalSettingsFromCloud — INDIRME tarafi', () => {
  it('ESKI bulut dokumanindaki PIN yerele GERI YAZILMAZ', () => {
    // v1.7.9 oncesinde yazilmis bir dokuman bu alanlari hala iceriyor.
    const fromCloud = stripDeviceLocalSettingsFromCloud({
      wakeUpTime: '09:00',
      securityPin: 'bayat-hash',
      biometricsEnabled: true,
    });

    expect(fromCloud).toEqual({ wakeUpTime: '09:00' });
  });

  it('undefined bulut ayarinda bos doner', () => {
    expect(stripDeviceLocalSettingsFromCloud(undefined)).toEqual({});
  });
});

describe('findLeakedDeviceLocalKeys', () => {
  it('sizan alanlari isimleriyle bildirir', () => {
    expect(
      findLeakedDeviceLocalKeys({ wakeUpTime: '08:00', securityPin: 'x', lockTimeout: 2 }).sort()
    ).toEqual(['lockTimeout', 'securityPin']);
  });

  it('temiz yukte bos liste doner', () => {
    expect(findLeakedDeviceLocalKeys({ wakeUpTime: '08:00' })).toEqual([]);
  });
});
