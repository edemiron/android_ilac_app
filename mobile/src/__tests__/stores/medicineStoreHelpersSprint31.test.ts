/**
 * medicineStoreHelpers Sprint 31 ek helper testleri.
 *
 * Sprint 31.1: hasActiveReminderTime (3-key ReminderTime check helper).
 */

import { hasActiveReminderTime } from '../../stores/medicineStoreHelpers';

describe('hasActiveReminderTime', () => {
  const reminderTimes = [
    { id: 'rt1', medicineId: 'm1', isEnabled: true },
    { id: 'rt2', medicineId: 'm1', isEnabled: false },
    { id: 'rt3', medicineId: 'm2', isEnabled: true },
    { id: 'rt4', medicineId: 'm3', isEnabled: true },
  ];

  it('returns true when id, medicineId match and isEnabled', () => {
    expect(hasActiveReminderTime(reminderTimes, 'rt1', 'm1')).toBe(true);
  });

  it('returns false when isEnabled is false', () => {
    expect(hasActiveReminderTime(reminderTimes, 'rt2', 'm1')).toBe(false);
  });

  it('returns false when medicineId mismatch', () => {
    expect(hasActiveReminderTime(reminderTimes, 'rt3', 'm1')).toBe(false);
  });

  it('returns false when id not found', () => {
    expect(hasActiveReminderTime(reminderTimes, 'nope', 'm1')).toBe(false);
  });

  it('returns false for empty list', () => {
    expect(hasActiveReminderTime([], 'rt1', 'm1')).toBe(false);
  });
});
