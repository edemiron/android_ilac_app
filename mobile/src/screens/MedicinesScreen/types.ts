/**
 * MedicinesScreen types + sabitler.
 *
 * Sprint 5.1: MedicinesScreen.tsx (1317 satir) modularizasyonu.
 */

export type ExpiryStatus = 'expired' | 'expiring' | 'ok' | 'unknown';

export type MedicinIconInfo = { lib: 'mci'; name: string } | { lib: 'ion'; name: string };

export const DEFAULT_REMINDER_DAYS = 7;

export interface ExpiryResult {
  status: ExpiryStatus;
  daysUntil: number | null;
}
