/**
 * Voice Recognition & Command Parser
 *
 * Alarm ve ana ekranda sesli komutlar ile ilaç alma, erteleme ve atlama işlemlerini yönetir.
 * Türkçe ve İngilizce yaygın konuşma kalıplarını destekler.
 */

export type VoiceCommandIntent = 'TAKE' | 'SNOOZE' | 'SKIP' | 'UNKNOWN';

export interface ParsedVoiceResult {
  intent: VoiceCommandIntent;
  confidence: number;
  rawText: string;
  matchedKeyword?: string;
}

const TAKE_KEYWORDS = [
  'aldım',
  'aldim',
  'içtim',
  'ictim',
  'yuttum',
  'tamam',
  'tamamdır',
  'ilaç alındı',
  'ilac alindi',
  'evet',
  'took',
  'taken',
  'done',
  'yes',
  'confirm',
];

const SNOOZE_KEYWORDS = [
  'ertele',
  'erteleyin',
  'sonra',
  'sonraya bırak',
  '5 dakika',
  '10 dakika',
  'beklet',
  'daha sonra',
  'snooze',
  'later',
  'delay',
  'remind later',
];

const SKIP_KEYWORDS = [
  'atla',
  'atlayın',
  'içmeyeceğim',
  'icmeyecegim',
  'pas',
  'içmedim',
  'icmedim',
  'almayacağım',
  'almayacagim',
  'skip',
  'pass',
  'no',
  'cancel',
];

/**
 * Kullanıcı konuşma metnini analiz ederek intent (eylem) çıkarır.
 */
export function parseVoiceCommand(transcript: string): ParsedVoiceResult {
  if (!transcript || typeof transcript !== 'string') {
    return { intent: 'UNKNOWN', confidence: 0, rawText: '' };
  }

  const normalized = transcript.trim().toLowerCase();

  // 1. "Aldım" kontrolü
  for (const keyword of TAKE_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return {
        intent: 'TAKE',
        confidence: keyword === normalized ? 1.0 : 0.85,
        rawText: transcript,
        matchedKeyword: keyword,
      };
    }
  }

  // 2. "Ertele" kontrolü
  for (const keyword of SNOOZE_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return {
        intent: 'SNOOZE',
        confidence: keyword === normalized ? 1.0 : 0.85,
        rawText: transcript,
        matchedKeyword: keyword,
      };
    }
  }

  // 3. "Atla" kontrolü
  for (const keyword of SKIP_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return {
        intent: 'SKIP',
        confidence: keyword === normalized ? 1.0 : 0.85,
        rawText: transcript,
        matchedKeyword: keyword,
      };
    }
  }

  return {
    intent: 'UNKNOWN',
    confidence: 0,
    rawText: transcript,
  };
}
