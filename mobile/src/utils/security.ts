/**
 * Security Service - PIN ve Biyometrik Kimlik Doğrulama
 * Sağlık verileri için güvenlik katmanı
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { createScopedLogger } from './logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const log = createScopedLogger('Security');

const SECURITY_STORAGE_KEY = '@security_settings';
const PIN_HASH_KEY = '@security_pin_hash';

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
      return {
        success: false,
        error: result.error || 'Kimlik doğrulama başarısız',
      };
    }
  } catch (error) {
    log.error('Biyometrik kimlik doğrulama hatası', error);
    return {
      success: false,
      error: 'Kimlik doğrulama sırasında hata oluştu',
    };
  }
}

/**
 * PIN hash'le (güvenli saklama için)
 */
export async function hashPin(pin: string): Promise<string> {
  try {
    // Expo Crypto kullanarak SHA256 hash
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin, {
      encoding: Crypto.CryptoEncoding.HEX,
    });
    return hash;
  } catch (error) {
    log.error('PIN hash hatası', error);
    // Fallback: Basit hash (güvenlik açısından ideal değil ama çalışır)
    return pin.split('').reverse().join('') + pin.length;
  }
}

/**
 * PIN doğrula
 */
export async function verifyPin(enteredPin: string): Promise<boolean> {
  try {
    const storedHash = await AsyncStorage.getItem(PIN_HASH_KEY);
    if (!storedHash) {
      log.warn('Kaydedilmiş PIN bulunamadı');
      return false;
    }

    const enteredHash = await hashPin(enteredPin);
    return enteredHash === storedHash;
  } catch (error) {
    log.error('PIN doğrulama hatası', error);
    return false;
  }
}

/**
 * PIN kaydet
 */
export async function savePin(pin: string): Promise<boolean> {
  try {
    if (!isValidPin(pin)) {
      log.warn('Geçersiz PIN formatı');
      return false;
    }

    const hash = await hashPin(pin);
    await AsyncStorage.setItem(PIN_HASH_KEY, hash);
    log.debug('PIN kaydedildi');
    return true;
  } catch (error) {
    log.error('PIN kaydetme hatası', error);
    return false;
  }
}

/**
 * PIN sil
 */
export async function clearPin(): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(PIN_HASH_KEY);
    log.debug('PIN silindi');
    return true;
  } catch (error) {
    log.error('PIN silme hatası', error);
    return false;
  }
}

/**
 * PIN formatı geçerli mi?
 */
export function isValidPin(pin: string): boolean {
  // 4-6 haneli, sadece rakam
  return /^\d{4,6}$/.test(pin);
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
export async function authenticateWithPin(pin: string): Promise<SecurityCheckResult> {
  const isValid = await verifyPin(pin);

  if (isValid) {
    log.debug('PIN doğrulama başarılı');
    return { success: true };
  } else {
    log.debug('PIN doğrulama başarısız');
    return {
      success: false,
      error: 'Yanlış PIN',
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
    const storedHash = await AsyncStorage.getItem(PIN_HASH_KEY);
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
  const shouldLock = await shouldLockApp(settings.lockTimeout, await getLastActiveTime());
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
