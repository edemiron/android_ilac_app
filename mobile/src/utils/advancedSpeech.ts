/**
 * Advanced TTS Service - Gelişmiş Sesli Okuma
 * Alarm sırasında ilaç adı söyleme ve tekrar özellikleri
 */

import Tts from 'react-native-tts';
import { MedicineInstruction } from '../types';
import { createScopedLogger } from './logger';

const log = createScopedLogger('AdvancedTTS');

// TTS başlatma
let isInitialized = false;
let currentRepeatCount = 0;
let maxRepeatCount = 1;
let repeatInterval: NodeJS.Timeout | null = null;
let isSpeaking = false;

let currentSpeechRate = 1.1;
let currentPitch = 1.0;

// Aktif alarm durumu
interface ActiveAlarmState {
  medicineName: string;
  dosage: string;
  instruction?: MedicineInstruction;
  language: 'tr' | 'en';
  speechRate?: number;
}

let activeAlarmState: ActiveAlarmState | null = null;

async function initTts(rate: number = 1.1, pitch: number = 1.0): Promise<void> {
  currentSpeechRate = rate;
  currentPitch = pitch;

  if (isInitialized) {
    try {
      await Tts.setDefaultRate(rate, true);
      await Tts.setDefaultPitch(pitch);
    } catch {
      // Ignore if engine busy
    }
    return;
  }

  try {
    await Tts.setDefaultLanguage('tr-TR');
    await Tts.setDefaultRate(rate, true);
    await Tts.setDefaultPitch(pitch);
    isInitialized = true;
    log.debug('TTS başlatıldı', { rate, pitch });
  } catch (error) {
    log.warn('TTS başlatma hatası:', error);
  }
}

/**
 * Gelişmiş ilaç hatırlatma seslendirmesi
 * Tekrar, konuşma hızı ve ses seviyesi kontrolü ile
 */
export async function speakAdvancedMedicineReminder(
  medicineName: string,
  dosage: string,
  instruction: MedicineInstruction | undefined,
  language: 'tr' | 'en',
  options: {
    volume?: number; // 0-100
    repeatCount?: number; // 0-3
    speechRate?: number; // 0.9 - 1.3 (Varsayılan 1.1)
    pitch?: number; // Varsayılan 1.0
    speakMedicineName?: boolean;
    speakDosage?: boolean;
    speakInstructions?: boolean;
  } = {}
): Promise<void> {
  const {
    repeatCount = 1,
    speechRate = 1.1,
    pitch = 1.0,
    speakMedicineName = true,
    speakDosage = true,
    speakInstructions = true,
  } = options;

  await initTts(speechRate, pitch);

  // Önceki tekrarı temizle
  stopAdvancedSpeaking();

  // Aktif alarm durumunu kaydet (tekrarlar için)
  activeAlarmState = {
    medicineName,
    dosage,
    instruction,
    language,
    speechRate,
  };

  maxRepeatCount = repeatCount;
  currentRepeatCount = 0;

  // Mesajı oluştur
  const message = buildMessage(medicineName, dosage, instruction, language, {
    speakMedicineName,
    speakDosage,
    speakInstructions,
  });

  // İlk seslendirme
  await speakWithPromise(message, language, speechRate, pitch);

  // Tekrar gerekliyse zamanla
  if (repeatCount > 1) {
    currentRepeatCount = 1;
    scheduleRepeat(message, language, speechRate, pitch);
  }
}

/**
 * Mesajı birleştir
 */
function buildMessage(
  medicineName: string,
  dosage: string,
  instruction: MedicineInstruction | undefined,
  language: 'tr' | 'en',
  options: {
    speakMedicineName: boolean;
    speakDosage: boolean;
    speakInstructions: boolean;
  }
): string {
  const parts: string[] = [];

  if (language === 'tr') {
    // Başlangıç uyarısı
    parts.push('İlaç zamanı!');

    if (options.speakMedicineName) {
      parts.push(medicineName);
    }

    if (options.speakDosage) {
      parts.push(dosage);
    }

    if (options.speakInstructions && instruction) {
      parts.push(getInstructionTextTr(instruction));
    }
  } else {
    // English
    parts.push('Medicine time!');

    if (options.speakMedicineName) {
      parts.push(medicineName);
    }

    if (options.speakDosage) {
      parts.push(dosage);
    }

    if (options.speakInstructions && instruction) {
      parts.push(getInstructionTextEn(instruction));
    }
  }

  return parts.join('. ');
}

