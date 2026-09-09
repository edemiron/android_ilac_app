/* global __dirname */
/**
 * Paket kimligi ve Firebase projesi tutarliligi.
 *
 * Neden: arsiv gecmisinde paket adi bir kez `com.demirlabs.ilachatirlatici`'ye
 * tasinip geri alindi (v1.5.9 → v1.6.0) ve Firebase projesi de bir kez
 * degistirilip geri donuldu (v1.5.7 → v1.6.0). Bu tur bir gecis YARIM
 * kalirsa (ornegin build.gradle degisir ama google-services.json degismezse)
 * uygulama sessizce yanlis projeye baglanir veya FCM hic gelmez.
 *
 * Play Store'a cikildiktan sonra `applicationId` ASLA degistirilemez; bu test
 * yayin oncesi kilidin yerinde durdugunu garanti eder.
 */

import fs from 'fs';
import path from 'path';

const MOBILE_ROOT = path.join(__dirname, '..', '..', '..');
const read = (...segments: string[]) =>
  fs.readFileSync(path.join(MOBILE_ROOT, ...segments), 'utf8');
const readJson = (...segments: string[]) => JSON.parse(read(...segments));

const EXPECTED_PACKAGE = 'com.ilachatirlatici';
const RETIRED_PACKAGE = 'com.demirlabs.ilachatirlatici';

describe('paket kimligi', () => {
  it('build.gradle applicationId beklenen paket', () => {
    const gradle = read('android', 'app', 'build.gradle');
    const match = /applicationId\s*=?\s*['"]([^'"]+)['"]/.exec(gradle);

    expect(match?.[1]).toBe(EXPECTED_PACKAGE);
  });

  it('app.json android paketi ve iOS bundle id ayni', () => {
    const appJson = readJson('app.json');

    expect(appJson.expo.android.package).toBe(EXPECTED_PACKAGE);
    expect(appJson.expo.ios.bundleIdentifier).toBe(EXPECTED_PACKAGE);
  });

  it('native kaynak dizini paket adiyla uyusuyor', () => {
    const dirs = fs.readdirSync(
      path.join(MOBILE_ROOT, 'android', 'app', 'src', 'main', 'java', 'com')
    );

    expect(dirs).toContain(EXPECTED_PACKAGE.split('.')[1]);
  });

  it('terk edilmis paket adi hicbir yapilandirmada kalmadi', () => {
    const files: string[][] = [
      ['android', 'app', 'build.gradle'],
      ['app.json'],
      ['android', 'app', 'google-services.json'],
      ['android', 'app', 'src', 'main', 'AndroidManifest.xml'],
    ];

    for (const file of files) {
      expect(read(...file)).not.toContain(RETIRED_PACKAGE);
    }
  });
});

describe('Firebase projesi', () => {
  it('google-services.json paketi uygulamayla ayni', () => {
    const gs = readJson('android', 'app', 'google-services.json');
    const packages = (gs.client ?? []).map(
      (c: { client_info?: { android_client_info?: { package_name?: string } } }) =>
        c.client_info?.android_client_info?.package_name
    );

    expect(packages).toContain(EXPECTED_PACKAGE);
  });

  it('app.json Firebase yapilandirmasi google-services.json ile ayni projeyi gosteriyor', () => {
    const appJson = readJson('app.json');
    const gs = readJson('android', 'app', 'google-services.json');
    const extra = appJson.expo.extra.firebase;

    expect(extra.projectId).toBe(gs.project_info.project_id);
    expect(extra.messagingSenderId).toBe(gs.project_info.project_number);
    expect(extra.appId).toBe(gs.client[0].client_info.mobilesdk_app_id);
  });
});
