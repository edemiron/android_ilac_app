import { Platform } from 'react-native';
import Sound from 'react-native-sound';
import { createScopedLogger } from './logger';
import type { AlarmSoundType } from '../types';

const log = createScopedLogger('AlarmSoundManager');

// Sound kategorisini ayarla (sadece bir kez yapılmalı)
Sound.setCategory('Alarm', true);

export interface SoundOption {
  id: AlarmSoundType;
  nameTr: string;
  nameEn: string;
  filename: string;
  descriptionTr: string;
  descriptionEn: string;
  icon: string;
  color: string;
}

export const ALARM_SOUND_LIST: SoundOption[] = [
  {
    id: 'soft_chime',
    nameTr: 'Yumuşak Melodi',
    nameEn: 'Soft Chime',
    filename: 'sound_soft_chime.wav',
    descriptionTr: 'Sakin ve uyandırıcı majör akorlar',
    descriptionEn: 'Gentle and soothing major chords',
    icon: 'musical-notes',
    color: '#0D9488',
  },
  {
    id: 'crystal_bell',
    nameTr: 'Kristal Çan',
    nameEn: 'Crystal Bell',
    filename: 'sound_crystal_bell.wav',
    descriptionTr: 'Yüksek netlikte parlayan çan sesi',
    descriptionEn: 'High acoustic clarity sparkling bell',
    icon: 'sparkles',
    color: '#0284C7',
  },
  {
    id: 'zen_garden',
    nameTr: 'Huzurlu Zen',
    nameEn: 'Zen Garden',
    filename: 'sound_zen_garden.wav',
    descriptionTr: 'Akşam ilaçları için dingin kase tınısı',
    descriptionEn: 'Warm meditative Tibetan bowl tone',
    icon: 'leaf',
    color: '#10B981',
  },
  {
    id: 'clinical_pulse',
    nameTr: 'Klinik Nabız',
    nameEn: 'Clinical Pulse',
    filename: 'sound_clinical_pulse.wav',
    descriptionTr: 'Tıbbi monitör ve profesyonel uyarı',
    descriptionEn: 'Professional hospital vital monitor tone',
    icon: 'pulse',
    color: '#6366F1',
  },
  {
    id: 'urgent_alert',
    nameTr: 'Kritik & Acil',
    nameEn: 'Urgent Alert',
    filename: 'sound_urgent_alert.wav',
    descriptionTr: 'İnsülin ve tansiyon için yüksek öncelik',
    descriptionEn: 'High-priority alert for critical meds',
    icon: 'warning',
    color: '#EF4444',
  },
  {
    id: 'morning_vital',
    nameTr: 'Sabah Marimbası',
    nameEn: 'Morning Vital',
    filename: 'sound_morning_vital.wav',
    descriptionTr: 'Neşeli ve canlandırıcı melodi',
    descriptionEn: 'Uplifting morning marimba arpeggio',
    icon: 'sunny',
    color: '#F59E0B',
  },
  {
    id: 'alarm',
    nameTr: 'Klasik Dijital Alarm',
    nameEn: 'Classic Digital Alarm',
    filename: 'alarm.mp3',
    descriptionTr: 'Geleneksel standart dijital alarm sesi',
    descriptionEn: 'Standard traditional digital alarm',
    icon: 'alarm',
    color: '#8B5CF6',
  },
];

export function resolveSoundFile(soundId?: string): string {
  const match = ALARM_SOUND_LIST.find(s => s.id === soundId);
  if (match) {
    return match.filename;
  }
  if (soundId === 'gentle') return 'sound_soft_chime.wav';
  if (soundId === 'urgent') return 'sound_urgent_alert.wav';
  if (soundId === 'default') return 'sound_soft_chime.wav';
  return 'sound_soft_chime.wav';
}

export function getSoundDisplayName(soundId?: string, language = 'tr'): string {
  const isTr = language === 'tr';
  const match = ALARM_SOUND_LIST.find(s => s.id === soundId);
  if (match) {
    return isTr ? match.nameTr : match.nameEn;
  }
  if (soundId === 'gentle') return isTr ? 'Yumuşak Melodi' : 'Soft Chime';
  if (soundId === 'urgent') return isTr ? 'Kritik & Acil' : 'Urgent Alert';
  return isTr ? 'Yumuşak Melodi' : 'Soft Chime';
}

let soundInstance: Sound | null = null;
let isPlaying = false;
let currentVolume = 0.8;
let previewTimeout: ReturnType<typeof setTimeout> | null = null;

export async function playAlarmSound(
  volume: number = 80,
  soundId: string = 'soft_chime',
  loop: boolean = true
): Promise<void> {
  if (previewTimeout) {
    clearTimeout(previewTimeout);
    previewTimeout = null;
  }

  // Eğer zaten çalıyorsa durdurup yenisini yükle
  if (soundInstance) {
    try {
      soundInstance.stop();
      soundInstance.release();
      soundInstance = null;
    } catch (_e) {
      // ignore
    }
  }

  isPlaying = true;
  currentVolume = Math.max(0, Math.min(100, volume)) / 100;
  const soundFilename = resolveSoundFile(soundId);

  log.debug('Starting alarm sound', { soundFilename, volume: currentVolume, loop });

  return new Promise(resolve => {
    const basePath = Platform.OS === 'android' ? Sound.MAIN_BUNDLE : Sound.MAIN_BUNDLE;

    soundInstance = new Sound(soundFilename, basePath, error => {
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
      soundInstance.setNumberOfLoops(loop ? -1 : 0);

      soundInstance.play(success => {
        if (!success) {
          log.warn('Sound playback stopped unexpectedly');
        }
        if (!loop) {
          isPlaying = false;
        }
      });

      log.debug('Playing alarm via react-native-sound');
      resolve();
    });
  });
}

/**
 * Canlı ses ve ses seviyesi önizlemesi (Preview)
 * Belirtilen süre sonra sesi otomatik durdurur.
 */
export async function previewAlarmSound(
  volume: number = 80,
  soundId: string = 'soft_chime',
  durationMs: number = 2500
): Promise<void> {
  await playAlarmSound(volume, soundId, false);

  if (previewTimeout) {
    clearTimeout(previewTimeout);
  }

  previewTimeout = setTimeout(() => {
    stopAlarmSound();
    previewTimeout = null;
  }, durationMs);
}

export async function stopAlarmSound(): Promise<void> {
  if (previewTimeout) {
    clearTimeout(previewTimeout);
    previewTimeout = null;
  }

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

export function preloadAlarmSound(soundId: string = 'soft_chime'): void {
  const soundFilename = resolveSoundFile(soundId);
  const basePath = Sound.MAIN_BUNDLE;

  new Sound(soundFilename, basePath, error => {
    if (error) {
      log.warn('Preload failed', error);
    } else {
      log.debug('Alarm sound preloaded', { soundFilename });
    }
  });
}
