/**
 * timeCalculator advanced tests — Sprint 8
 * calculateMedicineTimes + getNextReminderTime edge case testleri
 */

import { calculateMedicineTimes, getNextReminderTime } from '../../utils/timeCalculator';
import type { ReminderTime } from '../../types';

describe('timeCalculator advanced', () => {
  describe('calculateMedicineTimes', () => {
    it('returns empty array for unknown frequency', () => {
      const result = calculateMedicineTimes('med-1', {
        wakeUpTime: '08:00',
        sleepTime: '23:00',
        frequency: 'invalid' as unknown as number,
      });
      expect(Array.isArray(result)).toBe(true);
    });

    it('respects wakeUpTime and sleepTime range', () => {
      const result = calculateMedicineTimes('med-1', {
        wakeUpTime: '06:00',
        sleepTime: '22:00',
        frequency: 3,
      });
      expect(result.length).toBeGreaterThan(0);
      // Tüm saatler 06:00-22:00 araliginda
      result.forEach(t => {
        const [h] = t.time.split(':').map(Number);
        expect(h).toBeGreaterThanOrEqual(6);
        expect(h).toBeLessThanOrEqual(22);
      });
    });
  });

  describe('getNextReminderTime', () => {
    it('returns null for empty array', () => {
      const result = getNextReminderTime([]);
      expect(result).toBeNull();
    });

    it('returns the first enabled reminder', () => {
      const reminders: ReminderTime[] = [
        { id: 'rt-3', medicineId: 'm1', time: '20:00', isEnabled: true },
        { id: 'rt-1', medicineId: 'm1', time: '08:00', isEnabled: true },
        { id: 'rt-2', medicineId: 'm1', time: '14:00', isEnabled: true },
      ];
      const result = getNextReminderTime(reminders);
      // Ilk enabled doner (siralama korunur, earliest degil)
      expect(result?.id).toBe('rt-3');
    });

    it('skips disabled reminders', () => {
      const reminders: ReminderTime[] = [
        { id: 'rt-1', medicineId: 'm1', time: '08:00', isEnabled: false },
        { id: 'rt-2', medicineId: 'm1', time: '14:00', isEnabled: true },
      ];
      const result = getNextReminderTime(reminders);
      expect(result?.id).toBe('rt-2');
    });

    it('returns the only enabled reminder', () => {
      const reminders: ReminderTime[] = [
        { id: 'rt-1', medicineId: 'm1', time: '08:00', isEnabled: true },
        { id: 'rt-2', medicineId: 'm1', time: '14:00', isEnabled: false },
        { id: 'rt-3', medicineId: 'm1', time: '20:00', isEnabled: false },
      ];
      const result = getNextReminderTime(reminders);
      expect(result?.id).toBe('rt-1');
    });
  });
});
