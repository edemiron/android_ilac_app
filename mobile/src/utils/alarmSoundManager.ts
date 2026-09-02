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

/**
 * Her playAlarmSound cagrisina artan bir kusak (generation) numarasi verilir.
 *
 * Neden: `new Sound(file, base, cb)` yuklemesi asenkron ve callback modul
 * seviyesindeki `soundInstance` degiskenine kapaniyordu. Yukleme surerken ikinci
 * bir playAlarmSound gelirse, BIRINCI instance'in callback'i artik IKINCI
 * instance'i gorup `play()` cagiriyor; `stopAlarmSound()` ise sadece son
 * referansi durdurabiliyordu. Sonuc: calan ama artik referanslanmayan bir Sound
 * ("Simdi Al"dan sonra susmayan alarm).
 *
 * Cozum: callback yalnizca kendi kusagi hala guncelse oynatir ve calan her
 * instance `liveInstances` icinde tutulur; stopAlarmSound hepsini durdurur.
 */
let playGeneration = 0;
const liveInstances = new Set<Sound>();

function releaseInstance(instance: Sound): void {
  liveInstances.delete(instance);
  try {
    instance.stop(() => {
      try {
        instance.release();
      } catch (_e) {
        /* ignore */
      }
    });
  } catch (error) {
    log.debug('releaseInstance hatasi', { error });
    try {
      instance.release();
    } catch (_e) {
      /* ignore */
    }
  }
}

export async function playAlarmSound(
  volume: number = 80,
  soundId: string = 'soft_chime',
  loop: boolean = true
): Promise<void> {
  if (previewTimeout) {
    clearTimeout(previewTimeout);
    previewTimeout = null;
  }

  // Onceki kusagi gecersiz kil ve calan TUM instance'lari durdur.
  const generation = ++playGeneration;
  for (const instance of Array.from(liveInstances)) {
    releaseInstance(instance);
  }
  soundInstance = null;

  isPlaying = true;
  currentVolume = Math.max(0, Math.min(100, volume)) / 100;
  const soundFilename = resolveSoundFile(soundId);

  log.debug('Starting alarm sound', { soundFilename, volume: currentVolume, loop });

  return new Promise(resolve => {
    const basePath = Platform.OS === 'android' ? Sound.MAIN_BUNDLE : Sound.MAIN_BUNDLE;

    const loadAndPlay = (filename: string, isFallback: boolean = false) => {
      // KRITIK: callback modul seviyesindeki `soundInstance` degiskenine DEGIL,
      // kendi instance'ina bakar (bkz. playGeneration aciklamasi).
      let instance: Sound | undefined;
      let playWhenConstructed = false;

      const startPlayback = (target: Sound) => {
        soundInstance = target;
        target.setVolume(currentVolume);
        target.setNumberOfLoops(loop ? -1 : 0);

        target.play(success => {
          if (!success) {
            log.warn('Sound playback stopped unexpectedly');
          }
          if (!loop) {
            liveInstances.delete(target);
            if (generation === playGeneration) {
              isPlaying = false;
            }
          }
        });

        log.debug(`Playing alarm via react-native-sound: ${filename}`);
      };

      instance = new Sound(filename, basePath, error => {
        if (error) {
          log.error(`Sound load error for ${filename}`, error);
          if (instance) {
            liveInstances.delete(instance);
          }
          if (!isFallback && filename !== 'sound_soft_chime.wav') {
            log.debug('Trying fallback sound_soft_chime.wav');
            loadAndPlay('sound_soft_chime.wav', true);
            return;
          }
          if (generation === playGeneration) {
            isPlaying = false;
          }
          resolve();
          return;
        }

        // Bu kusak artik gecerli degilse (arada stop veya yeni bir play geldi)
        // ASLA oynatma — ve instance'i mutlaka birak.
        if (!isPlaying || generation !== playGeneration) {
          log.debug('Sound yuklendi ama kusak gecersiz, birakiliyor', {
            filename,
            generation,
            current: playGeneration,
          });
          if (instance) {
            releaseInstance(instance);
          } else {
            // Senkron callback: instance henuz yok, olusunca birakilacak.
            playWhenConstructed = false;
          }
          resolve();
          return;
        }

        if (!instance) {
          // Callback, constructor daha donmeden SENKRON cagrildi; nesneye
          // henuz referans yok. Oynatmayi construction sonrasina ertele.
          playWhenConstructed = true;
          resolve();
          return;
        }

        startPlayback(instance);
        resolve();
      });

      liveInstances.add(instance);

      if (playWhenConstructed) {
        if (isPlaying && generation === playGeneration) {
          startPlayback(instance);
        } else {
          releaseInstance(instance);
        }
      }
    };

    loadAndPlay(soundFilename);
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

  log.debug('Stopping alarm sound', { liveInstances: liveInstances.size });
  isPlaying = false;

  // Kusagi ilerlet: yolda olan yukleme callback'leri artik oynatmayacak.
  playGeneration += 1;
  soundInstance = null;

  for (const instance of Array.from(liveInstances)) {
    releaseInstance(instance);
  }

  log.debug('Sound stopped and released');
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
