import { Platform } from 'react-native';
import Sound from 'react-native-sound';
import { createScopedLogger } from './logger';

const log = createScopedLogger('AlarmSoundManager');

// Sound kategorisini ayarla (sadece bir kez yapılmalı)
Sound.setCategory('Alarm', true);

let soundInstance: Sound | null = null;
let isPlaying = false;
let currentVolume = 0.8;

export async function playAlarmSound(volume: number = 80): Promise<void> {
  if (isPlaying) {
    log.debug('Already playing, skipping');
    return;
  }

  isPlaying = true;
  currentVolume = Math.max(0, Math.min(100, volume)) / 100;
  log.debug('Starting alarm sound', { volume: currentVolume });

  return new Promise(resolve => {
    // Platform'a göre ses dosyası yolu
    const soundFile = Platform.OS === 'android' ? 'alarm.mp3' : 'alarm.mp3';
    const basePath = Platform.OS === 'android' ? Sound.MAIN_BUNDLE : Sound.MAIN_BUNDLE;

    soundInstance = new Sound(soundFile, basePath, error => {
      if (error) {
        log.error('Sound load error', error);
        isPlaying = false;
        resolve();
        return;
      }

      if (!isPlaying || !soundInstance) {
        soundInstance?.release();
        resolve();
        return;
      }

      soundInstance.setVolume(currentVolume);
      soundInstance.setNumberOfLoops(-1); // Sonsuz döngü

      soundInstance.play(success => {
        if (!success) {
          log.warn('Sound playback stopped unexpectedly');
        }
      });

      log.debug('Playing alarm via react-native-sound');
      resolve();
    });
  });
}

export async function stopAlarmSound(): Promise<void> {
  log.debug('Stopping alarm sound');
  isPlaying = false;

  if (soundInstance) {
    try {
      const sound = soundInstance;
      soundInstance = null;
      sound.stop(() => {
        sound.release();
        log.debug('Sound stopped and released');
      });
    } catch (error) {
      log.error('Error stopping sound', error);
    }
  }
}

export function isAlarmPlaying(): boolean {
  return isPlaying;
}

export async function setAlarmVolume(volume: number): Promise<void> {
  currentVolume = Math.max(0, Math.min(100, volume)) / 100;

  if (soundInstance) {
    soundInstance.setVolume(currentVolume);
    log.debug('Volume updated', { volume: currentVolume });
  }
}

// Ses dosyasını önceden yükle (opsiyonel performans iyileştirmesi)
export function preloadAlarmSound(): void {
  const soundFile = Platform.OS === 'android' ? 'alarm.mp3' : 'alarm.mp3';
  const basePath = Sound.MAIN_BUNDLE;

  new Sound(soundFile, basePath, error => {
    if (error) {
      log.warn('Preload failed', error);
    } else {
      log.debug('Alarm sound preloaded');
    }
  });
}
