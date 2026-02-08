/**
 * Uygulama genelinde kullanılan sabit değerler.
 * Magic string'leri tek noktada toplar.
 */

// ===== ASYNCSTORAGE KEYS =====
export const STORAGE_KEYS = {
  /** Zustand persist key — ilaç, hatırlatma, log, ayarlar */
  MEDICINE_STORAGE: 'medicine-storage',
  /** BG handler → App arası alarm verisi */
  PENDING_ALARM: 'pending-alarm',
  /** İşlenmiş alarm key'leri (duplicate engel) */
  HANDLED_ALARMS: 'handled-alarms',
  /** Boot recovery sonucu */
  BOOT_RECOVERY: 'boot-recovery-result',
  /** Dev mode durumu */
  DEV_MODE: 'dev-mode',
  /** MIUI uyarısı gösterildi mi */
  MIUI_CHECK_SHOWN: '@miui_battery_check_shown',
  /** Güvenlik ayarları */
  SECURITY_SETTINGS: '@security_settings',
  /** PIN hash */
  PIN_HASH: '@security_pin_hash',
  /** Son aktif zaman */
  LAST_ACTIVE_TIME: '@last_active_time',
  /** Tema tercihi */
  THEME: '@app_theme',
} as const;

// ===== NOTIFICATION CHANNEL IDS =====
export const CHANNELS = {
  /** Tam ekran alarm kanalı (native MainApplication.kt ile eşleşmeli) */
  ALARM: 'medicine-alarms-v4',
  /** Normal hatırlatma kanalı */
  REMINDER: 'medicine-reminders-v4',
  /** Kalıcı bildirim kanalı */
  PERSISTENT: 'persistent-medicine-reminders',
} as const;

// ===== NOTIFICATION IDS =====
export const NOTIFICATION_IDS = {
  /** Boot recovery senkronizasyon bildirimi */
  ALARM_SYNC: 'alarm-sync-notification',
} as const;
