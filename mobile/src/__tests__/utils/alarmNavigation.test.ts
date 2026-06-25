import {
  buildAlarmNotificationId,
  buildSnoozeNotificationId,
  getAlarmKey,
  getNotificationIdForAlarmData,
  hasAlarmBeenLoggedToday,
  AlarmNavigationData,
} from '../../utils/alarmNavigation';

describe('alarmNavigation utils', () => {
  describe('buildAlarmNotificationId', () => {
    it('formats as alarm-{medicineId}-{reminderTimeId}', () => {
      expect(buildAlarmNotificationId('med-1', 'rt-1')).toBe('alarm-med-1-rt-1');
    });
  });

  describe('buildSnoozeNotificationId', () => {
    it('formats as snooze-{medicineId}-{reminderTimeId}', () => {
      expect(buildSnoozeNotificationId('med-1', 'rt-1')).toBe('snooze-med-1-rt-1');
    });
  });

  describe('getAlarmKey', () => {
    it('builds minute-level unique key', () => {
      const data: AlarmNavigationData = {
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-06-25T08:00:00Z',
      };
      const now = new Date('2024-06-25T08:00:30Z');
      const key = getAlarmKey(data, now);
      expect(key).toContain('med-1');
      expect(key).toContain('rt-1');
      // Dakika seviyesinde — ayni dakika icinde ayni key
    });

    it('produces different keys for different minutes', () => {
      const data: AlarmNavigationData = {
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-06-25T08:00:00Z',
      };
      const key1 = getAlarmKey(data, new Date('2024-06-25T08:00:00Z'));
      const key2 = getAlarmKey(data, new Date('2024-06-25T08:01:00Z'));
      expect(key1).not.toBe(key2);
    });
  });

  describe('getNotificationIdForAlarmData', () => {
    it('returns snooze ID when isSnooze is true', () => {
      const data: AlarmNavigationData = {
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-06-25T08:00:00Z',
        isSnooze: 'true',
        snoozeId: 'snooze-1',
      };
      expect(getNotificationIdForAlarmData(data)).toBe('snooze-med-1-rt-1');
    });

    it('returns alarm ID when isSnooze is false or missing', () => {
      const data: AlarmNavigationData = {
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-06-25T08:00:00Z',
      };
      expect(getNotificationIdForAlarmData(data)).toBe('alarm-med-1-rt-1');
    });
  });

  describe('hasAlarmBeenLoggedToday', () => {
    it('returns true when log exists for today with taken status', () => {
      const logs = [
        {
          reminderTimeId: 'rt-1',
          scheduledTime: '2024-06-25T08:00:00Z',
          status: 'taken',
        },
      ];
      const data: AlarmNavigationData = {
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-06-25T08:00:00Z',
      };
      expect(hasAlarmBeenLoggedToday(logs, data, new Date('2024-06-25T10:00:00Z'))).toBe(true);
    });

    it('returns false when no log exists', () => {
      const data: AlarmNavigationData = {
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-06-25T08:00:00Z',
      };
      expect(hasAlarmBeenLoggedToday([], data, new Date('2024-06-25T10:00:00Z'))).toBe(false);
    });

    it('returns false when log exists but for different reminderTimeId', () => {
      const logs = [
        {
          reminderTimeId: 'rt-OTHER',
          scheduledTime: '2024-06-25T08:00:00Z',
          status: 'taken',
        },
      ];
      const data: AlarmNavigationData = {
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-06-25T08:00:00Z',
      };
      expect(hasAlarmBeenLoggedToday(logs, data, new Date('2024-06-25T10:00:00Z'))).toBe(false);
    });
  });
});
