/**
 * Erteleme (snooze) native alarm ayrimi — v1.7.1 regresyon korumasi.
 *
 * IKI GERCEK KUSUR:
 *
 * 1. requestCode CAKISMASI. `AlarmModule` requestCode'u
 *    `(medicineId, reminderTimeId)` cifti hash'inden turetiyordu. Erteleme
 *    alarmi ayni cifti kullandigi icin `PendingIntent.getBroadcast` mevcut
 *    PendingIntent'i DEGISTIRIYOR: 5 dakikalik bir erteleme kurmak, ayni
 *    hatirlatmanin bir sonraki gunku native alarmini SILIYORDU.
 *
 * 2. ERTELEME ICIN NATIVE IPTAL HIC CAGRILMIYORDU. `cancel.ts` `snooze-`
 *    onekli kimliklerde erken donuyordu; iptal edilen bir erteleme arkasinda
 *    ARMED bir AlarmManager alarmi ve integer id'li tam ekran tasiyici
 *    bildirim birakiyordu (hayalet tam ekran alarm).
 *
 * Cozum: `alarmKind` ('main' | 'snooze') native imzaya eklendi, Kotlin tarafi
 * bunu requestCode'a tuz olarak katiyor ve TUM JS cagrilari tek kopruden
 * (`utils/notifications/nativeAlarm.ts`) geciyor.
 */

/* global __dirname */
import fs from 'fs';
import path from 'path';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockScheduleNativeAlarm = jest.fn().mockResolvedValue(true);
const mockCancelNativeAlarm = jest.fn().mockResolvedValue(true);
const mockCancelAlarmNotification = jest.fn().mockResolvedValue(true);

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  NativeModules: {
    AlarmModule: {
      scheduleNativeAlarm: (...args: unknown[]) => mockScheduleNativeAlarm(...args),
      cancelNativeAlarm: (...args: unknown[]) => mockCancelNativeAlarm(...args),
      cancelAlarmNotification: (...args: unknown[]) => mockCancelAlarmNotification(...args),
    },
  },
}));

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createTriggerNotification: jest.fn().mockResolvedValue('notification-id'),
    createChannel: jest.fn().mockResolvedValue('channel-id'),
    cancelNotification: jest.fn().mockResolvedValue(undefined),
    cancelDisplayedNotification: jest.fn().mockResolvedValue(undefined),
    getTriggerNotificationIds: jest.fn().mockResolvedValue([]),
    getDisplayedNotifications: jest.fn().mockResolvedValue([]),
  },
  TriggerType: { TIMESTAMP: 0 },
  AlarmType: { SET_ALARM_CLOCK: 4 },
  AndroidImportance: { HIGH: 4 },
  AndroidVisibility: { PUBLIC: 1, PRIVATE: 0 },
  AndroidCategory: { ALARM: 4, REMINDER: 5 },
  AndroidStyle: { BIGTEXT: 1 },
}));

jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { ALARM_KIND_MAIN, ALARM_KIND_SNOOZE } from '../../utils/notifications/nativeAlarm';
import { parseAlarmNotificationId } from '../../utils/notifications/ids';
import { cancelNotification } from '../../utils/notifications/cancel';
import {
  scheduleMedicineNotification,
  scheduleSnoozeNotification,
} from '../../utils/notifications/schedule';
import { createDefaultUserSettings } from '../../utils/defaultSettings';
import type { Medicine, ReminderTime } from '../../types';

const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');
const ANDROID_JAVA = path.join(
  PROJECT_ROOT,
  'android',
  'app',
  'src',
  'main',
  'java',
  'com',
  'ilachatirlatici'
);

const medicine = {
  id: 'med-1',
  name: 'Aspirin',
  dosage: '500mg',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  color: '#FF6B6B',
  frequency: 1,
  startDate: '2024-01-01T00:00:00Z',
} as unknown as Medicine;

