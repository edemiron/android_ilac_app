/**
 * UCES: Version Sync Script
 * Build.gradle versionName/versionCode → app.json
 * Run: node scripts/sync-version.js
 */

const fs = require('fs');
const path = require('path');

const ANDROID_DIR = path.join(__dirname, '..', 'android');
const APP_JSON_PATH = path.join(__dirname, '..', 'app.json');

function readBuildGradleVersion() {
  const buildGradlePath = path.join(ANDROID_DIR, 'app', 'build.gradle');
  
  if (!fs.existsSync(buildGradlePath)) {
    console.warn('⚠️ build.gradle not found, skipping sync');
    return null;
  }
  
  const content = fs.readFileSync(buildGradlePath, 'utf8');
  
  const versionNameMatch = content.match(/versionName\s+"([^"]+)"/);
  const versionCodeMatch = content.match(/versionCode\s+(\d+)/);
  
  if (versionNameMatch && versionCodeMatch) {
    return {
      versionName: versionNameMatch[1],
      versionCode: parseInt(versionCodeMatch[1], 10),
    };
  }
  
  return null;
}

function updateAppJson(version) {
  if (!fs.existsSync(APP_JSON_PATH)) {
    console.error('❌ app.json not found!');
    return false;
  }
  
  const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
  
  // Update version
  appJson.version = version.versionName;
  
  // Update Android versionCode
  if (!appJson.android) appJson.android = {};
  appJson.android.versionCode = version.versionCode;
  
  // Update iOS buildNumber
  if (!appJson.ios) appJson.ios = {};
  appJson.ios.buildNumber = String(version.versionCode);
  
  fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2));
  
  console.log(`✅ Version synced: ${version.versionName} (${version.versionCode})`);
  return true;
}

function main() {
  console.log('🔄 Syncing version from build.gradle to app.json...\n');
  
  const version = readBuildGradleVersion();
  
  if (!version) {
    console.error('❌ Could not read version from build.gradle');
    process.exit(1);
  }
  
  console.log(`📱 Android version: ${version.versionName} (${version.versionCode})`);
  
  if (updateAppJson(version)) {
    console.log('\n✨ Sync complete!');
    process.exit(0);
  } else {
    console.error('\n❌ Sync failed!');
    process.exit(1);
  }
}

main();
