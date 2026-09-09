/**
 * Ayarlarin KAPSAMI: hangi ayar buluta gider, hangisi cihazda kalir.
 *
 * ⚠️ v1.7.9 — PIN HASH'I BULUTA VE DIGER CIHAZLARA GIDIYORDU
 * ══════════════════════════════════════════════════════════════════════════
 *
 * `updateSettings` degisen alanlari `syncSettingsToCloud`a veriyor:
 *
 *     syncSettingsToCloud(userId, { ...updates, settingsUpdatedAt });
 *
 * `updates` ne olursa olsun gidiyordu — GUVENLIK alanlari dahil. Ve
 * `mergeSettingsWithUndefined` onlari geri indiriyordu. Uc ayri sonuc:
 *
 * 1. **PIN baska cihaza taşıyordu.** Telefonda PIN kuran kullanicinin
 *    tabletindeki uygulama da AYNI PIN ile kilitleniyordu. Kullanici bunu
 *    hic istemedi; ustelik ailenin ortak kullandigi bir tablette bu, uygulamayi
 *    beklenmedik sekilde erisilemez yapar.
 *
 * 2. **`biometricsEnabled` cihaza ozgudur.** Telefonda parmak izi acan
 *    kullanicinin, parmak izi donanimi OLMAYAN tabletinde de bu ayar aciliyordu.
 *    Biyometrik tek yontemse kullanici kendi uygulamasindan dişarıda kalabilir.
 *
 * 3. **`lastActiveTime` saf cihaz durumudur.** Buluta yazilmasi hem gereksiz
 *    (her odaklanmada bir Firestore yazmasi) hem anlamsiz: bir cihazin son
 *    aktiflik zamani digerinin otomatik kilidini etkilememeli.
 *
 * Kimlik dogrulama sirri (PIN hash'i) senkron yukune HIC girmemeliydi.
 * Bulut yedegi, PIN'i unutan kullaniciyi kurtarmaz — hash geri donusturulemez;
 * yalnizca sirri fazladan bir yerde tutar.
 */

import type { UserSettings } from '../types';

/**
 * Yalnizca CIHAZDA kalan ayarlar. Buluta yazilmaz, buluttan okunmaz.
 *
 * Bu listeye ekleme yaparken sor: "bu ayarin baska cihazda ayni olmasi
 * kullanicinin ISTEDIGI sey mi?" Cevap hayirsa buraya girer.
 */
export const DEVICE_LOCAL_SETTING_KEYS = [
  'securityType',
  'securityPin',
  'biometricsEnabled',
  'lockTimeout',
  'lastActiveTime',
] as const satisfies ReadonlyArray<keyof UserSettings>;

export type DeviceLocalSettingKey = (typeof DEVICE_LOCAL_SETTING_KEYS)[number];

const DEVICE_LOCAL_KEY_SET: ReadonlySet<string> = new Set(DEVICE_LOCAL_SETTING_KEYS);

export function isDeviceLocalSettingKey(key: string): boolean {
  return DEVICE_LOCAL_KEY_SET.has(key);
}

/**
 * Buluta GIDECEK yuku ayikla: cihaza ozel alanlari cikarir.
 */
export function stripDeviceLocalSettings<T extends Record<string, unknown>>(
  settings: T
): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(settings || {})) {
    if (!isDeviceLocalSettingKey(key)) out[key] = value;
  }
  return out as Partial<T>;
}

/**
 * Buluttan GELEN yuku ayikla: cihaza ozel alanlari YOK SAYAR.
 *
 * Eski bulut dokumanlari bu alanlari HALA icerebilir (v1.7.9 oncesinde
 * yazilmis). Indirme tarafinda da suzmek, guncelleyen kullanicinin
 * tabletinin bayat bir PIN'i geri yuklemesini onler.
 */
export function stripDeviceLocalSettingsFromCloud<T extends Record<string, unknown>>(
  cloudSettings: T | undefined
): Partial<T> {
  if (!cloudSettings) return {};
  return stripDeviceLocalSettings(cloudSettings);
}

/**
 * Bu yukte buluta GITMEMESI gereken bir alan var mi? (teshis/test icin)
 */
export function findLeakedDeviceLocalKeys(payload: Record<string, unknown>): string[] {
  return Object.keys(payload || {}).filter(isDeviceLocalSettingKey);
}
