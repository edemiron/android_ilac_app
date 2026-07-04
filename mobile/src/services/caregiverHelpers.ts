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
