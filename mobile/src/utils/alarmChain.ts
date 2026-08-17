/**
 * Alarm zinciri devamliligi.
 *
 * Her hatirlatmanin tek bir bekleyen TIMESTAMP trigger'i vardir. Alarm caldigi
 * anda o trigger tukenir; bir sonrakini kurmak ZORUNLUDUR, aksi halde o ilac
 * icin alarm bir daha hic calmaz.
 *
 * NEDEN AYRI MODUL?
 * -----------------
 * Bu mantik daha once yalnizca index.ts icinde, onBackgroundEvent'e ozel bir
 * private fonksiyon olarak duruyordu. Ama notifee her olayi TEK bir isleyiciye
 * yonlendirir: uygulama on plandaysa onForegroundEvent, degilse
 * onBackgroundEvent. Yani alarm uygulama ACIKKEN calarsa arka plan isleyicisi
 * hic tetiklenmiyor ve zincir sessizce kopuyordu.
 *
 * Kopan zincir yalnizca uygulama TAMAMEN kapatilip yeniden acildiginda
 * onariliyordu (useBootRecovery -> reRegisterAllAlarms). Android uygulamayi
 * gunlerce bellekte tuttugu icin kullanici arada dozlarini kacirabiliyordu.
 *
 * Artik hem index.ts (arka plan) hem App.tsx (on plan, setupNotificationListeners
 * uzerinden) ayni yardimciyi cagirir.
 *
 * Not: bootHandler.ts `./notifications` barrel'ini import ettigi ve barrel
 * listeners.ts'i yeniden export ettigi icin bu modul BILEREK notifications
 * klasorunun disinda tutuldu — aksi halde dongusel import olusuyordu.
 */

import { rescheduleNextOccurrence } from './bootHandler';
import { createScopedLogger } from './logger';

const log = createScopedLogger('AlarmChain');

/** notifee Notification'in bu modulun ihtiyac duydugu alt kumesi. */
export interface FiredNotificationLike {
  id?: string;
  data?: Record<string, unknown>;
}

/**
 * Calan bir ilac alarminin bir sonraki tekrarini kurar.
 *
 * Sessizce atlanan durumlar (hepsi kasitli):
 *   - medicineId/reminderTimeId yok: zincirlenecek bir hatirlatma yok
 *   - isSnooze: erteleme bildirimlerinin kendi akisi var
 *   - id 'alarm-' ile baslamiyor: son kullanma / kalici / diger bildirimler
 *
 * @returns Kurulan bildirimin ID'si, kurulmadiysa null.
 */
export async function rescheduleFiredAlarm(
  notification: FiredNotificationLike | undefined
): Promise<string | null> {
  const medicineId = notification?.data?.medicineId as string | undefined;
  const reminderTimeId = notification?.data?.reminderTimeId as string | undefined;
  const isSnooze = notification?.data?.isSnooze;
  const id = notification?.id;

  if (!medicineId || !reminderTimeId) return null;
  if (isSnooze === 'true' || isSnooze === true) return null;
  if (!id || !id.startsWith('alarm-')) return null;

  try {
    const nextId = await rescheduleNextOccurrence(medicineId, reminderTimeId);
    log.debug('Sonraki tekrar kuruldu', { medicineId, reminderTimeId, nextId });
    return nextId;
  } catch (error) {
    log.error('Sonraki tekrar kurulamadi', error);
    return null;
  }
}
