import { createDefaultUserSettings, DEFAULT_USER_SETTINGS } from '../../utils/defaultSettings';

describe('defaultSettings utils', () => {
  describe('DEFAULT_USER_SETTINGS', () => {
    it('has expected default values', () => {
      expect(DEFAULT_USER_SETTINGS.wakeUpTime).toBe('08:00');
      expect(DEFAULT_USER_SETTINGS.sleepTime).toBe('23:00');
      expect(DEFAULT_USER_SETTINGS.language).toBe('tr');
      expect(DEFAULT_USER_SETTINGS.fullScreenAlarmEnabled).toBe(true);
      expect(DEFAULT_USER_SETTINGS.alarmVolume).toBe(80);
      expect(DEFAULT_USER_SETTINGS.snoozeDuration).toBe(5);
      expect(DEFAULT_USER_SETTINGS.maxSnoozeCount).toBe(3);
    });
  });

  describe('createDefaultUserSettings', () => {
    it('returns default settings with no overrides', () => {
      const result = createDefaultUserSettings();
      expect(result.wakeUpTime).toBe('08:00');
      expect(result.language).toBe('tr');
    });

    it('applies overrides on top of defaults', () => {
      const result = createDefaultUserSettings({
        wakeUpTime: '06:30',
        language: 'en',
        alarmVolume: 50,
      });
      expect(result.wakeUpTime).toBe('06:30');
      expect(result.language).toBe('en');
      expect(result.alarmVolume).toBe(50);
      // Override edilmeyen alanlar default kalir
      expect(result.sleepTime).toBe('23:00');
      expect(result.snoozeDuration).toBe(5);
    });

    it('handles empty override object', () => {
      const result = createDefaultUserSettings({});
      expect(result).toEqual(DEFAULT_USER_SETTINGS);
    });
  });
});
