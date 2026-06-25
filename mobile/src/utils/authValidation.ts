/**
 * Authentication validation utilities
 * Shared between Login, Register ve Forgot Password ekranları.
 */

const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmailFormat(email: string): boolean {
  return EMAIL_FORMAT_REGEX.test(normalizeEmail(email));
}

/**
 * Minimum şifre uzunluğu doğrulaması (Firebase default 6 karakter ile uyumlu).
 * Sadece UI seviyesi kontrol — server tarafında da yürütülür.
 */
export function isValidPasswordLength(password: string, minLength = 6): boolean {
  return typeof password === 'string' && password.length >= minLength;
}
