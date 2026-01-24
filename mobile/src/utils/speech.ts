import * as Speech from 'expo-speech';

// TTS ayarları
interface SpeechOptions {
  language?: string;
  pitch?: number;
  rate?: number;
  volume?: number;
}

const DEFAULT_OPTIONS: SpeechOptions = {
  language: 'tr-TR',
  pitch: 1.0,
  rate: 0.9,
  volume: 1.0,
};

// Sesli hatırlatma gönder
export async function speakMedicineReminder(
  medicineName: string,
  dosage: string,
  instruction?: string,
  language: 'tr' | 'en' = 'tr'
): Promise<void> {
  const isSpeaking = await Speech.isSpeakingAsync();
  
  if (isSpeaking) {
    await Speech.stop();
  }
  
  let message: string;
  
  if (language === 'tr') {
    message = `İlaç zamanı! ${medicineName}, ${dosage}`;
    if (instruction) {
      message += `. ${getInstructionTextTr(instruction)}`;
    }
  } else {
    message = `Medicine time! ${medicineName}, ${dosage}`;
    if (instruction) {
      message += `. ${getInstructionTextEn(instruction)}`;
    }
  }
  
  return new Promise((resolve, reject) => {
    Speech.speak(message, {
      ...DEFAULT_OPTIONS,
      language: language === 'tr' ? 'tr-TR' : 'en-US',
      onDone: () => resolve(),
      onError: (error) => reject(error),
    });
  });
}

// Genel mesaj söyle
export async function speak(
  message: string,
  language: 'tr' | 'en' = 'tr'
): Promise<void> {
  const isSpeaking = await Speech.isSpeakingAsync();
  
  if (isSpeaking) {
    await Speech.stop();
  }
  
  return new Promise((resolve, reject) => {
    Speech.speak(message, {
      ...DEFAULT_OPTIONS,
      language: language === 'tr' ? 'tr-TR' : 'en-US',
      onDone: () => resolve(),
      onError: (error) => reject(error),
    });
  });
}

// Konuşmayı durdur
export async function stopSpeaking(): Promise<void> {
  const isSpeaking = await Speech.isSpeakingAsync();
  if (isSpeaking) {
    await Speech.stop();
  }
}

// Konuşuyor mu kontrol et
export async function isSpeaking(): Promise<boolean> {
  return Speech.isSpeakingAsync();
}

// Mevcut sesleri listele
export async function getAvailableVoices(): Promise<Speech.Voice[]> {
  return Speech.getAvailableVoicesAsync();
}

// Talimat metnini Türkçe'ye çevir
function getInstructionTextTr(instruction: string): string {
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

// Talimat metnini İngilizce'ye çevir
function getInstructionTextEn(instruction: string): string {
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
