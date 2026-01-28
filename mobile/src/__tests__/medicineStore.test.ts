/**
 * Medicine Store Tests
 * Tests for ID generation, sync operations, and data integrity
 */
import { v7 as uuidv7, validate as uuidValidate, version as uuidVersion } from 'uuid';

// Import the utility functions
import { generateId, isValidUUID } from '../utils/idGenerator';
import { SyncQueue } from '../utils/syncQueue';
import { markMissedReminders } from '../utils/missedReminders';
import { validateSyncData, SyncDataValidationError } from '../utils/syncDataValidator';
import { MedicineLog, Medicine, ReminderTime } from '../types';

describe('ID Generator', () => {
  describe('generateId', () => {
    it('should generate a valid UUID', () => {
      const id = generateId();

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(uuidValidate(id)).toBe(true);
    });

    it('should generate UUID v7 (time-ordered)', () => {
      const id = generateId();

      // UUID v7 has version 7 in the version nibble
      expect(uuidVersion(id)).toBe(7);
    });

    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      const count = 10000;

      for (let i = 0; i < count; i++) {
        ids.add(generateId());
      }

      // All IDs should be unique
      expect(ids.size).toBe(count);
    });

    it('should generate time-ordered IDs (later IDs are greater)', () => {
      const id1 = generateId();

      // Small delay to ensure time difference
      const id2 = generateId();

      // UUID v7 is lexicographically sortable by time
      // So id2 should be >= id1 (equal if generated in same millisecond)
      expect(id2 >= id1).toBe(true);
    });
  });

  describe('isValidUUID', () => {
    it('should return true for valid UUID v7', () => {
      const id = generateId();
      expect(isValidUUID(id)).toBe(true);
    });

    it('should return true for valid UUID v4', () => {
      // A known valid UUID v4
      const uuidV4 = '550e8400-e29b-41d4-a716-446655440000';
      expect(isValidUUID(uuidV4)).toBe(true);
    });

    it('should return false for invalid strings', () => {
      expect(isValidUUID('')).toBe(false);
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('12345')).toBe(false);
      expect(isValidUUID(null as unknown as string)).toBe(false);
      expect(isValidUUID(undefined as unknown as string)).toBe(false);
    });

    it('should return false for old Math.random style IDs', () => {
      // This is what the old generateId produced
      const oldStyleId = Math.random().toString(36).substring(2, 15);
      expect(isValidUUID(oldStyleId)).toBe(false);
    });
  });
});

describe('SyncQueue', () => {
  let syncQueue: SyncQueue;

  beforeEach(() => {
    syncQueue = new SyncQueue();
  });

  afterEach(() => {
    syncQueue.dispose();
  });

  describe('enqueue', () => {
    it('should execute operations sequentially', async () => {
      const results: number[] = [];

      await Promise.all([
        syncQueue.enqueue(async () => {
          await delay(50);
          results.push(1);
        }),
        syncQueue.enqueue(async () => {
          await delay(10);
          results.push(2);
        }),
        syncQueue.enqueue(async () => {
          results.push(3);
        }),
      ]);

      // Despite different delays, operations should complete in order
      expect(results).toEqual([1, 2, 3]);
    });

    it('should prevent concurrent execution (mutex behavior)', async () => {
      let concurrentCount = 0;
      let maxConcurrent = 0;

      const operation = async () => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        await delay(20);
        concurrentCount--;
      };

      await Promise.all([
        syncQueue.enqueue(operation),
        syncQueue.enqueue(operation),
        syncQueue.enqueue(operation),
      ]);

      // Only one operation should run at a time
      expect(maxConcurrent).toBe(1);
    });

    it('should propagate errors without blocking the queue', async () => {
      const results: string[] = [];

      const promise1 = syncQueue.enqueue(async () => {
        results.push('first');
      });

      const promise2 = syncQueue.enqueue(async () => {
        throw new Error('Test error');
      });

      const promise3 = syncQueue.enqueue(async () => {
        results.push('third');
      });

      await promise1;
      await expect(promise2).rejects.toThrow('Test error');
      await promise3;

      // Queue should continue after error
      expect(results).toEqual(['first', 'third']);
    });

    it('should return the operation result', async () => {
      const result = await syncQueue.enqueue(async () => {
        return 'test-result';
      });

      expect(result).toBe('test-result');
    });
  });

  describe('isProcessing', () => {
    it('should return true while processing', async () => {
      expect(syncQueue.isProcessing).toBe(false);

      let wasProcessingDuringOperation = false;

      const operation = syncQueue.enqueue(async () => {
        wasProcessingDuringOperation = syncQueue.isProcessing;
        await delay(10);
      });

      // Check immediately after enqueue
      expect(syncQueue.isProcessing).toBe(true);

      await operation;

      expect(wasProcessingDuringOperation).toBe(true);
      expect(syncQueue.isProcessing).toBe(false);
    });
  });

  describe('queueLength', () => {
    it('should report correct queue length', async () => {
      expect(syncQueue.queueLength).toBe(0);

      const longOperation = syncQueue.enqueue(async () => {
        await delay(100);
      });

      // Queue the next operations while first is running
      await delay(10);

      const op2 = syncQueue.enqueue(async () => delay(10));
      const op3 = syncQueue.enqueue(async () => delay(10));

      // Queue should have pending items (excluding current)
      expect(syncQueue.queueLength).toBeGreaterThanOrEqual(1);

      await Promise.all([longOperation, op2, op3]);

      expect(syncQueue.queueLength).toBe(0);
    });
  });
});

