/**
 * MedicinesScreen helpers.
 *
 * Sprint 5.1: Pure helper'lar (expiry status, dosage decode, form icon picker).
 * TimelineItem ile paylasilan helpers bu modulde standardize ediliyor — DRY.
 */

import { differenceInDays, parseISO } from 'date-fns';
import type { Medicine } from '../../types';
import { type ExpiryStatus, type ExpiryResult, DEFAULT_REMINDER_DAYS } from './types';

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
