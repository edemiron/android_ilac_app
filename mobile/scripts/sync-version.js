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

  // Android versionCode
  if (!appJson.android) {
    appJson.android = {};
  }
  appJson.android.versionCode = versionInfo.androidCode;

  // iOS buildNumber
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
