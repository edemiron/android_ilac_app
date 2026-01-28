import { isInQuietHours } from '../utils/notifications';
import { UserSettings } from '../types';

describe('isInQuietHours', () => {
  const baseSettings: UserSettings = {
    wakeUpTime: '08:00',
    sleepTime: '23:00',
    notificationSound: 'default',
    vibrationEnabled: true,
    fullScreenAlarmEnabled: true,
    language: 'tr',
    alarmSound: 'alarm',
    alarmVolume: 80,
    snoozeDuration: 5,
    quietHoursEnabled: true,
    quietHoursStart: '23:00',
    quietHoursEnd: '07:00',
    alarmModeEnabled: true,
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return false when quiet hours are disabled', () => {
    const settings = { ...baseSettings, quietHoursEnabled: false };
    jest.setSystemTime(new Date('2024-01-15T02:00:00'));

    expect(isInQuietHours(settings)).toBe(false);
  });

  describe('when quiet hours span midnight (23:00 - 07:00)', () => {
    it('should return true at 02:00 (within quiet hours)', () => {
      jest.setSystemTime(new Date('2024-01-15T02:00:00'));
      expect(isInQuietHours(baseSettings)).toBe(true);
    });

    it('should return true at 23:30 (within quiet hours)', () => {
      jest.setSystemTime(new Date('2024-01-15T23:30:00'));
      expect(isInQuietHours(baseSettings)).toBe(true);
    });

    it('should return true at 06:59 (within quiet hours)', () => {
      jest.setSystemTime(new Date('2024-01-15T06:59:00'));
      expect(isInQuietHours(baseSettings)).toBe(true);
    });

    it('should return false at 07:00 (at end of quiet hours)', () => {
      jest.setSystemTime(new Date('2024-01-15T07:00:00'));
      expect(isInQuietHours(baseSettings)).toBe(false);
    });

    it('should return false at 12:00 (outside quiet hours)', () => {
      jest.setSystemTime(new Date('2024-01-15T12:00:00'));
      expect(isInQuietHours(baseSettings)).toBe(false);
    });

    it('should return false at 22:59 (just before quiet hours)', () => {
      jest.setSystemTime(new Date('2024-01-15T22:59:00'));
      expect(isInQuietHours(baseSettings)).toBe(false);
    });
  });

  describe('when quiet hours do not span midnight (09:00 - 17:00)', () => {
    const daytimeSettings = {
      ...baseSettings,
      quietHoursStart: '09:00',
      quietHoursEnd: '17:00',
    };

    it('should return true at 12:00 (within quiet hours)', () => {
      jest.setSystemTime(new Date('2024-01-15T12:00:00'));
      expect(isInQuietHours(daytimeSettings)).toBe(true);
    });

    it('should return true at 09:00 (at start of quiet hours)', () => {
      jest.setSystemTime(new Date('2024-01-15T09:00:00'));
      expect(isInQuietHours(daytimeSettings)).toBe(true);
    });

    it('should return false at 17:00 (at end of quiet hours)', () => {
      jest.setSystemTime(new Date('2024-01-15T17:00:00'));
      expect(isInQuietHours(daytimeSettings)).toBe(false);
    });

    it('should return false at 08:59 (just before quiet hours)', () => {
      jest.setSystemTime(new Date('2024-01-15T08:59:00'));
      expect(isInQuietHours(daytimeSettings)).toBe(false);
    });

    it('should return false at 18:00 (after quiet hours)', () => {
      jest.setSystemTime(new Date('2024-01-15T18:00:00'));
      expect(isInQuietHours(daytimeSettings)).toBe(false);
    });
  });
});
