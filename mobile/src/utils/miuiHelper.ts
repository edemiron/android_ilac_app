/**
 * MIUI (Xiaomi) Battery Optimization Helper
 * UCES Native: Guides users to whitelist the app for reliable alarms
 */

import { Platform, Linking, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createScopedLogger } from './logger';

const MIUI_CHECK_STORAGE_KEY = '@miui_battery_check_shown';
const log = createScopedLogger('MIUIHelper');

export interface MIUISettings {
  autoStart: boolean;
  batteryOptimization: boolean;
  backgroundPopup: boolean;
}

/**
 * Check if device is MIUI (Xiaomi/Redmi/Poco)
 */
export function isMIUIDevice(): boolean {
  if (Platform.OS !== 'android') return false;

  const { Manufacturer, Brand } = NativeModules.PlatformConstants || {};
  const manufacturer = (Manufacturer || '').toLowerCase();
  const brand = (Brand || '').toLowerCase();

  return (
    manufacturer.includes('xiaomi') ||
    manufacturer.includes('redmi') ||
    manufacturer.includes('poco') ||
    manufacturer.includes('mi') ||
    brand.includes('xiaomi') ||
    brand.includes('redmi') ||
    brand.includes('poco')
  );
}

/**
 * Check if we should show MIUI warning
 */
export async function shouldShowMIUIWarning(): Promise<boolean> {
  if (!isMIUIDevice()) return false;

  try {
    const shown = await AsyncStorage.getItem(MIUI_CHECK_STORAGE_KEY);
    return shown !== 'true';
  } catch {
    return true;
  }
}

/**
 * Mark MIUI warning as shown
 */
export async function markMIUIWarningShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(MIUI_CHECK_STORAGE_KEY, 'true');
  } catch (error) {
    log.error('Failed to mark MIUI warning', error);
  }
}

/**
 * Open MIUI Auto-start settings
 */
export async function openMIUIAutoStartSettings(): Promise<boolean> {
  const intents = [
    // MIUI 12/13/14 Auto-start
    { action: 'miui.intent.action.OP_AUTO_START' },
    // Alternative paths
    {
      action: 'android.settings.APPLICATION_DETAILS_SETTINGS',
      data: 'package:com.ilachatirlatici',
    },
    // General app settings
    { action: 'android.settings.SETTINGS' },
  ];

  for (const intent of intents) {
    try {
      const canOpen = await Linking.canOpenURL(intent.data || intent.action);
      if (canOpen) {
        await Linking.openURL(intent.data || intent.action);
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}

/**
 * Open MIUI Battery Optimization settings
 */
export async function openMIUIBatterySettings(): Promise<boolean> {
  try {
    // Try MIUI specific battery settings
    await Linking.openURL('android.settings.BATTERY_SAVER_SETTINGS');
    return true;
  } catch {
    try {
      await Linking.openURL('android.settings.SETTINGS');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Get MIUI setup instructions
 */
export function getMIUIInstructions(): string {
  return `
📱 XİAOMİ / REDMİ / POCO CİHAZLAR İÇİN ÖNEMLİ AYARLAR

İlaç hatırlatmalarının güvenilir çalışması için lütfen şu ayarları yapın:

1️⃣ OTO BAŞLATMA (Auto-start)
   Ayarlar → Uygulamalar → İlaç Hatırlatıcı → Oto başlatma → AÇIK

2️⃣ BATARYA OPTİMİZASYONU
   Ayarlar → Pil ve performans → Uygulama pil tasarrufu → İlaç Hatırlatıcı → Kısıtlama yok

3️⃣ ARKA PLANDA AÇIK KALMA
   Ayarlar → Uygulamalar → İzni olan uygulamalar → Arka planda açık kalma → İlaç Hatırlatıcı → İZİN VER

4️⃣ KİLİT EKRANI BİLDİRİMLERİ
   Ayarlar → Bildirimler → İlaç Hatırlatıcı → Kilit ekranı bildirimleri → GÖSTER

⚠️ Bu ayarlar yapılmazsa alarmalar çalmayabilir!
`;
}

/**
 * Check if all MIUI settings are properly configured
 * Note: This is a best-effort check - actual status cannot be reliably detected
 */
export async function checkMIUISettings(): Promise<MIUISettings> {
  // We cannot reliably detect these settings programmatically on MIUI
  // Return conservative defaults
  return {
    autoStart: false,
    batteryOptimization: false,
    backgroundPopup: false,
  };
}
