import { isMedicineScheduledForDate } from '../../utils/timeCalculator';
import { Medicine } from '../../types';

describe('isMedicineScheduledForDate Advanced Scheduling', () => {
  const baseMedicine: Medicine = {
    id: 'med-1',
    name: 'Test Med',
    dosage: '1 tablet',
    frequency: 1,
    color: '#FF6B6B',
    startDate: '2026-08-01T00:00:00.000Z',
    isActive: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  };

  it('should return true for daily medicine on any date after startDate', () => {
    const med: Medicine = { ...baseMedicine, scheduleType: 'daily' };
    expect(isMedicineScheduledForDate(med, new Date('2026-08-10T12:00:00Z'))).toBe(true);
  });

  it('should return false if targetDate is before startDate', () => {
    const med: Medicine = { ...baseMedicine, startDate: '2026-08-10T00:00:00.000Z' };
    expect(isMedicineScheduledForDate(med, new Date('2026-08-05T12:00:00Z'))).toBe(false);
  });

  it('should return false if targetDate is after endDate', () => {
    const med: Medicine = {
      ...baseMedicine,
      startDate: '2026-08-01T00:00:00.000Z',
      endDate: '2026-08-10T00:00:00.000Z',
    };
    expect(isMedicineScheduledForDate(med, new Date('2026-08-11T12:00:00Z'))).toBe(false);
    expect(isMedicineScheduledForDate(med, new Date('2026-08-09T12:00:00Z'))).toBe(true);
  });

  it('should return false for inactive medicines', () => {
    const med: Medicine = { ...baseMedicine, isActive: false };
    expect(isMedicineScheduledForDate(med, new Date('2026-08-10T12:00:00Z'))).toBe(false);
  });

  describe('specific_days schedule', () => {
    // 2026-08-17 is Monday (1), 2026-08-18 is Tuesday (2), 2026-08-19 is Wednesday (3)
    const med: Medicine = {
      ...baseMedicine,
      scheduleType: 'specific_days',
      specificDays: [1, 3, 5], // Mon, Wed, Fri
    };

    it('should return true on matching days of week', () => {
      // Monday
      expect(isMedicineScheduledForDate(med, new Date(2026, 7, 17))).toBe(true);
      // Wednesday
      expect(isMedicineScheduledForDate(med, new Date(2026, 7, 19))).toBe(true);
    });

    it('should return false on non-matching days of week', () => {
      // Tuesday
      expect(isMedicineScheduledForDate(med, new Date(2026, 7, 18))).toBe(false);
      // Sunday
      expect(isMedicineScheduledForDate(med, new Date(2026, 7, 23))).toBe(false);
    });
  });

  describe('interval_days schedule', () => {
    const med: Medicine = {
      ...baseMedicine,
      startDate: new Date(2026, 7, 1).toISOString(), // Aug 1
      scheduleType: 'interval_days',
      intervalDays: 2, // Every 2 days: Aug 1, Aug 3, Aug 5, Aug 7...
    };

    it('should return true on even intervals', () => {
      expect(isMedicineScheduledForDate(med, new Date(2026, 7, 1))).toBe(true);
      expect(isMedicineScheduledForDate(med, new Date(2026, 7, 3))).toBe(true);
      expect(isMedicineScheduledForDate(med, new Date(2026, 7, 5))).toBe(true);
    });

    it('should return false on off-interval days', () => {
      expect(isMedicineScheduledForDate(med, new Date(2026, 7, 2))).toBe(false);
      expect(isMedicineScheduledForDate(med, new Date(2026, 7, 4))).toBe(false);
    });
  });

  describe('cycle schedule', () => {
    const med: Medicine = {
      ...baseMedicine,
      startDate: new Date(2026, 7, 1).toISOString(), // Aug 1
      scheduleType: 'cycle',
      cycleDaysOn: 5, // Take for 5 days (Aug 1 - Aug 5)
      cycleDaysOff: 2, // Off for 2 days (Aug 6 - Aug 7)
    };

    it('should return true during active cycle days', () => {
      expect(isMedicineScheduledForDate(med, new Date(2026, 7, 1))).toBe(true);
      expect(isMedicineScheduledForDate(med, new Date(2026, 7, 5))).toBe(true);
      // Next cycle starts on Aug 8
      expect(isMedicineScheduledForDate(med, new Date(2026, 7, 8))).toBe(true);
    });

    it('should return false during off cycle days', () => {
      expect(isMedicineScheduledForDate(med, new Date(2026, 7, 6))).toBe(false);
      expect(isMedicineScheduledForDate(med, new Date(2026, 7, 7))).toBe(false);
    });
  });
});
