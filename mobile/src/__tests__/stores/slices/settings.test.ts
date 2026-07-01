import { useSettingsStore } from '../../../stores/slices/settings';
import { DEFAULT_USER_SETTINGS } from '../../../utils/defaultSettings';

describe('SettingsSlice', () => {
  beforeEach(() => {
    useSettingsStore.setState({ settings: DEFAULT_USER_SETTINGS });
  });

  describe('setSettings', () => {
    it('replaces settings entirely', () => {
      const newSettings = { ...DEFAULT_USER_SETTINGS, language: 'en' as const };
      useSettingsStore.getState().setSettings(newSettings);
      expect(useSettingsStore.getState().settings.language).toBe('en');
    });
  });

  describe('updateSettings', () => {
    it('updates only provided fields, merges with existing', () => {
      useSettingsStore.getState().updateSettings({ wakeUpTime: '06:30' });
      const { settings } = useSettingsStore.getState();

      expect(settings.wakeUpTime).toBe('06:30');
      // Other fields should remain unchanged
      expect(settings.sleepTime).toBe(DEFAULT_USER_SETTINGS.sleepTime);
      expect(settings.language).toBe(DEFAULT_USER_SETTINGS.language);
    });

    it('supports multiple field updates at once', () => {
      useSettingsStore
        .getState()
        .updateSettings({ wakeUpTime: '06:00', sleepTime: '23:00', language: 'en' });

      const { settings } = useSettingsStore.getState();
      expect(settings.wakeUpTime).toBe('06:00');
      expect(settings.sleepTime).toBe('23:00');
      expect(settings.language).toBe('en');
    });
  });

  describe('resetSettings', () => {
    it('resets to default settings', () => {
      useSettingsStore.getState().updateSettings({ language: 'en', wakeUpTime: '06:00' });
      useSettingsStore.getState().resetSettings();

      expect(useSettingsStore.getState().settings.language).toBe(DEFAULT_USER_SETTINGS.language);
      expect(useSettingsStore.getState().settings.wakeUpTime).toBe(
        DEFAULT_USER_SETTINGS.wakeUpTime
      );
    });
  });

  describe('applyCloudSettings', () => {
    it('merges cloud settings with local settings', () => {
      useSettingsStore.getState().setSettings({
        ...DEFAULT_USER_SETTINGS,
        wakeUpTime: '06:00',
        sleepTime: '22:00',
        language: 'tr',
      });

      useSettingsStore.getState().applyCloudSettings({ language: 'en', wakeUpTime: '07:00' });

      const { settings } = useSettingsStore.getState();
      expect(settings.language).toBe('en'); // cloud value
      expect(settings.wakeUpTime).toBe('07:00'); // cloud value
      expect(settings.sleepTime).toBe('22:00'); // local retained
    });
  });
});
