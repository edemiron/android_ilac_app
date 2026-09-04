/**
 * AlarmScreen helpers — pure utility'ler.
 *
 * Sprint 6.2: AlarmScreen.tsx (910 satir) pure helper extraction.
 * UI text lookuplari + formatters pure fonksiyonlara ayrildi.
 */

import type { MedicineInstruction } from '../../types';

export const DEFAULT_SNOOZE_DURATION = 5;
export const DEFAULT_MAX_SNOOZE_COUNT = 3;

export interface InstructionDisplay {
  tr: string;
  en: string;
}

/**
 * v1.8.7 — EMOJI METINDEN CIKARILDI, YERINE IKON ADI GELDI.
 *
 * Neden: alarm ekrani kritik yol. Hasta uykudan uyaniyor ve bu ekrana
 * bakiyor; TalkBack kullaniyorsa "saat emojisi Herhangi bir zaman" duyuyordu.
 * Ayrica bazi OEM'lerde emoji fontu eksik oldugunda bos kutuya donuyor.
 * Artik metin duz, gorsel isaret bir ikon fontu glifi (bkz.
 * `INSTRUCTION_ICONS`) ve ikon `accessibilityElementsHidden` ile TalkBack'ten
 * gizlenebiliyor — yani ekran okuyucu yalnizca ANLAMI okur.
 *
 * `🧪 TEST ALARMI` isareti BILEREK korunuyor (bkz. useAlarmController):
 * orada amac susleme degil, kullanicinin bunu gercek bir doz sanmasini
 * onlemek.
 */
export const INSTRUCTION_DISPLAY_TEXTS: Record<string, InstructionDisplay> = {
  before_meal: { tr: 'Yemekten önce', en: 'Before meal' },
  after_meal: { tr: 'Yemekten sonra', en: 'After meal' },
  with_meal: { tr: 'Yemekle birlikte', en: 'With meal' },
  empty_stomach: { tr: 'Aç karnına', en: 'Empty stomach' },
  before_sleep: { tr: 'Yatmadan önce', en: 'Before sleep' },
  any_time: { tr: 'Herhangi bir zaman', en: 'Any time' },
};

/**
 * Talimat basina Ionicons glif adi. Anahtar kumesi
 * `INSTRUCTION_DISPLAY_TEXTS` ile AYNI olmak zorunda (teste baglandi):
 * eksik bir anahtar, metni olan ama ikonu olmayan bir rozet demek olurdu.
 */
export const INSTRUCTION_ICONS: Record<string, string> = {
  before_meal: 'restaurant-outline',
  after_meal: 'restaurant-outline',
  with_meal: 'restaurant-outline',
  empty_stomach: 'warning-outline',
  before_sleep: 'moon-outline',
  any_time: 'time-outline',
};

/**
 * Medicine instruction label (TR + EN) lokalize.
 */
export function getInstructionDisplay(
  instruction: MedicineInstruction | undefined,
  language: 'tr' | 'en'
): string | null {
  if (!instruction) return null;
  return INSTRUCTION_DISPLAY_TEXTS[instruction]?.[language] ?? null;
}

/**
 * Talimatin ikon adi. Bilinmeyen/eksik talimatta `null` doner ve rozet
 * ikonsuz cizilir — metin her zaman tek basina yeterli olmali.
 */
export function getInstructionIcon(instruction: MedicineInstruction | undefined): string | null {
  if (!instruction) return null;
  return INSTRUCTION_ICONS[instruction] ?? null;
}

/**
 * Alarm countdown text — TR ve EN formatlarinda "X dakika X saniye".
 */
export function formatCountdownText(seconds: number, language: 'tr' | 'en'): string {
  if (seconds <= 0) return language === 'tr' ? 'Şimdi' : 'Now';
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (language === 'tr') {
    return minutes > 0 ? `${minutes} dk ${secs} sn` : `${secs} sn`;
  }
  return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
}

/**
 * Snooze limit text — kalan erteleme hakki.
 */
