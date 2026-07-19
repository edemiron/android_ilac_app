/**
 * Security Service - PIN ve Biyometrik Kimlik Doğrulama
 * Sağlık verileri için güvenlik katmanı
 *
 * Sprint 4.4: Pure crypto helper'lar ./security/pinCrypto.ts'e tasindi.
 * Bu dosya barrel olarak davranmaya devam ediyor; tum public API korunuyor.
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { createScopedLogger } from './logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { recordDiagnosticEvent } from './diagnosticTelemetry';

const log = createScopedLogger('Security');

const SECURITY_STORAGE_KEY = '@security_settings';
// Expo SecureStore keys may only contain alphanumeric characters, ".", "-", and "_".
const PIN_HASH_KEY = 'security.pin.hash';
const SALT_STORAGE_KEY = 'security.pin.salt';

// Sprint 4.4: Pure PIN crypto helpers re-export ediliyor.
// isValidPin burada inline tanimli (pattern detection iceren zengin hali);
// diger pure helper'lar ./security/pinCrypto.ts'den geliyor.
export {
  constantTimeEqual,
  generateSalt,
  hashPinWithSalt,
  generatePinHash,
} from './security/pinCrypto';
import { constantTimeEqual, hashPinWithSalt, generatePinHash } from './security/pinCrypto';

export interface SecurityCheckResult {
  success: boolean;
  error?: string;
}

export interface BiometricAvailability {
  available: boolean;
  biometricsType: LocalAuthentication.AuthenticationType[];
  error?: string;
}

/**
 * Cihazın biyometrik yeteneklerini kontrol et
 */
export async function checkBiometricAvailability(): Promise<BiometricAvailability> {
  try {
    // Hardware desteği var mı?
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) {
      return {
        available: false,
        biometricsType: [],
        error: 'Cihaz biyometrik kimlik doğrulamayı desteklemiyor',
      };
    }

    // Kaydedilmiş biyometrik var mı?
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      return {
        available: false,
        biometricsType: [],
        error: 'Kaydedilmiş parmak izi veya yüz tanıma bulunamadı',
      };
    }

    // Desteklenen tipleri al
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    return {
      available: true,
      biometricsType: supportedTypes,
    };
  } catch (error) {
    log.error('Biyometrik kontrol hatası', error);
    return {
      available: false,
      biometricsType: [],
      error: 'Biyometrik kontrol sırasında hata oluştu',
    };
  }
}

/**
 * Biyometrik tipin insan okunabilir adını döndür
 */
export function getBiometricTypeName(types: LocalAuthentication.AuthenticationType[]): string {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Yüz Tanıma';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Parmak İzi';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'İris Tanıma';
  }
  return 'Biyometrik Kimlik Doğrulama';
}

/**
 * Biyometrik kimlik doğrulama yap
 */
export async function authenticateWithBiometrics(
  promptMessage = 'Uygulamayı açmak için kimlik doğrulama'
): Promise<SecurityCheckResult> {
  try {
    const availability = await checkBiometricAvailability();
    if (!availability.available) {
      void recordDiagnosticEvent({
        scope: 'security',
        level: 'warn',
        message: 'Biometric authentication unavailable',
        context: { reason: availability.error },
      });
      return {
        success: false,
        error: availability.error,
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'PIN kullan',
      cancelLabel: 'İptal',
      disableDeviceFallback: false,
    });

    if (result.success) {
      log.debug('Biyometrik kimlik doğrulama başarılı');
      return { success: true };
    } else {
      log.debug('Biyometrik kimlik doğrulama iptal edildi veya başarısız');
      void recordDiagnosticEvent({
        scope: 'security',
        level: 'warn',
        message: 'Biometric authentication failed',
        context: { error: result.error },
      });
      return {
        success: false,
        error: result.error || 'Kimlik doğrulama başarısız',
      };
    }
  } catch (error) {
    log.error('Biyometrik kimlik doğrulama hatası', error);
    void recordDiagnosticEvent({
      scope: 'security',
      level: 'error',
      message: 'Biometric authentication threw an error',
    });
    return {
      success: false,
      error: 'Kimlik doğrulama sırasında hata oluştu',
    };
  }
}

/**
 * Pin hash migrate path. Native PBKDF2 mevcutsa upgrade gerekli.
 */
const FAILED_ATTEMPTS_KEY = '@security_failed_attempts';
const LOCKOUT_TIME_KEY = '@security_lockout_until';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 dakika

