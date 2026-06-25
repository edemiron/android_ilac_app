import {
  validateSyncData,
  validateSyncDataOrThrow,
  SyncDataValidationError,
} from '../../utils/syncDataValidator';

const FULL_SETTINGS = {
  wakeUpTime: '08:00',
  sleepTime: '23:00',
  notificationSound: 'default',
  vibrationEnabled: true,
  fullScreenAlarmEnabled: true,
  language: 'tr' as const,
  alarmSound: 'alarm' as const,
  alarmVolume: 80,
  snoozeDuration: 5,
  maxSnoozeCount: 3,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  alarmModeEnabled: true,
  conflictIntervalMinutes: 10,
};

describe('syncDataValidator utils', () => {
  describe('validateSyncData', () => {
    it('returns success: true for valid medicines-only data', () => {
      const valid = {
        medicines: [],
        reminderTimes: [],
        medicineLogs: [],
        settings: FULL_SETTINGS,
      };
      const result = validateSyncData(valid);
      expect(result.success).toBe(true);
    });

    it('returns success: true for valid data with one medicine', () => {
      const valid = {
        medicines: [
          {
            id: 'med-1',
            name: 'Aspirin',
            dosage: '500mg',
            frequency: 1,
            color: '#FF0000',
            isActive: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            startDate: '2024-01-01',
          },
        ],
        reminderTimes: [],
        medicineLogs: [],
        settings: FULL_SETTINGS,
      };
      const result = validateSyncData(valid);
      expect(result.success).toBe(true);
    });

    it('returns success: false for invalid medicine (missing required fields)', () => {
      const invalid = {
        medicines: [{ id: 'med-1' /* name eksik */ }],
        reminderTimes: [],
        medicineLogs: [],
        settings: FULL_SETTINGS,
      };
      const result = validateSyncData(invalid);
      expect(result.success).toBe(false);
    });

    it('returns success: false for completely malformed data', () => {
      const result = validateSyncData('not an object');
      expect(result.success).toBe(false);
    });
  });

  describe('validateSyncDataOrThrow', () => {
    it('returns parsed data on valid input', () => {
      const valid = {
        medicines: [],
        reminderTimes: [],
        medicineLogs: [],
        settings: FULL_SETTINGS,
      };
      const parsed = validateSyncDataOrThrow(valid);
      expect(parsed.settings.userId ?? 'no-uid').toBe('no-uid'); // settings.userId yok
      expect(parsed.medicines).toEqual([]);
    });

    it('throws SyncDataValidationError on invalid input', () => {
      expect(() => validateSyncDataOrThrow({})).toThrow(SyncDataValidationError);
    });
  });
});
