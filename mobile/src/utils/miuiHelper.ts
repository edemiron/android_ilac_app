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

  // NativeModules.PlatformConstants test ortaminda veya nadir cihazlarda
  // undefined olabilir; bu durumda MIUI degil varsayalim (safe default).
  const platformConstants = NativeModules?.PlatformConstants;
  if (!platformConstants) return false;

  const manufacturer = String(platformConstants.Manufacturer ?? '').toLowerCase();
  const brand = String(platformConstants.Brand ?? '').toLowerCase();

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
 * Get device manufacturer type
 */
export function getDeviceManufacturer():
  | 'xiaomi'
  | 'samsung'
  | 'huawei'
  | 'oppo'
  | 'vivo'
  | 'other' {
  if (Platform.OS !== 'android') return 'other';
  const platformConstants = NativeModules?.PlatformConstants;
  if (!platformConstants) return 'other';

  const m = String(platformConstants.Manufacturer ?? '').toLowerCase();
  const b = String(platformConstants.Brand ?? '').toLowerCase();

  if (
    m.includes('xiaomi') ||
    m.includes('redmi') ||
    m.includes('poco') ||
    b.includes('xiaomi') ||
    b.includes('redmi')
  ) {
    return 'xiaomi';
  }
  if (m.includes('samsung') || b.includes('samsung')) {
    return 'samsung';
  }
  if (m.includes('huawei') || m.includes('honor') || b.includes('huawei') || b.includes('honor')) {
    return 'huawei';
  }
  if (m.includes('oppo') || m.includes('realme') || m.includes('oneplus') || b.includes('oppo')) {
    return 'oppo';
  }
  if (m.includes('vivo') || b.includes('vivo')) {
    return 'vivo';
  }
  return 'other';
}

/**
 * Get OEM setup instructions tailored to device manufacturer
 */
export function getOEMInstructions(manufacturer: string, language: 'tr' | 'en' = 'tr'): string {
  const isTr = language === 'tr';

  if (manufacturer === 'xiaomi') {
    return getMIUIInstructions();
  }

  if (manufacturer === 'samsung') {
    return isTr
      ? `📱 SAMSUNG CİHAZLAR İÇİN PİL AYARI\n\nAlarmların kaçmaması için:\n1️⃣ Ayarlar → Uygulamalar → İlaç Hatırlatıcı\n2️⃣ Pil → "Kısıtlanmamış" seçeneğini işaretleyin.\n3️⃣ Arka Planda Kullanım Sınırları → "Hiçbir zaman uyku moduna alınmayan uygulamalar" listesine ekleyin.`
      : `📱 SAMSUNG BATTERY SETTINGS\n\n1️⃣ Settings → Apps → Medicine Reminder\n2️⃣ Battery → Select "Unrestricted"\n3️⃣ Never sleeping apps → Add Medicine Reminder`;
  }

  if (manufacturer === 'huawei') {
    return isTr
      ? `📱 HUAWEI / HONOR CİHAZLAR İÇİN AYARLAR\n\n1️⃣ Ayarlar → Pil → Uygulama Başlatma\n2️⃣ İlaç Hatırlatıcı → "Manuel Yönet" (Otomatik Başlatma, İkincil Başlatma ve Arka Planda Çalışma'yı AÇIN).`
      : `📱 HUAWEI BATTERY SETTINGS\n\n1️⃣ Settings → Battery → App Launch\n2️⃣ Medicine Reminder → Manage manually (Enable Auto-launch, Secondary launch & Run in background).`;
  }

  return isTr
    ? `📱 KESİNTİSİZ ALARM & PİL REHBERİ\n\nAlarmların zamanında çalması için:\n1️⃣ Ayarlar → Uygulamalar → İlaç Hatırlatıcı\n2️⃣ Pil Tasarrufu → "Kısıtlama Yok" olarak ayarlayın.\n3️⃣ Otomatik Başlatma ve Bildirim izinlerini açık tutun.`
    : `📱 UNINTERRUPTED ALARM GUIDE\n\n1️⃣ Settings → Apps → Medicine Reminder\n2️⃣ Battery Optimization → Set to "Unrestricted" / "Don't optimize"\n3️⃣ Keep auto-start and notifications enabled.`;
}

/**
 * Check if all MIUI settings are properly configured
 * Note: This is a best-effort check - actual status cannot be reliably detected
 */
export async function checkMIUISettings(): Promise<MIUISettings> {
  return {
    autoStart: false,
    batteryOptimization: false,
    backgroundPopup: false,
  };
}
