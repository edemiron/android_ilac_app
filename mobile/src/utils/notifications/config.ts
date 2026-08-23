/**
 * Notifications — config module.
 *
 * Shared notification konfigurasyon sabitleri. Sprint 3 (notifications.ts modular).
 */

export const ALARM_ACTIONS: Array<{ title: string; pressAction: { id: string } }> = [
  { title: '😴 Ertele', pressAction: { id: 'snooze' } },
  { title: '✅ Aldım', pressAction: { id: 'take' } },
];

export const FULL_SCREEN_ACTION = {
  id: 'default',
  launchActivity: 'default',
};

export const PRESS_ACTION = {
  id: 'default',
  launchActivity: 'default',
};

export const ANDROID_TRIGGER_INTROSPECTION_LIMIT = 50;
