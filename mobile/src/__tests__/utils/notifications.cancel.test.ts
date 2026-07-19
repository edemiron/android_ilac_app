/**
 * notifications/cancel tests — Sprint 3 ek testler
 * cancelNotification + cancelMedicineNotifications + cleanupOrphanNotifications
 * logic coverage (notifee mock'lanarak).
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    cancelNotification: jest.fn().mockResolvedValue(undefined),
    cancelDisplayedNotification: jest.fn().mockResolvedValue(undefined),
    getTriggerNotificationIds: jest.fn().mockResolvedValue([]),
    getDisplayedNotifications: jest.fn().mockResolvedValue([]),
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

import notifee from '@notifee/react-native';
import {
  cancelNotification,
  cancelMedicineNotifications,
  cleanupOrphanNotifications,
} from '../../utils/notifications/cancel';

describe('cancelNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls notifee.cancelNotification with id', async () => {
    await cancelNotification('alarm-med-1-rt-1');
    expect(notifee.cancelNotification).toHaveBeenCalledWith('alarm-med-1-rt-1');
  });

  it('does not throw if notifee throws', async () => {
    (notifee.cancelNotification as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    await expect(cancelNotification('alarm-med-1-rt-1')).resolves.toBeUndefined();
  });
});

describe('cancelMedicineNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cancels trigger notifications belonging to medicine', async () => {
    (notifee.getTriggerNotificationIds as jest.Mock).mockResolvedValue([
      'alarm-med-1-rt-1',
      'alarm-med-1-rt-2',
      'alarm-med-2-rt-1',
    ]);
    (notifee.getDisplayedNotifications as jest.Mock).mockResolvedValue([]);

    await cancelMedicineNotifications('med-1');
    expect(notifee.cancelNotification).toHaveBeenCalledWith('alarm-med-1-rt-1');
    expect(notifee.cancelNotification).toHaveBeenCalledWith('alarm-med-1-rt-2');
    expect(notifee.cancelNotification).not.toHaveBeenCalledWith('alarm-med-2-rt-1');
  });

  it('also cancels snooze notifications for that medicine', async () => {
    (notifee.getTriggerNotificationIds as jest.Mock).mockResolvedValue([
      'snooze-med-1-rt-1-snooze-1',
      'snooze-med-2-rt-1-snooze-1',
    ]);
    (notifee.getDisplayedNotifications as jest.Mock).mockResolvedValue([]);

    await cancelMedicineNotifications('med-1');
    expect(notifee.cancelNotification).toHaveBeenCalledWith('snooze-med-1-rt-1-snooze-1');
    expect(notifee.cancelNotification).not.toHaveBeenCalledWith('snooze-med-2-rt-1-snooze-1');
  });

  it('cancels displayed notifications matching medicine id in data', async () => {
    (notifee.getTriggerNotificationIds as jest.Mock).mockResolvedValue([]);
    (notifee.getDisplayedNotifications as jest.Mock).mockResolvedValue([
      {
        id: 'displayed-1',
        notification: { data: { medicineId: 'med-1' } },
      },
      {
        id: 'displayed-2',
        notification: { data: { medicineId: 'med-2' } },
      },
    ]);

    await cancelMedicineNotifications('med-1');
    expect(notifee.cancelDisplayedNotification).toHaveBeenCalledWith('displayed-1');
    expect(notifee.cancelDisplayedNotification).not.toHaveBeenCalledWith('displayed-2');
  });

  it('does not throw if notifee throws', async () => {
    (notifee.getTriggerNotificationIds as jest.Mock).mockRejectedValue(new Error('fail'));
    await expect(cancelMedicineNotifications('med-1')).resolves.toBeUndefined();
  });
});

describe('cleanupOrphanNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cancels alarm triggers not matching any valid medicine', async () => {
    (notifee.getTriggerNotificationIds as jest.Mock).mockResolvedValue([
      'alarm-med-1-rt-1', // valid
      'alarm-orphan-rt-1', // orphan
    ]);
    (notifee.getDisplayedNotifications as jest.Mock).mockResolvedValue([]);

    const cancelled = await cleanupOrphanNotifications(['med-1']);
    expect(cancelled).toBe(1);
    expect(notifee.cancelNotification).toHaveBeenCalledWith('alarm-orphan-rt-1');
    expect(notifee.cancelNotification).not.toHaveBeenCalledWith('alarm-med-1-rt-1');
  });

  it('treats test-medicine as always valid', async () => {
    (notifee.getTriggerNotificationIds as jest.Mock).mockResolvedValue([
      'alarm-test-medicine-test-reminder',
    ]);
    (notifee.getDisplayedNotifications as jest.Mock).mockResolvedValue([]);

    const cancelled = await cleanupOrphanNotifications([]);
    expect(cancelled).toBe(0);
    expect(notifee.cancelNotification).not.toHaveBeenCalled();
  });

  it('preserves snooze triggers without medicineId (legacy)', async () => {
    (notifee.getTriggerNotificationIds as jest.Mock).mockResolvedValue([
      'snooze-orphan-snooze-1', // legacy, no medicine id
    ]);
    (notifee.getDisplayedNotifications as jest.Mock).mockResolvedValue([]);

    const cancelled = await cleanupOrphanNotifications(['med-1']);
    expect(cancelled).toBe(0);
    expect(notifee.cancelNotification).not.toHaveBeenCalled();
  });

  it('cancels displayed notifications not matching valid medicines', async () => {
    (notifee.getTriggerNotificationIds as jest.Mock).mockResolvedValue([]);
    (notifee.getDisplayedNotifications as jest.Mock).mockResolvedValue([
      {
        id: 'alarm-orphan-rt-1',
        notification: { data: { medicineId: 'unknown' } },
      },
    ]);

    const cancelled = await cleanupOrphanNotifications(['med-1']);
    expect(cancelled).toBe(1);
    expect(notifee.cancelDisplayedNotification).toHaveBeenCalledWith('alarm-orphan-rt-1');
  });

  it('skips displayed notifications without id', async () => {
    (notifee.getTriggerNotificationIds as jest.Mock).mockResolvedValue([]);
    (notifee.getDisplayedNotifications as jest.Mock).mockResolvedValue([
      { id: undefined, notification: { data: { medicineId: 'unknown' } } },
      { notification: { data: { medicineId: 'unknown' } } },
    ]);

    const cancelled = await cleanupOrphanNotifications(['med-1']);
    expect(cancelled).toBe(0);
  });

  it('returns 0 on error', async () => {
    (notifee.getTriggerNotificationIds as jest.Mock).mockRejectedValue(new Error('fail'));
    const cancelled = await cleanupOrphanNotifications(['med-1']);
    expect(cancelled).toBe(0);
  });

  it('counts both trigger and displayed orphans in total', async () => {
    (notifee.getTriggerNotificationIds as jest.Mock).mockResolvedValue(['alarm-orphan-rt-1']);
    (notifee.getDisplayedNotifications as jest.Mock).mockResolvedValue([
      { id: 'alarm-orphan-rt-2', notification: { data: { medicineId: 'x' } } },
    ]);

    const cancelled = await cleanupOrphanNotifications(['med-1']);
    expect(cancelled).toBe(2);
  });
});
