/**
 * SettingsScreen helpers testleri.
 */

import {
  DEV_MODE_TAP_COUNT,
  DEV_MODE_TAP_TIMEOUT,
  shouldTriggerDevMode,
  isDevModeTapExpired,
  SETTINGS_SECTIONS,
} from '../../screens/SettingsScreen/helpers';

describe('Sprint 11.4: DEV_MODE constants', () => {
  it('has expected tap count', () => {
    expect(DEV_MODE_TAP_COUNT).toBe(5);
  });

  it('has expected tap timeout', () => {
    expect(DEV_MODE_TAP_TIMEOUT).toBe(3000);
  });
});

describe('shouldTriggerDevMode', () => {
  it('returns true when tap count reached and within timeout', () => {
    const now = Date.now();
    expect(shouldTriggerDevMode(5, now - 1000, now)).toBe(true);
    expect(shouldTriggerDevMode(10, now - 100, now)).toBe(true);
  });

  it('returns false when tap count not reached', () => {
    const now = Date.now();
    expect(shouldTriggerDevMode(3, now - 1000, now)).toBe(false);
  });

  it('returns false when tap timeout exceeded', () => {
    const now = Date.now();
    expect(shouldTriggerDevMode(10, now - 5000, now)).toBe(false);
  });
});

describe('isDevModeTapExpired', () => {
  it('returns true when timeout exceeded', () => {
    const now = Date.now();
    expect(isDevModeTapExpired(now - 5000, now)).toBe(true);
  });

  it('returns false when within timeout', () => {
    const now = Date.now();
    expect(isDevModeTapExpired(now - 1000, now)).toBe(false);
  });

  it('returns false exactly at boundary', () => {
    const now = Date.now();
    expect(isDevModeTapExpired(now - DEV_MODE_TAP_TIMEOUT, now)).toBe(false);
  });
});

describe('SETTINGS_SECTIONS', () => {
  it('has expected section IDs', () => {
    expect(SETTINGS_SECTIONS.GENERAL).toBe('general');
    expect(SETTINGS_SECTIONS.NOTIFICATIONS).toBe('notifications');
    expect(SETTINGS_SECTIONS.ALARMS).toBe('alarms');
    expect(SETTINGS_SECTIONS.SECURITY).toBe('security');
    expect(SETTINGS_SECTIONS.ACCOUNT).toBe('account');
  });
});
