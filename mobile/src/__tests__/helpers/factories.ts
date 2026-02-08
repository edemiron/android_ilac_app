/**
 * Test Factory Functions
 * Type-safe test data generators to avoid `as any` casts
 */
import { Medicine, ReminderTime, MedicineLog } from '../../types';

let counter = 0;

export function createMedicine(overrides: Partial<Medicine> = {}): Medicine {
  counter++;
  return {
    id: `med-${counter}`,
    name: 'Test Medicine',
    dosage: '500mg',
    frequency: 2,
    color: '#FF6B6B',
    startDate: '2024-01-01T00:00:00.000Z',
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createReminderTime(overrides: Partial<ReminderTime> = {}): ReminderTime {
  counter++;
  return {
    id: `rt-${counter}`,
    medicineId: 'med-1',
    time: '08:00',
    isEnabled: true,
    ...overrides,
  };
}

export function createMedicineLog(overrides: Partial<MedicineLog> = {}): MedicineLog {
  counter++;
  return {
    id: `log-${counter}`,
    medicineId: 'med-1',
    reminderTimeId: 'rt-1',
    scheduledTime: '2024-01-15T08:00:00',
    status: 'taken',
    ...overrides,
  };
}

export function resetCounter(): void {
  counter = 0;
}
