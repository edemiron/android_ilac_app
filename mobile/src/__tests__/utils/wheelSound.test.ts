jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  NativeModules: {},
}));

import { NativeModules, Platform } from 'react-native';
import {
  playWheelTickSound,
  resetWheelSoundThrottle,
  WHEEL_SOUND_THROTTLE_MS,
} from '../../utils/wheelSound';

describe('wheelSound utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetWheelSoundThrottle();
    Platform.OS = 'android';
    NativeModules.WheelSoundModule = {
      playTick: jest.fn(),
    };
  });

  it('calls WheelSoundModule.playTick on android', () => {
    playWheelTickSound();
    expect(NativeModules.WheelSoundModule.playTick).toHaveBeenCalledTimes(1);
  });

  it('throttles rapid consecutive calls within WHEEL_SOUND_THROTTLE_MS', () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    playWheelTickSound();
    expect(NativeModules.WheelSoundModule.playTick).toHaveBeenCalledTimes(1);

    // Call 10ms later — should be throttled
    jest.spyOn(Date, 'now').mockReturnValue(now + 10);
    playWheelTickSound();
    expect(NativeModules.WheelSoundModule.playTick).toHaveBeenCalledTimes(1);

    // Call 26ms later — should execute
    jest.spyOn(Date, 'now').mockReturnValue(now + WHEEL_SOUND_THROTTLE_MS + 1);
    playWheelTickSound();
    expect(NativeModules.WheelSoundModule.playTick).toHaveBeenCalledTimes(2);

    (Date.now as any).mockRestore();
  });

  it('resets throttle with resetWheelSoundThrottle()', () => {
    playWheelTickSound();
    expect(NativeModules.WheelSoundModule.playTick).toHaveBeenCalledTimes(1);

    // Reset throttle and call immediately
    resetWheelSoundThrottle();
    playWheelTickSound();
    expect(NativeModules.WheelSoundModule.playTick).toHaveBeenCalledTimes(2);
  });

  it('safely handles missing WheelSoundModule without throwing', () => {
    NativeModules.WheelSoundModule = undefined;
    expect(() => playWheelTickSound()).not.toThrow();
  });

  it('safely handles playTick throwing without crashing', () => {
    NativeModules.WheelSoundModule = {
      playTick: jest.fn(() => {
        throw new Error('Native audio crash simulation');
      }),
    };
    expect(() => playWheelTickSound()).not.toThrow();
  });

  it('does not call WheelSoundModule on non-android platforms', () => {
    Platform.OS = 'ios';
    playWheelTickSound();
    expect(NativeModules.WheelSoundModule.playTick).not.toHaveBeenCalled();
  });
});
