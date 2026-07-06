/**
 * medicineStoreHelpers Sprint 28 ek helper testleri.
 *
 * Sprint 28.1: buildAlarmNotificationId (notificationId template helper).
 * Sprint 28.3: findReminderTimeById (Reminder lookup helper).
 */

import { buildAlarmNotificationId, findReminderTimeById } from '../../stores/medicineStoreHelpers';

describe('buildAlarmNotificationId', () => {
  it('builds alarm notification ID with template', () => {
    expect(buildAlarmNotificationId('m1', 'rt1')).toBe('alarm-m1-rt1');
  });

  it('handles long IDs', () => {
    expect(buildAlarmNotificationId('med-12345', 'reminder-time-67890')).toBe(
      'alarm-med-12345-reminder-time-67890'
    );
  });

  it('handles empty strings', () => {
    expect(buildAlarmNotificationId('', '')).toBe('alarm--');
  });
});

describe('findReminderTimeById', () => {
  const reminderTimes = [
    { id: 'rt1', medicineId: 'm1', time: '08:00' },
    { id: 'rt2', medicineId: 'm2', time: '12:00' },
    { id: 'rt3', medicineId: 'm3', time: '18:00' },
  ];

  it('finds matching reminder time', () => {
    expect(findReminderTimeById(reminderTimes, 'rt2')?.medicineId).toBe('m2');
  });

  it('returns undefined when not found', () => {
    expect(findReminderTimeById(reminderTimes, 'nope')).toBeUndefined();
  });

  it('returns undefined for null/undefined id', () => {
    expect(findReminderTimeById(reminderTimes, null)).toBeUndefined();
    expect(findReminderTimeById(reminderTimes, undefined)).toBeUndefined();
  });

  it('returns undefined for empty list', () => {
    expect(findReminderTimeById([], 'rt1')).toBeUndefined();
  });
});
