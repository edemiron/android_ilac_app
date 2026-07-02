/**
 * Notifications — vibration module.
 *
 * Cihaz titreşim kontrolü. Sprint 3 (notifications.ts modular).
 */

import { Vibration } from 'react-native';
import { createScopedLogger } from '../logger';

const log = createScopedLogger('NotificationVibration');

/**
 * Aktif titreşimi iptal et
 */
export function stopAlarmVibration(): void {
  try {
    Vibration.cancel?.();
  } catch (error) {
    log.debug('Titreşim durdurma native bridge olmadan atlandi', error);
  }
}
