/**
 * notifications/time tests — Sprint 3 devamı
 *
 * ZAMAN DILIMI NOTU
 * isInQuietHours yerel saati okur (referenceDate.getHours()). Bu testler
 * eskiden UTC damgasi ('2024-06-25T14:00:00Z') kullaniyordu; UTC+3'te 14:00Z
 * yerel 17:00 oldugu icin gun ici pencere testleri basarisiz oluyor ve
 * "timezone-dependent" gerekcesiyle it.skip ile kapatilmislardi.
 *
 * Gecen testler de ayni kirilganliga sahipti, yalnizca UTC+3'te tesadufen
 * dogru sonuc veriyorlardi.
 *
 * Cozum: tarihleri YEREL saat kurucusuyla olustur — new Date(y, m, d, h, min)
 * calisan makinenin dilimi ne olursa olsun istenen yerel saati verir.
 */

import { isInQuietHours } from '../../utils/notifications/time';
import { DEFAULT_USER_SETTINGS } from '../../utils/defaultSettings';

/** 25 Haziran 2024, YEREL saat. Ay 0-indexli (5 = Haziran). */
const localTime = (hour: number, minute = 0) => new Date(2024, 5, 25, hour, minute, 0, 0);

const quietHours = (start: string, end: string) => ({
  ...DEFAULT_USER_SETTINGS,
  quietHoursEnabled: true,
  quietHoursStart: start,
  quietHoursEnd: end,
});

describe('isInQuietHours', () => {
  it('returns false when quietHoursEnabled=false', () => {
    const settings = { ...DEFAULT_USER_SETTINGS, quietHoursEnabled: false };
    expect(isInQuietHours(settings, localTime(22))).toBe(false);
  });

  it('returns false when start == end (empty window)', () => {
    expect(isInQuietHours(quietHours('22:00', '22:00'), localTime(22, 30))).toBe(false);
  });

  it('returns true when current time within daytime range', () => {
    expect(isInQuietHours(quietHours('13:00', '15:00'), localTime(14))).toBe(true);
  });

  it('returns false when current time outside daytime range', () => {
    expect(isInQuietHours(quietHours('13:00', '15:00'), localTime(16))).toBe(false);
  });

  it('daytime range is start-inclusive, end-exclusive', () => {
    const settings = quietHours('13:00', '15:00');
    expect(isInQuietHours(settings, localTime(13))).toBe(true);
    expect(isInQuietHours(settings, localTime(15))).toBe(false);
  });

  it('handles overnight range (22:00 - 07:00)', () => {
    const settings = quietHours('22:00', '07:00');
    expect(isInQuietHours(settings, localTime(23))).toBe(true);
    expect(isInQuietHours(settings, localTime(3))).toBe(true);
    expect(isInQuietHours(settings, localTime(12))).toBe(false);
  });

  it('overnight range boundaries', () => {
    const settings = quietHours('22:00', '07:00');
    expect(isInQuietHours(settings, localTime(22))).toBe(true);
    expect(isInQuietHours(settings, localTime(7))).toBe(false);
    expect(isInQuietHours(settings, localTime(6, 59))).toBe(true);
  });

  it('respects minute precision', () => {
    const settings = quietHours('13:00', '13:30');
    expect(isInQuietHours(settings, localTime(13, 15))).toBe(true);
    expect(isInQuietHours(settings, localTime(13, 30))).toBe(false);
    expect(isInQuietHours(settings, localTime(13, 0))).toBe(true);
  });
});
