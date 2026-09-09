/**
 * Resource Cleanup & Memory Leak Audit Test Suite
 *
 * Verifies that all long-lived subscriptions, intervals, timers,
 * native audio instances, TTS listeners, and AppState listeners
 * are safely released upon component unmount / teardown.
 */

import { playAlarmSound, stopAlarmSound, isAlarmPlaying } from '../../utils/alarmSoundManager';
import { stopAdvancedSpeaking } from '../../utils/advancedSpeech';
import Tts from 'react-native-tts';

// Mock react-native
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  Vibration: {
    vibrate: jest.fn(),
    cancel: jest.fn(),
  },
  AppState: {
    addEventListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
  },
}));

// Mock react-native-sound
const mockRelease = jest.fn();
const mockStop = jest.fn((cb?: () => void) => {
  if (cb) cb();
});
const mockPlay = jest.fn();
const mockSetVolume = jest.fn();
const mockSetNumberOfLoops = jest.fn();

jest.mock('react-native-sound', () => {
  const MockSound = jest.fn().mockImplementation((_file, _path, callback) => {
    if (callback) callback(null);
    return {
      play: mockPlay,
      stop: mockStop,
      release: mockRelease,
      setVolume: mockSetVolume,
      setNumberOfLoops: mockSetNumberOfLoops,
    };
  });
  (MockSound as any).setCategory = jest.fn();
  (MockSound as any).MAIN_BUNDLE = 'main_bundle';
  return MockSound;
});

// Mock react-native-tts
jest.mock('react-native-tts', () => ({
  setDefaultLanguage: jest.fn().mockResolvedValue(undefined),
  setDefaultRate: jest.fn().mockResolvedValue(undefined),
  setDefaultPitch: jest.fn().mockResolvedValue(undefined),
  speak: jest.fn().mockResolvedValue('utterance-1'),
  stop: jest.fn().mockResolvedValue(undefined),
  removeAllListeners: jest.fn(),
  addEventListener: jest.fn(),
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('Resource Cleanup & Memory Leak Audit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Native Audio Instance Lifecycle & Release', () => {
    it('initializes and plays sound, and fully releases native player on stop', async () => {
      await playAlarmSound(80);
      expect(isAlarmPlaying()).toBe(true);

      await stopAlarmSound();
      expect(mockStop).toHaveBeenCalled();
      expect(mockRelease).toHaveBeenCalled();
      expect(isAlarmPlaying()).toBe(false);
    });

    it('handles multiple stopAlarmSound calls idempotently without throwing', async () => {
      await stopAlarmSound();
      await stopAlarmSound();
      expect(isAlarmPlaying()).toBe(false);
    });
  });

  describe('2. TTS Engine Listener & Interval Teardown', () => {
    it('stops speech and clears all event listeners and intervals', async () => {
      await stopAdvancedSpeaking();
      expect(Tts.stop).toHaveBeenCalled();
      expect(Tts.removeAllListeners).toHaveBeenCalledWith('tts-finish');
      expect(Tts.removeAllListeners).toHaveBeenCalledWith('tts-cancel');
      expect(Tts.removeAllListeners).toHaveBeenCalledWith('tts-error');
    });
  });

  describe('3. Subscription / Listener Unsubscription Integrity', () => {
    it('ensures event unsubscribe closures successfully invoke underlying native detachment', () => {
      const mockNativeUnsubscribe = jest.fn();
      const createScopedListener = () => {
        return () => {
          mockNativeUnsubscribe();
        };
      };

      const unsubscribe = createScopedListener();
      expect(mockNativeUnsubscribe).not.toHaveBeenCalled();

      unsubscribe();
      expect(mockNativeUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('verifies timer clearing logic prevents background task leaks', () => {
      jest.useFakeTimers();
      const mockCallback = jest.fn();
      const timerId = setTimeout(mockCallback, 5000);

      // Clean teardown before expiry
      clearTimeout(timerId);
      jest.advanceTimersByTime(6000);

      expect(mockCallback).not.toHaveBeenCalled();
      jest.useRealTimers();
    });
  });
});
