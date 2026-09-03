/**
 * Bildirim kanallari (channels) modulu — **KANAL KIMLIKLERININ TEK KAYNAGI**.
 *
 * Android 8+ Oreo'dan itibaren tum bildirimler channel uzerinden gonderilir.
 * Her melodi icin ozel bir kanal olusturulur; cunku bir kanalin sesi
 * olusturulduktan SONRA DEGISTIRILEMEZ.
 *
 * ── Yayin oncesi birlestirme (v1.7.1) ─────────────────────────────────────
 * Onceden kanal tanimi BES ayri yerde, UC farkli surumleme semasiyla duruyordu:
 *   1. `MainApplication.kt`      → medicine-alarms-v4, medicine-reminders-v4, …
 *   2. `AlarmReceiver.kt`        → medicine-alarms-fsi-v7
 *   3. bu dosya                  → *-v7 ailesi
 *   4. `res/values/strings.xml`  → FCM varsayilani = medicine-reminders-v4
 *   5. `constants.ts` (olu kod)  → v4 kimlikleri
 * Sonuc: push bildirimleri eski v4 kanalina dusuyordu; hangi kanalin caldigi
 * bildirimi hangi yolun gonderdigine bagliydi.
 *
 * Artik kural su: **kimlikler burada tanimlanir.** Native taraf yalnizca JS
 * calismadan once gereken kanallari (FCM varsayilani + tam ekran) AYNI
 * kimliklerle olusturur; `notifications.channelIds.test.ts` Kotlin ve XML
 * dosyalarini okuyup buradaki sabitlerle karsilastirir, ayrisirsa test kirilir.
 *
 * NOT (bypassDnd): eskiden alarm kanallari `bypassDnd: true` ile
 * olusturuluyordu. Manifest'te `ACCESS_NOTIFICATION_POLICY` izni OLMADIGI icin
 * Android bu istegi sessizce yok sayiyor (cihazda dogrulandi: v4 alarm kanali
 * `mBypassDnd=false`). Yaniltici oldugu icin kaldirildi. "Sessizde bile cal"
 * davranisi USAGE_ALARM ses nitelikleri + uygulamanin kendi ses calaricisi ile
 * saglaniyor. Gercek DND bypass isteniyorsa bu bir URUN karari: manifest izni
 * + kullanicidan "Rahatsiz Etmeyin erisimi" istemek gerekir.
 */

import { Platform } from 'react-native';
import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';
import { createScopedLogger } from '../logger';
import { ALARM_SOUND_LIST, resolveSoundFile } from '../alarmSoundManager';

const log = createScopedLogger('Notifications.Channels');

/**
 * Kanal surum eki. Bir kanalin importance/ses/bypassDnd degeri olusturulduktan
 * sonra degistirilemedigi icin, sema degisiminde surum artirilir — ama bunun
 * bedeli kullanicinin o kanaldaki tum ayarlarinin sifirlanmasidir. Bu yuzden
 * yayin oncesi TEMIZ bir baslangic secildi: `v1`, `v4`, `v6`, `v7` gecmiste
 * farkli ailelerde kullanildi; `r1` (release 1) hicbir ailede kullanilmadi.
 */
export const CHANNEL_VERSION = 'r1';

export const ALARM_CHANNEL_ID = `medicine-alarms-${CHANNEL_VERSION}`;
export const ALARM_NO_VIBRATION_CHANNEL_ID = `medicine-alarms-no-vibration-${CHANNEL_VERSION}`;
export const REMINDER_CHANNEL_ID = `medicine-reminders-${CHANNEL_VERSION}`;
export const REMINDER_NO_VIBRATION_CHANNEL_ID = `medicine-reminders-no-vibration-${CHANNEL_VERSION}`;
export const EMERGENCY_SOS_CHANNEL_ID = `emergency-sos-${CHANNEL_VERSION}`;
export const CAREGIVER_ALERT_CHANNEL_ID = `caregiver-live-alerts-${CHANNEL_VERSION}`;
export const PATIENT_REMOTE_REMINDER_CHANNEL_ID = `patient-remote-reminders-${CHANNEL_VERSION}`;

