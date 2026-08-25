/**
 * HomeScreen helpers — getRelativeTimeText gibi pure helper'lar.
 * Sprint 4.2: HomeScreen.tsx (1962 satir) modularizasyonu.
 */

import { differenceInMinutes, format } from 'date-fns';
import type { MedicineLog } from '../../types';

export interface RelativeTimeResult {
  text: string;
  isNow: boolean;
  isPast: boolean;
  minutesDiff: number;
}

/**
 * Reminder time'a gore insan-okur-dostu relatif zaman etiketi uretir.
 * Ornekler: "5 dk once", "in 10 min", "Simdi" / "Now", "Aldi" / "Taken".
 */
export function getRelativeTimeText(
  reminderTime: string,
  language: string,
  log?: MedicineLog,
  nowOverride?: Date
): RelativeTimeResult {
  const now = nowOverride || new Date();
  const currentTime = format(now, 'HH:mm');
  const [rH, rM] = reminderTime.split(':').map(Number);
  const reminderDate = new Date(now);
  reminderDate.setHours(rH, rM, 0, 0);

  const minutesDiff = differenceInMinutes(reminderDate, now);
  const isPast = reminderTime < currentTime;
  const isNow = Math.abs(minutesDiff) <= 2;

  if (log?.status === 'taken') {
    return {
      text: language === 'tr' ? 'Alındı' : 'Taken',
      isNow: false,
      isPast: false,
      minutesDiff,
    };
  }
  if (log?.status === 'skipped') {
    return {
      text: language === 'tr' ? 'Atlandı' : 'Skipped',
      isNow: false,
      isPast: false,
      minutesDiff,
    };
  }

  if (isNow) {
    return { text: language === 'tr' ? 'Şimdi' : 'Now', isNow: true, isPast: false, minutesDiff };
  }

  if (isPast) {
    const absMinutes = Math.abs(minutesDiff);
    if (absMinutes < 60) {
      return {
        text: language === 'tr' ? `${absMinutes} dk önce` : `${absMinutes} min ago`,
        isNow: false,
        isPast: true,
        minutesDiff,
      };
    }
    const hours = Math.floor(absMinutes / 60);
    return {
      text: language === 'tr' ? `${hours} saat önce` : `${hours}h ago`,
      isNow: false,
      isPast: true,
      minutesDiff,
    };
  }

  if (minutesDiff < 60) {
    return {
      text: language === 'tr' ? `${minutesDiff} dk sonra` : `in ${minutesDiff} min`,
      isNow: false,
      isPast: false,
      minutesDiff,
    };
  }
  const hours = Math.floor(minutesDiff / 60);
  return {
    text: language === 'tr' ? `${hours} saat sonra` : `in ${hours}h`,
    isNow: false,
    isPast: false,
    minutesDiff,
  };
}