const reminderTime = {
  id: 'rt-1',
  medicineId: 'med-1',
  time: '23:59',
  isEnabled: true,
} as unknown as ReminderTime;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('alarmKind — Kotlin / JS sabit hizasi', () => {
  const receiver = fs.readFileSync(path.join(ANDROID_JAVA, 'AlarmReceiver.kt'), 'utf8');

  it('KIND_MAIN / KIND_SNOOZE degerleri JS sabitleriyle AYNI', () => {
    const main = /const val KIND_MAIN = "([^"]+)"/.exec(receiver);
    const snooze = /const val KIND_SNOOZE = "([^"]+)"/.exec(receiver);

    expect(main?.[1]).toBe(ALARM_KIND_MAIN);
    expect(snooze?.[1]).toBe(ALARM_KIND_SNOOZE);
  });

  it('requestCode yalnizca erteleme icin tuzlanir (ana alarm geriye donuk uyumlu)', () => {
    // Ana alarmin uretilen degeri DEGISMEMELI: eski kurulumlarda o requestCode
    // ile kurulmus PendingIntent'ler var, aksi halde iptal edilemez hale gelir.
    expect(receiver).toMatch(
      /val salted = if \(kind == KIND_SNOOZE\) base xor KIND_SNOOZE\.hashCode\(\) else base/
    );
  });

  it('AlarmReceiver erteleme bilgisini JS tarafina tasir', () => {
    // Native yoldan acilan erteleme ekrani, hangi turu iptal edecegini
    // bilmezse "Simdi Al" ANA alarmi dusuruyordu.
    expect(receiver).toMatch(/putString\("isSnooze", isSnoozeFlag\)/);
    expect(receiver).toMatch(/putExtra\("isSnooze", isSnoozeFlag\)/);
  });

  it('MainActivity isSnooze / snoozeId alanlarini emit eder', () => {
    const activity = fs.readFileSync(path.join(ANDROID_JAVA, 'MainActivity.kt'), 'utf8');
    expect(activity).toMatch(/putString\("isSnooze", isSnoozeStr\)/);
    expect(activity).toMatch(/putString\("snoozeId", snoozeIdStr\)/);
  });

  it('AlarmModule metodlari alarmKind parametresi aliyor', () => {
    const module = fs.readFileSync(path.join(ANDROID_JAVA, 'AlarmModule.kt'), 'utf8');
    const withKind = [...module.matchAll(/alarmKind: String\?/g)];
    // scheduleNativeAlarm + cancelNativeAlarm + cancelAlarmNotification
    expect(withKind).toHaveLength(3);
  });
});

