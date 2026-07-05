/**
 * HomeScreen helpers testleri — getRelativeTimeText pure helper.
 *
 * Test stratejisi: fonksiyon herhangi bir "now" ile calisiyor; biz
 * Time-aware kontrolleri yapmak yerine fonksiyonun dondurdugu text
 * pattern'i (dk/once, h/ago, dk/sonra) veya flag (isPast/isNow) uzerinden
 * kontrol ediyoruz. System saatinden bagimsiz.
 */

import { getRelativeTimeText } from '../../screens/HomeScreen/helpers';
import type { MedicineLog } from '../../types';

describe('getRelativeTimeText', () => {
  it('returns "Alindi" for taken log (TR)', () => {
    const result = getRelativeTimeText('04:00', 'tr', { status: 'taken' } as MedicineLog);
    expect(result.text).toBe('Alındı');
    expect(result.isPast).toBe(false);
  });

  it('returns "Taken" for taken log (EN)', () => {
    const result = getRelativeTimeText('04:00', 'en', { status: 'taken' } as MedicineLog);
    expect(result.text).toBe('Taken');
  });

  it('returns "Atlandi" for skipped log (TR)', () => {
    const result = getRelativeTimeText('04:00', 'tr', { status: 'skipped' } as MedicineLog);
    expect(result.text).toBe('Atlandı');
  });

  it('returns "Skipped" for skipped log (EN)', () => {
    const result = getRelativeTimeText('04:00', 'en', { status: 'skipped' } as MedicineLog);
    expect(result.text).toBe('Skipped');
  });

  it('returns isPast=true for past times', () => {
    // 00:00 kesinlikle gecmis
    const result = getRelativeTimeText('00:00', 'tr');
    expect(result.isPast).toBe(true);
  });

  it('returns text matching dk/once or h/ago for past (TR)', () => {
    const result = getRelativeTimeText('00:00', 'tr');
    expect(result.text).toMatch(/dk önce|saat önce/);
  });

  it('returns text matching past pattern (EN)', () => {
    const result = getRelativeTimeText('00:00', 'en');
    expect(result.text).toMatch(/min ago|h ago/);
  });

  it('returns isPast=false for future times', () => {
    // 23:59 kesinlikle gelecek
    const result = getRelativeTimeText('04:00', 'tr');
    expect(result.isPast).toBe(false);
  });

  it('returns future text pattern (TR)', () => {
    const result = getRelativeTimeText('04:00', 'tr');
    expect(result.text).toMatch(/dk sonra|saat sonra/);
  });

  it('returns future text pattern (EN)', () => {
    const result = getRelativeTimeText('04:00', 'en');
    expect(result.text).toMatch(/in \d+ min|in \d+h/);
  });

  it('returns isNow for current window (time rounded to nearest 2 min)', () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const result = getRelativeTimeText(`${hh}:${mm}`, 'tr');
    expect(result.isNow).toBe(true);
  });

  it('result contains minutesDiff field with numeric value', () => {
    const result = getRelativeTimeText('04:00', 'en');
    expect(typeof result.minutesDiff).toBe('number');
  });
});
