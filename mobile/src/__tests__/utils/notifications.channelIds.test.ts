/**
 * Kanal kimlikleri icin ayrisma korumasi (v1.7.1 yayin oncesi birlestirme).
 *
 * Kanal tanimi eskiden BES ayri yerde, UC farkli surumleme semasiyla duruyordu;
 * push bildirimleri bu yuzden eski `medicine-reminders-v4` kanalina dusuyordu.
 * Artik kimliklerin tek kaynagi `utils/notifications/channels.ts`. Bu test
 * Kotlin ve XML dosyalarini OKUYUP karsilastirir: biri degisip digeri
 * degismezse test kirilir.
 */

/* global __dirname */
import fs from 'fs';
import path from 'path';

import {
  CHANNEL_VERSION,
  REMINDER_CHANNEL_ID,
  CAREGIVER_ALERT_CHANNEL_ID,
  PATIENT_REMOTE_REMINDER_CHANNEL_ID,
  ALARM_FSI_CHANNEL_ID,
  FCM_DEFAULT_CHANNEL_ID,
  getAlarmChannelId,
  getReminderChannelId,
  getManagedChannelIds,
  isLegacyManagedChannelId,
} from '../../utils/notifications/channels';

const ANDROID_MAIN = path.join(__dirname, '..', '..', '..', 'android', 'app', 'src', 'main');
const readAndroidFile = (...segments: string[]) =>
  fs.readFileSync(path.join(ANDROID_MAIN, ...segments), 'utf8');

describe('kanal kimlikleri — JS / native / XML hizasi', () => {
  it('surum eki gecmiste kullanilmis bir deger OLMAMALI', () => {
    // v1 / v4 / v6 / v7 farkli ailelerde kullanildi; tekrar kullanmak
    // kullanicinin o kanaldaki eski ayarlarini miras almak demek.
    expect(['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7']).not.toContain(CHANNEL_VERSION);
  });

  it('FCM varsayilan kanali strings.xml ile ayni', () => {
    const strings = readAndroidFile('res', 'values', 'strings.xml');
    const match = /<string name="default_notification_channel_id">([^<]+)<\/string>/.exec(strings);

    expect(match).toBeTruthy();
    expect(match?.[1]).toBe(FCM_DEFAULT_CHANNEL_ID);
    expect(FCM_DEFAULT_CHANNEL_ID).toBe(REMINDER_CHANNEL_ID);
  });

  it('MainApplication.kt yalnizca JS ile ayni kimlikleri olusturuyor', () => {
    const kotlin = readAndroidFile('java', 'com', 'ilachatirlatici', 'MainApplication.kt');

    // Olusturulan kanallar: `NotificationChannel(\n  "<id>",` kalibi
    const created = [...kotlin.matchAll(/NotificationChannel\(\s*"([^"]+)"/g)].map(m => m[1]);

    expect(created).toEqual([
      REMINDER_CHANNEL_ID,
      CAREGIVER_ALERT_CHANNEL_ID,
      PATIENT_REMOTE_REMINDER_CHANNEL_ID,
    ]);
  });

  it('AlarmReceiver.kt tam ekran kanali JS sabitiyle ayni', () => {
    const kotlin = readAndroidFile('java', 'com', 'ilachatirlatici', 'AlarmReceiver.kt');
    const match = /FSI_CHANNEL_ID\s*=\s*"([^"]+)"/.exec(kotlin);

    expect(match?.[1]).toBe(ALARM_FSI_CHANNEL_ID);
  });

  it('native taraf artik bypassDnd istemiyor (izin manifestte yok)', () => {
    const kotlin = readAndroidFile('java', 'com', 'ilachatirlatici', 'MainApplication.kt');
    const manifest = readAndroidFile('AndroidManifest.xml');

    const hasPolicyPermission = manifest.includes('ACCESS_NOTIFICATION_POLICY');
    if (!hasPolicyPermission) {
      expect(kotlin).not.toContain('setBypassDnd(true)');
    }
  });

  // notifee: vibrationPattern cift uzunlukta ve TUM degerler POZITIF olmali.
  // Ihlal edildiginde `createChannel` REDDEDER; eskiden tum kanal olusturma
  // tek try/catch icinde oldugu icin bir tek hatali desen butun kanallari
  // (36 tanesini) olusturulamaz hale getiriyordu.
  it('hicbir kanal gecersiz vibrationPattern kullanmiyor', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'utils', 'notifications', 'channels.ts'),
      'utf8'
    );
    const patterns = [...source.matchAll(/vibrationPattern:\s*\[([^\]]+)\]/g)];

    expect(patterns.length).toBeGreaterThan(0);
    for (const [, body] of patterns) {
      const values = body
        .split(',')
        .map(v => Number(v.trim()))
        .filter(v => !Number.isNaN(v));

      expect(values.length % 2).toBe(0);
      for (const v of values) {
        expect(v).toBeGreaterThan(0);
      }
    }
  });

  it('olu CHANNELS sabiti constants.ts icinde kalmadi', () => {
    const constants = fs.readFileSync(path.join(__dirname, '..', '..', 'constants.ts'), 'utf8');
    expect(constants).not.toMatch(/export const CHANNELS\b/);
  });
});

describe('kanal kimligi ureticileri', () => {
  it('alarm ve hatirlatma kanallari ayri kimlikler uretir', () => {
    const alarm = getAlarmChannelId('soft_chime', true);
    const reminder = getReminderChannelId('soft_chime', true);

    expect(alarm).not.toBe(reminder);
    expect(alarm.startsWith('medicine-alarms-')).toBe(true);
    expect(reminder.startsWith('medicine-reminders-')).toBe(true);
    expect(alarm.endsWith(`-vib-${CHANNEL_VERSION}`)).toBe(true);
    expect(reminder.endsWith(`-vib-${CHANNEL_VERSION}`)).toBe(true);
  });

  it('titresim durumu kimlige yansir', () => {
    expect(getReminderChannelId('soft_chime', false)).toContain('-novib-');
    expect(getAlarmChannelId('soft_chime', false)).toContain('-novib-');
  });

  it('yonetilen kimlik listesi benzersiz ve tumu bu surumden', () => {
    const ids = getManagedChannelIds();

    expect(ids.length).toBeGreaterThan(8);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id.endsWith(CHANNEL_VERSION)).toBe(true);
    }
  });
});

describe('eski kanal tanima', () => {
  const managed = getManagedChannelIds();

  it('bize ait eski kanallari eski sayar', () => {
    for (const legacy of [
      'medicine-alarms-v4',
      'medicine-reminders-v4',
      'medicine-alarms-v6',
      'medicine-alarms-fsi-v7',
      'caregiver-live-alerts-v1',
      'patient-remote-reminders-v1',
      'med_alarms',
      'open-app-reminders',
    ]) {
      expect(isLegacyManagedChannelId(legacy, managed)).toBe(true);
    }
  });

  it('bu surumun kanallarina DOKUNMAZ', () => {
    for (const id of managed) {
      expect(isLegacyManagedChannelId(id, managed)).toBe(false);
    }
  });

  it('baska uygulamalarin/sistemin kanallarina DOKUNMAZ', () => {
    for (const foreign of [
      'fcm_fallback_notification_channel',
      'notification_channel_upcoming_alarm',
      'LEARNING_REMINDER',
      'boot-task-channel',
      'flow_channel_ALARM',
    ]) {
      expect(isLegacyManagedChannelId(foreign, managed)).toBe(false);
    }
  });
});
