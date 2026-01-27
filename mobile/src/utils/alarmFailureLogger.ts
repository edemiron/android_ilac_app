import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createScopedLogger } from './logger';

const log = createScopedLogger('AlarmFailure');

// App version - package.json'dan okunabilir veya build sırasında set edilebilir
const APP_VERSION = '1.0.0';

const FAILURE_LOG_KEY = 'alarm-failure-log';
const MAX_LOG_ENTRIES = 100;

export type AlarmType = 'reminder' | 'snooze';

export type AlarmFailureReason =
  | 'MEDICATION_DELETED'
  | 'MEDICATION_INACTIVE'
  | 'REMINDER_INACTIVE'
  | 'REMINDER_MISSING'
  | 'SNOOZE_INACTIVE'
  | 'SNOOZE_MISSING'
  | 'ALREADY_LOGGED'
  | 'INVALID_DATA'
  | 'UNKNOWN';

export interface AlarmFailureEntry {
  id: string;
  timestamp: string;
  alarmType: AlarmType;
  reason: AlarmFailureReason;
  medicineId?: string;
  reminderTimeId?: string;
  snoozeId?: string;
  platform: 'android' | 'ios';
  appVersion: string;
  context?: Record<string, unknown>;
}

function generateFailureId(): string {
  return `fail_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function getAppVersion(): string {
  return APP_VERSION;
}

export async function logAlarmFailure(
  alarmType: AlarmType,
  reason: AlarmFailureReason,
  ids: {
    medicineId?: string;
    reminderTimeId?: string;
    snoozeId?: string;
  },
  context?: Record<string, unknown>
): Promise<void> {
  const entry: AlarmFailureEntry = {
    id: generateFailureId(),
    timestamp: new Date().toISOString(),
    alarmType,
    reason,
    medicineId: ids.medicineId,
    reminderTimeId: ids.reminderTimeId,
    snoozeId: ids.snoozeId,
    platform: Platform.OS as 'android' | 'ios',
    appVersion: getAppVersion(),
    context,
  };

  log.warn(`Silent alarm failure: ${reason}`, {
    alarmType,
    medicineId: ids.medicineId,
    reminderTimeId: ids.reminderTimeId,
    snoozeId: ids.snoozeId,
  });

  try {
    const existingData = await AsyncStorage.getItem(FAILURE_LOG_KEY);
    const logs: AlarmFailureEntry[] = existingData ? JSON.parse(existingData) : [];

    logs.push(entry);

    const trimmedLogs = logs.slice(-MAX_LOG_ENTRIES);

    await AsyncStorage.setItem(FAILURE_LOG_KEY, JSON.stringify(trimmedLogs));
  } catch (error) {
    log.error('Failed to persist alarm failure log', error);
  }
}

export async function getAlarmFailureLogs(): Promise<AlarmFailureEntry[]> {
  try {
    const data = await AsyncStorage.getItem(FAILURE_LOG_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    log.error('Failed to read alarm failure logs', error);
    return [];
  }
}

export async function clearAlarmFailureLogs(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FAILURE_LOG_KEY);
  } catch (error) {
    log.error('Failed to clear alarm failure logs', error);
  }
}

export async function getFailureStats(): Promise<{
  total: number;
  byReason: Record<AlarmFailureReason, number>;
  last24h: number;
}> {
  const logs = await getAlarmFailureLogs();
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const byReason: Record<string, number> = {};
  let last24h = 0;

  for (const entry of logs) {
    byReason[entry.reason] = (byReason[entry.reason] || 0) + 1;

    if (new Date(entry.timestamp).getTime() > oneDayAgo) {
      last24h++;
    }
  }

  return {
    total: logs.length,
    byReason: byReason as Record<AlarmFailureReason, number>,
    last24h,
  };
}
