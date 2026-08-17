#!/usr/bin/env node
/**
 * src/services altinda hicbir yerden CAGRILMAYAN export'lari bulur.
 *
 * NEDEN?
 * Bu kod tabaninda tekrar tekrar ayni desen cikti: tam yazilmis ama hicbir
 * yere baglanmamis kod. Ornekler:
 *
 *   markMissedReminders  -> uyum orani sistematik olarak sisiyordu
 *   updateTITCKCache     -> TITCK onbellegi DAIMA bos; ilac aramasinin iki
 *                           kaynagindan biri hic calismadi
 *   widget "Aldim"       -> dinleyicisi olmayan broadcast yayinliyordu
 *
 * Hicbiri tsc, eslint veya testlerle yakalanmiyor: kod gecerli, tipler
 * dogru, testler kendi icinde geciyor. Eksik olan tek sey CAGRI.
 *
 * ts-prune benzer is yapar ama "kullanilmayan export" ile "cagrilmayan
 * fonksiyon" ayni sey degil: barrel'dan re-export edilen ya da yalnizca tip
 * olarak kullanilan seyleri farkli degerlendirir. Bu script cagri odaklidir.
 *
 * ---------------------------------------------------------------------------
 * DIKKAT — BU SCRIPT'I DEGISTIRIRKEN OKU
 * Fonksiyonlar TANIMLANDIKLARI DOSYANIN ICINDEN de cagrilabilir
 * (firestoreSync.uploadAllData -> syncMedicinesToCloud). Tanim dosyasini
 * taramadan cikarmak bu cagrilari gizler ve saglam kodu "olu" gosterir.
 * Ilk denemede tam bu hata yapildi ve 20+ yanlis pozitif uretti.
 * Bu yuzden TUM dosyalar taranir, yalnizca TANIM SATIRLARI atlanir.
 * ---------------------------------------------------------------------------
 *
 * Kullanim:  node scripts/check-unwired-exports.js
 * Cikis 1 ise allowlist'te olmayan baglanmamis export var.
 */

const fs = require('fs');
const path = require('path');

const SCAN_DIR = path.join('src', 'services');
const EXTRA_ENTRY_POINTS = ['App.tsx', 'index.ts'];

/**
 * Bilerek cagrilmayan export'lar. Her kayit GEREKCE ister — aksi halde bu
 * liste hatalarin saklandigi yere doner.
 */
/**
 * ALLOWLIST, bu kontrolun devreye alindigi andaki KABUL EDILMIS BIRIKIMDIR.
 * Amaci bugunu temize cikarmak degil; yeni baglanmamis kodun EKLENMESINI
 * engellemek. Listedeki her kaydin gerekcesi var ve her biri ayri bir karar
 * bekliyor — tamami "sorun yok" demek degildir.
 */
