import {
  triggerCaregiverLiveAlert,
  subscribeToLiveCaregiverAlerts,
  markAlertDismissed,
  isAlertDismissed,
  isCaregiverAlertDismissed,
  getCurrentActiveAlert,
  clearCurrentActiveAlert,
  LiveCaregiverAlertData,
} from '../../services/caregiverLiveAlertService';

jest.mock('@notifee/react-native', () => ({
  createChannel: jest.fn().mockResolvedValue(undefined),
  displayNotification: jest.fn().mockResolvedValue('notif-1'),
  AndroidImportance: { HIGH: 4 },
  AndroidVisibility: { PUBLIC: 1 },
}));

jest.mock('../../utils/alarmSoundManager', () => ({
  playAlarmSound: jest.fn().mockResolvedValue(undefined),
  stopAlarmSound: jest.fn(),
}));

describe('caregiverLiveAlertService', () => {
  beforeEach(() => {
    clearCurrentActiveAlert();
    jest.clearAllMocks();
  });

  it('marks alerts as dismissed and identifies them correctly', () => {
    markAlertDismissed('alert-123');
    expect(isAlertDismissed('alert-123')).toBe(true);
    expect(isAlertDismissed('alert-999')).toBe(false);
    expect(isAlertDismissed('')).toBe(false);
    expect(isAlertDismissed(undefined)).toBe(false);
  });

  it('correctly checks isCaregiverAlertDismissed for compound keys', () => {
    markAlertDismissed('p1_2026-08-28T20:00:00.000Z');
    markAlertDismissed('p2_alert-sos-99');

    expect(
      isCaregiverAlertDismissed({
        patientId: 'p1',
        scheduledTime: '2026-08-28T20:00:00.000Z',
      })
    ).toBe(true);

    expect(
      isCaregiverAlertDismissed({
        patientId: 'p2',
        alertId: 'alert-sos-99',
      })
    ).toBe(true);

    expect(
      isCaregiverAlertDismissed({
        patientId: 'p3',
        alertId: 'alert-sos-new',
      })
    ).toBe(false);
  });

  it('triggers alert listener and sets active alert', async () => {
    const listener = jest.fn();
    const unsub = subscribeToLiveCaregiverAlerts(listener);

    const alertData: LiveCaregiverAlertData = {
      alertId: 'alert-unique-1',
      patientId: 'patient-abc',
      patientName: 'Ahmet',
      medicineName: 'Aspirin',
      status: 'taken',
      scheduledTime: '10:00',
      timestamp: Date.now(),
    };

    await triggerCaregiverLiveAlert(alertData);

    expect(listener).toHaveBeenCalledWith(alertData);
    expect(getCurrentActiveAlert()).toEqual(alertData);

    // Duplicate trigger with same active alert should be ignored
    listener.mockClear();
    await triggerCaregiverLiveAlert(alertData);
    expect(listener).not.toHaveBeenCalled();

    unsub();
  });

  it('suppresses dismissed alerts from triggering', async () => {
    const listener = jest.fn();
    const unsub = subscribeToLiveCaregiverAlerts(listener);

    markAlertDismissed('alert-dismissed-xyz');

    const alertData: LiveCaregiverAlertData = {
      alertId: 'alert-dismissed-xyz',
      patientId: 'patient-abc',
      patientName: 'Ahmet',
      medicineName: 'Aspirin',
      status: 'taken',
      scheduledTime: '10:00',
      timestamp: Date.now(),
    };

    await triggerCaregiverLiveAlert(alertData);
    expect(listener).not.toHaveBeenCalled();

    unsub();
  });
});
