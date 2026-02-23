/**
 * UCES: App Version Hook
 * src/config/version.ts'den otomatik versiyon çekme
 * Zero-tolerance for version mismatch
 *
 * NOT: Versiyon güncellemek için src/config/version.ts dosyasını düzenleyin
 */

import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { createScopedLogger } from '../utils/logger';
import { APP_VERSION, ANDROID_VERSION_CODE, IOS_BUILD_NUMBER } from '../config/version';

const log = createScopedLogger('AppVersion');

interface AppVersion {
  versionName: string;
  versionCode: string;
  fullVersion: string;
}

/**
 * Get app version from version config
 * Runtime'da okur, her zaman günceldir
 */
export function useAppVersion(): AppVersion {
  const [version, setVersion] = useState<AppVersion>(() => {
    // Initial state from config
    return getVersionFromConfig();
  });

  useEffect(() => {
    // Async check for native version (if available)
    if (Platform.OS === 'android') {
      getNativeAndroidVersion()
        .then(nativeVersion => {
          if (nativeVersion) {
            setVersion(nativeVersion);
          }
        })
        .catch(e => log.error('Native version read error', e));
    }
  }, []);

  return version;
}

/**
 * Versiyon bilgisini config dosyasından okur
 * Bu değer app.json ile senkronize edilmelidir
 */
function getVersionFromConfig(): AppVersion {
  const versionName = APP_VERSION;
  const versionCode = Platform.OS === 'android'
    ? String(ANDROID_VERSION_CODE)
    : IOS_BUILD_NUMBER;

  return {
    versionName,
    versionCode,
    fullVersion: `${versionName} (${versionCode})`,
  };
}

/**
 * Android native BuildConfig'den versiyon oku (Opsiyonel)
 * Eğer native build varsa bu değerler daha doğru olur
 */
async function getNativeAndroidVersion(): Promise<AppVersion | null> {
  try {
    const nativeAppVersion = Constants.nativeAppVersion;
    const nativeBuildVersion = Constants.nativeBuildVersion;

    if (nativeAppVersion) {
      return {
        versionName: nativeAppVersion,
        versionCode: nativeBuildVersion || String(ANDROID_VERSION_CODE),
        fullVersion: `${nativeAppVersion} (${nativeBuildVersion || ANDROID_VERSION_CODE})`,
      };
    }

    return null;
  } catch (error) {
    log.warn('Native Android version read failed', { error });
    return null;
  }
}

/**
 * Mevcut versiyonu döndür (Hook kullanmadan)
 */
export function getAppVersion(): string {
  return APP_VERSION;
}

/**
 * Mevcut version code'u döndür
 */
export function getVersionCode(): number {
  return ANDROID_VERSION_CODE;
}