/** Tam ekran alarmi tasiyan sessiz kanal. Native `AlarmReceiver.kt` de kullanir. */
export const ALARM_FSI_CHANNEL_ID = `medicine-alarms-fsi-${CHANNEL_VERSION}`;

/** Kalici (ongoing) hatirlatma bildirimi kanali — `utils/persistentNotification.ts`. */
export const PERSISTENT_CHANNEL_ID = `persistent-medicine-reminders-${CHANNEL_VERSION}`;

/**
 * SESSIZ durum kanali — "Alarmlar senkronize edildi" gibi bilgilendirmeler.
 *
 * ⚠️ v1.7.4 (Faz 1.2) — CIHAZDA DUYULAN "CIFT SES" HATASININ COZUMU
 * `bootHandler.showRecoveryNotification` bu bildirimi REMINDER_CHANNEL_ID
 * uzerinden gonderiyordu. O kanal SESLI (MainApplication: setSound(reminderSound))
 * ve USAGE_NOTIFICATION akisinda; ilac alarmi ise USAGE_ALARM akisinda calan
 * ayri bir kanalda. Ikisi ayni anda teslim edildiginde kullanici AYNI melodiyi
 * IKI FARKLI SES SEVIYESINDE duyuyordu (bildirim akisi vs alarm akisi).
 * Cihazda `dumpsys notification` ile dogrulandi: alarm anında 4 bildirim
 * gosteriliyordu, ikisi sesli (`medicine-alarms-<sound>-vib-r1` ve
 * `medicine-reminders-r1`).
 *
 * Durum bildirimleri artik bu sessiz, dusuk onemli kanaldan gider.
 */
export const SYNC_STATUS_CHANNEL_ID = `sync-status-${CHANNEL_VERSION}`;

/** FCM varsayilan kanali. `res/values/strings.xml` ile AYNI olmali. */
export const FCM_DEFAULT_CHANNEL_ID = REMINDER_CHANNEL_ID;

export function getSoundResourceName(soundId?: string): string {
  const file = resolveSoundFile(soundId);
  return file.replace(/\.(wav|mp3|ogg)$/, '');
}

/** Melodiye ozel ALARM kanali (USAGE_ALARM, yuksek oncelik). */
export function getAlarmChannelId(soundId?: string, vibration: boolean = true): string {
  const soundRes = getSoundResourceName(soundId);
  return `medicine-alarms-${soundRes}-${vibration ? 'vib' : 'novib'}-${CHANNEL_VERSION}`;
}

/**
 * Melodiye ozel HATIRLATMA kanali.
 *
 * "Kilit ekraninda tam ekran alarm" KAPALIYKEN alarm kanali kullanilmaz; ama
 * kullanicinin sectigi melodinin de kaybolmamasi gerekir. Kanal sesi
 * degistirilemedigi icin tek yol melodi basina hatirlatma kanali acmaktir.
 * Bu kanallar DND'yi delmez ve onceligi kullanici sistem ayarlarindan
 * dusurebilir — "kapali" durumun tanimi budur.
 */
export function getReminderChannelId(soundId?: string, vibration: boolean = true): string {
  const soundRes = getSoundResourceName(soundId);
  return `medicine-reminders-${soundRes}-${vibration ? 'vib' : 'novib'}-${CHANNEL_VERSION}`;
}

/** Bu surumun yonettigi TUM kanal kimlikleri (eski kanal temizligi bunu kullanir). */
export function getManagedChannelIds(): string[] {
  const ids = [
    ALARM_CHANNEL_ID,
    ALARM_NO_VIBRATION_CHANNEL_ID,
    REMINDER_CHANNEL_ID,
    REMINDER_NO_VIBRATION_CHANNEL_ID,
    EMERGENCY_SOS_CHANNEL_ID,
    CAREGIVER_ALERT_CHANNEL_ID,
    PATIENT_REMOTE_REMINDER_CHANNEL_ID,
    ALARM_FSI_CHANNEL_ID,
    PERSISTENT_CHANNEL_ID,
  ];

  for (const sound of ALARM_SOUND_LIST) {
    ids.push(getAlarmChannelId(sound.id, true));
    ids.push(getAlarmChannelId(sound.id, false));
    ids.push(getReminderChannelId(sound.id, true));
    ids.push(getReminderChannelId(sound.id, false));
  }

  return ids;
}

