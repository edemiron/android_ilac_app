/**
 * reminderStats tests — Sprint 65B.
 *
 * Pure function tests for getUniqueMedicineCount / getUniqueMedicineTakenCount.
 */

import {
  getUniqueMedicineCount,
  getUniqueMedicineTakenCount,
} from '../../../stores/helpers/reminderStats';
import type { TodayReminder } from '../../../screens/HomeScreen/types';

function makeReminder(
  medicineId: string,
  status: 'taken' | 'skipped' | 'pending' | null = null
): TodayReminder {
  return {
    medicine: { id: medicineId, name: `Med-${medicineId}` } as TodayReminder['medicine'],
    reminderTime: { id: `rt-${medicineId}`, time: '08:00' } as TodayReminder['reminderTime'],
    log: status ? ({ id: 'log', status } as TodayReminder['log']) : undefined,
  };
}

describe('reminderStats', () => {
  describe('getUniqueMedicineCount', () => {
    it('returns 0 for empty array', () => {
      expect(getUniqueMedicineCount([])).toBe(0);
    });

    it('returns 1 for single reminder', () => {
      const reminders = [makeReminder('a')];
      expect(getUniqueMedicineCount(reminders)).toBe(1);
    });

    it('deduplicates same medicine id', () => {
      const reminders = [makeReminder('a'), makeReminder('a'), makeReminder('a')];
      expect(getUniqueMedicineCount(reminders)).toBe(1);
    });

    it('counts distinct medicine ids', () => {
      const reminders = [
        makeReminder('a'),
        makeReminder('b'),
        makeReminder('c'),
        makeReminder('a'), // duplicate
      ];
      expect(getUniqueMedicineCount(reminders)).toBe(3);
    });

    it('handles missing medicine.id gracefully (skip)', () => {
      const reminders: TodayReminder[] = [
        makeReminder('a'),
        { ...makeReminder(''), medicine: { id: '' } as TodayReminder['medicine'] },
      ];
      expect(getUniqueMedicineCount(reminders)).toBe(1);
    });

    it('returns 0 if all reminders have empty id', () => {
      const reminders: TodayReminder[] = [
        { ...makeReminder(''), medicine: { id: '' } as TodayReminder['medicine'] },
      ];
      expect(getUniqueMedicineCount(reminders)).toBe(0);
    });
  });

  describe('getUniqueMedicineTakenCount', () => {
    it('returns 0 for empty array', () => {
      expect(getUniqueMedicineTakenCount([])).toBe(0);
    });

    it('counts only medicines with taken status', () => {
      const reminders = [
        makeReminder('a', 'taken'),
        makeReminder('a', 'pending'), // same medicine, different dose
        makeReminder('b', 'taken'),
        makeReminder('c', 'skipped'), // skipped, not taken
        makeReminder('d', null), // no log
      ];
      expect(getUniqueMedicineTakenCount(reminders)).toBe(2); // a + b
    });

    it('counts medicine once even if multiple doses taken', () => {
      const reminders = [
        makeReminder('a', 'taken'),
        makeReminder('a', 'taken'),
        makeReminder('a', 'taken'),
      ];
      expect(getUniqueMedicineTakenCount(reminders)).toBe(1);
    });
  });
});
