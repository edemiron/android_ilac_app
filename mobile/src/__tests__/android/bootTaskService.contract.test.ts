/**
 * BootTaskService — shortService SÜRE sözleşmesi (YENİ-3 / Y4)
 *
 * ── Neden bu test var ──────────────────────────────────────────────────────
 * `BootTaskService`, reboot / saat dilimi değişikliği / uygulama güncellemesi
 * SONRASI alarmları yeniden kaydeden JS yolunun taşıyıcısı. Doz alarmlarının
 * son savunma hattı olduğu için burada bir ANR veya erken ölüm = hastanın
 * alarmlarının sessizce kaybolması.
 *
 * Android 14+ `foregroundServiceType="shortService"` sözleşmesi:
 *   - 3 dakikalık (180 s) saat `Service.startForeground()` çağrısından, yani
 *     `onCreate`'ten itibaren işler.
 *   - Süre aşılırsa sistem `Service.onTimeout()` çağırır; servis
 *     `stopSelf()`/`stopForeground()` ile durdurulMAZsa uygulama cached
 *     duruma düşer ve **ANR** alır — uygulamanın başka geçerli foreground
 *     servisi olsa bile.
 *
 * Kusur: `getTaskConfig` 180000 ms veriyordu — shortService tavanına TAM EŞİT.
 * Üstelik görev saati `onCreate`'teki `startForeground`'dan DAHA GEÇ
 * başladığı için tavan her zaman görevden ÖNCE doluyordu. Görev bütçesinin
 * tamamını kullanan bir cihazda ANR kaçınılmazdı.
 *
 * ── Neden kaynak-tarama kapısı ─────────────────────────────────────────────
 * Kotlin tarafı jest ile çalıştırılamıyor (Gradle + cihaz/emülatör gerekir;
 * bu makinede Java 1.8 var, Android emülatörü Java 11+ ister). Bu yüzden
 * sayısal invariantlar ve yapısal gereklilikler kaynak üzerinden kilitleniyor
 * — `firestoreRules.contract.test.ts` ve `a11y.test.ts` ile aynı desen.
 *
 * ⚠️ DÜRÜST SINIR: bu test Kotlin'in DERLENDİĞİNİ veya çalışma anı
 * davranışını kanıtlamaz. Yalnızca birinin süreleri geri bozmasını veya
 * emniyet supabını silmesini engeller. Gerçek doğrulama için cihazda
 * `adb shell am broadcast -a android.intent.action.BOOT_COMPLETED` senaryosu
 * ve logcat gerekir.
 */

/* global __dirname */
import fs from 'fs';
import path from 'path';

const SERVICE_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'android',
  'app',
  'src',
  'main',
  'java',
  'com',
  'ilachatirlatici',
  'BootTaskService.kt'
);
const MANIFEST_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'android',
  'app',
  'src',
  'main',
  'AndroidManifest.xml'
);

const service = fs.readFileSync(SERVICE_PATH, 'utf8');
const manifest = fs.readFileSync(MANIFEST_PATH, 'utf8');

/** Yorumları atar — kusuru ANLATAN yorumlar kusur sanılmasın. */
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const code = stripComments(service);

/** `private const val NAME = 123_456L` biçimindeki sabiti ms olarak çözer. */
const constMs = (name: string): number => {
  const m = new RegExp(`private\\s+const\\s+val\\s+${name}\\s*=\\s*([0-9_]+)L?`).exec(code);
  expect(m).not.toBeNull();
  return Number((m as RegExpExecArray)[1].replace(/_/g, ''));
};