/**
 * Promise tabanlı seslendirme
 */
function speakWithPromise(
  message: string,
  language: 'tr' | 'en',
  speechRate: number = 0.5,
  pitch: number = 1.0
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isInitialized) {
      resolve();
      return;
    }

    isSpeaking = true;

    // Önceki dinleyicileri temizle
    Tts.removeAllListeners('tts-finish');
    Tts.removeAllListeners('tts-cancel');
    Tts.removeAllListeners('tts-error');

    const onFinish = () => {
      isSpeaking = false;
      cleanupListeners();
      resolve();
    };

    const onCancel = () => {
      isSpeaking = false;
      cleanupListeners();
      resolve();
    };

    const onError = (error: Error) => {
      isSpeaking = false;
      cleanupListeners();
      log.error('TTS hatası', error);
      reject(error);
    };

    Tts.addEventListener('tts-finish', onFinish);
    Tts.addEventListener('tts-cancel', onCancel);
    Tts.addEventListener('tts-error', (event: { utteranceId?: string | number }) => {
      onError(new Error(String(event?.utteranceId ?? 'TTS error')));
    });

    // Dil, Hız ve Perde ayarı
    Tts.setDefaultLanguage(language === 'tr' ? 'tr-TR' : 'en-US')
      .then(() => Tts.setDefaultRate(speechRate, true))
      .then(() => Tts.setDefaultPitch(pitch))
      .then(() => {
        Tts.speak(message);
      })
      .catch(reject);

    function cleanupListeners() {
      Tts.removeAllListeners('tts-finish');
      Tts.removeAllListeners('tts-cancel');
      Tts.removeAllListeners('tts-error');
    }
  });
}

/**
 * Tekrarları zamanla
 */
function scheduleRepeat(
  message: string,
  language: 'tr' | 'en',
  speechRate: number = 0.5,
  pitch: number = 1.0
): void {
  // Her 8 saniyede bir tekrar et (ilk seslendirme + bekleme süresi)
  const repeatDelay = 8000;

  repeatInterval = setInterval(async () => {
    if (currentRepeatCount >= maxRepeatCount) {
      stopAdvancedSpeaking();
      return;
    }

    if (!isSpeaking) {
      currentRepeatCount++;
      log.debug('TTS tekrar', { current: currentRepeatCount, max: maxRepeatCount });
      await speakWithPromise(message, language, speechRate, pitch);
    }
  }, repeatDelay);
}

/**
 * Gelişmiş seslendirmeyi durdur
 */
export async function stopAdvancedSpeaking(): Promise<void> {
  log.debug('Gelişmiş TTS durduruluyor');

  // Tekrar interval'ını temizle
  if (repeatInterval) {
    clearInterval(repeatInterval);
    repeatInterval = null;
  }

  // Aktif durumu temizle
  activeAlarmState = null;
  currentRepeatCount = 0;
  maxRepeatCount = 0;

  // TTS'i durdur
  try {
    await Tts.stop();
    isSpeaking = false;
  } catch {
    // Ignore
  }

  // Dinleyicileri temizle
  Tts.removeAllListeners('tts-finish');
  Tts.removeAllListeners('tts-cancel');
  Tts.removeAllListeners('tts-error');
}

/**
 * Hâlâ konuşuyor mu?
 */
export function isCurrentlySpeaking(): boolean {
  return isSpeaking;
}

/**
 * Kalan tekrar sayısı
 */
export function getRemainingRepeats(): number {
  return Math.max(0, maxRepeatCount - currentRepeatCount);
}

/**
 * Manuel tekrar başlat (kullanıcı isteği üzerine)
 */
export async function repeatLastMessage(): Promise<boolean> {
  if (!activeAlarmState) {
    return false;
  }

  const { medicineName, dosage, instruction, language, speechRate } = activeAlarmState;

  const message = buildMessage(medicineName, dosage, instruction, language, {
    speakMedicineName: true,
    speakDosage: true,
    speakInstructions: true,
  });

  await speakWithPromise(message, language, speechRate ?? 0.5, currentPitch);
  return true;
}

