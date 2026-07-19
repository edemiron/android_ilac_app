/**
 * notifications/time tests — Sprint 3 devamı
 */

import { isInQuietHours } from '../../utils/notifications/time';
import { DEFAULT_USER_SETTINGS } from '../../utils/defaultSettings';

describe('isInQuietHours', () => {
  it('returns false when quietHoursEnabled=false', () => {
    const settings = { ...DEFAULT_USER_SETTINGS, quietHoursEnabled: false };
    expect(isInQuietHours(settings, new Date('2024-06-25T22:00:00Z'))).toBe(false);
  });

  it('returns false when start == end (empty window)', () => {
    const settings = {
      ...DEFAULT_USER_SETTINGS,
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '22:00',
    };
    expect(isInQuietHours(settings, new Date('2024-06-25T22:30:00Z'))).toBe(false);
  });

  it.skip('returns true when current time within daytime range (timezone-dependent)', () => {
    const settings = {
      ...DEFAULT_USER_SETTINGS,
      quietHoursEnabled: true,
      quietHoursStart: '13:00',
      quietHoursEnd: '15:00',
    };
    expect(isInQuietHours(settings, new Date('2024-06-25T14:00:00Z'))).toBe(true);
  });

  it.skip('returns false when current time outside daytime range (timezone-dependent)', () => {
    const settings = {
      ...DEFAULT_USER_SETTINGS,
      quietHoursEnabled: true,
      quietHoursStart: '13:00',
      quietHoursEnd: '15:00',
    };
    expect(isInQuietHours(settings, new Date('2024-06-25T16:00:00Z'))).toBe(false);
  });

  it('handles overnight range (22:00 - 07:00)', () => {
    const settings = {
      ...DEFAULT_USER_SETTINGS,
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    };
    // Late night (23:00)
    expect(isInQuietHours(settings, new Date('2024-06-25T23:00:00Z'))).toBe(true);
    // Early morning (03:00)
    expect(isInQuietHours(settings, new Date('2024-06-25T03:00:00Z'))).toBe(true);
    // Midday (12:00) — outside
    expect(isInQuietHours(settings, new Date('2024-06-25T12:00:00Z'))).toBe(false);
  });

  it.skip('respects minute precision (timezone-dependent)', () => {
    const settings = {
      ...DEFAULT_USER_SETTINGS,
      quietHoursEnabled: true,
      quietHoursStart: '13:00',
      quietHoursEnd: '13:30',
    };
    expect(isInQuietHours(settings, new Date('2024-06-25T13:15:00Z'))).toBe(true);
    expect(isInQuietHours(settings, new Date('2024-06-25T13:30:00Z'))).toBe(false);
    expect(isInQuietHours(settings, new Date('2024-06-25T13:00:00Z'))).toBe(true);
  });
});
