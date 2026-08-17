#!/usr/bin/env node
/**
 * Baglanmamis store action'larini bulur.
 *
 * NEDEN AYRI BIR KONTROL?
 * ts-prune yalnizca kullanilmayan EXPORT'lari bulur. Zustand store action'lari
 * ise bir nesnenin ozelligi — hicbir yerden cagrilmasalar bile ts-prune onlari
 * gormez. Bu koru nokta gercek hatalara yol acti:
 *
 *   markMissedReminders  : tam yazilmis (missed kaydi uretir, buluta yazar,
 *                          bakiciya bildirim gonderir) ama HIC cagrilmiyordu.
 *                          Sonuc: gormezden gelinen dozlar uyum oranini
 *                          dusurmuyordu; 7 dozdan 1'ini alan hasta %100
 *                          uyum goruyordu.
 *
 * DIKKAT — YANLIS POZITIF TUZAGI
 * Action'lar store'un ICINDEN de cagrilabilir (`get().decrementStock(...)`).
 * medicineStore.ts'i taramadan cikarmak bu cagrilari gizler ve saglam bir
 * ozelligi "olu" gostermeye yol acar. Bu yuzden store dosyasi DA taranir;
 * yalnizca bildirim/tanim satirlari haric tutulur.
 *
 * Kullanim:  node scripts/check-unwired-store-actions.js
 * Cikis kodu 1 ise baglanmamis action var.
 */

const fs = require('fs');
const path = require('path');

const STORE_FILE = path.join('src', 'stores', 'medicineStore.ts');
const EXTRA_ENTRY_POINTS = ['App.tsx', 'index.ts'];

/**
 * Bilerek cagrilmayan action'lar. Yeni istisna eklerken GEREKCE yaz —
 * aksi halde bu liste hatalarin saklandigi yer olur.
 */
const ALLOWLIST = new Map([
  // Store'un kendi ic yardimcilari; disaridan cagrilmalari beklenmez.
  ['_createMedicineLog', 'store ici helper (logMedicineTaken/Skipped kullanir)'],
  ['_cleanupNotifications', 'store ici helper (log akislari kullanir)'],

  // Uretimde cagrilmiyor ama medicineStore.advanced.test.ts sozlesmesini test
  // ediyor: zod dogrulamasi + state kurulumu + bildirim yeniden planlama.
  // Yedekten geri yukleme / veri gocu icin rezerve. Silinirse test edilmis bir
  // yetenek de gider; bu yuzden bilincli olarak korunuyor.
  ['importData', 'rezerve geri yukleme/goc API\'si, testlerle kapsanmis'],
]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

function extractActions(storeSource) {
  const match = storeSource.match(/interface MedicineState \{([\s\S]*?)\n\}/);
  if (!match) throw new Error('MedicineState interface bulunamadi');
  return [...match[1].matchAll(/^\s{2}(\w+)\s*:\s*\(/gm)].map(m => m[1]);
}

/** Tanim satiri mi? (interface bildirimi veya implementasyon) */
function isDefinitionLine(line, action) {
  return new RegExp(`^\\s*${action}\\s*:`).test(line);
}

function countCalls(files, action) {
  // Cagri bicimleri: `.action(`, `state.action`, destructure `{ action }`
  const callPatterns = [
    new RegExp(`\\.${action}\\s*\\(`),
    new RegExp(`\\bstate\\.${action}\\b`),
    new RegExp(`[{,]\\s*${action}\\s*[,}]`),
  ];

  let count = 0;
  for (const file of files) {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      if (isDefinitionLine(line, action)) continue;
      if (callPatterns.some(re => re.test(line))) count++;
    }
  }
  return count;
}

function main() {
  const storeSource = fs.readFileSync(STORE_FILE, 'utf8');
  const actions = extractActions(storeSource);
  const files = [...walk('src'), ...EXTRA_ENTRY_POINTS.filter(f => fs.existsSync(f))];

  const unwired = actions.filter(a => !ALLOWLIST.has(a) && countCalls(files, a) === 0);

  console.log(`Taranan action: ${actions.length}, dosya: ${files.length}`);

  if (unwired.length === 0) {
    console.log('OK — baglanmamis store action yok.');
    return 0;
  }

  console.error('\nBAGLANMAMIS STORE ACTION BULUNDU:\n');
  for (const action of unwired) {
    console.error(`  - ${action}`);
  }
  console.error(
    '\nBu action hicbir yerden cagrilmiyor. Ya bir ozellik sessizce olu\n' +
      '(markMissedReminders gibi), ya da action gercekten gereksiz ve\n' +
      'silinmeli. Bilerek birakiliyorsa ALLOWLIST\'e GEREKCESIYLE ekle.\n'
  );
  return 1;
}

process.exit(main());