/**
 * Bize ait olan ama artik kullanilmayan kanallari tanir.
 * Baska kutuphanelerin/sistemin kanallarina ASLA dokunmaz.
 */
const LEGACY_CHANNEL_PATTERNS = [
  /^medicine-/,
  /^emergency-sos-/,
  /^caregiver-live-alerts-/,
  /^patient-remote-reminders-/,
  /^persistent-medicine-reminders/,
  /^med_alarms$/,
  /^open-app-reminders$/,
];

export function isLegacyManagedChannelId(id: string, managed: string[]): boolean {
  if (managed.includes(id)) return false;
  return LEGACY_CHANNEL_PATTERNS.some(re => re.test(id));
}

/**
 * Eski surumlerden kalan kanallari sil.
 *
 * Yayin oncesi onemli: cihazlarda `*-v4`, `*-v6`, `*-v7` kalintilari birikti.
 * Kullanicinin bildirim ayarlari ekraninda artik kullanilmayan kanallari
 * gormesi, hangi kanali sustursa ne olacagini bilemez hale getiriyor.
 */
export async function cleanupLegacyNotificationChannels(): Promise<number> {
  if (Platform.OS !== 'android') return 0;

  let deleted = 0;
  try {
    const managed = getManagedChannelIds();
    const existing = await notifee.getChannels();

    for (const channel of existing) {
      if (!channel?.id) continue;
      if (!isLegacyManagedChannelId(channel.id, managed)) continue;
      try {
        await notifee.deleteChannel(channel.id);
        deleted++;
        log.debug('Eski kanal silindi', { id: channel.id });
      } catch (error) {
        log.warn('Eski kanal silinemedi', { id: channel.id, error: String(error) });
      }
    }
  } catch (error) {
    log.warn('Eski kanal temizligi yapilamadi', { error: String(error) });
  }

  return deleted;
}

/**
 * Tek bir kanali olustur. Her kanal KENDI try/catch'inde: eskiden ilk hatali
 * kanal (ornegin izinsiz `bypassDnd`) sonrasindaki TUM kanallarin
 * olusturulmasini engelliyordu.
 */
async function createChannelSafely(config: Parameters<typeof notifee.createChannel>[0]) {
  try {
    await notifee.createChannel(config);
  } catch (error) {
    log.error('Kanal olusturulamadi', error, { id: config.id });
  }
}

/**
 * Bildirim kanallarini olustur (idempotent — zaten varsa dokunmaz).
 * iOS'ta no-op (iOS notification channels kullanmaz).
 */