// Helper function for delays
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('markMissedReminders', () => {
  it('should mark reminders as missed if scheduled time has passed', () => {
    const now = new Date('2024-01-15T14:00:00');
    const medicines = [
      {
        id: 'med-1',
        name: 'Test Medicine',
        isActive: true,
      },
    ];
    const reminderTimes = [
      { id: 'rt-1', medicineId: 'med-1', time: '08:00', isEnabled: true },
      { id: 'rt-2', medicineId: 'med-1', time: '12:00', isEnabled: true },
      { id: 'rt-3', medicineId: 'med-1', time: '18:00', isEnabled: true }, // Future
    ];
    const existingLogs = [] as MedicineLog[];

    const result = markMissedReminders(
      medicines as any,
      reminderTimes as any,
      existingLogs,
      now
    );

    // Should create missed logs for 08:00 and 12:00 (past times)
    expect(result.length).toBe(2);
    expect(result[0].status).toBe('missed');
    expect(result[0].reminderTimeId).toBe('rt-1');
    expect(result[1].status).toBe('missed');
    expect(result[1].reminderTimeId).toBe('rt-2');
  });

  it('should not mark reminders that already have logs', () => {
    const now = new Date('2024-01-15T14:00:00');
    const medicines = [
      { id: 'med-1', name: 'Test Medicine', isActive: true },
    ];
    const reminderTimes = [
      { id: 'rt-1', medicineId: 'med-1', time: '08:00', isEnabled: true },
      { id: 'rt-2', medicineId: 'med-1', time: '12:00', isEnabled: true },
    ];
    const existingLogs = [
      {
        id: 'log-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-01-15T08:00:00',
        status: 'taken',
      },
    ];

    const result = markMissedReminders(
      medicines as any,
      reminderTimes as any,
      existingLogs as any,
      now
    );

    // Should only create missed log for rt-2 (rt-1 already has a log)
    expect(result.length).toBe(1);
    expect(result[0].reminderTimeId).toBe('rt-2');
  });

  it('should skip inactive medicines', () => {
    const now = new Date('2024-01-15T14:00:00');
    const medicines = [
      { id: 'med-1', name: 'Inactive Medicine', isActive: false },
    ];
    const reminderTimes = [
      { id: 'rt-1', medicineId: 'med-1', time: '08:00', isEnabled: true },
    ];
    const existingLogs = [] as MedicineLog[];

    const result = markMissedReminders(
      medicines as any,
      reminderTimes as any,
      existingLogs,
      now
    );

    // Should not create any logs for inactive medicines
    expect(result.length).toBe(0);
  });

  it('should skip disabled reminder times', () => {
    const now = new Date('2024-01-15T14:00:00');
    const medicines = [
      { id: 'med-1', name: 'Test Medicine', isActive: true },
    ];
    const reminderTimes = [
      { id: 'rt-1', medicineId: 'med-1', time: '08:00', isEnabled: false },
    ];
    const existingLogs = [] as MedicineLog[];

    const result = markMissedReminders(
      medicines as any,
      reminderTimes as any,
      existingLogs,
      now
    );

    // Should not create logs for disabled reminders
    expect(result.length).toBe(0);
  });

  it('should use grace period (not mark as missed immediately)', () => {
    // If scheduled at 12:00 and current time is 12:10, should not be marked missed yet
    // Grace period is typically 30-60 minutes
    const now = new Date('2024-01-15T12:10:00');
    const medicines = [
      { id: 'med-1', name: 'Test Medicine', isActive: true },
    ];
    const reminderTimes = [
      { id: 'rt-1', medicineId: 'med-1', time: '12:00', isEnabled: true },
    ];
    const existingLogs = [] as MedicineLog[];

    const result = markMissedReminders(
      medicines as any,
      reminderTimes as any,
      existingLogs,
      now,
      30 // 30 minute grace period
    );

    // Should not mark as missed within grace period
    expect(result.length).toBe(0);
  });

  it('should mark as missed after grace period expires', () => {
    // If scheduled at 12:00 and current time is 12:45, should be marked missed
    const now = new Date('2024-01-15T12:45:00');
    const medicines = [
      { id: 'med-1', name: 'Test Medicine', isActive: true },
    ];
    const reminderTimes = [
      { id: 'rt-1', medicineId: 'med-1', time: '12:00', isEnabled: true },
    ];
    const existingLogs = [] as MedicineLog[];

    const result = markMissedReminders(
      medicines as any,
      reminderTimes as any,
      existingLogs,
      now,
      30 // 30 minute grace period
    );

    // Should mark as missed after grace period
    expect(result.length).toBe(1);
    expect(result[0].status).toBe('missed');
  });
});

