/**
 * Alarm giris (ingress) tekilleştirme — TEK KAYNAK.
 *
 * ⚠️ v1.7.4 (Faz 1.2) — "AYNI ALARM İKİ KEZ AÇILIYOR" HATASININ ÇÖZÜMÜ
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ── Neden bir alarm birden fazla kez JS'e ulaşır? ─────────────────────────
 * Güvenilirlik için TEK bir doz için İKİ bağımsız işletim sistemi tetiği
 * kurulur (bkz. schedule.ts):
 *   A) notifee TIMESTAMP bildirimi (`fullScreenAction` + kanal sesi)
 *   B) native `AlarmManager.setAlarmClock` → `AlarmReceiver`
 * Bu bilinçli bir yedeklilik: biri OEM pil yönetimi tarafından düşürülse bile
 * diğeri çalar. Ama her biri JS tarafına AYRI bir giriş açar:
 *   1. `AlarmModule.emitAlarmTriggered` (AlarmReceiver'dan)
 *   2. `MainActivity.handleAlarmIntent` emit
 *   3. notifee `DELIVERED` / `PRESS` foreground olayı
 *   4. `Linking` deep link (`ilachatirlatici://alarm?...`)
 *   5. `getInitialAlarm` (cold start önbelleği)
 * Yani ekranı açma kararı 5 yoldan gelebilir; hepsi aynı çalmayı temsil eder.
 *
 * ── Eski tekilleştirme neden tutmuyordu? ──────────────────────────────────
 * Anahtar `alarmNavigation.getAlarmKey` içinde şöyle üretiliyordu:
 *
 *     `${medicineId}::${reminderTimeId}::${format(now, 'yyyy-MM-dd-HH-mm')}`
 *                                                └── DUVAR SAATİ DAKİKASI
 *
 * `now`, o girişin İŞLENDİĞİ andır. Yollar birbirinden saniyeler ayrıdır
 * (native yayın anında gelir; deep link / notifee olayı Activity açılıp RN
 * köprüsü hazır olduktan sonra). Çalma bir dakikanın son saniyelerine
 * denk gelirse:
 *     yol A → 00:33:59.8 → anahtar "...-00-33"
 *     yol B → 00:34:00.3 → anahtar "...-00-34"
 * İki FARKLI anahtar; `activeAlarmKeys` seti hiçbirini yakalamaz ve
 * ekran ÜST ÜSTE İKİ KEZ açılır. Kullanıcı "Şimdi Al"a basar, ekran kapanır,
 * hemen ardından aynı ekran yeniden gelir ve tekrar basmak zorunda kalır.
 * (Sahadan gelen kanıt: ekran görüntüsünde durum çubuğu 00:34, alarm ekranı
 * saati 00:33 — tam dakika sınırı.)
 *
 * Sesin "aynı melodi ama iki farklı seviye" duyulmasının nedeni de budur:
 * BİRİNCİ ekran açılırken notifee bildirimi hâlâ kendi kanalında (USAGE_ALARM)
 * döngüsel çalıyordur; üstüne AlarmScreen kendi oynatıcısını başlatır — iki
 * kaynak üst üste biner. "Şimdi Al" bildirimi iptal edince ses kaynağı bire
 * düşer; İKİNCİ ekranda yalnızca uygulama içi oynatıcı kalır ve aynı melodi
 * belirgin şekilde daha kısık duyulur.
 *
 * ── Bu modülün çözümü ─────────────────────────────────────────────────────
 * 1. Anahtardan duvar saati TAMAMEN çıkarıldı. Anahtar artık dozun kimliği:
 *    `medicineId::reminderTimeId::<main|snooze:snoozeId>`. Aynı çalmanın tüm
 *    girişleri — kaç saniye arayla gelirse gelsin — AYNI anahtarı üretir.
 * 2. Kayıt bir zamanlayıcıya değil ZAMAN DAMGASINA dayanır; `setTimeout`
 *    sızıntısı ve "timer temizlendi ama anahtar kaldı" durumu yok.
 * 3. Alarm ÇÖZÜMLENDİĞİNDE (alındı / atlandı / kapatıldı) kayıt AÇIKÇA
 *    serbest bırakılır (`releaseAlarmDedupFor`). Böylece kullanıcı 5 saniyelik
 *    test alarmını kapatıp hemen yeniden kurduğunda ikinci test SUSTURULMAZ.
 * 4. `INGRESS_WINDOW_MS` yalnızca bir emniyet supabı: uygulama serbest
 *    bırakmadan öldürülürse kayıt kendiliğinden eskir.
 *
 * NOT: `snoozeId` tuz olarak anahtara girer, çünkü erteleme alarmı ayrı bir
 * çalmadır ve ana alarmın anahtarını paylaşmamalıdır (bkz. AlarmReceiver
 * `buildNotificationId` içindeki aynı gerekçe).
 */

