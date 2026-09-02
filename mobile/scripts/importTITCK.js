/**
 * TİTCK (Türkiye İlaç ve Tıbbi Cihaz Kurumu) Otomatik İlaç Listesi İndirici,
 * Ayrıştırıcı, Çevrimdışı JSON Üretici ve Firestore Veritabanı Güncelleyici.
 *
 * Kaynak: https://www.titck.gov.tr/dinamikmodul/43 (E-Reçete İlaç ve Diğer Farmasötik Ürünler)
 *
 * Kullanım:
 *   node scripts/importTITCK.js [--download] [--dry-run] [--limit=100] [--upload-firebase]
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, writeBatch, getDocs } = require('firebase/firestore');

// Firebase Yapılandırması
const firebaseConfig = {
  apiKey: "AIzaSyAsqXQZZiVM1EPF0k8MW_b2AsiUv4XSJhM",
  authDomain: "ilacantiv1.firebaseapp.com",
  projectId: "ilacantiv1",
  storageBucket: "ilacantiv1.firebasestorage.app",
  messagingSenderId: "708668760763",
  appId: "1:708668760763:android:2fb620035e210d5ca3ff9e",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Parametreler
const args = process.argv.slice(2);
const shouldDownload = args.includes('--download');
const uploadFirebase = args.includes('--upload-firebase');
const dryRun = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : null;
const customFilePath = args.find(a => !a.startsWith('--'));

const defaultExcelPath = path.join(__dirname, 'data', 'titck_ilac_listesi.xlsx');
const defaultJsonPath = path.join(__dirname, '..', 'src', 'assets', 'data', 'titck_medicines.json');

// Yardımcı Fonksiyonlar
function normalizeTurkish(str) {
  return (str || '')
    .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
    .replace(/Ğ/g, 'g').replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u').replace(/ü/g, 'u')
    .replace(/Ş/g, 's').replace(/ş/g, 's')
    .replace(/Ö/g, 'o').replace(/ö/g, 'o')
    .replace(/Ç/g, 'c').replace(/ç/g, 'c')
    .toUpperCase();
}

const formRules = [
  { form: 'tablet', keywords: ['TABLET', 'TAB', 'DRAJE'] },
  { form: 'capsule', keywords: ['KAPSUL', 'CAPSULE'] },
  { form: 'injection', keywords: ['ENJEKS', 'ENJEKT', 'AMPUL', 'FLAKON', 'SERUM', 'INFUZYON', 'IY'] },
  { form: 'syrup', keywords: ['SURUP', 'SUSPANS', 'COZELTI', 'SOLUSYON', 'ELIKSIR'] },
  { form: 'drops', keywords: ['DAMLA', 'KOLIR'] },
  { form: 'cream', keywords: ['KREM', 'POMAD', 'MERHEM', 'JEL', 'GEL', 'LOSYON'] },
  { form: 'spray', keywords: ['SPREY', 'AEROSOL'] },
  { form: 'inhaler', keywords: ['INHAL', 'DISCUS', 'AEROLIZER', 'RESPIMAT', 'TURBUHALER'] },
  { form: 'powder', keywords: ['TOZ', 'SASE', 'GRANUL'] },
  { form: 'suppository', keywords: ['FITIL', 'SUPOZITUAR', 'OVUL'] },
  { form: 'patch', keywords: ['PATCH', 'BANT', 'FLASTER', 'TTS'] },
];

function detectForm(name) {
  const norm = normalizeTurkish(name);
  for (const r of formRules) {
    for (const kw of r.keywords) {
      if (norm.includes(kw)) return r.form;
    }
  }
  return 'other';
}

function extractDosage(name) {
  if (!name) return '';
  const dosageMatch = name.match(/(\d+[.,]?\d*)\s*(MG\/ML|MCG\/ML|MG|MCG|ML|GR|G|IU|ÜNİTE|IU\/ML|MG\/G|MCG\/DOZ|MG\/DOZ)/i);
  if (dosageMatch) {
    return (dosageMatch[1] + ' ' + dosageMatch[2].toUpperCase()).trim();
  }
  return '';
}

function cleanBarcode(raw) {
  if (!raw) return null;
  let str = raw.toString().trim();
  if (str.includes('E+') || str.includes('e+')) {
    str = Number(str).toFixed(0);
  }
  str = str.replace(/\D/g, '');
  if (str.length === 0) return null;
  return str;
}

function fetchHttp(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let nextUrl = res.headers.location;
        if (!nextUrl.startsWith('http')) nextUrl = 'https://www.titck.gov.tr' + nextUrl;
        return resolve(fetchHttp(nextUrl));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

function downloadBinary(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let nextUrl = res.headers.location;
        if (!nextUrl.startsWith('http')) nextUrl = 'https://www.titck.gov.tr' + nextUrl;
        return resolve(downloadBinary(nextUrl, destPath));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Download failed with HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(destPath);
      });
    }).on('error', err => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function downloadLatestFromTITCK(targetPath) {
  console.log('🌐 TİTCK web sitesi taranıyor: https://www.titck.gov.tr/dinamikmodul/43 ...');
  const res = await fetchHttp('https://www.titck.gov.tr/dinamikmodul/43');
  
  const trRegex = /<tr[\s\S]*?<\/tr>/gi;
  let match;
  let latestUrl = null;
  let latestTitle = '';

  while ((match = trRegex.exec(res.body)) !== null) {
    const rowHtml = match[0];
    const linkMatch = rowHtml.match(/href=["']([^"']+\.xlsx)["']/i);
    if (linkMatch) {
      latestUrl = linkMatch[1].startsWith('http') ? linkMatch[1] : 'https://www.titck.gov.tr' + linkMatch[1];
      latestTitle = rowHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      break;
    }
  }

  if (!latestUrl) {
    throw new Error('TİTCK sayfasında geçerli bir Excel (.xlsx) indirme linki bulunamadı!');
  }

  console.log(`📌 En son yayınlanan liste bulundu: ${latestTitle}`);
  console.log(`📥 İndiriliyor: ${latestUrl}`);
  
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  await downloadBinary(latestUrl, targetPath);
  const stats = fs.statSync(targetPath);
  console.log(`✅ İndirme tamamlandı (${(stats.size / 1024 / 1024).toFixed(2)} MB).\n`);
}

function parseExcel(excelFilePath) {
  console.log(`📖 Excel dosyası işleniyor: ${excelFilePath}`);
  const wb = XLSX.readFile(excelFilePath);
  const sheet = wb.Sheets['AKTİF ÜRÜNLER LİSTESİ'] || wb.Sheets[wb.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  function normalizeHeader(str) {
    return (str || '')
      .replace(/İ/g, 'i').replace(/I/g, 'ı')
      .toLowerCase()
      .replace(/[\r\n]+/g, ' ')
      .trim();
  }

  let headerIndex = -1;
  for (let i = 0; i < Math.min(10, rawRows.length); i++) {
    const row = rawRows[i];
    if (!row) continue;
    const s = row.map(c => (c || '').toString().toLowerCase()).join(' ');
    if (s.includes('ilac') || s.includes('ilaç') || s.includes('barkod')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error('Excel içinde başlık satırı algılanamadı!');
  }

  const headers = rawRows[headerIndex].map(normalizeHeader);
  const colIndices = {
    name: headers.findIndex(h => h.includes('ilac') || h.includes('ilaç') || h.includes('urun') || h.includes('ürün')),
    barcode: headers.findIndex(h => h.includes('barkod') || h.includes('barcode')),
    atcCode: headers.findIndex(h => h.includes('atc') && h.includes('kod')),
    genericName: headers.findIndex(h => (h.includes('atc') && (h.includes('ad') || h.includes('adı'))) || h.includes('etkin') || h.includes('etken')),
    manufacturer: headers.findIndex(h => h.includes('firma') || h.includes('üretici') || h.includes('uretici')),
    prescription: headers.findIndex(h => h.includes('recete') || h.includes('reçete')),
  };

  const medicines = [];
  const maxRows = limit ? Math.min(rawRows.length, headerIndex + 1 + limit) : rawRows.length;

  for (let i = headerIndex + 1; i < maxRows; i++) {
    const row = rawRows[i];
    if (!row || !row[colIndices.name]) continue;

    const rawName = (row[colIndices.name] || '').toString().trim();
    if (!rawName) continue;

    const barcode = cleanBarcode(row[colIndices.barcode]);
    if (!barcode) continue;

    const genericName = colIndices.genericName >= 0 && row[colIndices.genericName] ? row[colIndices.genericName].toString().trim() : undefined;
    const atcCode = colIndices.atcCode >= 0 && row[colIndices.atcCode] ? row[colIndices.atcCode].toString().trim() : undefined;
    const manufacturer = colIndices.manufacturer >= 0 && row[colIndices.manufacturer] ? row[colIndices.manufacturer].toString().trim() : 'Bilinmiyor';
    const prescriptionType = colIndices.prescription >= 0 && row[colIndices.prescription] ? row[colIndices.prescription].toString().trim() : undefined;
    const dosage = extractDosage(rawName) || undefined;
    const form = detectForm(rawName);

    medicines.push({
      barcode,
      name: rawName,
      genericName,
      atcCode,
      dosage,
      form,
      manufacturer,
      prescriptionType,
      country: 'TR',
      isVerified: true,
      addedBy: 'titck_import',
      searchCount: 0,
      source: 'TITCK',
    });
  }

  return medicines;
}

function sanitizeForFirestore(obj) {
  const clean = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined && obj[key] !== null) {
      clean[key] = obj[key];
    }
  });
  return clean;
}

async function uploadToFirebase(medicines) {
  console.log(`\n☁️  Firebase Firestore'a ${medicines.length} ilaç yükleniyor...\n`);

  const collectionRef = collection(db, 'globalMedicines');
  let successCount = 0;
  let errorCount = 0;
  const batchSize = 500;

  for (let i = 0; i < medicines.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = medicines.slice(i, i + batchSize);

    for (const medicine of chunk) {
      const docRef = doc(collectionRef, medicine.barcode);
      const dataToSave = sanitizeForFirestore({
        ...medicine,
        updatedAt: new Date().toISOString(),
      });
      batch.set(docRef, dataToSave, { merge: true });
    }

    try {
      await batch.commit();
      successCount += chunk.length;
      console.log(`Batch ${Math.floor(i / batchSize) + 1}: ${chunk.length} kayıt yazıldı (Toplam: ${successCount})`);
    } catch (error) {
      errorCount += chunk.length;
      console.error(`Batch hatası: ${error.message}`);
    }
  }

  console.log(`\n🎉 Firestore Güncellemesi Tamamlandı: ${successCount} başarılı, ${errorCount} hata.`);
}

async function main() {
  console.log('🚀 TİTCK İlaç Veritabanı Entegrasyon Aracı Başlatılıyor...\n');

  const targetExcel = customFilePath || defaultExcelPath;

  if (shouldDownload || !fs.existsSync(targetExcel)) {
    await downloadLatestFromTITCK(targetExcel);
  }

  const medicines = parseExcel(targetExcel);
  console.log(`📊 Toplam ayrıştırılan geçerli ilaç: ${medicines.length}`);

  // 1. Çevrimdışı JSON Veritabanını Güncelle
  const jsonMap = {};
  medicines.forEach(m => {
    jsonMap[m.barcode] = {
      name: m.name,
      genericName: m.genericName,
      atcCode: m.atcCode,
      dosage: m.dosage,
      form: m.form,
      manufacturer: m.manufacturer,
      prescriptionType: m.prescriptionType,
    };
  });

  const jsonDir = path.dirname(defaultJsonPath);
  if (!fs.existsSync(jsonDir)) fs.mkdirSync(jsonDir, { recursive: true });
  fs.writeFileSync(defaultJsonPath, JSON.stringify(jsonMap));
  const jsonStats = fs.statSync(defaultJsonPath);
  console.log(`💾 Gömülü Çevrimdışı Veri Tabanı (${defaultJsonPath}) güncellendi (${(jsonStats.size / 1024 / 1024).toFixed(2)} MB).`);

  // 2. Firebase Firestore Yükleme
  if (uploadFirebase && !dryRun) {
    await uploadToFirebase(medicines);
  } else {
    console.log(`ℹ️  Firebase yüklemesi atlandı. (Yüklemek için '--upload-firebase' parametresi ekleyin).`);
  }

  console.log('\n✨ İşlem başarıyla tamamlandı!');
}

main().catch(err => {
  console.error('\n❌ HATA:', err.message);
  process.exit(1);
});
