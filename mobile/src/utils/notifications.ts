// Sprint 3 — notifications.ts barrel re-exports.
// Tum fonksiyon/sabit/tip degerleri ilgili ./notifications/* modullerinden
// yeniden export edilir; geriye donuk import uyumlulugu korunur.

export {
  buildSnoozeNotificationId,
  buildAlarmNotificationId,
  getAlarmNotificationId,
  isAlarmNotificationId,
  isSnoozeNotificationId,
  belongsToMedicine,
  extractDisplayedMedicineId,
} from './notifications/ids';

// Diagnostics — interfaces isolatedModules icin `export type` ile
export {
  ANDROID_TRIGGER_INTROSPECTION_LIMIT,
  analyzeNotificationDrift,
  getNotificationDiagnostics,
} from './notifications/diagnostics';
export type {
  NotificationStateSnapshot,
  ExpectedNotificationSnapshot,
  ScheduledNotificationSnapshot,
  NotificationDriftReport,
  NotificationDiagnosticsSnapshot,
} from './notifications/diagnostics';

// Permissions — runtime ve ayri type'lar
export {
  getPowerManagerInfo,
  openPowerManagerSettings,
  checkAllPermissions,
  openFullScreenIntentSettings,
  requestNotificationPermissions,
  requestExactAlarmPermission,
  requestBatteryOptimizationPermission,
  openDndSettings,
  openNotificationSettings,
} from './notifications/permissions';
export type { PermissionStatus, PowerManagerInfo } from './notifications/permissions';

// Schedule — runtime + ScheduleSnoozeParams type
export {
  scheduleMedicineNotification,
  scheduleSnoozeNotification,
  scheduleTestAlarmNotification,
  scheduleExpiryReminder,
  cancelExpiryReminder,
} from './notifications/schedule';
export type { ScheduleSnoozeParams } from './notifications/schedule';

// Cancel — sadece orphan/cancel ailesi
export {
  cancelNotification,
  cancelMedicineNotifications,
  cleanupOrphanNotifications,
} from './notifications/cancel';

// Actions — genel cancel/dismiss/sendTest ailesi
export {
  cancelAllNotifications,
  dismissNotification,
  sendTestNotification,
} from './notifications/actions';

// Time + vibration + behavior
export { isInQuietHours } from './notifications/time';
export { stopAlarmVibration, getVibrationPattern } from './notifications/vibration';
export { resolveNotificationSettings, resolveNotificationBehavior } from './notifications/behavior';
export type {
  NotificationSettingsInput,
  ResolvedNotificationBehavior,
} from './notifications/behavior';

// Listeners
export { setupNotificationListeners } from './notifications/listeners';
export type { NotificationData, AlarmPressData } from './notifications/listeners';

// Channels
export {
  CHANNEL_VERSION,
  ALARM_CHANNEL_ID,
  ALARM_NO_VIBRATION_CHANNEL_ID,
  REMINDER_CHANNEL_ID,
  REMINDER_NO_VIBRATION_CHANNEL_ID,
  createNotificationChannels,
} from './notifications/channels';

// Expo-notifications ile uyumluluk icin eski fonksiyon adi
export { requestNotificationPermissions as setupNotificationCategories } from './notifications/permissions';

// MIUI Helper re-exports
export { isMIUIDevice, getMIUIInstructions, openMIUIAutoStartSettings } from './miuiHelper';

export { wakeAndOpenApp, wakeScreenOnly } from './notifications/wake';
