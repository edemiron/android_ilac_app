/**
 * QR Kod Servisi
 *
 * Bakıcı davet kodlarını QR kod olarak oluşturur ve gösterir.
 */

import { createScopedLogger } from '../utils/logger';
import { isValidInviteCode } from './caregiverService';

const log = createScopedLogger('QRCodeService');

/**
 * Invite kodu için QR URL oluştur
 * Deep link ile uygulama açılması sağlanır
 */
export function createInviteDeepLink(inviteCode: string): string {
  // Uygulama deep link scheme
  return `ilachatirlatici://caregiver/invite/${inviteCode}`;
}

/**
 * QR kod için URL encode edilmiş veri oluştur
 * QR render için kullanılır
 */
export function createQRCodeData(inviteCode: string): string {
  if (!isValidInviteCode(inviteCode)) {
    log.error('Geçersiz davet kodu', { inviteCode });
    return '';
  }

  // Deep link formatında QR verisi
  return createInviteDeepLink(inviteCode);
}

/**
 * Invite kodunu extract et (QR scan sonrası)
 */
export function extractInviteCodeFromUrl(url: string): string | null {
  try {
    // Format: ilachatirlatici://caregiver/invite/CODE
    const pattern = /ilachatirlatici:\/\/caregiver\/invite\/([A-Z0-9]{6})/i;
    const match = url.match(pattern);

    if (match && match[1]) {
      const code = match[1].toUpperCase();
      if (isValidInviteCode(code)) {
        return code;
      }
    }

    // Alternatif format: Sadece kod (manuel giriş)
    if (isValidInviteCode(url.toUpperCase())) {
      return url.toUpperCase();
    }

    return null;
  } catch (error) {
    log.error('URL parse hatası', error);
    return null;
  }
}

/**
 * QR kod için renk teması
 */
export interface QRCodeTheme {
  backgroundColor: string;
  foregroundColor: string;
  size: number;
}

/**
 * Varsayılan QR kod teması
 */
export function getDefaultQRTheme(isDark: boolean): QRCodeTheme {
  return {
    backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF',
    foregroundColor: isDark ? '#FFFFFF' : '#000000',
    size: 250,
  };
}

/**
 * QR kod render için uygunluk kontrolü
 */
export function validateInviteCodeForQR(code: string): { valid: boolean; error?: string } {
  if (!code) {
    return { valid: false, error: 'Davet kodu boş olamaz' };
  }

  if (!isValidInviteCode(code)) {
    return { valid: false, error: 'Geçersiz davet kodu formatı' };
  }

  return { valid: true };
}