describe('native kopru disiplini', () => {
  /**
   * React Native'in Android bridge'i argument SAYISINI kati dogrular. Bir tek
   * cagri guncellenmeyi atlarsa calisma zamaninda
   * "Got 3 arguments, expected 4" alinir — testte degil, kullanicinin
   * cihazinda. Bu yuzden dagilmis cagri YASAK.
   */
  const walk = (dir: string, acc: string[] = []): string[] => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, acc);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        acc.push(full);
      }
    }
    return acc;
  };

  it('AlarmModule alarm metodlari YALNIZCA nativeAlarm.ts icinden cagriliyor', () => {
    const bridgeFile = path.join(PROJECT_ROOT, 'src', 'utils', 'notifications', 'nativeAlarm.ts');

    const files = [...walk(path.join(PROJECT_ROOT, 'src')), path.join(PROJECT_ROOT, 'App.tsx')];

    const offenders: string[] = [];
    for (const file of files) {
      if (file === bridgeFile) continue;
      if (file.includes(`${path.sep}__tests__${path.sep}`)) continue;

      // Yorumlar cikarilir: bu kusuru ANLATAN yorumlar dosyalarda duruyor
      // (bkz. ids.ts / testAlarm.ts) ve tarama onlari kusur sanmamali.
      const source = fs
        .readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');

      if (
        /AlarmModule\??\.\s*(scheduleNativeAlarm|cancelNativeAlarm|cancelAlarmNotification)/.test(
          source
        )
      ) {
        offenders.push(path.relative(PROJECT_ROOT, file));
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe('parseAlarmNotificationId — erteleme kimlikleri', () => {
  const known = {
    medicineIds: ['01a057f1-3ae0-7679-9383-9b68f7198b59'],
    reminderTimeIds: ['1f0a2b3c-4d5e-6f70-8192-a3b4c5d6e7f8'],
  };
  const [medicineId] = known.medicineIds;
  const [reminderTimeId] = known.reminderTimeIds;

  it('3 parametreli erteleme kimligini cozumler (snoozeId kuyrugu atilir)', () => {
    const id = `snooze-${medicineId}-${reminderTimeId}-snz-9f8e7d6c`;
    expect(parseAlarmNotificationId(id, known)).toEqual({ medicineId, reminderTimeId });
  });

  it('2 parametreli erteleme kimligini cozumler', () => {
    const id = `snooze-${medicineId}-${reminderTimeId}`;
    expect(parseAlarmNotificationId(id, known)).toEqual({ medicineId, reminderTimeId });
  });

  it('bilinmeyen hatirlatma kimligiyle erteleme icin null doner (yanlis iptal YOK)', () => {
    // reminderTimeId'nin nerede bittigi bilinemez; tahmin etmek native iptali
    // YANLIS requestCode ile cagirir ve baska bir alarmi dusurebilir.
    const id = `snooze-${medicineId}-silinmis-rt-snz-1234`;
    expect(parseAlarmNotificationId(id, known)).toBeNull();
  });

  it('ana alarm kimligi bilinmeyen hatirlatmayla da cozumlenir', () => {
    const id = `alarm-${medicineId}-silinmis-rt`;
    expect(parseAlarmNotificationId(id, known)).toEqual({
      medicineId,
      reminderTimeId: 'silinmis-rt',
    });
  });

  it('test alarmi kimligi her iki onekle de cozumlenir', () => {
    expect(parseAlarmNotificationId('alarm-test-medicine-test-reminder')).toEqual({
      medicineId: 'test-medicine',
      reminderTimeId: 'test-reminder',
    });
    expect(parseAlarmNotificationId('snooze-test-medicine-test-reminder')).toEqual({
      medicineId: 'test-medicine',
      reminderTimeId: 'test-reminder',
    });
  });
});

describe('cancelNotification — dogru alarmKind ile native iptal', () => {
  const target = { medicineId: 'med-1', reminderTimeId: 'rt-1' };

  it('erteleme kimligi SNOOZE turunu iptal eder', async () => {
    await cancelNotification('snooze-med-1-rt-1-snz-1', target);

    expect(mockCancelNativeAlarm).toHaveBeenCalledWith('med-1', 'rt-1', ALARM_KIND_SNOOZE);
    expect(mockCancelAlarmNotification).toHaveBeenCalledWith('med-1', 'rt-1', ALARM_KIND_SNOOZE);
  });

  it('ana alarm kimligi MAIN turunu iptal eder', async () => {
    await cancelNotification('alarm-med-1-rt-1', target);

    expect(mockCancelNativeAlarm).toHaveBeenCalledWith('med-1', 'rt-1', ALARM_KIND_MAIN);
    expect(mockCancelAlarmNotification).toHaveBeenCalledWith('med-1', 'rt-1', ALARM_KIND_MAIN);
  });

  it('alarm/erteleme olmayan kimlik native iptali TETIKLEMEZ', async () => {
    await cancelNotification('expiry-med-1');

    expect(mockCancelNativeAlarm).not.toHaveBeenCalled();
    expect(mockCancelAlarmNotification).not.toHaveBeenCalled();
  });
});

describe('scheduleNativeAlarm — kurulumda dogru alarmKind', () => {
  it('erteleme SNOOZE turuyle kurulur', async () => {
    await scheduleSnoozeNotification({
      medicine,
      reminderTime,
      snoozeId: 'snz-1',
      originalScheduledTime: '2026-01-01T08:00:00Z',
      snoozeCount: 1,
      settings: createDefaultUserSettings({ fullScreenAlarmEnabled: true }),
    });

    expect(mockScheduleNativeAlarm).toHaveBeenCalledTimes(1);
    expect(mockScheduleNativeAlarm).toHaveBeenCalledWith(
      expect.any(Number),
      'med-1',
      'rt-1',
      ALARM_KIND_SNOOZE
    );
  });

  it('ana hatirlatma MAIN turuyle kurulur', async () => {
    await scheduleMedicineNotification(
      medicine,
      reminderTime,
      createDefaultUserSettings({ fullScreenAlarmEnabled: true }),
      true
    );

    expect(mockScheduleNativeAlarm).toHaveBeenCalledTimes(1);
    expect(mockScheduleNativeAlarm).toHaveBeenCalledWith(
      expect.any(Number),
      'med-1',
      'rt-1',
      ALARM_KIND_MAIN
    );
  });

  it('erteleme kurulumu ANA alarmin requestCode uzayina dokunmaz', async () => {
    // Ayni cift, farkli tur → Kotlin tarafinda farkli requestCode.
    await scheduleSnoozeNotification({
      medicine,
      reminderTime,
      snoozeId: 'snz-2',
      originalScheduledTime: '2026-01-01T08:00:00Z',
      snoozeCount: 1,
      settings: createDefaultUserSettings({ fullScreenAlarmEnabled: true }),
    });

    const kinds = mockScheduleNativeAlarm.mock.calls.map(call => call[3]);
    expect(kinds).not.toContain(ALARM_KIND_MAIN);
  });
});
