/**
 * persistentNotification tests — Sprint 7
 * notifee mock'lu.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native', () => ({
  Platform: { OS: 'android', Version: 33 },
}));

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn().mockResolvedValue('channel-id'),
    displayNotification: jest.fn().mockResolvedValue('notif-id'),
    cancelDisplayedNotification: jest.fn().mockResolvedValue(undefined),
    getDisplayedNotifications: jest.fn().mockResolvedValue([]),
  },
  TriggerType: { TIMESTAMP: 0 },
  AndroidImportance: { HIGH: 4 },
  AndroidVisibility: { PUBLIC: 1 },
  AndroidStyle: { BIGTEXT: 'bigtext' },
  AndroidBadgeIconType: { LARGE: 'large' },
  AndroidGroupAlertBehavior: { CHILDREN: 'children' },
}));

jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import notifee from '@notifee/react-native';
import {
  createPersistentNotificationChannel,
  dismissPersistentNotification,
  dismissAllPersistentNotifications,
} from '../../utils/persistentNotification';

describe('persistentNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPersistentNotificationChannel', () => {
    it('creates channel on Android', async () => {
      await createPersistentNotificationChannel();
      // On Android, notifee.createChannel should be called
      expect(notifee.createChannel).toHaveBeenCalled();
    });

    it('does not throw', async () => {
      await expect(createPersistentNotificationChannel()).resolves.not.toThrow();
    });
  });

  describe('dismissPersistentNotification', () => {
    it('cancels the persistent notification for given medicine', async () => {
      await dismissPersistentNotification('med-1', 'rt-1');
      expect(notifee.cancelDisplayedNotification).toHaveBeenCalledWith('persistent-med-1-rt-1');
    });

    it('does not throw when notification does not exist', async () => {
      (notifee.cancelDisplayedNotification as jest.Mock).mockRejectedValueOnce(
        new Error('Not found')
      );
      await expect(dismissPersistentNotification('m', 'r')).resolves.not.toThrow();
    });
  });

  describe('dismissAllPersistentNotifications', () => {
    it('does not throw when no notifications are displayed', async () => {
      (notifee.getDisplayedNotifications as jest.Mock).mockResolvedValueOnce([]);
      await expect(dismissAllPersistentNotifications()).resolves.not.toThrow();
    });

    it('cancels persistent notifications', async () => {
      (notifee.getDisplayedNotifications as jest.Mock).mockResolvedValueOnce([
        { id: 'persistent-1', notification: { data: {} } },
        { id: 'persistent-2', notification: { data: { isPersistent: 'true' } } },
        { id: 'other-id', notification: { data: {} } },
      ]);
      await dismissAllPersistentNotifications();
      expect(notifee.cancelDisplayedNotification).toHaveBeenCalledWith('persistent-1');
      expect(notifee.cancelDisplayedNotification).toHaveBeenCalledWith('persistent-2');
      expect(notifee.cancelDisplayedNotification).not.toHaveBeenCalledWith('other-id');
    });

    it('does not throw when getDisplayedNotifications fails', async () => {
      (notifee.getDisplayedNotifications as jest.Mock).mockRejectedValueOnce(new Error('Failed'));
      await expect(dismissAllPersistentNotifications()).resolves.not.toThrow();
    });
  });
});
