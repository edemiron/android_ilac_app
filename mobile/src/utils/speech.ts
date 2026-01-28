import Tts from 'react-native-tts';

// TTS başlatma
let isInitialized = false;

async function initTts(): Promise<void> {
  if (isInitialized) return;

  try {
    await Tts.setDefaultLanguage('tr-TR');
    await Tts.setDefaultRate(0.5);
    await Tts.setDefaultPitch(1.0);
    isInitialized = true;
  } catch (error) {
    console.warn('[Speech] TTS initialization failed:', error);
  }
}

// Sesli hatırlatma gönder
export async function speakMedicineReminder(
  medicineName: string,
  dosage: string,
  instruction?: string,
  language: 'tr' | 'en' = 'tr'
): Promise<void> {
  await initTts();

  try {
    await Tts.stop();
  } catch {
    // Ignore if not speaking
  }

  await Tts.setDefaultLanguage(language === 'tr' ? 'tr-TR' : 'en-US');

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
    const onFinish = () => {
      Tts.removeAllListeners('tts-finish');
      Tts.removeAllListeners('tts-cancel');
      resolve();
    };

    const onCancel = () => {
      Tts.removeAllListeners('tts-finish');
      Tts.removeAllListeners('tts-cancel');
      resolve();
    };

    Tts.addEventListener('tts-finish', onFinish);
    Tts.addEventListener('tts-cancel', onCancel);

    try {
      Tts.speak(message);
    } catch (error) {
      reject(error);
    }
  });
}

// Genel mesaj söyle
export async function speak(message: string, language: 'tr' | 'en' = 'tr'): Promise<void> {
  await initTts();

  try {
    await Tts.stop();
  } catch {
    // Ignore if not speaking
  }

  await Tts.setDefaultLanguage(language === 'tr' ? 'tr-TR' : 'en-US');

  return new Promise((resolve, reject) => {
    const onFinish = () => {
      Tts.removeAllListeners('tts-finish');
      Tts.removeAllListeners('tts-cancel');
      resolve();
    };

    const onCancel = () => {
      Tts.removeAllListeners('tts-finish');
      Tts.removeAllListeners('tts-cancel');
      resolve();
    };

    Tts.addEventListener('tts-finish', onFinish);
    Tts.addEventListener('tts-cancel', onCancel);

    try {
      Tts.speak(message);
    } catch (error) {
      reject(error);
    }
  });
}

export async function stopSpeaking(): Promise<void> {
  try {
    await Tts.stop();
  } catch {
    // Safe to ignore if not speaking
  }
}

// Konuşuyor mu kontrol et (TTS doesn't have this, always return false)
export async function isSpeaking(): Promise<boolean> {
  return false;
}

// Mevcut sesleri listele
export async function getAvailableVoices(): Promise<
  { id: string; name: string; language: string }[]
> {
  try {
    const voices = await Tts.voices();
    return voices.map((v: { id: string; name: string; language: string }) => ({
      id: v.id,
      name: v.name,
      language: v.language,
    }));
  } catch {
    return [];
  }
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
