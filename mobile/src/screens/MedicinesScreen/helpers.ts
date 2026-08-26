/**
 * MedicinesScreen helpers.
 *
 * Sprint 5.1: Pure helper'lar (expiry status, dosage decode, form icon picker).
 * TimelineItem ile paylasilan helpers bu modulde standardize ediliyor — DRY.
 *
 * Sprint 82: MedicineRow icindeki helper'lar (Sprint 81) buraya tasiyip
 * export edildi — pure, testable, single source of truth.
 */

import { differenceInDays, differenceInCalendarDays, parseISO } from 'date-fns';
import type { Medicine } from '../../types';
import { type ExpiryStatus, type ExpiryResult, DEFAULT_REMINDER_DAYS } from './types';
import type { ThemeColors } from '../../contexts/ThemeContext';

/**
 * Medicine expiryDate + reminderDays ikilisine gore expiry status.
 * 'expired' / 'expiring' / 'ok' / 'unknown'.
 */
export function getExpiryStatus(
  expiryDate: string | undefined,
  reminderDays?: number
): ExpiryStatus {
  if (!expiryDate) return 'unknown';
  try {
    const expiry = parseISO(expiryDate);
    const days = differenceInDays(expiry, new Date());
    const reminder = reminderDays ?? DEFAULT_REMINDER_DAYS;
    if (days < 0) return 'expired';
    if (days <= reminder) return 'expiring';
    return 'ok';
  } catch {
    return 'unknown';
  }
}

/**
 * Detailed expiry result (status + days until).
 */
export function getExpiryDetails(
  expiryDate: string | undefined,
  reminderDays?: number
): ExpiryResult {
  if (!expiryDate) return { status: 'unknown', daysUntil: null };
  try {
    const expiry = parseISO(expiryDate);
    const days = differenceInDays(expiry, new Date());
    return {
      status: getExpiryStatus(expiryDate, reminderDays),
      daysUntil: days,
    };
  } catch {
    return { status: 'unknown', daysUntil: null };
  }
}

/**
 * Decode escape sequences in dosage string.
 * (HomeScreen/TimelineItem ile paylasilan helper — DRY.)
 */
