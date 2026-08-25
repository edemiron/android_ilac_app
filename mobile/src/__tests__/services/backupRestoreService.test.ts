import {
  createBackupPayload,
  validateBackupPayload,
  parseAndValidateBackupJson,
  shareBackup,
  utf8ToBase64,
  base64ToUtf8,
  BACKUP_SCHEMA_VERSION,
} from '../../services/backupRestoreService';
import Share from 'react-native-share';
import { UserSettings } from '../../types';

jest.mock('react-native-share', () => ({
  open: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('backupRestoreService', () => {
  const mockMedicines = [
    {
      id: 'med-1',
      name: 'Aspirin',
      dosage: '100mg',
      frequency: 1,
      color: '#FF6B6B',
      startDate: '2026-08-01T00:00:00.000Z',
      isActive: true,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
  ];

  const mockReminderTimes = [
    {
      id: 'rt-1',
      medicineId: 'med-1',
      time: '08:00',
      isEnabled: true,
    },
  ];

  const mockLogs = [
    {
      id: 'log-1',
      medicineId: 'med-1',
      reminderTimeId: 'rt-1',
      scheduledTime: '2026-08-10T08:00:00',
      status: 'taken' as const,
      takenAt: '2026-08-10T08:05:00',
    },
  ];

  const mockSettings = {
    wakeUpTime: '08:00',
    sleepTime: '23:00',
    language: 'tr',
  } as unknown as UserSettings;

  it('creates valid backup payload with current version and metadata', () => {
    const payload = createBackupPayload(mockMedicines, mockReminderTimes, mockLogs, mockSettings);

    expect(payload.version).toBe(BACKUP_SCHEMA_VERSION);
    expect(payload.appName).toBe('İlaç Hatırlatıcı');
    expect(payload.medicines).toEqual(mockMedicines);
    expect(payload.reminderTimes).toEqual(mockReminderTimes);
    expect(payload.medicineLogs).toEqual(mockLogs);
  });

  it('validates a correct payload', () => {
    const payload = createBackupPayload(mockMedicines, mockReminderTimes, mockLogs, mockSettings);

    const result = validateBackupPayload(payload);
    expect(result.isValid).toBe(true);
    expect(result.summary?.medicineCount).toBe(1);
    expect(result.summary?.reminderCount).toBe(1);
  });

  it('rejects payload with higher version', () => {
    const invalid = {
      version: 999,
      medicines: [],
      reminderTimes: [],
    };
    const result = validateBackupPayload(invalid);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('sürümü');
  });

  it('rejects corrupt medicine entries', () => {
    const corrupt = {
      version: 1,
      medicines: [{ invalid: 'object' }],
      reminderTimes: [],
    };
    const result = validateBackupPayload(corrupt);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('İlaç listesinde');
  });

  it('parses valid JSON string', () => {
    const payload = createBackupPayload(mockMedicines, mockReminderTimes, mockLogs, mockSettings);
    const jsonStr = JSON.stringify(payload);
    const result = parseAndValidateBackupJson(jsonStr);

    expect(result.isValid).toBe(true);
    expect(result.payload?.medicines.length).toBe(1);
  });

  it('returns error on broken JSON string', () => {
    const result = parseAndValidateBackupJson('{ broken json');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('JSON');
  });

  it('calls Share.open with base64 data URL on shareBackup', async () => {
    const payload = createBackupPayload(mockMedicines, mockReminderTimes, mockLogs, mockSettings);

    const result = await shareBackup(payload);
    expect(result.success).toBe(true);
    expect(Share.open).toHaveBeenCalledTimes(1);
    const shareCallArgs = (Share.open as jest.Mock).mock.calls[0][0];
    expect(shareCallArgs.url).toMatch(/^data:application\/json;base64,/);
    expect(shareCallArgs.type).toBe('application/json');
  });

  it('correctly encodes and decodes UTF-8 strings with Turkish characters and emojis', () => {
    const originalText = 'Parol 500mg, Tok karnına (Çörekotu & Şurup) 💊 1 tablet - ĞİÖŞÜçğıöşü';
    const encoded = utf8ToBase64(originalText);
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = base64ToUtf8(encoded);
    expect(decoded).toBe(originalText);
  });
});
