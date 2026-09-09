/* global __dirname */
/**
 * Expo yapilandirmasinin TEK kaynagi: app.json
 *
 * Neden bu test var:
 * v1.8.1'e kadar depoda hem `app.json` (guncel) hem `app.config.json` (1.6.0'da
 * donmus bir kopya) vardi. Expo'nun cozumleme sirasi `app.config.*` dosyasini
 * `app.json`'in ONUNE koyar; yani `npx expo config` ve build sirasinda
 * expo-constants'in gomdugu yapilandirma AYLARDIR 1.6.0 / versionCode 37
 * degerlerini ve `REPLACE_WITH_ENV_FUNCTIONS_BASE_URL` gibi doldurulmamis
 * placeholder'lari tasiyordu. `scripts/sync-version.js` bu dosyayi hic
 * bilmedigi icin her versiyon yukseltmesi sessizce yarim kaliyordu.
 *
 * Ayni sinif hata bir kez daha yasandi (bkz. arsiv v1.7.1: build.gradle
 * sync kapsaminda degildi). Bu yuzden artik kod yerine test bekciligi yapiyor:
 * ikinci bir Expo yapilandirma dosyasi eklenirse veya versiyon alanlari
 * ayrisirsa suite kirmizi olur.
 */

import fs from 'fs';
import path from 'path';

import { APP_VERSION, ANDROID_VERSION_CODE, IOS_BUILD_NUMBER } from '../../config/version';

const MOBILE_ROOT = path.join(__dirname, '..', '..', '..');

// Expo'nun app.json'dan ONCE okudugu dosya adlari (cozumleme sirasi).
const SHADOWING_CONFIG_FILES = [
  'app.config.ts',
  'app.config.js',
  'app.config.mjs',
  'app.config.json',
];

const readJson = (...segments: string[]) =>
  JSON.parse(fs.readFileSync(path.join(MOBILE_ROOT, ...segments), 'utf8'));

describe('Expo yapilandirmasi tek kaynak', () => {
  it('app.json disinda app.config.* dosyasi yok', () => {
    const found = SHADOWING_CONFIG_FILES.filter(name =>
      fs.existsSync(path.join(MOBILE_ROOT, name))
    );

    // Bulunursa: dosyayi silin ya da app.json'i silip TEK kaynak olarak onu
    // kullanin. Ikisini birlikte tutmak "hangisi gecerli" sorusunu dogurur ve
    // sync-version.js yalnizca app.json'i gunceller.
    expect(found).toEqual([]);
  });

  it('app.json versiyon alanlari version.ts ile ayni', () => {
    const appJson = readJson('app.json');

    expect(appJson.expo.version).toBe(APP_VERSION);
    expect(appJson.version).toBe(APP_VERSION);
    expect(appJson.expo.android.versionCode).toBe(ANDROID_VERSION_CODE);
    expect(appJson.android.versionCode).toBe(ANDROID_VERSION_CODE);
    expect(appJson.expo.ios.buildNumber).toBe(IOS_BUILD_NUMBER);
    expect(appJson.ios.buildNumber).toBe(IOS_BUILD_NUMBER);
  });

  it('build.gradle versiyonu version.ts ile ayni', () => {
    const gradle = fs.readFileSync(
      path.join(MOBILE_ROOT, 'android', 'app', 'build.gradle'),
      'utf8'
    );

    expect(/versionName\s*=?\s*"([^"]+)"/.exec(gradle)?.[1]).toBe(APP_VERSION);
    expect(Number(/versionCode\s*=?\s*(\d+)/.exec(gradle)?.[1])).toBe(ANDROID_VERSION_CODE);
  });

  it('app.json plugin listesindeki her paket gercekten kurulu', () => {
    const appJson = readJson('app.json');
    const pkg = readJson('package.json');
    const installed = new Set([
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
    ]);

    const missing = (appJson.expo.plugins || [])
      .map((entry: unknown) => (Array.isArray(entry) ? entry[0] : entry))
      .filter((name: unknown): name is string => typeof name === 'string')
      // './plugins/foo.js' gibi yerel plugin'ler paket degil, atlanir.
      .filter((name: string) => !name.startsWith('.') && !name.startsWith('/'))
      .filter((name: string) => !installed.has(name));

    // Kurulu olmayan bir plugin adi `npx expo config`'i patlatir. Bu komut
    // build sirasinda expo-constants tarafindan cagrildigi icin sonuc
    // "derlenmeyen uygulama"dir; bu yuzden lint degil test seviyesinde kapi.
    expect(missing).toEqual([]);
  });

  it('newArchEnabled app.json ile gradle.properties arasinda ayrismiyor', () => {
    const appJson = readJson('app.json');
    const props = fs.readFileSync(path.join(MOBILE_ROOT, 'android', 'gradle.properties'), 'utf8');
    const gradleValue = /^newArchEnabled\s*=\s*(\S+)/m.exec(props)?.[1];

    // Native build'i belirleyen deger gradle.properties'tir (BuildConfig.
    // IS_NEW_ARCHITECTURE_ENABLED oradan gelir). app.json yalnizca `prebuild`
    // sirasinda okunur — ikisi celisirse bir gun prebuild calistiran kisi
    // mimariyi sessizce ters cevirir.
    expect(String(appJson.expo.newArchEnabled)).toBe(gradleValue);
  });
});