import { createScopedLogger } from '../logger';

const log = createScopedLogger('AlarmDedup');

/**
 * Bir kayıt, açıkça serbest bırakılmazsa ne kadar sonra kendiliğinden eskir.
 *
 * Tek bir çalmanın tüm girişleri saniyeler içinde gelir; 60 sn soğuk başlatmada
 * RN köprüsünün hazırlanmasını da rahatça kapsar. Uygulama "Şimdi Al"dan önce
 * öldürülürse kayıt bu süre sonunda düşer ve alarm yeniden açılabilir.
 */
export const INGRESS_WINDOW_MS = 60_000;

export interface AlarmDedupIdentity {
  medicineId: string;
  reminderTimeId: string;
  /** notifee/FCM yükü string taşır: `'true'` erteleme demektir. */
  isSnooze?: string | boolean | null;
  snoozeId?: string | null;
}

/** anahtar → ekranın açıldığı an (ms) */
const navigatedAt = new Map<string, number>();

function isSnoozeFlag(value: AlarmDedupIdentity['isSnooze']): boolean {
  return value === true || value === 'true';
}

/**
 * Bir çalmanın kimliği. Duvar saati İÇERMEZ — dosya başındaki gerekçe.
 */
export function buildAlarmDedupKey(identity: AlarmDedupIdentity): string {
  const kind = isSnoozeFlag(identity.isSnooze)
    ? `snooze:${identity.snoozeId || 'unknown'}`
    : 'main';
  return `${identity.medicineId}::${identity.reminderTimeId}::${kind}`;
}

/** Bu çalma için ekran zaten açıldı mı (pencere içinde)? */
export function isAlarmIngressDuplicate(key: string, now: number = Date.now()): boolean {
  const at = navigatedAt.get(key);
  if (at === undefined) return false;
  if (now - at >= INGRESS_WINDOW_MS) {
    navigatedAt.delete(key);
    return false;
  }
  return true;
}

/** Ekran bu çalma için açıldı: sonraki girişler yinelenmiş sayılacak. */
export function markAlarmIngressNavigated(key: string, now: number = Date.now()): void {
  navigatedAt.set(key, now);
  pruneExpired(now);
}

/**
 * Alarm çözümlendi (alındı / atlandı / kapatıldı): kaydı bırak.
 *
 * Bu ÇAĞRILMAZSA yalnızca `INGRESS_WINDOW_MS` sonunda düşer ve o süre içinde
 * kurulan YENİ bir çalma (özellikle 5 saniyelik test alarmı) susturulur.
 */
export function releaseAlarmDedupFor(identity: AlarmDedupIdentity): void {
  const key = buildAlarmDedupKey(identity);
  if (navigatedAt.delete(key)) {
    log.debug('Dedup kaydi serbest birakildi', { key });
  }
  // Kullanıcı ana alarm ekranından ertelemeyi kapatmış olabilir (ya da tersi):
  // aynı doza ait DİĞER türü de bırak, aksi halde bir sonraki çalma düşer.
  const otherKind = isSnoozeFlag(identity.isSnooze)
    ? buildAlarmDedupKey({ ...identity, isSnooze: 'false', snoozeId: null })
    : null;
  if (otherKind) navigatedAt.delete(otherKind);
}

function pruneExpired(now: number): void {
  for (const [key, at] of navigatedAt) {
    if (now - at >= INGRESS_WINDOW_MS) navigatedAt.delete(key);
  }
}

/** Yalnızca testler için. */
export function __resetAlarmDedupForTests(): void {
  navigatedAt.clear();
}

/** Yalnızca testler/teşhis için: o an tutulan anahtarlar. */
export function __getAlarmDedupKeysForTests(): string[] {
  return Array.from(navigatedAt.keys());
}