describe('BootTaskService — shortService süre sözleşmesi', () => {
  const taskTimeout = constMs('TASK_TIMEOUT_MS');
  const hardStop = constMs('HARD_STOP_MS');
  const shortServiceLimit = constMs('SHORT_SERVICE_LIMIT_MS');

  it('shortService tavanı Android sözleşmesiyle uyumlu (180 s)', () => {
    // Doküman: 3 dakika. Bu değeri değiştirmek Android sürümüne göre
    // güncellenmesi gereken bilinçli bir karar olmalı, kazara değil.
    expect(shortServiceLimit).toBe(180_000);
  });

  it('⚠️ görev bütçesi shortService tavanından KESİN biçimde düşük', () => {
    // Kusurun özü: eski değer 180000 == tavan. Eşitlik bile YETMEZ, çünkü
    // görev saati onCreate'teki startForeground'dan daha geç başlar.
    expect(taskTimeout).toBeLessThan(shortServiceLimit);
  });

  it('⚠️ görev bütçesi ile tavan arasında en az 30 s marj var', () => {
    // Marj, görev saatinin startForeground'dan daha geç başlamasını ve
    // onHeadlessJsTaskFinish'in çalışması için gereken süreyi karşılamalı.
    expect(shortServiceLimit - taskTimeout).toBeGreaterThanOrEqual(30_000);
  });

  it('⚠️ emniyet supabı görev bütçesinden SONRA, tavandan ÖNCE tetikleniyor', () => {
    // Sıralama: taskTimeout < hardStop < shortServiceLimit
    // hardStop, RN'in görev-zaman-aşımı yolunun onHeadlessJsTaskFinish'i
    // çağırıp çağırmadığından BAĞIMSIZ olarak servisi tavandan önce durdurur.
    expect(hardStop).toBeGreaterThan(taskTimeout);
    expect(hardStop).toBeLessThan(shortServiceLimit);
  });

  it('emniyet supabı gerçekten zamanlanıyor (postDelayed)', () => {
    expect(code).toMatch(/postDelayed\(\s*hardStopRunnable\s*,\s*HARD_STOP_MS\s*\)/);
  });

  it('servis tek bir idempotent kapanış yolundan geçiyor', () => {
    // Hem onHeadlessJsTaskFinish hem hardStopRunnable shutdown()'ı çağırıyor;
    // isShutDown bayrağı çift stopSelf / yarış durumunu engelliyor.
    expect(code).toMatch(/private fun shutdown\(/);
    expect(code).toMatch(/if \(isShutDown\)/);
    expect(code).toMatch(/shutdown\("taskFinish"\)/);
    expect(code).toMatch(/shutdown\("hardStop"\)/);
  });

  it('emniyet supabı onDestroy\'da geri alınıyor (main looper sızıntısı yok)', () => {
    const onDestroy = /override fun onDestroy\(\)[\s\S]*?super\.onDestroy\(\)/.exec(code);
    expect(onDestroy).not.toBeNull();
    expect(onDestroy?.[0]).toMatch(/removeCallbacks\(\s*hardStopRunnable\s*\)/);
  });

  it('getTaskConfig sabiti kullanıyor, ham 180000 literali YOK', () => {
    // Birinin doğrudan `180000,` yazıp invariantı bypass etmesini engeller.
    expect(code).toMatch(/TASK_TIMEOUT_MS,/);
    expect(code).not.toMatch(/\b180000\b/);
  });
});

describe('BootTaskService — manifest sözleşmesi', () => {
  it('servis shortService olarak deklare edilmiş', () => {
    expect(manifest).toMatch(
      /<service[^>]*\.BootTaskService[^>]*android:foregroundServiceType="shortService"/
    );
  });

  it('temel FOREGROUND_SERVICE izni bildirilmiş', () => {
    // Resmî Android 14 dokümanına göre shortService için alt-tip izni
    // GEREKMİYOR (manifest'te bildirilecek izin: "None"); temel
    // FOREGROUND_SERVICE yeterli. Yani burada bir eksik YOK — bu assert
    // "FOREGROUND_SERVICE_SHORT_SERVICE eksik" yönündeki hatalı denetim
    // iddiasının tekrar gündeme gelmesini engellemek için var.
    expect(manifest).toMatch(/<uses-permission android:name="android\.permission\.FOREGROUND_SERVICE"\s*\/>/);
  });

  it('servis exported değil', () => {
    const m = /<service[^>]*\.BootTaskService[^>]*>/.exec(manifest);
    expect(m).not.toBeNull();
    expect(m?.[0]).toMatch(/android:exported="false"/);
  });
});
