/**
 * notifications/schedule tests — Sprint 3 devami
 * scheduleExpiryReminder + scheduleSnoozeNotification + scheduleTestAlarmNotification
 * hepsi notifee mock'lanarak test edilir.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createTriggerNotification: jest.fn().mockResolvedValue('notification-id'),
    cancelNotification: jest.fn().mockResolvedValue(undefined),
    cancelDisplayedNotification: jest.fn().mockResolvedValue(undefined),
    getTriggerNotificationIds: jest.fn().mockResolvedValue([]),
  },
  TriggerType: { TIMESTAMP: 0 },
  AlarmType: { SET_ALARM_CLOCK: 4 },
  AndroidImportance: { HIGH: 4 },
  AndroidVisibility: { PRIVATE: 0 },
  AndroidCategory: { ALARM: 4 },
  AndroidStyle: { BIGTEXT: 1, BIGPICTURE: 2, INBOX: 3, MESSAGING: 4 },
}));

jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import notifee from '@notifee/react-native';
import {
  scheduleExpiryReminder,
  cancelExpiryReminder,
  scheduleSnoozeNotification,
  scheduleTestAlarmNotification,
  scheduleMedicineNotification,
} from '../../utils/notifications/schedule';
import type { ScheduleSnoozeParams } from '../../utils/notifications/schedule';
import { findEmoji } from '../helpers/emoji';

const baseMedicine = {
  id: 'med-1',
  name: 'Aspirin',
  dosage: '500mg',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  color: '#FF6B6B',
  frequency: 2,
  startDate: '2024-01-01',
};

describe('scheduleExpiryReminder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when expiry date is in the past', async () => {
    const past = new Date();
    past.setDate(past.getDate() - 30);
    const result = await scheduleExpiryReminder(baseMedicine, past.toISOString(), 7);
    expect(result).toBeNull();
    expect(notifee.createTriggerNotification).not.toHaveBeenCalled();
  });

  it('creates notification for future expiry date', async () => {
    const future = new Date();
    future.setDate(future.getDate() + 60);
    const result = await scheduleExpiryReminder(baseMedicine, future.toISOString(), 7);
    expect(result).toBe('expiry-med-1');
    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(1);
  });

  it('cancels existing expiry notification before creating new one', async () => {
    const future = new Date();
    future.setDate(future.getDate() + 60);
    await scheduleExpiryReminder(baseMedicine, future.toISOString(), 7);
    expect(notifee.cancelNotification).toHaveBeenCalledWith('expiry-med-1');
  });

  it('includes type expiry_reminder in data', async () => {
    const future = new Date();
    future.setDate(future.getDate() + 60);
    await scheduleExpiryReminder(baseMedicine, future.toISOString(), 7, 'en');
    const call = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
    expect(call[0].data.type).toBe('expiry_reminder');
    expect(call[0].data.medicineId).toBe('med-1');
  });
});

describe('cancelExpiryReminder', () => {
  it('cancels expiry notification', async () => {
    await cancelExpiryReminder('med-1');
    expect(notifee.cancelNotification).toHaveBeenCalledWith('expiry-med-1');
  });
});

describe('scheduleSnoozeNotification', () => {
  const baseReminder = {
    id: 'rt-1',
    medicineId: 'med-1',
    time: '08:00',
    isEnabled: true,
  };

  const baseParams: ScheduleSnoozeParams = {
    medicine: baseMedicine,
    reminderTime: baseReminder,
    snoozeId: 'snooze-1',
    originalScheduledTime: '2024-06-25T08:00:00Z',
    snoozeCount: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('schedules snooze notification with default duration (5 min)', async () => {
    const result = await scheduleSnoozeNotification(baseParams);
    expect(result).not.toBeNull();
    expect(result?.notificationId).toBe('snooze-med-1-rt-1-snooze-1');
    expect(notifee.createTriggerNotification).toHaveBeenCalledTimes(1);
  });

  it('schedules snooze with custom duration', async () => {
    const result = await scheduleSnoozeNotification({
      ...baseParams,
      snoozeDuration: 10,
    });
    expect(result).not.toBeNull();
    expect(notifee.createTriggerNotification).toHaveBeenCalled();
  });

  it('uses explicit triggerTime when provided', async () => {
    const explicit = new Date('2024-12-25T10:00:00Z');
    const result = await scheduleSnoozeNotification({
      ...baseParams,
      triggerTime: explicit,
    });
    expect(result?.triggerTime.getTime()).toBe(explicit.getTime());
  });

  it('cancels existing snooze before creating new one', async () => {
    await scheduleSnoozeNotification(baseParams);
    expect(notifee.cancelNotification).toHaveBeenCalledWith('snooze-med-1-rt-1-snooze-1');
  });

  it('returns null on error', async () => {
    (notifee.createTriggerNotification as jest.Mock).mockRejectedValueOnce(
      new Error('test failure')
    );
    const result = await scheduleSnoozeNotification(baseParams);
    expect(result).toBeNull();
  });

  it('includes snooze data fields', async () => {
    await scheduleSnoozeNotification({
      ...baseParams,
      snoozeCount: 3,
    });
    const call = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
    expect(call[0].data.isSnooze).toBe('true');
    expect(call[0].data.snoozeId).toBe('snooze-1');
    expect(call[0].data.snoozeCount).toBe('3');
  });
});

describe('scheduleTestAlarmNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('schedules alarm with default language (tr)', async () => {
    const result = await scheduleTestAlarmNotification(5);
    expect(result).toBe('alarm-test-medicine-test-reminder');
  });

  it('uses English title when language=en', async () => {
    await scheduleTestAlarmNotification(5, 'en');
    const call = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
    expect(call[0].title).toContain('TEST ALARM');
    expect(call[0].title).toContain('not a real dose');
  });

  it('enforces minimum 5 seconds delay', async () => {
    await scheduleTestAlarmNotification(0.01); // 0.6 seconds < 5
    const call = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
    const trigger = call[1];
    const triggerTime = new Date(trigger.timestamp);
    const now = Date.now();
    const delaySec = (triggerTime.getTime() - now) / 1000;
    expect(delaySec).toBeGreaterThanOrEqual(4.9); // 5s allowance
  });

  it('cancels existing test alarm before creating new one', async () => {
    await scheduleTestAlarmNotification(5);
    expect(notifee.cancelNotification).toHaveBeenCalledWith('alarm-test-medicine-test-reminder');
  });

  it('throws on createTriggerNotification failure', async () => {
    (notifee.createTriggerNotification as jest.Mock).mockRejectedValueOnce(
      new Error('notif failure')
    );
    await expect(scheduleTestAlarmNotification(5)).rejects.toThrow('notif failure');
  });

  it('includes isTestAlarm data field', async () => {
    await scheduleTestAlarmNotification(5);
    const call = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
    expect(call[0].data.isTestAlarm).toBe('true');
  });
});

describe('scheduleMedicineNotification', () => {
  const mockMedicine: import('../../types').Medicine = {
    id: 'med-1',
    name: 'Aspirin',
    dosage: '500mg',
    frequency: 2,
    color: '#FF6B6B',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    startDate: '2024-01-01',
  };

  const mockReminder = {
    id: 'rt-1',
    medicineId: 'med-1',
    time: '08:00',
    isEnabled: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null for invalid medicine (no id)', async () => {
    const result = await scheduleMedicineNotification({ ...mockMedicine, id: '' }, mockReminder);
    expect(result).toBeNull();
    expect(notifee.createTriggerNotification).not.toHaveBeenCalled();
  });

  it('returns null for invalid reminder (no id)', async () => {
    const result = await scheduleMedicineNotification(mockMedicine, {
      ...mockReminder,
      id: '',
    });
    expect(result).toBeNull();
  });

  it('returns null for reminder without time', async () => {
    const result = await scheduleMedicineNotification(mockMedicine, {
      ...mockReminder,
      time: '',
    });
    expect(result).toBeNull();
  });

  it('returns notification id for valid medicine + reminder', async () => {
    const result = await scheduleMedicineNotification(mockMedicine, mockReminder);
    expect(result).toBe('notification-id');
  });

  it('cancels existing alarm before creating new one', async () => {
    await scheduleMedicineNotification(mockMedicine, mockReminder);
    expect(notifee.cancelNotification).toHaveBeenCalledWith('alarm-med-1-rt-1');
  });

  it('includes medicine + reminder data in payload', async () => {
    await scheduleMedicineNotification(mockMedicine, mockReminder);
    const call = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
    expect(call[0].id).toBe('alarm-med-1-rt-1');
    expect(call[0].data.medicineId).toBe('med-1');
    expect(call[0].data.reminderTimeId).toBe('rt-1');
  });

  it('uses AlarmType.SET_ALARM_CLOCK for trigger', async () => {
    await scheduleMedicineNotification(mockMedicine, mockReminder);
    const call = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
    expect(call[1].alarmManager.type).toBe(4); // SET_ALARM_CLOCK
  });

  it('returns null on createTriggerNotification error', async () => {
    (notifee.createTriggerNotification as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    const result = await scheduleMedicineNotification(mockMedicine, mockReminder);
    expect(result).toBeNull();
  });
});

/**
 * v1.8.7 — BILDIRIM METNI EMOJI KAPISI (DAVRANISSAL).
 *
 * Neden bu test var: v1.8.2 emojiyi `content.ts` ureticilerinden kaldirdi ve
 * kapiyi da orada kurdu (`notifications.content.test.ts`). Ama `schedule.ts`
 * test-alarm metinlerini KENDI ICINDE uretiyor ve o kapiya hic ugramiyordu.
 * Sonuc: test alarminin govdesinde `⏰ 19:01` aylarca ayakta kaldi ve
 * ancak cihazda `dumpsys notification` okunarak fark edildi.
 *
 * Bu yuzden kapi artik URETICIYE degil, notifee'ye GIDEN YUKE bakiyor:
 * hangi modulun yazdigi onemli degil, `createTriggerNotification`'a giden
 * title/subtitle/body ve BIGTEXT alanlari denetlenir.
 *
 * TEK BILINCLI ISTISNA: test alarminin baslgindaki `\u{1F9EA}` isareti. Orada
 * amac suslemek degil, kullanicinin bunu GERCEK bir doz sanmasini onlemek;
 * gorsel isaret kasitli. Baska hicbir alanda emoji kabul edilmez.
 */