/**
 * Test için canlı örnek mesaj söyle
 */
export async function speakTestMessage(
  language: 'tr' | 'en' = 'tr',
  options: {
    speechRate?: number;
    pitch?: number;
    speakMedicineName?: boolean;
    speakDosage?: boolean;
    speakInstructions?: boolean;
  } = {}
): Promise<void> {
  const {
    speechRate = 0.5,
    pitch = 1.0,
    speakMedicineName = true,
    speakDosage = true,
    speakInstructions = true,
  } = options;

  await initTts(speechRate, pitch);

  const sampleMedicineName = language === 'tr' ? 'Aspirin' : 'Aspirin';
  const sampleDosage = language === 'tr' ? '500 miligram' : '500 milligrams';
  const sampleInstruction = language === 'tr' ? 'Tok karnına alınız' : 'Take after meal';

  const parts: string[] = [];
  parts.push(language === 'tr' ? 'İlaç zamanı!' : 'Medicine time!');
  if (speakMedicineName) parts.push(sampleMedicineName);
  if (speakDosage) parts.push(sampleDosage);
  if (speakInstructions) parts.push(sampleInstruction);

  const message = parts.join('. ');
  await speakWithPromise(message, language, speechRate, pitch);
}

/**
 * Mevcut sesleri listele
 */
export async function getAvailableVoices(): Promise<
  { id: string; name: string; language: string }[]
> {
  try {
    await initTts(currentSpeechRate, currentPitch);
    const voices = await Tts.voices();
    return voices.map(v => ({
      id: v.id,
      name: v.name,
      language: v.language,
    }));
  } catch (error) {
    log.error('Ses listesi alma hatası', error);
    return [];
  }
}

/**
 * Türkçe talimat metni
 */
function getInstructionTextTr(instruction: MedicineInstruction): string {
  const instructions: Record<string, string> = {
    before_meal: 'Yemekten önce alınız',
    after_meal: 'Yemekten sonra alınız',
    with_meal: 'Yemekle birlikte alınız',
    empty_stomach: 'Aç karnına alınız',
    before_sleep: 'Yatmadan önce alınız',
    any_time: 'İstediğiniz zaman alabilirsiniz',
  };
  return instructions[instruction] || '';
}

/**
 * İngilizce talimat metni
 */
function getInstructionTextEn(instruction: MedicineInstruction): string {
  const instructions: Record<string, string> = {
    before_meal: 'Take before meal',
    after_meal: 'Take after meal',
    with_meal: 'Take with meal',
    empty_stomach: 'Take on empty stomach',
    before_sleep: 'Take before sleep',
    any_time: 'Take any time',
  };
  return instructions[instruction] || '';
}

/**
 * Hızlı alarm seslendirmesi (AlarmScreen için)
 * Bu fonksiyon AlarmScreen'de doğrudan kullanılabilir
 */
export async function speakAlarmNotification(
  medicineName: string,
  dosage: string,
  instruction: MedicineInstruction | undefined,
  language: 'tr' | 'en',
  settings: {
    ttsEnabled: boolean;
    ttsVolume?: number;
    ttsRepeatCount?: number;
    ttsSpeechRate?: number;
    ttsSpeakMedicineName?: boolean;
    ttsSpeakDosage?: boolean;
    ttsSpeakInstructions?: boolean;
  }
): Promise<void> {
  if (!settings.ttsEnabled) {
    log.debug('TTS kapalı, seslendirme yapılmıyor');
    return;
  }

  try {
    await speakAdvancedMedicineReminder(medicineName, dosage, instruction, language, {
      volume: settings.ttsVolume ?? 80,
      repeatCount: settings.ttsRepeatCount ?? 1,
      speechRate: settings.ttsSpeechRate ?? 1.1,
      speakMedicineName: settings.ttsSpeakMedicineName ?? true,
      speakDosage: settings.ttsSpeakDosage ?? true,
      speakInstructions: settings.ttsSpeakInstructions ?? true,
    });
  } catch (error) {
    log.error('Alarm TTS hatası', error);
  }
}
