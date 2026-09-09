/**
 * Notifications — time helpers module.
 *
 * Pure time calculations (quiet hours check).
 * Sprint 3 (notifications.ts modular).
 */

import type { UserSettings } from '../../types';

/**
 * Quiet hours kontrolu — belirli bir saat diliminde miyiz?
 *
 * Davranis:
 * - quietHoursEnabled=false → her zaman false
 * - start == end → her zaman false (bos pencere)
 * - start > end (gece yarisi asimi, ornek 22:00-07:00) →
 *     current >= start VEYA current < end
 * - start < end (gun ici, ornek 13:00-15:00) →
 *     start <= current < end
 */
export function isInQuietHours(settings: UserSettings, referenceDate: Date = new Date()): boolean {
  if (!settings || !settings.quietHoursEnabled) {
    return false;
  }

  if (
    typeof settings.quietHoursStart !== 'string' ||
    typeof settings.quietHoursEnd !== 'string' ||
    !settings.quietHoursStart.includes(':') ||
    !settings.quietHoursEnd.includes(':')
  ) {
    return false;
  }

  const currentHour = referenceDate.getHours();
  const currentMinute = referenceDate.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const [startHour, startMinute] = settings.quietHoursStart.split(':').map(Number);
  const [endHour, endMinute] = settings.quietHoursEnd.split(':').map(Number);

  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  if (startTime == endTime) {
    return false;
  }

  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime;
  }

  return currentTime >= startTime && currentTime < endTime;
}
