/**
 * notifications/channels tests — Sprint 8
 */

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn().mockResolvedValue('channel-id'),
  },
}));

jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'android', Version: 33 },
}));

import notifee from '@notifee/react-native';
import {
  CHANNEL_VERSION,
  ALARM_CHANNEL_ID,
  ALARM_NO_VIBRATION_CHANNEL_ID,
  REMINDER_CHANNEL_ID,
  REMINDER_NO_VIBRATION_CHANNEL_ID,
  createNotificationChannels,
} from '../../utils/notifications/channels';

describe('notifications/channels', () => {
  describe('constants', () => {
    it('CHANNEL_VERSION is defined', () => {
      expect(CHANNEL_VERSION).toBe('v4');
    });

    it('channel IDs include version', () => {
      expect(ALARM_CHANNEL_ID).toContain(CHANNEL_VERSION);
      expect(ALARM_NO_VIBRATION_CHANNEL_ID).toContain(CHANNEL_VERSION);
      expect(REMINDER_CHANNEL_ID).toContain(CHANNEL_VERSION);
      expect(REMINDER_NO_VIBRATION_CHANNEL_ID).toContain(CHANNEL_VERSION);
    });

    it('channel IDs are distinct', () => {
      expect(ALARM_CHANNEL_ID).not.toBe(REMINDER_CHANNEL_ID);
      expect(ALARM_CHANNEL_ID).not.toBe(ALARM_NO_VIBRATION_CHANNEL_ID);
      expect(REMINDER_CHANNEL_ID).not.toBe(REMINDER_NO_VIBRATION_CHANNEL_ID);
    });
  });

  describe('createNotificationChannels', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns without throwing (iOS or already created channels)', async () => {
      // Platform mock test ortaminda 'android' olmayabilir (jest.setup.js mock'u)
      // Bu yuzden fonksiyon erken return yapar. Test ortami icin smoke test.
      await expect(createNotificationChannels()).resolves.not.toThrow();
    });

    it('handles channel creation errors gracefully', async () => {
      (notifee.createChannel as jest.Mock).mockRejectedValueOnce(new Error('failed'));
      await expect(createNotificationChannels()).resolves.not.toThrow();
    });
  });
});
