/**
 * Caregiver Invite helpers.
 *
 * Sprint 14 (Caregiver invite güçlendirme) kapsaminda:
 * - 6 karakter -> 8 karakter (daha fazla kombinasyon: 30^8 = 656M milyar)
 * - Expiry kontrolü (7 gün)
 *
 * NOT: Eski 6-karakterli kodlar hâlâ valide (geriye uyumluluk).
 * Yeni davet kabul akışları 8-karakterli kod üretir.
 */

import { createScopedLogger } from './logger';

const log = createScopedLogger('CaregiverInvite');

/**
 * Davet kodu üretim karakterleri.
 * I, O, Q çıkarıldı (karışıklık önleme — 0/O, 1/I).
 */
const CODE_CHARS = '0123456789ABCDEFGHJKLMNPRSTUVWXYZ';
const CODE_LENGTH = 8; // Sprint 14: 6 -> 8

/**
 * Yeni davet kodu üret (8 karakter, alphanumeric).
 *
 * Güvenlik: 32^8 = ~1.1 trilyon olası kombinasyon (eskiden 6 karakter
 * ile 2.1 milyardı). Brute-force direnci yeterli.
 */
export function generateInviteCode(length: number = CODE_LENGTH): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return code;
}

/**
 * Davet kodu format validasyonu.
 *
 * Eski (6 karakter) ve yeni (8 karakter) kodlar için uyumlu.
 * Karakter seti: 0-9, A-Z (I, O, Q hariç).
 */
const INVITE_CODE_REGEX = new RegExp(`^[${CODE_CHARS}]{6,8}$`);

export function isValidInviteCode(code: string): boolean {
  if (!code) return false;
  return INVITE_CODE_REGEX.test(code);
}

/**
 * Davet kodunun süresinin dolup dolmadığını kontrol et.
 *
 * Sprint 14'te expiry 7 gün ile sınırlandırıldı (eskiden yoktu).
 */
export interface InviteWithExpiry {
  code: string;
  createdAt: string; // ISO timestamp
  expiresAt?: string; // ISO timestamp (yeni alan)
}

export const INVITE_EXPIRY_DAYS = 7;

export function isInviteExpired(invite: InviteWithExpiry): boolean {
  // expiresAt varsa onu kullan; yoksa createdAt + INVITE_EXPIRY_DAYS kullan.
  // createdAt bos ise expiresAt yoksa expired sayilir (güvenli default).
  let expiryMs: number;
  if (invite.expiresAt) {
    expiryMs = new Date(invite.expiresAt).getTime();
    if (Number.isNaN(expiryMs)) return true;
  } else if (invite.createdAt) {
    const createdMs = new Date(invite.createdAt).getTime();
    if (Number.isNaN(createdMs)) return true;
    expiryMs = createdMs + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  } else {
    return true; // bilgi yok — güvenli taraf
  }
  return Date.now() > expiryMs;
}

/**
 * Davet kodunu normalle (büyük harf, trim).
 */
export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

log.debug('CaregiverInvite helpers loaded', { codeLength: CODE_LENGTH });
