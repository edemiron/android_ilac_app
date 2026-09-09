/* global __dirname */
/**
 * Surum bilgisinin TEK KAYNAGI `src/config/version.ts`; `npm run sync-version`
 * onu app.json / package.json / build.gradle'a yayar.
 *
 * v1.7.1 oncesi durum: build.gradle 1.7.1/49 ile store'a gidiyordu ama
 * version.ts 1.6.0/37'de takiliydi ve Ayarlar ekrani `APP_VERSION` okudugu
 * icin kullaniciya 1.6.0 gosteriyordu. Ayrica `expo.android.versionCode`
 * 45'te kalmisti cunku script yalnizca kok seviyedeki alani guncelliyordu.
 * Bu test o ayrismayi bir daha sessizce olmasin diye sabitler.
 */

import fs from 'fs';
import path from 'path';

import { APP_VERSION, ANDROID_VERSION_CODE, IOS_BUILD_NUMBER } from '../../config/version';

const MOBILE_ROOT = path.join(__dirname, '..', '..', '..');
const read = (...segments: string[]) =>
  fs.readFileSync(path.join(MOBILE_ROOT, ...segments), 'utf8');
const readJson = (...segments: string[]) => JSON.parse(read(...segments));

describe('surum tutarliligi', () => {
  it('APP_VERSION semantic versioning bicimindedir', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('android versionCode ile iOS buildNumber ayni sayiyi gosterir', () => {
    expect(String(ANDROID_VERSION_CODE)).toBe(IOS_BUILD_NUMBER);
  });

  it('package.json version.ts ile ayni', () => {
    expect(readJson('package.json').version).toBe(APP_VERSION);
  });

  it('app.json (expo + kok) version.ts ile ayni', () => {
    const appJson = readJson('app.json');

    expect(appJson.expo.version).toBe(APP_VERSION);
    expect(appJson.version).toBe(APP_VERSION);
    // Expo'nun gercekten okudugu alan
    expect(appJson.expo.android.versionCode).toBe(ANDROID_VERSION_CODE);
    expect(appJson.expo.ios.buildNumber).toBe(IOS_BUILD_NUMBER);
    // Kok seviyedeki kopyalar
    expect(appJson.android.versionCode).toBe(ANDROID_VERSION_CODE);
    expect(appJson.ios.buildNumber).toBe(IOS_BUILD_NUMBER);
  });

  it('build.gradle version.ts ile ayni (store surumu budur)', () => {
    const gradle = read('android', 'app', 'build.gradle');

    const name = /versionName\s*=?\s*"([^"]+)"/.exec(gradle);
    const code = /versionCode\s*=?\s*(\d+)/.exec(gradle);

    expect(name?.[1]).toBe(APP_VERSION);
    expect(Number(code?.[1])).toBe(ANDROID_VERSION_CODE);
  });

  it('sync-version script build.gradle dosyasini da kapsiyor', () => {
    const script = read('scripts', 'sync-version.js');

    expect(script).toContain('build.gradle');
    expect(script).toContain('updateBuildGradle');
    expect(script).toContain('expo.android');
  });
});
