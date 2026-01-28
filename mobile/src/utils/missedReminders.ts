/**
 * Missed Reminders Utility
 *
 * Marks medicine reminders as missed when scheduled time has passed
 * and no action (taken/skipped) was recorded.
 */
import { format } from 'date-fns';
import { generateId } from './idGenerator';
import { Medicine, ReminderTime, MedicineLog } from '../types';

/**
 * Default grace period in minutes.
 * Reminders are not marked as missed immediately - user has time to respond.
 */
const DEFAULT_GRACE_PERIOD_MINUTES = 60;

/**
 * Creates missed reminder logs for past reminders that have no action recorded.
 *
 * @param medicines - Array of medicines
 * @param reminderTimes - Array of reminder times
 * @param existingLogs - Array of existing medicine logs
 * @param now - Current date/time (allows for testing)
 * @param gracePeriodMinutes - Minutes after scheduled time before marking as missed
 * @returns Array of new MedicineLog entries with status 'missed'
 */
export function markMissedReminders(
  medicines: Medicine[],
  reminderTimes: ReminderTime[],
  existingLogs: MedicineLog[],
  now: Date = new Date(),
  gracePeriodMinutes: number = DEFAULT_GRACE_PERIOD_MINUTES
): MedicineLog[] {
  const missedLogs: MedicineLog[] = [];
  const today = format(now, 'yyyy-MM-dd');

  // Get active medicine IDs
  const activeMedicineIds = new Set(
    medicines
      .filter((m) => m.isActive)
      .map((m) => m.id)
  );

  // Get today's logs by reminderTimeId for quick lookup
  const todayLogsByReminderId = new Map<string, MedicineLog>();
  existingLogs.forEach((log) => {
    if (log.scheduledTime.startsWith(today)) {
      todayLogsByReminderId.set(log.reminderTimeId, log);
    }
  });

  // Check each enabled reminder time
  for (const reminderTime of reminderTimes) {
    // Skip if medicine is not active
    if (!activeMedicineIds.has(reminderTime.medicineId)) {
      continue;
    }

    // Skip if reminder is disabled
    if (!reminderTime.isEnabled) {
      continue;
    }

    // Skip if log already exists for today
    if (todayLogsByReminderId.has(reminderTime.id)) {
      continue;
    }

    // Parse scheduled time
    const [hours, minutes] = reminderTime.time.split(':').map(Number);
    const scheduledDateTime = new Date(now);
    scheduledDateTime.setHours(hours, minutes, 0, 0);

    // Calculate time with grace period
    const graceDeadline = new Date(scheduledDateTime);
    graceDeadline.setMinutes(graceDeadline.getMinutes() + gracePeriodMinutes);

    // Only mark as missed if past grace period
    if (now < graceDeadline) {
      continue;
    }

    // Create missed log
    const scheduledTimeISO = `${today}T${reminderTime.time}:00`;
    const missedLog: MedicineLog = {
      id: generateId(),
      medicineId: reminderTime.medicineId,
      reminderTimeId: reminderTime.id,
      scheduledTime: scheduledTimeISO,
      status: 'missed',
    };

    missedLogs.push(missedLog);
  }

  return missedLogs;
}
