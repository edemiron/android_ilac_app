/**
 * Versiyon Senkronizasyon Script'i
 *
 * Bu script src/config/version.ts dosyasındaki versiyon bilgisini
 * app.json ve package.json dosyalarına senkronize eder.
 *
 * Kullanım:
 *   node scripts/sync-version.js
 *   npm run sync-version
 */

const fs = require('fs');
const path = require('path');

// Dosya yolları
const rootDir = path.join(__dirname, '..');
const versionConfigPath = path.join(rootDir, 'src/config/version.ts');
const appJsonPath = path.join(rootDir, 'app.json');
const packageJsonPath = path.join(rootDir, 'package.json');
// v1.7.1: build.gradle bu script'in kapsaminda DEGILDI; sonuc olarak store'a
// giden versiyon (build.gradle 1.7.1/49) ile uygulama icinde gosterilen
// versiyon (version.ts 1.6.0) ayristi. Artik burasi da senkronize ediliyor.
const buildGradlePath = path.join(rootDir, 'android/app/build.gradle');

/**
 * version.ts dosyasından versiyon bilgisini okur
 */
function readVersionFromConfig() {
  if (!fs.existsSync(versionConfigPath)) {
    throw new Error('version.ts dosyası bulunamadı!');
  }

  const content = fs.readFileSync(versionConfigPath, 'utf-8');

  // Regex ile versiyon bilgilerini çıkar
  const appVersionMatch = content.match(/export const APP_VERSION = '([^']+)'/);
  const androidCodeMatch = content.match(/export const ANDROID_VERSION_CODE = (\d+)/);
  const iosBuildMatch = content.match(/export const IOS_BUILD_NUMBER = '([^']+)'/);

  if (!appVersionMatch) {
    throw new Error('APP_VERSION bulunamadı!');
  }

  return {
    version: appVersionMatch[1],
    androidCode: androidCodeMatch ? parseInt(androidCodeMatch[1], 10) : 1,
    iosBuild: iosBuildMatch ? iosBuildMatch[1] : '1',
  };
}

/**
 * app.json dosyasını günceller
 */
function updateAppJson(versionInfo) {
  if (!fs.existsSync(appJsonPath)) {
    throw new Error('app.json bulunamadı!');
  }

  const content = fs.readFileSync(appJsonPath, 'utf-8');
  const appJson = JSON.parse(content);

  // Expo version
  appJson.expo.version = versionInfo.version;

  // v1.7.1: Expo'nun GERCEKTEN okudugu alanlar `expo.android.versionCode` ve
  // `expo.ios.buildNumber`. Eskiden yalnizca kok seviyedeki `android`/`ios`
  // guncelleniyordu, bu yuzden `expo.android.versionCode` 45'te takili kalmisti.
  if (!appJson.expo.android) {
    appJson.expo.android = {};
  }
  appJson.expo.android.versionCode = versionInfo.androidCode;

  if (!appJson.expo.ios) {
    appJson.expo.ios = {};
  }
  appJson.expo.ios.buildNumber = versionInfo.iosBuild;

  // Kok seviyedeki kopyalar (bazi tool'lar bunlari okuyor)
  if (!appJson.android) {
    appJson.android = {};
  }
  appJson.android.versionCode = versionInfo.androidCode;

  if (!appJson.ios) {
    appJson.ios = {};
  }
  appJson.ios.buildNumber = versionInfo.iosBuild;

  // Root version (bazı tool'lar bunu kullanır)
  appJson.version = versionInfo.version;

  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
  console.log(`✅ app.json güncellendi: ${versionInfo.version}`);
}

/**
 * package.json dosyasını günceller
 */
function updatePackageJson(versionInfo) {
  if (!fs.existsSync(packageJsonPath)) {
    console.warn('⚠️ package.json bulunamadı, atlanıyor...');
    return;
  }

  const content = fs.readFileSync(packageJsonPath, 'utf-8');
  const packageJson = JSON.parse(content);

  packageJson.version = versionInfo.version;

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`✅ package.json güncellendi: ${versionInfo.version}`);
}

/**
 * android/app/build.gradle dosyasını günceller.
 *
 * Gradle tarafında JSON/TS okumaya çalışmak daha önce sorun çıkardığı için
 * (bkz. arşiv: v1.4.7 build-gradle-jsonslurper) dosya build zamanında
 * ayrıştırılmıyor; bunun yerine bu script metni yerinde değiştiriyor.
 */
function updateBuildGradle(versionInfo) {
  if (!fs.existsSync(buildGradlePath)) {
    console.warn('⚠️ build.gradle bulunamadı, atlanıyor...');
    return;
  }

  const content = fs.readFileSync(buildGradlePath, 'utf-8');

  // Bu projede Groovy dosyasinda atama sozdizimi kullaniliyor:
  //   versionCode = 49
  //   versionName = "1.7.1"
  // Bosluklu klasik sozdizimi (`versionName "1.7.1"`) de desteklenir.
  const nameRe = /(versionName\s*=?\s*")([^"]+)(")/;
  const codeRe = /(versionCode\s*=?\s*)(\d+)/;

  if (!nameRe.test(content) || !codeRe.test(content)) {
    throw new Error('build.gradle içinde versionName/versionCode bulunamadı!');
  }

  const updated = content
    .replace(nameRe, `$1${versionInfo.version}$3`)
    .replace(codeRe, `$1${versionInfo.androidCode}`);

  fs.writeFileSync(buildGradlePath, updated);
  console.log(
    `✅ build.gradle güncellendi: ${versionInfo.version} (${versionInfo.androidCode})`
  );
}

/**
 * Ana fonksiyon
 */
function main() {
  try {
    console.log('🔄 Versiyon senkronizasyonu başlıyor...\n');

    const versionInfo = readVersionFromConfig();
    console.log(`📦 Versiyon: ${versionInfo.version}`);
    console.log(`🤖 Android Code: ${versionInfo.androidCode}`);
    console.log(`🍎 iOS Build: ${versionInfo.iosBuild}\n`);

    updateAppJson(versionInfo);
    updatePackageJson(versionInfo);
    updateBuildGradle(versionInfo);

    console.log('\n✨ Tüm versiyon bilgileri senkronize edildi!');
    console.log('💡 İpucu: Versiyon değiştirmek için src/config/version.ts dosyasını düzenleyin.\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

// Çalıştır
main();