export async function createNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  // 0. ACIL DURUM & SOS
  await createChannelSafely({
    id: EMERGENCY_SOS_CHANNEL_ID,
    // v1.8.2: Kanal adindan emoji kaldirildi. Kanal adi Android'in SISTEM
    // ayarlarinda ("Bildirimler" listesinde) gorunuyor; orada emoji hem
    // TalkBack tarafindan okunuyor hem de arama/siralamayi bozuyor.
    name: 'Acil Durum (SOS) Alarmları',
    description: 'Hastanızdan gelen acil durum ve yardım çağrıları - kilit ekranında sesli çalar',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: 'sound_urgent_alert',
    vibration: true,
    // DIKKAT: notifee `vibrationPattern` icin "cift uzunlukta ve TUM degerler
    // POZITIF" sarti koyar. Basindaki 0 yuzunden bu kanal AYLARDIR
    // olusturulamiyordu (cihazda dogrulandi: emergency-sos-* kanali hic yoktu)
    // ve eski kodda tum kanal olusturma tek try/catch icinde oldugu icin
    // SONRASINDAKI TUM kanallar da olusmuyordu.
    vibrationPattern: [800, 400, 800, 400, 1200, 400],
    lights: true,
    lightColor: '#FF0000',
  });

  // 0.1. Bakici canli bildirimleri
  await createChannelSafely({
    id: CAREGIVER_ALERT_CHANNEL_ID,
    name: 'Bakıcı Canlı Bildirimleri',
    description: 'Hastanızın ilaç alma/atlama canlı bildirimleri',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: 'sound_crystal_bell',
    vibration: true,
  });

  // 0.2. Hasta uzaktan hatirlatici
  await createChannelSafely({
    id: PATIENT_REMOTE_REMINDER_CHANNEL_ID,
    name: 'Uzaktan İlaç Hatırlatması',
    description: 'Yakınlarınızın size gönderdiği ilaç hatırlatmaları',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: 'sound_crystal_bell',
    vibration: true,
  });

  // 0.3. Tam ekran alarm tasiyicisi (SESSIZ — sesi uygulama kendi calar)
  await createChannelSafely({
    id: ALARM_FSI_CHANNEL_ID,
    name: 'İlaç Alarmı (Tam Ekran)',
    description: 'Kilit ekranında tam ekran alarm açan sessiz taşıyıcı bildirim',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: undefined,
    vibration: false,
  });

  // 0.4. Durum bildirimleri (SESSIZ, DUSUK ONEM) — bkz. SYNC_STATUS_CHANNEL_ID
  // notu: bu bildirimler eskiden SESLI hatirlatma kanalindan gidiyor ve ilac
  // alarmiyla ayni anda calarak "ayni melodi, iki farkli ses seviyesi"
  // etkisine yol aciyordu.
  await createChannelSafely({
    id: SYNC_STATUS_CHANNEL_ID,
    name: 'Durum Bilgilendirmeleri',
    description: 'Alarmların yeniden planlandığı gibi sessiz durum bilgileri',
    importance: AndroidImportance.LOW,
    visibility: AndroidVisibility.PUBLIC,
    sound: undefined,
    vibration: false,
  });

  // 0.4. Kalici (ongoing) hatirlatma bildirimi
  await createChannelSafely({
    id: PERSISTENT_CHANNEL_ID,
    name: 'Kalıcı İlaç Hatırlatması',
    description: 'İlacı alana kadar bildirim panelinde kalan hatırlatma',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: 'sound_crystal_bell',
    vibration: true,
  });

  // 1. Standart kanallar
  await createChannelSafely({
    id: ALARM_CHANNEL_ID,
    name: 'İlaç Alarmları',
    description: 'Kritik ilaç hatırlatmaları',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: 'alarm',
    vibration: true,
    lights: true,
    lightColor: '#FF0000',
  });

  await createChannelSafely({
    id: ALARM_NO_VIBRATION_CHANNEL_ID,
    name: 'İlaç Alarmları (Titreşimsiz)',
    description: 'Kritik ilaç hatırlatmaları - titreşim kapalı',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: 'alarm',
    vibration: false,
    lights: true,
    lightColor: '#FF0000',
  });

  await createChannelSafely({
    id: REMINDER_CHANNEL_ID,
    name: 'İlaç Hatırlatmaları',
    description: 'Normal ilaç hatırlatmaları',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: 'sound_crystal_bell',
    vibration: true,
  });

  await createChannelSafely({
    id: REMINDER_NO_VIBRATION_CHANNEL_ID,
    name: 'İlaç Hatırlatmaları (Titreşimsiz)',
    description: 'Normal ilaç hatırlatmaları - titreşim kapalı',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    sound: 'sound_crystal_bell',
    vibration: false,
  });

  // 2. Her melodi icin alarm + hatirlatma kanallari
  for (const sound of ALARM_SOUND_LIST) {
    const soundRes = getSoundResourceName(sound.id);

    for (const vibration of [true, false]) {
      await createChannelSafely({
        id: getAlarmChannelId(sound.id, vibration),
        name: `İlaç Alarmı (${sound.nameTr}${vibration ? '' : ' - Titreşimsiz'})`,
        description: `Kritik ilaç hatırlatmaları - ${sound.nameTr}`,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        sound: soundRes,
        vibration,
        lights: true,
        lightColor: '#FF0000',
      });

      await createChannelSafely({
        id: getReminderChannelId(sound.id, vibration),
        name: `İlaç Hatırlatması (${sound.nameTr}${vibration ? '' : ' - Titreşimsiz'})`,
        description: `Normal ilaç hatırlatmaları - ${sound.nameTr}`,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        sound: soundRes,
        vibration,
      });
    }
  }

  log.debug('Notifee bildirim kanallari olusturuldu');

  const deleted = await cleanupLegacyNotificationChannels();
  if (deleted > 0) {
    log.info('Eski bildirim kanallari temizlendi', { deleted });
  }
}
