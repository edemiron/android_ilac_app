/**
 * Notifications — wake module.
 *
 * MIUI / cihaz wake kontrolü. Sprint 3 (notifications.ts modular).
 * Native AlarmModule native bridge uzerinden wakeAndOpenApp + wakeScreenOnly.
 */

import { Platform, NativeModules } from 'react-native';
import { createScopedLogger } from '../logger';

const log = createScopedLogger('NotificationWake');

/**
 * Cihaz ekranini ac + uygulamayi one getir (MIUI AlarmModule native bridge).
 */
export async function wakeAndOpenApp(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    const { AlarmModule } = NativeModules;
    if (AlarmModule) {
      await AlarmModule.wakeAndOpenApp();
      log.debug('AlarmModule: Screen woken + app opened');
      return true;
    }
  } catch (error) {
    log.error('AlarmModule: wakeAndOpenApp failed', error);
  }
  return false;
}

/**
 * Sadece cihaz ekranini ac (uygulama one gelmez).
 */
export async function wakeScreenOnly(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    const { AlarmModule } = NativeModules;
    if (AlarmModule) {
      await AlarmModule.wakeScreenOnly();
      log.debug('AlarmModule: Screen woken only');
      return true;
    }
  } catch (error) {
    log.error('AlarmModule: wakeScreenOnly failed', error);
  }
  return false;
}