export function formatSnoozeRemainingText(
  current: number,
  max: number,
  language: 'tr' | 'en'
): string {
  const remaining = Math.max(0, max - current);
  if (language === 'tr') {
    return `${remaining} ${remaining === 1 ? 'erteleme hakkı' : 'erteleme hakkı'} kaldı`;
  }
  return `${remaining} snooze${remaining === 1 ? '' : 's'} left`;
}

/**
 * Settings fallback degerleri (medicineStore'dan gelen undefined durumlar icin).
 */
export function resolveSnoozeSettings(
  snoozeDuration: number | undefined,
  maxSnoozeCount: number | undefined
): { snoozeDuration: number; maxSnoozeCount: number } {
  return {
    snoozeDuration: snoozeDuration ?? DEFAULT_SNOOZE_DURATION,
    maxSnoozeCount: maxSnoozeCount ?? DEFAULT_MAX_SNOOZE_COUNT,
  };
}

export interface SnoozeRights {
  /** Erteleme yapilabilir mi? */
  canSnooze: boolean;
  /** Kalan hak sayisi (0'in altina inmez). */
  remainingSnoozes: number;
  /**
   * Hak bitti. Bu durumda doz ATLANMAZ — kullanici "Aldim" ya da "Atla"
   * secmelidir. Bkz. asagidaki gerekce.
   */
  limitReached: boolean;
}

/**
 * Erteleme hakki karari — TEK KAYNAK.
 *
 * ⚠️ v1.7.7 — "N HAK = N ERTELEME" NIYE AYRI BIR FONKSIYON OLDU
 * ══════════════════════════════════════════════════════════════════════════
 * Bu karar `useAlarmController` icinde iki satirlik ifadeydi ve uzerine iki
 * ayri dal kurulmustu; ikisi de dozu `atlandi` yaziyordu:
 *
 *   if (!canSnooze) handleSkip();                 // "disabled" gorunen butona
 *                                                 // dokunmak dozu atliyordu
 *   if (remainingSnoozes === 1) handleSkip();     // ILAN EDILEN son hak hic
 *                                                 // kullanilamiyordu
 *
 * `maxSnoozeCount = 3` iken buton "3 hak" yaziyor, kullanici iki kez
 * erteleyebiliyor, ucuncu dokunusta doz ATLANIYORDU. Buton etiketi bunu
 * "Ertele — Son hak! (Ilac atlanir)" diye itiraf ediyordu, ama "atlandi"
 * doktora giden uyum raporuna yazilan KLINIK bir karar ve yalnizca kullanici
 * acikca secerse (atlama nedeni diyalogu ile) yazilmalidir.
 *
 * Dogru semantik: ilan edilen hak sayisi kadar erteleme YAPILABILIR; hak
 * bitince hicbir sey yazilmaz, alarm acik kalir, karar kullanicinin.
 */
export function resolveSnoozeRights(
  currentSnoozeCount: number,
  maxSnoozeCount: number
): SnoozeRights {
  // Bozuk/eksik degerlere karsi: negatif ya da NaN sayac hakki sifirlamamali.
  const used = Number.isFinite(currentSnoozeCount) ? Math.max(0, currentSnoozeCount) : 0;
  const max = Number.isFinite(maxSnoozeCount) ? Math.max(0, maxSnoozeCount) : 0;

  const remainingSnoozes = Math.max(0, max - used);
  const canSnooze = used < max;

  return { canSnooze, remainingSnoozes, limitReached: !canSnooze };
}

/**
 * Alarm screen critical-level labels (TR + EN).
 */
export const ALARM_TAKE_ACTION_LABELS = {
  takenTitle: { tr: 'İlaç alındı', en: 'Medicine taken' },
  skippedTitle: { tr: 'İlaç atlandı', en: 'Medicine skipped' },
  snoozedTitle: { tr: 'Ertelendi', en: 'Snoozed' },
  takenMessage: {
    tr: 'İlaç kaydınız oluşturuldu.',
    en: 'Medicine log saved successfully.',
  },
  skippedMessage: {
    tr: 'Atlandı olarak işaretlendi.',
    en: 'Marked as skipped.',
  },
} as const;
