/**
 * SecurityScreen helpers testleri.
 */

jest.mock('react-native-haptic-feedback', () => ({
  __esModule: true,
  default: { trigger: jest.fn() },
}));

import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
  triggerHaptic,
  checkSecurityRequirement,
  checkBiometricRequirement,
  formatLockTimeoutLabel,
  LOCK_TIMEOUT_OPTIONS,
  type HapticType,
} from '../../screens/SecurityScreen/helpers';

describe('triggerHaptic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls haptic with notificationSuccess type for "success"', () => {
    triggerHaptic('success');
    expect(ReactNativeHapticFeedback.trigger).toHaveBeenCalledWith(
      'notificationSuccess',
      expect.objectContaining({ enableVibrateFallback: true })
    );
  });

  it('calls haptic with notificationError type for "error"', () => {
    triggerHaptic('error');
    expect(ReactNativeHapticFeedback.trigger).toHaveBeenCalledWith(
      'notificationError',
      expect.any(Object)
    );
  });

  it('calls haptic with impactLight for "light"', () => {
    triggerHaptic('light');
    expect(ReactNativeHapticFeedback.trigger).toHaveBeenCalledWith(
      'impactLight',
      expect.any(Object)
    );
  });

  it('uses each HapticType once in coverage', () => {
    const types: HapticType[] = ['light', 'success', 'error'];
    for (const t of types) {
      triggerHaptic(t);
    }
    expect(ReactNativeHapticFeedback.trigger).toHaveBeenCalledTimes(3);
  });
});

describe('checkSecurityRequirement', () => {
  it('returns ok when enabling with PIN', () => {
    const result = checkSecurityRequirement(true, true, false, 'en');
    expect(result.ok).toBe(true);
  });

  it('returns ok when enabling with biometric', () => {
    const result = checkSecurityRequirement(true, false, true, 'en');
    expect(result.ok).toBe(true);
  });

  it('returns ok when enabling with both', () => {
    const result = checkSecurityRequirement(true, true, true, 'tr');
    expect(result.ok).toBe(true);
  });

  it('blocks enabling with neither', () => {
    const result = checkSecurityRequirement(true, false, false, 'en');
    expect(result.ok).toBe(false);
    expect(result.message).toBeDefined();
  });

  it('returns Turkish error message when language=tr', () => {
    const result = checkSecurityRequirement(true, false, false, 'tr');
    expect(result.message).toMatch(/PIN/);
  });

  it('returns English error message when language=en', () => {
    const result = checkSecurityRequirement(true, false, false, 'en');
    expect(result.message).toMatch(/PIN/);
  });

  it('returns ok when disabling (no requirement)', () => {
    const result = checkSecurityRequirement(false, false, false, 'en');
    expect(result.ok).toBe(true);
  });
});

describe('checkBiometricRequirement', () => {
  it('blocks biometric without PIN (TR)', () => {
    const result = checkBiometricRequirement(true, false, 'tr');
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/PIN/);
  });

  it('blocks biometric without PIN (EN)', () => {
    const result = checkBiometricRequirement(true, false, 'en');
    expect(result.ok).toBe(false);
  });

  it('allows biometric with PIN', () => {
    const result = checkBiometricRequirement(true, true, 'en');
    expect(result.ok).toBe(true);
  });

  it('allows disabling biometric', () => {
    expect(checkBiometricRequirement(false, false, 'en').ok).toBe(true);
  });
});

describe('formatLockTimeoutLabel', () => {
  it('returns Turkish label for known options', () => {
    expect(formatLockTimeoutLabel(0, 'tr')).toBe('Hemen');
    expect(formatLockTimeoutLabel(60, 'tr')).toBe('1 saat');
  });

  it('returns English label for known options', () => {
    expect(formatLockTimeoutLabel(0, 'en')).toBe('Immediately');
    expect(formatLockTimeoutLabel(60, 'en')).toBe('1 hour');
  });

  it('returns fallback for unknown minutes', () => {
    expect(formatLockTimeoutLabel(45, 'tr')).toBe('45 dakika');
    expect(formatLockTimeoutLabel(45, 'en')).toBe('45 minutes');
  });
});

describe('LOCK_TIMEOUT_OPTIONS', () => {
  it('has expected default values', () => {
    const values = LOCK_TIMEOUT_OPTIONS.map(o => o.value);
    expect(values).toContain(0);
    expect(values).toContain(5);
    expect(values).toContain(60);
  });
});
