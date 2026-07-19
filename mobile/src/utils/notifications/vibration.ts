/**
 * Notifications — vibration module.
 *
 * Cihaz titreşim kontrolü ve pattern seçimi. Sprint 3 (notifications.ts modular).
 */

import { Vibration } from 'react-native';
import { createScopedLogger } from '../logger';

const log = createScopedLogger('NotificationVibration');

/**
 * Titreşim pattern'i seç
 */
export function getVibrationPattern(
  pattern?: 'default' | 'heartbeat' | 'urgent' | 'soft'
): number[] {
  switch (pattern) {
    case 'heartbeat':
      return [300, 150, 300, 1000, 300, 150, 300, 1000];
    case 'urgent':
      return [150, 150, 150, 150, 150, 500, 150, 150, 150, 150];
    case 'soft':
      return [1000, 2000, 1000, 2000];
    case 'default':
    default:
      return [500, 1000, 500, 1000, 500, 1000];
  }
}

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