/**
 * Eski (100 round) hash'lerden yeni (10k round) hash'e migrate et.
 * verifyPin başarılı olduğunda otomatik çağrılır; eski kullanıcı PIN'leri
 * bir sonraki başarılı girişte upgrade edilir.
 */
async function migratePinHashIfNeeded(
  enteredPin: string,
  salt: string,
  newHash: string
): Promise<void> {
  try {
    await SecureStore.setItemAsync(PIN_HASH_KEY, newHash);
    log.debug('PIN hash migrated to new iteration count');
  } catch (error) {
    log.warn('PIN hash migration failed (non-fatal)', error);
  }
}

/**
 * PIN hash'le (güvenli saklama için)
 * Salt oluşturur ve PBKDF2 ile hash'ler
 */
export async function hashPin(pin: string): Promise<{ hash: string; salt: string }> {
  return generatePinHash(pin);
}

/**
 * Başarısız deneme sayısını artır ve kilitleme kontrolü yap
 */
async function incrementFailedAttempts(): Promise<{ locked: boolean; remainingAttempts: number }> {
  try {
    const attemptsStr = await AsyncStorage.getItem(FAILED_ATTEMPTS_KEY);
    const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
    const newAttempts = attempts + 1;

    await AsyncStorage.setItem(FAILED_ATTEMPTS_KEY, newAttempts.toString());

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
      await AsyncStorage.setItem(LOCKOUT_TIME_KEY, lockoutUntil.toString());
      await AsyncStorage.removeItem(FAILED_ATTEMPTS_KEY);
      return { locked: true, remainingAttempts: 0 };
    }

    return { locked: false, remainingAttempts: MAX_FAILED_ATTEMPTS - newAttempts };
  } catch (error) {
    log.error('Failed attempts increment error', error);
    return { locked: false, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }
}

/**
 * Başarılı girişte failed attempts sıfırla
 */
async function resetFailedAttempts(): Promise<void> {
  try {
    await AsyncStorage.removeItem(FAILED_ATTEMPTS_KEY);
    await AsyncStorage.removeItem(LOCKOUT_TIME_KEY);
  } catch (error) {
    log.error('Failed attempts reset error', error);
  }
}

/**
 * Kilitli mi kontrol et
 */
async function isLockedOut(): Promise<boolean> {
  try {
    const lockoutUntilStr = await AsyncStorage.getItem(LOCKOUT_TIME_KEY);
    if (!lockoutUntilStr) return false;

    const lockoutUntil = parseInt(lockoutUntilStr, 10);
    if (Date.now() >= lockoutUntil) {
      // Kilitleme süresi doldu
      await AsyncStorage.removeItem(LOCKOUT_TIME_KEY);
      return false;
    }

    return true;
  } catch (error) {
    log.error('Lockout check error', error);
    return false;
  }
}

/**
 * Kalan kilitleme süresini dakika olarak döndür
 */
export async function getRemainingLockoutTime(): Promise<number> {
  try {
    const lockoutUntilStr = await AsyncStorage.getItem(LOCKOUT_TIME_KEY);
    if (!lockoutUntilStr) return 0;

    const lockoutUntil = parseInt(lockoutUntilStr, 10);
    const remaining = Math.max(0, lockoutUntil - Date.now());
    return Math.ceil(remaining / 60000); // dakika olarak
  } catch {
    return 0;
  }
}

/**
 * PIN doğrula - Brute-force korumalı
 */