describe('bildirim yuku — emoji kapisi (schedule.ts)', () => {
  const ALLOWED_TEST_MARKER = '\u{1F9EA}';

  const reminder = { id: 'rt-1', medicineId: 'med-1', time: '08:00', isEnabled: true };

  /** Bir cagridaki tum kullaniciya gorunen metin alanlari. */
  function visibleTexts(call: unknown[]): string[] {
    const cfg = call[0] as {
      title?: string;
      subtitle?: string;
      body?: string;
      android?: { style?: { text?: string; title?: string; summary?: string } };
    };
    const style = cfg.android?.style ?? {};
    return [cfg.title, cfg.subtitle, cfg.body, style.text, style.title, style.summary].filter(
      (t): t is string => typeof t === 'string' && t.length > 0
    );
  }

  function offendersFor(texts: string[]): string[] {
    return texts.flatMap(text => {
      const hits = findEmoji(text);
      return hits.filter(hit => hit !== ALLOWED_TEST_MARKER);
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(['tr', 'en'] as const)('test alarmi (%s) yalnizca izinli isareti tasir', async lang => {
    await scheduleTestAlarmNotification(5, lang);
    const call = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
    const texts = visibleTexts(call);

    expect(texts.length).toBeGreaterThan(3);
    expect(offendersFor(texts)).toEqual([]);
  });

  it('test alarmi govdesinde saat TEKRAR ETMEZ (subtitle zaten gosteriyor)', async () => {
    await scheduleTestAlarmNotification(5, 'tr');
    const call = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
    const cfg = call[0] as { subtitle?: string; body?: string };

    // Saat bilgisi TEK yerde: subtitle. Govde onu tekrarlamaz.
    expect(cfg.subtitle).toMatch(/^\d{2}:\d{2} /);
    expect(cfg.body).not.toMatch(/\d{2}:\d{2}/);
  });

  it('gercek ilac alarmi hic emoji tasimaz', async () => {
    await scheduleMedicineNotification(baseMedicine, reminder);
    const call = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
    const texts = visibleTexts(call);

    expect(texts.length).toBeGreaterThan(1);
    expect(texts.flatMap(t => findEmoji(t))).toEqual([]);
  });

  it('erteleme bildirimi hic emoji tasimaz', async () => {
    await scheduleSnoozeNotification({
      medicine: baseMedicine,
      reminderTime: reminder,
      snoozeId: 'snooze-1',
      originalScheduledTime: '2024-06-25T08:00:00Z',
      snoozeCount: 2,
    });
    const call = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
    const texts = visibleTexts(call);

    expect(texts.length).toBeGreaterThan(1);
    expect(texts.flatMap(t => findEmoji(t))).toEqual([]);
  });

  it('son kullanma tarihi bildirimi hic emoji tasimaz', async () => {
    const future = new Date();
    future.setDate(future.getDate() + 60);
    await scheduleExpiryReminder(baseMedicine, future.toISOString(), 7);
    const call = (notifee.createTriggerNotification as jest.Mock).mock.calls[0];
    const texts = visibleTexts(call);

    expect(texts.length).toBeGreaterThan(1);
    expect(texts.flatMap(t => findEmoji(t))).toEqual([]);
  });
});
