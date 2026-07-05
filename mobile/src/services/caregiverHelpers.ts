/**
 * caregiverService — pure helpers.
 *
 * Sprint 7.3: caregiverService.ts (534 satir) helper extraction.
 * Invite code generator + validator pure modulde — test edilebilir,
 * service dosyasi sadelestirilir.
 */

/** I, O, Q cikarilmis karakter seti (karisiklik onleme). */
export const INVITE_CODE_CHARS = '0123456789ABCDEFGHJKLMNPRSTUVWXYZ';
export const INVITE_CODE_LENGTH = 6;

/**
 * 6 haneli rastgele invite code uretici.
 * Tum olasi harf karisikliklari onlenmis karakter seti kullanir.
 */
export function generateInviteCode(length: number = INVITE_CODE_LENGTH): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += INVITE_CODE_CHARS.charAt(Math.floor(Math.random() * INVITE_CODE_CHARS.length));
  }
  return code;
}

/**
 * Invite code validasyonu — 6 haneli sadece alfanumerik (buyuk harf + rakam).
 * I, O, Q harfleri set'te olmadigi icin otomatik reject edilir.
 */
export function isValidInviteCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code);
}

/**
 * Bakici email validasyonu (basic format check).
 */
export function isValidCaregiverEmail(email: string): boolean {
  if (typeof email !== 'string') return false;
  // Basit email regex — RFC 5322'nin tam karsiligi degil
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Davet bitim tarihi — bugunden itibaren INVITE_EXPIRY_DAYS gun sonra.
 */
export function calculateInviteExpiry(now: Date = new Date(), expiryDays: number = 7): Date {
  const expiry = new Date(now);
  expiry.setDate(expiry.getDate() + expiryDays);
  return expiry;
}

/**
 * Davet expired mi kontrol et.
 */
export function isInviteExpired(expiresAt: Date | string, now: Date = new Date()): boolean {
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return expiry.getTime() <= now.getTime();
}

/**
 * Caregiver bildirim icerigi (TR/EN) — pure helper (I/O bagimsiz).
 * Sprint 12.4: notifyCaregivers'in content builder logic'i.
 */
export interface CaregiverNotificationContent {
  title: string;
  body: string;
  type: 'missed' | 'skipped' | 'taken' | 'snoozed';
}

const NOTIFICATION_TEMPLATES = {
  tr: {
    missed: { title: '⏰ İlaç zamanı geçti', bodySuffix: 'ilacını zamanında almadı.' },
    skipped: { title: '⏭️ İlaç atlandı', bodySuffix: 'ilacını atladı.' },
    taken: { title: '✅ İlaç alındı', bodySuffix: 'ilacını aldı.' },
    snoozed: { title: '⏸️ İlaç ertelendi', bodySuffix: 'ilacını erteledi.' },
  },
  en: {
    missed: { title: '⏰ Medication missed', bodySuffix: 'did not take their medication on time.' },
    skipped: { title: '⏭️ Medication skipped', bodySuffix: 'skipped their medication.' },
    taken: { title: '✅ Medication taken', bodySuffix: 'took their medication.' },
    snoozed: { title: '⏸️ Medication snoozed', bodySuffix: 'snoozed their medication.' },
  },
} as const;

/**
 * Caregiver bildirim icerigi olustur (TR/EN lokalize).
 */
export function formatCaregiverNotification(
  type: 'missed' | 'skipped' | 'taken' | 'snoozed',
  medicineName: string,
  language: 'tr' | 'en' = 'tr'
): CaregiverNotificationContent {
  const template = NOTIFICATION_TEMPLATES[language][type];
  return {
    title: template.title,
    body: `${medicineName} ${template.bodySuffix}`,
    type,
  };
}

/**
 * Validate FCM token.
 * Firebase Cloud Messaging token'lar uzun alfanumerik string'lerdir.
 * Minimum uzunluk 50, max 250 (FCM spec).
 */
export function isValidFcmToken(token: string | null | undefined): boolean {
  if (typeof token !== 'string') return false;
  if (token.length < 50 || token.length > 250) return false;
  return /^[A-Za-z0-9_\-:]+$/.test(token);
}

/**
 * Caregiver relationship durumunu normalize et.
 * 'pending'|'active'|'paused'|'removed' disinda degerler 'unknown' doner.
 */
export type CaregiverStatusNormalized = 'pending' | 'active' | 'paused' | 'removed' | 'unknown';

export function normalizeCaregiverStatus(
  status: string | null | undefined
): CaregiverStatusNormalized {
  switch (status) {
    case 'pending':
    case 'active':
    case 'paused':
    case 'removed':
      return status;
    default:
      return 'unknown';
  }
}

/**
 * Caregiver bildirim tercihi acenta mi (verilen tip) kontrol et.
 * permission: 'viewSchedule' | 'viewHistory' | 'receiveAlerts'
 */
export function hasCaregiverPermission(
  permissions: Record<string, boolean> | undefined,
  permission: 'canViewSchedule' | 'canViewHistory' | 'canReceiveAlerts'
): boolean {
  if (!permissions) return false;
  return permissions[permission] === true;
}