export async function verifyPin(
  enteredPin: string
): Promise<{ success: boolean; error?: string; remainingAttempts?: number }> {
  // Kilitleme kontrolü
  const locked = await isLockedOut();
  if (locked) {
    const remainingMinutes = await getRemainingLockoutTime();
    void recordDiagnosticEvent({
      scope: 'security',
      level: 'warn',
      message: 'PIN verification attempted during lockout',
      context: { remainingMinutes },
    });
    return {
      success: false,
      error:
        remainingMinutes > 0
          ? `Çok fazla başarısız deneme. ${remainingMinutes} dakika bekleyin.`
          : 'Çok fazla başarısız deneme. Lütfen bekleyin.',
    };
  }

  try {
    // SecureStore kullan (device keychain - daha güvenli)
    const storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
    const storedSalt = await SecureStore.getItemAsync(SALT_STORAGE_KEY);

    if (!storedHash || !storedSalt) {
      log.warn('Kaydedilmiş PIN bulunamadı');
      return { success: false, error: 'PIN ayarlı değil' };
    }

    const enteredHash = await hashPinWithSalt(enteredPin, storedSalt);

    if (constantTimeEqual(enteredHash, storedHash)) {
      await resetFailedAttempts();
      // Eski hash migration: stored hash ile entered hash aynı formatta olmalı.
      // enteredHash her zaman yeni formatta üretilir; eğer storedHash farklıysa
      // (örn. eski 100-round'dan geliyorsa) enteredHash ile değiştir.
      if (enteredHash !== storedHash) {
        await migratePinHashIfNeeded(enteredPin, storedSalt, enteredHash);
      }
      log.debug('PIN doğrulama başarılı');
      return { success: true };
    } else {
      const result = await incrementFailedAttempts();
      log.debug(`PIN doğrulama başarısız. Kalan deneme: ${result.remainingAttempts}`);
      void recordDiagnosticEvent({
        scope: 'security',
        level: result.locked ? 'error' : 'warn',
        message: result.locked ? 'PIN lockout triggered' : 'PIN verification failed',
        context: { remainingAttempts: result.remainingAttempts },
      });
      return {
        success: false,
        error: result.locked
          ? `Çok fazla başarısız deneme. 5 dakika bekleyin.`
          : `Yanlış PIN. Kalan deneme: ${result.remainingAttempts}`,
        remainingAttempts: result.remainingAttempts,
      };
    }
  } catch (error) {
    log.error('PIN doğrulama hatası', error);
    void recordDiagnosticEvent({
      scope: 'security',
      level: 'error',
      message: 'PIN verification threw an error',
    });
    return { success: false, error: 'Doğrulama hatası' };
  }
}

/**
 * PIN kaydet - Güvenli hash + salt ile
 */
export async function savePin(pin: string): Promise<boolean> {
  try {
    if (!isValidPin(pin)) {
      log.warn('Geçersiz PIN formatı');
      return false;
    }

    // Zayıf PIN kontrolü (yaygın PIN'leri engelle)
    const weakPins = [
      '1234',
      '1111',
      '0000',
      '1212',
      '7777',
      '1004',
      '2000',
      '4444',
      '2222',
      '3333',
      '5555',
      '6666',
      '8888',
      '9999',
      '123456',
      '654321',
    ];
    if (weakPins.includes(pin)) {
      log.warn('Zayıf PIN reddedildi');
      return false;
    }

    const { hash, salt } = await hashPin(pin);
    // SecureStore kullan (device keychain - daha güvenli)
    await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
    await SecureStore.setItemAsync(SALT_STORAGE_KEY, salt);
    log.debug('PIN güvenli şekilde kaydedildi (SecureStore)');
    return true;
  } catch (error) {
    log.error('PIN kaydetme hatası', error);
    return false;
  }
}

/**
 * PIN sil - Salt'ı da sil
 */
export async function clearPin(): Promise<boolean> {
  try {
    // SecureStore kullan
    await SecureStore.deleteItemAsync(PIN_HASH_KEY);
    await SecureStore.deleteItemAsync(SALT_STORAGE_KEY);
    await resetFailedAttempts(); // Failed attempts'ı da temizle
    log.debug('PIN ve salt silindi (SecureStore)');
    return true;
  } catch (error) {
    log.error('PIN silme hatası', error);
    return false;
  }
}

/**
 * PIN formatı geçerli mi? (Güçlendirilmiş)
 * - 4-6 hane
 * - Ardışık rakam yok (123, 234, 345, 456)
 * - Tekrarlanan rakam yok (111, 222)
 * - Tarih değil (yılın son 2 hanesi)
 */
export function isValidPin(pin: string): boolean {
  // Temel format kontrolü (4-6 hane, sadece rakam)
  if (!/^\d{4,6}$/.test(pin)) {
    return false;
  }

  // Ardışık rakam kontrolü (123, 234, 345, 456, 567, 678, 789)
  const consecutivePatterns = [
    '012',
    '123',
    '234',
    '345',
    '456',
    '567',
    '678',
    '789',
    '890',
    '321',
    '432',
    '543',
    '654',
    '765',
    '876',
    '987',
  ];
  for (const pattern of consecutivePatterns) {
    if (pin.includes(pattern)) {
      log.debug('Ardışık rakam tespit edildi', { pin: pin.substring(0, 2) + '**' });
      return false;
    }
  }

  // Tekrarlanan rakam kontrolü (111, 222, 333, 444, 555, 666, 777, 888, 999)
  if (/(.)\1{2,}/.test(pin)) {
    log.debug('Tekrarlanan rakam tespit edildi', { pin: pin.substring(0, 2) + '**' });
    return false;
  }

  // Tarih kontrolü (yılın son 2 hanesi - gün doğum tarihi vb.)
  const currentYear = new Date().getFullYear() % 100;
  const lastYear = (currentYear - 1) % 100;
  if (pin.endsWith(String(currentYear)) || pin.endsWith(String(lastYear))) {
    log.debug('Tarih içeren PIN tespit edildi', { pin: pin.substring(0, 2) + '**' });
    return false;
  }

  return true;
}

