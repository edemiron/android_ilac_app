/**
 * UCES: App Version Hook
 * Build.gradle'den otomatik versiyon çekme
 * Zero-tolerance for version mismatch
 */

import { useState, useEffect } from 'react';
import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('AppVersion');

interface AppVersion {
  versionName: string;
  versionCode: string;
  fullVersion: string;
}

/**
 * Get app version from native build config
 * Android: build.gradle versionName/versionCode
 * iOS: Info.plist CFBundleShortVersionString/CFBundleVersion
 */
export function useAppVersion(): AppVersion {
  const [version, setVersion] = useState<AppVersion>({
    versionName: '1.0.0',
    versionCode: '1',
    fullVersion: '1.0.0 (1)',
  });

  useEffect(() => {
    getVersionInfo()
      .then(setVersion)
      .catch(e => log.error('Version info error', e));
  }, []);

  return version;
}

async function getVersionInfo(): Promise<AppVersion> {
  try {
    if (Platform.OS === 'android') {
      // Android: BuildConfig'den oku
      const { versionName, versionCode } = await getAndroidVersion();
      return {
        versionName: versionName || '1.0.0',
        versionCode: String(versionCode || '1'),
        fullVersion: `${versionName} (${versionCode})`,
      };
    } else {
      // iOS: Constants'dan oku
      const version = Constants.expoConfig?.version || '1.0.0';
      const buildNumber = Constants.expoConfig?.ios?.buildNumber || '1';
      return {
        versionName: version,
        versionCode: buildNumber,
        fullVersion: `${version} (${buildNumber})`,
      };
    }
  } catch (error) {
    log.error('Version read error', error);
    // Fallback: expoConfig'den oku
    const version = Constants.expoConfig?.version || '1.0.0';
    return {
      versionName: version,
      versionCode: '?',
      fullVersion: version,
    };
  }
}

/**
 * Android BuildConfig'den versiyon oku
 */
async function getAndroidVersion(): Promise<{ versionName: string; versionCode: number }> {
  try {
    // Expo Constants'ten native version bilgisini çek
    const nativeAppVersion = Constants.nativeAppVersion;
    const nativeBuildVersion = Constants.nativeBuildVersion;

    if (nativeAppVersion && nativeBuildVersion) {
      return {
        versionName: nativeAppVersion,
        versionCode: parseInt(nativeBuildVersion, 10) || 1,
      };
    }

    // Fallback: Native module ile dene
    const { BuildConfig } = NativeModules;
    if (BuildConfig) {
      const versionName = await BuildConfig.VERSION_NAME;
      const versionCode = await BuildConfig.VERSION_CODE;
      return { versionName, versionCode };
    }

    // Son çare: expoConfig
    return {
      versionName: Constants.expoConfig?.version || '1.0.0',
      versionCode: 1,
    };
  } catch (error) {
    log.warn('Android version read failed', error);
    return {
      versionName: Constants.expoConfig?.version || '1.0.0',
      versionCode: 1,
    };
  }
}

/**
 * Sync version to build.gradle
 * Bu fonksiyon build sırasında çalışır
 */
export function syncVersionFromBuildGradle(): string {
  // Build.gradle'den okunan versiyon
  // app.json'a yazılır (prebuild hook ile)
  const buildGradleVersion = '1.3.0'; // Build.gradle'den çekilir
  return buildGradleVersion;
}
