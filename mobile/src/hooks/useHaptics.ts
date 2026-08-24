/**
 * useHaptics — Sprint 64.
 *
 * react-native-haptic-feedback wrapper. useUserProfile.hapticsEnabled flag'ine
 * göre aktif/pasif. iOS: selection/impactLight/notificationSuccess mapping.
 *
 * Plan: react-native-haptic-feedback Sprint 19'dan kurulu, yeni dep yok.
 */

import { useCallback, useContext } from 'react';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { UserProfileContext } from './useUserProfile';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('useHaptics');

const HAPTIC_OPTIONS = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

export type { HapticType };

const HAPTIC_TYPE_MAP: Record<HapticType, string> = {
  light: 'impactLight',
  medium: 'impactMedium',
  heavy: 'impactHeavy',
  selection: 'selection',
  success: 'notificationSuccess',
  warning: 'notificationWarning',
  error: 'notificationError',
};

export function useHaptics() {
  const profileCtx = useContext(UserProfileContext);
  const hapticsEnabled = profileCtx?.profile?.hapticsEnabled ?? true;

  const trigger = useCallback(
    (type: HapticType = 'light') => {
      if (!hapticsEnabled) return;
      try {
        const nativeType = HAPTIC_TYPE_MAP[type] as
          | 'impactLight'
          | 'impactMedium'
          | 'impactHeavy'
          | 'selection'
          | 'notificationSuccess'
          | 'notificationWarning'
          | 'notificationError';
        ReactNativeHapticFeedback.trigger(nativeType, HAPTIC_OPTIONS);
      } catch (error) {
        // Haptic failures are non-critical
        log.warn(`Haptic tetiklenemedi: ${type}`, error);
      }
    },
    [hapticsEnabled]
  );

  return {
    light: () => trigger('light'),
    medium: () => trigger('medium'),
    heavy: () => trigger('heavy'),
    selection: () => trigger('selection'),
    success: () => trigger('success'),
    warning: () => trigger('warning'),
    error: () => trigger('error'),
    trigger,
  };
}