/**
 * Güvenlik durumunu kontrol et (kilitleme gerekli mi?)
 */
export async function shouldLockApp(
  lockTimeout: number,
  lastActiveTime?: string
): Promise<boolean> {
  // Kilitleme kapalıysa (0 dakika) her zaman kilitle
  if (lockTimeout === 0) {
    return true;
  }

  if (!lastActiveTime) {
    return true;
  }

  const lastActive = new Date(lastActiveTime).getTime();
  const now = Date.now();
  const minutesPassed = (now - lastActive) / (1000 * 60);

  return minutesPassed >= lockTimeout;
}

/**
 * Son aktif zamanı kaydet
 */
export async function updateLastActiveTime(): Promise<void> {
  try {
    const now = new Date().toISOString();
    await AsyncStorage.setItem('@last_active_time', now);
  } catch (error) {
    log.error('Son aktif zaman kaydetme hatası', error);
  }
}

/**
 * Son aktif zamanı al
 */
export async function getLastActiveTime(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('@last_active_time');
  } catch (error) {
    log.error('Son aktif zaman alma hatası', error);
    return null;
  }
}

/**
 * Karmaşık güvenlik doğrulama (PIN + Biyometrik)
 */
export async function authenticateWithPin(
  pin: string
): Promise<SecurityCheckResult & { remainingAttempts?: number }> {
  const result = await verifyPin(pin);

  if (result.success) {
    log.debug('PIN doğrulama başarılı');
    return { success: true };
  } else {
    log.debug('PIN doğrulama başarısız');
    return {
      success: false,
      error: result.error || 'Yanlış PIN',
      remainingAttempts: result.remainingAttempts,
    };
  }
}

/**
 * Güvenlik ayarlarını kaydet
 */
export interface SecuritySettings {
  securityEnabled: boolean;
  securityType: 'pin' | 'biometric' | 'both' | 'none';
  biometricsEnabled: boolean;
  lockTimeout: number;
}

export async function saveSecuritySettings(settings: SecuritySettings): Promise<boolean> {
  try {
    await AsyncStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(settings));
    log.debug('Güvenlik ayarları kaydedildi');
    return true;
  } catch (error) {
    log.error('Güvenlik ayarları kaydetme hatası', error);
    return false;
  }
}

/**
 * Güvenlik ayarlarını al
 */
export async function getSecuritySettings(): Promise<SecuritySettings | null> {
  try {
    const settings = await AsyncStorage.getItem(SECURITY_STORAGE_KEY);
    if (settings) {
      return JSON.parse(settings) as SecuritySettings;
    }
    return null;
  } catch (error) {
    log.error('Güvenlik ayarları alma hatası', error);
    return null;
  }
}

/**
 * PIN ayarlı mı kontrol et
 */
export async function isPinSet(): Promise<boolean> {
  try {
    // SecureStore kullan
    const storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
    return storedHash !== null;
  } catch (error) {
    log.error('PIN durum kontrolü hatası', error);
    return false;
  }
}

/**
 * Uygulama açılışında güvenlik kontrolü
 */
export async function performSecurityCheck(
  settings: SecuritySettings
): Promise<SecurityCheckResult> {
  // Güvenlik kapalıysa devam et
  if (!settings.securityEnabled || settings.securityType === 'none') {
    return { success: true };
  }

  // Kilitleme süresi kontrolü
  const lastActiveTime = await getLastActiveTime();
  const shouldLock = await shouldLockApp(settings.lockTimeout, lastActiveTime ?? undefined);
  if (!shouldLock) {
    return { success: true };
  }

  // Biyometrik kontrol
  if (settings.securityType === 'biometric' || settings.securityType === 'both') {
    const bioResult = await authenticateWithBiometrics();
    if (bioResult.success) {
      return { success: true };
    }
    // Biyometrik başarısız oldu ama "both" modundaysak PIN'e düş
    if (settings.securityType === 'biometric') {
      return bioResult;
    }
  }

  // PIN kontrolü - PIN ekranına yönlendirme gerektiğini belirt
  return {
    success: false,
    error: 'PIN_REQUIRED',
  };
}
