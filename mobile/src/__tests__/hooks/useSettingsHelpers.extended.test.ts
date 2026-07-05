/**
 * useSettingsHelpers ek testleri (Sprint 12.2 + onceki Sprint'ler).
 * useSettingsHelpers i18n normalization helper'lari.
 */

import {
  getLocalizedThemeLabel,
  getLocalizedLanguageLabel,
  normalizeTimeString,
} from '../../hooks/useSettingsHelpers';

describe('Sprint 12.2: getLocalizedThemeLabel', () => {
  it('returns Turkish labels', () => {
    expect(getLocalizedThemeLabel('light', 'tr')).toBe('Aydınlık');
    expect(getLocalizedThemeLabel('dark', 'tr')).toBe('Karanlık');
    expect(getLocalizedThemeLabel('system', 'tr')).toBe('Sistem');
  });

  it('returns English labels', () => {
    expect(getLocalizedThemeLabel('light', 'en')).toBe('Light');
    expect(getLocalizedThemeLabel('dark', 'en')).toBe('Dark');
    expect(getLocalizedThemeLabel('system', 'en')).toBe('System');
  });

  it('returns raw value for unknown theme', () => {
    expect(getLocalizedThemeLabel('rainbow', 'tr')).toBe('rainbow');
  });

  it('defaults to Turkish when language omitted', () => {
    expect(getLocalizedThemeLabel('light')).toBe('Aydınlık');
  });
});

describe('Sprint 12.2: getLocalizedLanguageLabel', () => {
  it('returns Turkish for tr', () => {
    expect(getLocalizedLanguageLabel('tr')).toBe('Türkçe');
  });

  it('returns English for en', () => {
    expect(getLocalizedLanguageLabel('en')).toBe('English');
  });
});

describe('Sprint 12.2: normalizeTimeString', () => {
  it('pads single-digit hours and minutes', () => {
    expect(normalizeTimeString('8:5')).toBe('08:05');
    expect(normalizeTimeString('9:30')).toBe('09:30');
    expect(normalizeTimeString('12:0')).toBe('12:00');
  });

  it('keeps already-padded values', () => {
    expect(normalizeTimeString('08:30')).toBe('08:30');
    expect(normalizeTimeString('23:59')).toBe('23:59');
  });

  it('returns 00:00 for empty/invalid input', () => {
    // '' typeof string -> first check pass. split('') -> [''] -> [NaN].
    // isFinite(NaN) -> false -> h=0. isFinite(undefined) -> false -> m=0.
    // Result: '00:00' (not NaN because of fallback).
    expect(normalizeTimeString('')).toBe('00:00');
    expect(normalizeTimeString('not-a-time')).toBe('00:00');
  });

  it('returns empty string for undefined (typeof check)', () => {
    expect(normalizeTimeString(undefined as string | undefined)).toBe('');
  });
});
