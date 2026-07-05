/**
 * missedReminders tests — Sprint 8 devamı
 */

import { markMissedReminders } from '../../utils/missedReminders';
import type { Medicine, ReminderTime, MedicineLog } from '../../types';

const baseMedicine: Medicine = {
  id: 'med-1',
  name: 'Test Med',
  dosage: '500mg',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  color: '#FF6B6B',
  frequency: 1,
  startDate: '2024-01-01',
};

const baseReminder: ReminderTime = {
  id: 'rt-1',
  medicineId: 'med-1',
  time: '08:00',
  isEnabled: true,
};

describe('markMissedReminders', () => {
  it('returns empty array when no medicines exist', () => {
    const result = markMissedReminders([], [], []);
    expect(result).toEqual([]);
  });

  it('skips inactive medicines', () => {
    const inactiveMed = { ...baseMedicine, isActive: false };
    const result = markMissedReminders(
      [inactiveMed],
      [baseReminder],
      [],
      new Date('2024-06-25T20:00:00Z')
    );
    expect(result).toEqual([]);
  });

  it('skips disabled reminder times', () => {
    const disabledRt = { ...baseReminder, isEnabled: false };
    const result = markMissedReminders(
      [baseMedicine],
      [disabledRt],
      [],
      new Date('2024-06-25T20:00:00Z')
    );
    expect(result).toEqual([]);
  });

  it('returns empty for future reminder times', () => {
    const futureRt = { ...baseReminder, time: '23:59' };
    const result = markMissedReminders(
      [baseMedicine],
      [futureRt],
      [],
      new Date('2024-06-25T08:00:00Z')
    );
    expect(result).toEqual([]);
  });

  it('returns empty when log already exists for today', () => {
    const existingLog: MedicineLog = {
      id: 'log-1',
      medicineId: 'med-1',
      reminderTimeId: 'rt-1',
      scheduledTime: '2024-06-25T08:00:00Z',
      status: 'taken',
      takenAt: '2024-06-25T08:01:00Z',
    };
    const result = markMissedReminders(
      [baseMedicine],
      [baseReminder],
      [existingLog],
      new Date('2024-06-25T20:00:00Z')
    );
    expect(result).toEqual([]);
  });

  it('creates missed log when reminder is past and no log exists', () => {
    const result = markMissedReminders(
      [baseMedicine],
      [baseReminder],
      [],
      new Date('2024-06-25T20:00:00Z'),
      0 // gracePeriodMinutes = 0, immediate
    );
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].medicineId).toBe('med-1');
    expect(result[0].reminderTimeId).toBe('rt-1');
    expect(result[0].status).toBe('missed');
  });

  it('does not throw with multiple medicines and reminders', () => {
    const medicines: Medicine[] = [
      { ...baseMedicine, id: 'med-1' },
      { ...baseMedicine, id: 'med-2', name: 'Med 2' },
    ];
    const reminders: ReminderTime[] = [
      { ...baseReminder, medicineId: 'med-1', time: '07:00' },
      { ...baseReminder, id: 'rt-2', medicineId: 'med-2', time: '07:30' },
    ];
    expect(() =>
      markMissedReminders(medicines, reminders, [], new Date('2024-06-25T20:00:00Z'), 0)
    ).not.toThrow();
  });
});
