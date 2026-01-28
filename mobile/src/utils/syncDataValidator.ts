/**
 * Sync Data Validator
 *
 * Uses Zod schemas to validate data coming from cloud sync.
 * This prevents corrupted or malicious data from entering the store.
 */
import { z } from 'zod';

/**
 * Time format regex: HH:MM (00:00 - 23:59)
 */
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Color format regex: Hex color (#RRGGBB or #RGB)
 */
const COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

/**
 * Medicine instruction types
 */
const MedicineInstructionSchema = z.enum([
  'before_meal',
  'after_meal',
  'with_meal',
  'empty_stomach',
  'before_sleep',
  'any_time',
]);

/**
 * Medicine schema
 */
const MedicineSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  dosage: z.string().min(1).max(100),
  frequency: z.number().int().min(1).max(24),
  instructions: MedicineInstructionSchema.optional(),
  color: z.string().regex(COLOR_REGEX, 'Invalid color format'),
  icon: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  customTimes: z.array(z.string().regex(TIME_REGEX)).optional(),
}).strict();

/**
 * Reminder time schema
 */
const ReminderTimeSchema = z.object({
  id: z.string().min(1),
  medicineId: z.string().min(1),
  time: z.string().regex(TIME_REGEX, 'Invalid time format (expected HH:MM)'),
  notificationId: z.string().optional(),
  isEnabled: z.boolean(),
}).strict();

/**
 * Medicine log status
 */
const MedicineLogStatusSchema = z.enum(['pending', 'taken', 'skipped', 'missed']);

/**
 * Medicine log schema
 */
const MedicineLogSchema = z.object({
  id: z.string().min(1),
  medicineId: z.string().min(1),
  reminderTimeId: z.string().min(1),
  scheduledTime: z.string(),
  takenAt: z.string().optional(),
  status: MedicineLogStatusSchema,
  note: z.string().max(500).optional(),
}).strict();

/**
 * User settings schema
 */
const UserSettingsSchema = z.object({
  wakeUpTime: z.string().regex(TIME_REGEX, 'Invalid wake up time format'),
  sleepTime: z.string().regex(TIME_REGEX, 'Invalid sleep time format'),
  notificationSound: z.string(),
  vibrationEnabled: z.boolean(),
  fullScreenAlarmEnabled: z.boolean(),
  language: z.enum(['tr', 'en']),
  alarmSound: z.enum(['alarm', 'default', 'gentle', 'urgent']).default('alarm'),
  alarmVolume: z.number().min(0).max(100).default(80),
  snoozeDuration: z.number().min(0.25).max(60),
  quietHoursEnabled: z.boolean(),
  quietHoursStart: z.string().regex(TIME_REGEX, 'Invalid quiet hours start time'),
  quietHoursEnd: z.string().regex(TIME_REGEX, 'Invalid quiet hours end time'),
  alarmModeEnabled: z.boolean(),
});

/**
 * Complete sync data schema
 */
const SyncDataSchema = z.object({
  medicines: z.array(MedicineSchema),
  reminderTimes: z.array(ReminderTimeSchema),
  medicineLogs: z.array(MedicineLogSchema),
  settings: UserSettingsSchema,
}).strict();

/**
 * Type inferred from Zod schema
 */
export type ValidatedSyncData = z.infer<typeof SyncDataSchema>;

/**
 * Custom error class for validation errors
 */
export class SyncDataValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: z.ZodIssue[]
  ) {
    super(message);
    this.name = 'SyncDataValidationError';
  }
}

/**
 * Validation result type
 */
export type ValidationResult =
  | { success: true; data: ValidatedSyncData }
  | { success: false; error: SyncDataValidationError };

/**
 * Validates sync data from cloud.
 *
 * @param data - Raw data from cloud sync
 * @returns Validation result with either validated data or error
 */
export function validateSyncData(data: unknown): ValidationResult {
  // Handle null/undefined input
  if (data === null || data === undefined) {
    return {
      success: false,
      error: new SyncDataValidationError(
        'Sync data is null or undefined',
        []
      ),
    };
  }

  const result = SyncDataSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    error: new SyncDataValidationError(
      `Sync data validation failed: ${result.error.issues.map(i => i.message).join(', ')}`,
      result.error.issues
    ),
  };
}

/**
 * Validates and throws if invalid (for use cases where exception is preferred)
 */
export function validateSyncDataOrThrow(data: unknown): ValidatedSyncData {
  const result = validateSyncData(data);

  if (!result.success) {
    throw result.error;
  }

  return result.data;
}
