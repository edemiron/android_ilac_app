/* global __dirname */
/**
 * Google Sign-In client ID'lerinin Firebase projesiyle AYNI projeye ait
 * olduğunu doğrular.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NİYE BU TEST VAR — v1.8.6
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `authService.ts` içinde elle yazılmış bir varsayılan vardı:
 *
 *     const DEFAULT_GOOGLE_WEB_CLIENT_ID =
 *       '708668760763-2ta9pf3rrtn8cg7ihf16tsct42e06mq6.apps.googleusercontent.com';
 *
 * Baştaki sayı GCP **proje numarasıdır**. Bu uygulamanın Firebase projesi
 * ise `506876057044` (`google-services.json` → `project_info.project_number`).
 * Yani varsayılan **başka bir Google Cloud projesine** aitti.
 *
 * Zinciri: `GoogleSignin` o client ID ile bir ID token alır → token'ın `aud`
 * alanı yabancı projeyi gösterir → `signInWithCredential` token'ı
 * `506876057044` projesine sunar → Firebase audience uyuşmazlığı nedeniyle
 * **reddeder**. "Google ile devam et" hiçbir zaman çalışmamış olmalı.
 *
 * Kullanılmadığı da varsayılamazdı: değer `Config.GOOGLE_WEB_CLIENT_ID ||
 * DEFAULT` şeklinde okunuyordu ve `react-native-config`in okuduğu
 * `mobile/.env` dosyası boştu (dosya var, içinde tek `KEY=value` satırı yok).
 *
 * Bu test, doğru değerin iki dosya arasında ayrışmasını engelliyor. Aynı
 * desen `packageIdentity.test.ts`te de var: native/gradle kaynaklarını
 * okuyup JS sabitleriyle karşılaştırmak — bu projenin en değerli test
 * alışkanlığı.
 */

import fs from 'fs';
import path from 'path';

const MOBILE_ROOT = path.join(__dirname, '..', '..', '..');

const readJson = (...segments: string[]) =>
  JSON.parse(fs.readFileSync(path.join(MOBILE_ROOT, ...segments), 'utf8'));

/** Google'in `client_type` kodlari. */
const CLIENT_TYPE_ANDROID = 1;
const CLIENT_TYPE_WEB = 3;

interface OAuthClient {
  client_id: string;
  client_type: number;
}

function googleServices() {
  return readJson('android', 'app', 'google-services.json');
}

function projectNumber(): string {
  return String(googleServices().project_info.project_number);
}

function oauthClients(): OAuthClient[] {
  const client = googleServices().client[0];
  const list: OAuthClient[] = [...(client.oauth_client || [])];

  const otherPlatform = client.services?.appinvite_service?.other_platform_oauth_client || [];
  list.push(...otherPlatform);

  return list;
}

describe('Google Sign-In client ID tutarliligi', () => {
  it('google-services.json bir WEB client ID tasiyor', () => {
    // Bu iddia olmadan asagidaki testler bos gecebilir.
    const web = oauthClients().filter(c => c.client_type === CLIENT_TYPE_WEB);

    expect(web.length).toBeGreaterThan(0);
  });

  it('app.json webClientId, google-services.json WEB client ID ile AYNI', () => {
    const appJson = readJson('app.json');
    const configured = appJson.expo.extra.google.webClientId;
    const webClients = oauthClients()
      .filter(c => c.client_type === CLIENT_TYPE_WEB)
      .map(c => c.client_id);

    expect(webClients).toContain(configured);
  });

  it('app.json webClientId Firebase PROJESIYLE ayni projeye ait', () => {
    // Kusurun ta kendisi buydu: client ID baska bir GCP projesine aitti ve
    // Firebase audience uyusmazligi yuzunden girisi reddediyordu.
    const appJson = readJson('app.json');
    const configured: string = appJson.expo.extra.google.webClientId;

    expect(configured.split('-')[0]).toBe(projectNumber());
  });

  it('app.json androidClientId de ayni projeye ait', () => {
    const appJson = readJson('app.json');
    const configured: string | undefined = appJson.expo.extra.google.androidClientId;

    if (!configured) return; // tanimli degilse iddia yok

    expect(configured.split('-')[0]).toBe(projectNumber());
  });

  it('authService.ts icinde YABANCI projeye ait bir client ID SABITI yok', () => {
    // Elle yazilmis client ID sabitleri bu hatanin kaynagiydi. Kod artik
    // degeri app.json'dan okuyor; bu iddia sabitin geri gelmesini
    // engelliyor.
    const source = fs.readFileSync(
      path.join(MOBILE_ROOT, 'src', 'services', 'authService.ts'),
      'utf8'
    );
    const codeOnly = source
      .split(/\r?\n/)
      .filter(line => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join('\n');

    const clientIds = codeOnly.match(/\d{10,}-[a-z0-9]+\.apps\.googleusercontent\.com/g) || [];
    const foreign = clientIds.filter(id => id.split('-')[0] !== projectNumber());

    expect(foreign).toEqual([]);
  });

  it('bilinen YANLIS client ID kod tabaninin hicbir yerinde kalmadi', () => {
    const RETIRED = '708668760763';
    const roots = ['src', 'app.json', 'index.ts'];
    const offenders: string[] = [];

    const scan = (target: string) => {
      const full = path.join(MOBILE_ROOT, target);
      if (!fs.existsSync(full)) return;

      if (fs.statSync(full).isDirectory()) {
        // Test dosyalari HARIC: bu testin kendisi yanlis kimligi bir sabit
        // olarak tasiyor (aradigi sey o) ve kendini yakalayip her zaman
        // kirmizi kalirdi.
        if (path.basename(full) === '__tests__') return;
        for (const entry of fs.readdirSync(full)) {
          scan(path.join(target, entry));
        }
        return;
      }

      if (!/\.(ts|tsx|json)$/.test(full)) return;

      const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
      lines.forEach((line, index) => {
        // Yorumlar kusuru ANLATIYOR; yalnizca kod sayiliyor.
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        if (line.includes(RETIRED)) {
          offenders.push(`${target}:${index + 1}`);
        }
      });
    };

    roots.forEach(scan);

    expect(offenders).toEqual([]);
  });
});