const ALLOWLIST = new Map([
  // === KIRIK OZELLIK — karar bekliyor =======================================
  // searchTITCKCache AsyncStorage'dan okur; o anahtari yazan TEK fonksiyon
  // budur ve cagrilmiyor. Yani TITCK onbellegi DAIMA bos ve orkestratorun iki
  // kaynagindan biri ('titck_cache', guven 90) hic veri dondurmedi.
  // Cozum bir cevrimdisi ayna tasarimi gerektiriyor (~10 bin kayit; depolama
  // ve bant genisligi karari).
  ['updateTITCKCache', 'KIRIK: TITCK onbellegi hic dolmuyor — cevrimdisi ayna karari gerekiyor'],

  // === BITMEMIS: bakici bildirimleri ========================================
  // FCM gonderimi Cloud Function gerektiriyor, o da Blaze plani; proje Spark'ta.
  // Bu kume o backend gelene kadar baglanamaz.
  ['setupCaregiverNotifications', 'FCM kurulum; Cloud Function bekliyor (billing kapali)'],
  ['setupCaregiverMessageListener', 'FCM dinleyici; ayni engel'],
  ['getStoredFcmToken', 'FCM token okuma; ayni engel'],
  ['setCaregiverNotificationsEnabled', 'FCM tercih yazma; ayni engel'],
  ['notifyCaregivers', 'bakici uyarisi; ayni engel'],
  ['notifyCaregiverLocally', 'bakici YEREL bildirimi — FCM bozuk oldugu icin OLASI COZUM'],
  ['cancelCaregiverLocalNotification', 'notifyCaregiverLocally ile birlikte'],
  ['createCaregiverLocalChannel', 'notifyCaregiverLocally ile birlikte'],

  // === REZERVE: backend veya UI akisi yok ===================================
  ['downgradeToFree', 'abonelik dusurme; subscription yazimi kurallarla kapali'],
  ['deleteAccount', 'KVKK hesap silme; UI akisi yok'],
  ['verifyMedicine', 'globalMedicines dogrulama; admin arac yuzeyi yok'],
  ['getPatientsForCaregiver', 'bakici tarafi hasta listesi; ekran yok'],

  // === GEREKSIZ: calisan bir alternatifi var ================================
  ['getMedicineByBarcode', 'ayni dosyadaki searchByBarcode kullaniliyor'],
  ['barcodeExists', 'searchByBarcode null kontrolu yeterli'],
  ['getPopularMedicines', 'kullanilmiyor; autocomplete yeterli'],
  ['searchByName', 'daha zengin cok-kaynakli yol; UI globalMedicineService.autocomplete kullaniyor'],
  ['getCacheStatus', 'tuketicisi yok; onbellek istatistigi hicbir ekranda gosterilmiyor'],
  ['getCurrentUser', 'AuthContext user state\'i kullaniliyor'],
  ['signInWithGoogleNative', 'AuthContext signInWithGoogle akisi kullaniliyor'],
  ['updateWidgetFromStore', 'updateWidgetData dogrudan cagriliyor'],
  ['setupWidgetSync', 'updateWidgetData dogrudan cagriliyor'],

  // === KASITLI TERK EDILMIS =================================================
  ['searchOpenFoodFacts', 'orkestratorden cikarildi: Turk ilaclari icin guvenilir degil'],

  // === DURAKSAMIS ServiceResult migration (Sprint 4.3) ======================
  // Cagirani yok; testleri yalnizca `typeof x === 'function'` iddia ediyor.
  // Mimari bir yon oldugu icin tek tarafli iptal edilmedi.
  ['getRxCuiForDrugService', 'ServiceResult wrapper; migration duraksadi'],
  ['checkInteractionsFromAPIService', 'ServiceResult wrapper; migration duraksadi'],
  ['checkInteractionService', 'ServiceResult wrapper; migration duraksadi'],
  ['checkMultipleInteractionsService', 'ServiceResult wrapper; migration duraksadi'],
  ['checkInteractionLocalService', 'ServiceResult wrapper; migration duraksadi'],
  ['createCaregiverInviteService', 'ServiceResult wrapper; migration duraksadi'],
  ['acceptCaregiverInviteService', 'ServiceResult wrapper; migration duraksadi'],
  ['getCaregiversService', 'ServiceResult wrapper; migration duraksadi'],

  // === TEST EDILMIS PURE HELPER KUTUPHANESI =================================
  // Bunlar cagrilmiyor ama saf, testleri olan yardimcilar. Silmenin faydasi
  // yok; runtime maliyeti sifir ve davranislari dokumanli.
  ['isValidCaregiverEmail', 'test edilmis pure helper'],
  ['calculateInviteExpiry', 'test edilmis pure helper'],
  ['normalizeCaregiverStatus', 'test edilmis pure helper'],
  ['hasCaregiverPermission', 'test edilmis pure helper'],
  ['filterCaregiversWithFcmToken', 'test edilmis pure helper'],
  ['filterNonExpiredInvites', 'test edilmis pure helper'],
  ['chunkArray', 'test edilmis pure helper'],
  ['calculateBatchCount', 'test edilmis pure helper'],
  ['extractUserIdFromPath', 'test edilmis pure helper'],
  ['getUserDocRef', 'Firestore ref builder; buildX* varyantlari kullaniliyor'],
  ['getMedicinesRef', 'Firestore ref builder; buildX* varyantlari kullaniliyor'],
  ['getReminderTimesRef', 'Firestore ref builder; buildX* varyantlari kullaniliyor'],
  ['getMedicineLogsRef', 'Firestore ref builder; buildX* varyantlari kullaniliyor'],
  ['getSettingsDocRef', 'Firestore ref builder; buildX* varyantlari kullaniliyor'],
  ['buildReportFilename', 'test edilmis pure helper'],
  ['getDefaultQRTheme', 'test edilmis pure helper'],
  ['validateInviteCodeForQR', 'test edilmis pure helper'],
  ['isRemoteMedicineImageUri', 'test edilmis pure helper'],
  ['err', 'ServiceResult kurucu (ok/err cifti)'],
  ['toServiceError', 'ServiceResult hata donusturucu'],
]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      walk(full, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** Dosyadaki `export function` / `export async function` adlari. */
function exportedFunctions(file) {
  const source = fs.readFileSync(file, 'utf8');
  return [...source.matchAll(/^export\s+(?:async\s+)?function\s+(\w+)/gm)].map(m => m[1]);
}

function isDefinitionLine(line, name) {
  return new RegExp(`^export\\s+(?:async\\s+)?function\\s+${name}\\b`).test(line);
}

function countCalls(files, name) {
  const patterns = [
    new RegExp(`\\b${name}\\s*\\(`), // dogrudan cagri
    new RegExp(`\\.${name}\\s*\\(`), // namespace uzerinden (svc.name())
    new RegExp(`[{,]\\s*${name}\\s*[,}]`), // import destructure
  ];

  let count = 0;
  for (const file of files) {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      if (isDefinitionLine(line, name)) continue;
      if (patterns.some(re => re.test(line))) count++;
    }
  }
  return count;
}

function main() {
  // TANIM DOSYALARI DA DAHIL — bkz. yukaridaki uyari.
  const allFiles = [...walk('src'), ...EXTRA_ENTRY_POINTS.filter(f => fs.existsSync(f))];
  const serviceFiles = walk(SCAN_DIR);

  const unwired = [];
  for (const file of serviceFiles) {
    for (const name of exportedFunctions(file)) {
      if (ALLOWLIST.has(name)) continue;
      if (countCalls(allFiles, name) === 0) {
        unwired.push({ file, name });
      }
    }
  }

  console.log(`Taranan servis dosyasi: ${serviceFiles.length}, toplam dosya: ${allFiles.length}`);

  if (unwired.length === 0) {
    console.log('OK — baglanmamis servis export yok.');
    return 0;
  }

  console.error('\nBAGLANMAMIS SERVIS EXPORT BULUNDU:\n');
  for (const { file, name } of unwired) {
    console.error(`  ${file} :: ${name}`);
  }
  console.error(
    '\nBu fonksiyonlar hicbir yerden cagrilmiyor. Ya bir ozellik sessizce olu\n' +
      '(updateTITCKCache gibi: TITCK onbellegi hic dolmadi), ya da kod gercekten\n' +
      'gereksiz ve silinmeli. Bilerek birakiliyorsa ALLOWLIST\'e GEREKCESIYLE ekle.\n'
  );
  return 1;
}

process.exit(main());
