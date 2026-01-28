import { Medicine, ReminderTime } from '../types';
import { createScopedLogger } from './logger';

const log = createScopedLogger('AlarmStateMachine');

export type AlarmStatus = 
  | 'idle'
  | 'scheduled'
  | 'firing'
  | 'snoozed'
  | 'dismissed';

export interface AlarmContext {
  medicine?: Medicine;
  reminderTime?: ReminderTime;
  scheduledTime?: string;
  snoozeCount?: number;
  snoozeId?: string;
  originalScheduledTime?: string;
}

export interface AlarmMachineState {
  status: AlarmStatus;
  context: AlarmContext;
  history: AlarmTransition[];
}

export interface AlarmTransition {
  from: AlarmStatus;
  to: AlarmStatus;
  event: AlarmEvent;
  timestamp: string;
}

export type AlarmEvent =
  | { type: 'SCHEDULE'; medicine: Medicine; reminderTime: ReminderTime; scheduledTime: string }
  | { type: 'FIRE'; medicine: Medicine; reminderTime: ReminderTime; scheduledTime: string }
  | { type: 'SNOOZE'; snoozeId: string; snoozeCount: number; originalScheduledTime: string }
  | { type: 'TAKE' }
  | { type: 'SKIP' }
  | { type: 'DISMISS' }
  | { type: 'TIMEOUT' }
  | { type: 'RESET' };

const VALID_TRANSITIONS: Record<AlarmStatus, AlarmEvent['type'][]> = {
  idle: ['SCHEDULE', 'FIRE'],
  scheduled: ['FIRE', 'RESET'],
  firing: ['SNOOZE', 'TAKE', 'SKIP', 'DISMISS', 'TIMEOUT'],
  snoozed: ['FIRE', 'TAKE', 'SKIP', 'RESET'],
  dismissed: ['RESET', 'SCHEDULE'],
};

function isValidTransition(from: AlarmStatus, event: AlarmEvent['type']): boolean {
  return VALID_TRANSITIONS[from].includes(event);
}

function getNextStatus(current: AlarmStatus, event: AlarmEvent): AlarmStatus {
  switch (event.type) {
    case 'SCHEDULE':
      return 'scheduled';
    case 'FIRE':
      return 'firing';
    case 'SNOOZE':
      return 'snoozed';
    case 'TAKE':
    case 'SKIP':
    case 'DISMISS':
      return 'dismissed';
    case 'TIMEOUT':
      return 'dismissed';
    case 'RESET':
      return 'idle';
    default:
      return current;
  }
}

function updateContext(current: AlarmContext, event: AlarmEvent): AlarmContext {
  switch (event.type) {
    case 'SCHEDULE':
    case 'FIRE':
      return {
        medicine: event.medicine,
        reminderTime: event.reminderTime,
        scheduledTime: event.scheduledTime,
        snoozeCount: 0,
      };
    case 'SNOOZE':
      return {
        ...current,
        snoozeId: event.snoozeId,
        snoozeCount: event.snoozeCount,
        originalScheduledTime: event.originalScheduledTime,
      };
    case 'TAKE':
    case 'SKIP':
    case 'DISMISS':
    case 'TIMEOUT':
    case 'RESET':
      return {};
    default:
      return current;
  }
}

export function createAlarmMachine(): AlarmMachineState {
  return {
    status: 'idle',
    context: {},
    history: [],
  };
}

export function transition(
  state: AlarmMachineState,
  event: AlarmEvent
): AlarmMachineState {
  const { status, context, history } = state;

  if (!isValidTransition(status, event.type)) {
    log.warn('Invalid state transition attempted', {
      from: status,
      event: event.type,
      validEvents: VALID_TRANSITIONS[status],
    });
    return state;
  }

  const nextStatus = getNextStatus(status, event);
  const nextContext = updateContext(context, event);

  const transitionRecord: AlarmTransition = {
    from: status,
    to: nextStatus,
    event,
    timestamp: new Date().toISOString(),
  };

  const newHistory = [...history.slice(-9), transitionRecord];

  log.debug('State transition', {
    from: status,
    to: nextStatus,
    event: event.type,
  });

  let finalState: AlarmMachineState = {
    status: nextStatus,
    context: nextContext,
    history: newHistory,
  };

  if (nextStatus === 'dismissed') {
    finalState = transition(finalState, { type: 'RESET' });
  }

  return finalState;
}

export function canTransition(state: AlarmMachineState, eventType: AlarmEvent['type']): boolean {
  return isValidTransition(state.status, eventType);
}

export function getStatusDisplayName(status: AlarmStatus, language: 'tr' | 'en' = 'tr'): string {
  const names: Record<AlarmStatus, Record<'tr' | 'en', string>> = {
    idle: { tr: 'Bekleniyor', en: 'Idle' },
    scheduled: { tr: 'Planlandı', en: 'Scheduled' },
    firing: { tr: 'Çalıyor', en: 'Firing' },
    snoozed: { tr: 'Ertelendi', en: 'Snoozed' },
    dismissed: { tr: 'Kapatıldı', en: 'Dismissed' },
  };
  return names[status][language];
}