describe('validateSyncData', () => {
  const validSyncData = {
    medicines: [
      {
        id: 'med-1',
        name: 'Aspirin',
        dosage: '500mg',
        frequency: 2,
        color: '#FF6B6B',
        startDate: '2024-01-01',
        isActive: true,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
      },
    ],
    reminderTimes: [
      {
        id: 'rt-1',
        medicineId: 'med-1',
        time: '08:00',
        isEnabled: true,
      },
    ],
    medicineLogs: [
      {
        id: 'log-1',
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-01-15T08:00:00',
        status: 'taken',
        takenAt: '2024-01-15T08:05:00Z',
      },
    ],
    settings: {
      wakeUpTime: '08:00',
      sleepTime: '23:00',
      notificationSound: 'default',
      vibrationEnabled: true,
      fullScreenAlarmEnabled: true,
      language: 'tr',
      snoozeDuration: 5,
      quietHoursEnabled: false,
      quietHoursStart: '23:00',
      quietHoursEnd: '07:00',
      alarmModeEnabled: true,
    },
  };

  it('should accept valid sync data', () => {
    const result = validateSyncData(validSyncData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeDefined();
    }
  });

  it('should reject data with missing required fields', () => {
    const invalidData = {
      medicines: [],
      reminderTimes: [],
      // Missing medicineLogs and settings
    };

    const result = validateSyncData(invalidData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it('should reject medicine with invalid frequency', () => {
    const invalidData = {
      ...validSyncData,
      medicines: [
        {
          ...validSyncData.medicines[0],
          frequency: -1, // Invalid: must be positive
        },
      ],
    };

    const result = validateSyncData(invalidData);

    expect(result.success).toBe(false);
  });

  it('should reject invalid time format in settings', () => {
    const invalidData = {
      ...validSyncData,
      settings: {
        ...validSyncData.settings,
        wakeUpTime: '25:00', // Invalid: hours > 24
      },
    };

    const result = validateSyncData(invalidData);

    expect(result.success).toBe(false);
  });

  it('should reject invalid medicine log status', () => {
    const invalidData = {
      ...validSyncData,
      medicineLogs: [
        {
          ...validSyncData.medicineLogs[0],
          status: 'invalid_status', // Not a valid status
        },
      ],
    };

    const result = validateSyncData(invalidData);

    expect(result.success).toBe(false);
  });

  it('should reject data with extra/unknown fields (strict mode)', () => {
    const dataWithExtraFields = {
      ...validSyncData,
      medicines: [
        {
          ...validSyncData.medicines[0],
          maliciousField: '<script>alert("xss")</script>',
        },
      ],
    };

    const result = validateSyncData(dataWithExtraFields);

    // Strict mode rejects unknown fields for security
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it('should reject null or undefined input', () => {
    expect(validateSyncData(null as any).success).toBe(false);
    expect(validateSyncData(undefined as any).success).toBe(false);
  });

  it('should handle empty arrays gracefully', () => {
    const emptyData = {
      medicines: [],
      reminderTimes: [],
      medicineLogs: [],
      settings: validSyncData.settings,
    };

    const result = validateSyncData(emptyData);

    expect(result.success).toBe(true);
  });
});
