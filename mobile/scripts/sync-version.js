/**
 * Versiyon Senkronizasyon Script'i
 *
 * Bu script src/config/version.ts dosyasındaki versiyon bilgisini
 * app.config.json ve package.json dosyalarına senkronize eder.
 *
 * NOT: Hedef app.config.json'dur, app.json DEĞİL. @expo/config dosyaları
 * ['app.config.json', 'app.json'] sırasıyla arar; app.config.json varken
 * app.json hiç okunmaz. Script eskiden app.json'u güncelliyordu, yani
 * etkin config'e hiç dokunmuyordu.
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
const appConfigPath = path.join(rootDir, 'app.config.json');
const packageJsonPath = path.join(rootDir, 'package.json');

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
 * app.config.json dosyasını günceller.
 *
 * Alanlar expo.* altına yazılır. Eski sürüm bunları kök seviyeye
 * (appJson.android.versionCode / appJson.version) yazıyordu; Expo oraya
 * bakmadığı için versionCode senkronizasyonu hiç çalışmıyordu.
 */
function updateAppConfig(versionInfo) {
  if (!fs.existsSync(appConfigPath)) {
    throw new Error('app.config.json bulunamadı!');
  }

  const content = fs.readFileSync(appConfigPath, 'utf-8');
  const appConfig = JSON.parse(content);

  if (!appConfig.expo) {
    throw new Error('app.config.json içinde "expo" anahtarı yok!');
  }

  appConfig.expo.version = versionInfo.version;

  if (!appConfig.expo.android) {
    appConfig.expo.android = {};
  }
  appConfig.expo.android.versionCode = versionInfo.androidCode;

  if (!appConfig.expo.ios) {
    appConfig.expo.ios = {};
  }
  appConfig.expo.ios.buildNumber = versionInfo.iosBuild;

  fs.writeFileSync(appConfigPath, JSON.stringify(appConfig, null, 2) + '\n');
  console.log(
    `✅ app.config.json güncellendi: ${versionInfo.version} (versionCode ${versionInfo.androidCode})`
  );
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
 * Ana fonksiyon
 */
function main() {
  try {
    console.log('🔄 Versiyon senkronizasyonu başlıyor...\n');

    const versionInfo = readVersionFromConfig();
    console.log(`📦 Versiyon: ${versionInfo.version}`);
    console.log(`🤖 Android Code: ${versionInfo.androidCode}`);
    console.log(`🍎 iOS Build: ${versionInfo.iosBuild}\n`);

    updateAppConfig(versionInfo);
    updatePackageJson(versionInfo);

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
