/**
 * CaregiverSection getInitials testleri — Sprint 93.
 *
 * getInitials pure helper izole modülde (getInitials.ts) — testable.
 * 10 unit test: empty/whitespace fallback, single-word, multi-word,
 * email-as-name, Turkish chars, multiple spaces.
 *
 * Sprint 82 MedicinesScreen.helpers.test pattern'i takip edildi.
 */

import { getInitials } from '../../../components/settings/getInitials';

describe('getInitials', () => {
  it('returns "?" for empty string', () => {
    expect(getInitials('')).toBe('?');
  });

  it('returns "?" for whitespace-only string', () => {
    expect(getInitials('   ')).toBe('?');
  });

  it('returns first 2 letters uppercase for single-word name', () => {
    expect(getInitials('John')).toBe('JO');
    expect(getInitials('ayşe')).toBe('AY');
  });

  it('truncates single-word name to 2 chars if longer', () => {
    expect(getInitials('Abdullah')).toBe('AB');
    expect(getInitials('X')).toBe('X');
  });

  it('returns first letter + last letter for two-word names', () => {
    expect(getInitials('John Doe')).toBe('JD');
    expect(getInitials('Ali Yılmaz')).toBe('AY');
  });

  it('returns first letter + last letter for three or more word names', () => {
    expect(getInitials('Mehmet Ali Şahin')).toBe('MŞ');
    expect(getInitials('Anna Maria Theresia')).toBe('AT');
  });

  it('handles email as name (splits on @)', () => {
    // caregiverName yoksa caregiverEmail kullanilir
    // split @: ["john.doe", "example.com"] → j + e = "JE"
    expect(getInitials('john.doe@example.com')).toBe('JE');
    // multi-part local: "ali.yılmaz" split edilmez (nokta split degil) -> "ay"
    expect(getInitials('ali@x.com')).toBe('AX');
  });

  it('returns single letter for very short name', () => {
    expect(getInitials('A')).toBe('A');
  });

  it('handles Turkish characters correctly', () => {
    expect(getInitials('İlhan Demir')).toBe('İD');
  });

  it('filters empty parts (multiple spaces)', () => {
    expect(getInitials('John    Doe')).toBe('JD');
    expect(getInitials(' John Doe ')).toBe('JD');
  });
});