export function decodeDosage(raw?: string): string {
  if (!raw) return '';
  return raw.replace(/u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

const FORM_ICON_MAP: Record<string, { lib: 'mci'; name: string }> = {
  tablet: { lib: 'mci', name: 'pill' },
  capsule: { lib: 'mci', name: 'pill-multiple' },
  syrup: { lib: 'mci', name: 'bottle-tonic-outline' },
  drops: { lib: 'mci', name: 'water-outline' },
  injection: { lib: 'mci', name: 'needle' },
  cream: { lib: 'mci', name: 'hand-back-right-outline' },
  spray: { lib: 'mci', name: 'spray' },
  other: { lib: 'mci', name: 'medical-bag' },
};

/**
 * Medicine form/dosage text'ten ikon sec (DrugInteractionsScreen,
 * HomeScreen ile ayni mantik).
 */
export function getMedicineFormIcon(medicine: Medicine): { lib: 'mci' | 'ion'; name: string } {
  if (medicine.form && FORM_ICON_MAP[medicine.form]) {
    return FORM_ICON_MAP[medicine.form];
  }
  const text = `${medicine.dosage || ''} ${medicine.stockUnit || ''}`.toLowerCase();
  if (text.includes('tablet')) return { lib: 'mci', name: 'pill' };
  if (text.includes('kaps')) return { lib: 'mci', name: 'pill-multiple' };
  if (text.includes('ml') || text.includes('şurup'))
    return { lib: 'mci', name: 'bottle-tonic-outline' };
  if (text.includes('damla')) return { lib: 'mci', name: 'water-outline' };
  if (text.includes('iğne') || text.includes('enjeksiyon')) return { lib: 'mci', name: 'needle' };
  return { lib: 'ion', name: 'medical' };
}

// ============================================================================
// Sprint 81: MedicineRow icin pure helper'lar (Sprint 82 ile buraya tasindi)
// ============================================================================

/**
 * Sprint 81A: SKT icin kalan gun sayisina gore renk paleti.
 * < 0: error (kirmizi), 0-reminderDays: warning (sari),
 * 30-90: success (yesil), > 90: muted (gri), tarih yoksa: muted.
 */
export function getExpiryColor(
  expiryDate: string | undefined,
  reminderDays: number | undefined,
  colors: ThemeColors
): { bg: string; fg: string } {
  if (!expiryDate) {
    return { bg: colors.textMuted + '15', fg: colors.textMuted };
  }
  try {
    const days = differenceInCalendarDays(parseISO(expiryDate), new Date());
    if (days < 0) {
      return { bg: colors.error + '20', fg: colors.error };
    }
    if (days <= (reminderDays ?? DEFAULT_REMINDER_DAYS)) {
      return { bg: (colors.warning || '#F59E0B') + '20', fg: colors.warning || '#F59E0B' };
    }
    if (days <= 90) {
      return { bg: (colors.success || '#10B981') + '15', fg: colors.success || '#10B981' };
    }
    return { bg: colors.textMuted + '15', fg: colors.textMuted };
  } catch {
    return { bg: colors.textMuted + '15', fg: colors.textMuted };
  }
}

/**
 * Sprint 81B: Stok badge rengini hesapla.
 * stockCount <= threshold: critical (kirmizi)
 * stockCount <= 2x threshold: low (sari)
 * stockCount > 2x threshold: ok (muted)
 * stockCount undefined: null (badge gosterme)
 */
export function getStockColor(
  stockCount: number | undefined,
  threshold: number | undefined,
  colors: ThemeColors
): { bg: string; fg: string; variant: 'critical' | 'low' | 'ok' } | null {
  if (stockCount === undefined) return null;
  const t = threshold ?? 5;
  if (stockCount <= t) {
    return { bg: colors.error + '20', fg: colors.error, variant: 'critical' };
  }
  if (stockCount <= t * 2) {
    return {
      bg: (colors.warning || '#F59E0B') + '20',
      fg: colors.warning || '#F59E0B',
      variant: 'low',
    };
  }
  return { bg: colors.textMuted + '15', fg: colors.textMuted, variant: 'ok' };
}

/**
 * Sprint 81C: Belirtilen HH:MM zamani su andan sonra mi (gelecek mi?).
 * Tam Date karsilastirmasi yapar — gun sinirini dogru geciyor.
 */
export function isFutureTime(time: string, now: Date = new Date()): boolean {
  const [hh, mm] = time.split(':').map(Number);
  const target = new Date(now);
  target.setHours(hh, mm, 0, 0);
  return target.getTime() > now.getTime();
}

/**
 * Modern UI: Yemek/Kullanım talimatına göre şık ikon adı.
 */
export function getInstructionIconName(instructions?: string): string {
  if (!instructions) return 'information-circle-outline';
  const lower = instructions.toLowerCase();
  if (
    lower.includes('yemekle') ||
    lower.includes('tok') ||
    lower.includes('food') ||
    lower.includes('after')
  ) {
    return 'restaurant-outline';
  }
  if (lower.includes('aç') || lower.includes('before') || lower.includes('empty')) {
    return 'cafe-outline';
  }
  if (lower.includes('su') || lower.includes('water')) {
    return 'water-outline';
  }
  if (
    lower.includes('gece') ||
    lower.includes('yatarken') ||
    lower.includes('bed') ||
    lower.includes('night')
  ) {
    return 'moon-outline';
  }
  if (lower.includes('sabah') || lower.includes('morning')) {
    return 'sunny-outline';
  }
  return 'bookmark-outline';
}

/**
 * Modern UI: Sıradaki doza kalan süreyi insansı metin olarak formatla.
 */
export function getRemainingDoseTimeFormatted(
  targetTime: string,
  language: 'tr' | 'en' = 'tr',
  now: Date = new Date()
): string {
  try {
    const [hh, mm] = targetTime.split(':').map(Number);
    const target = new Date(now);
    target.setHours(hh, mm, 0, 0);

    const diffMinutes = Math.round((target.getTime() - now.getTime()) / (1000 * 60));
    if (diffMinutes < 0) {
      return language === 'tr' ? 'Bugün alındı / geçti' : 'Passed today';
    }
    if (diffMinutes === 0) {
      return language === 'tr' ? 'Şimdi' : 'Now';
    }
    if (diffMinutes < 60) {
      return language === 'tr' ? `${diffMinutes} dk sonra` : `in ${diffMinutes}m`;
    }
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    if (mins === 0) {
      return language === 'tr' ? `${hours} saat sonra` : `in ${hours}h`;
    }
    return language === 'tr' ? `${hours} sa ${mins} dk sonra` : `in ${hours}h ${mins}m`;
  } catch {
    return targetTime;
  }
}

/**
 * Modern UI: İlaç formuna / rengine göre çift renkli gradient paleti.
 */
export function getMedicineGradient(
  baseColor: string | undefined,
  fallbackPrimary: string = '#0D9488'
): [string, string] {
  const color = baseColor || fallbackPrimary;
  return [color, color + 'CC'];
}
