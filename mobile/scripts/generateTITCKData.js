/**
 * TİTCK Excel dosyasından optimize edilmiş offline JSON veri tabanı üreten script.
 * Hem Aktif (7,944), hem Yeni Eklenenler, hem de Pasif (10,155) ilaçları kapsar (~18,100 ilaç).
 * Çıktı: mobile/src/assets/data/titck_medicines.json
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

function normalizeHeader(str) {
  return (str || '')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/[\r\n]+/g, ' ')
    .trim();
}

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

function parseSheetRows(sheet, statusLabel = 'Aktif') {
  if (!sheet) return [];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

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

  if (headerIndex === -1) return [];

  const headers = rawRows[headerIndex].map(normalizeHeader);
  const colIndices = {
    name: headers.findIndex(h => h.includes('ilac') || h.includes('ilaç') || h.includes('urun') || h.includes('ürün')),
    barcode: headers.findIndex(h => h.includes('barkod') || h.includes('barcode')),
    atcCode: headers.findIndex(h => h.includes('atc') && h.includes('kod')),
    genericName: headers.findIndex(h => (h.includes('atc') && (h.includes('ad') || h.includes('adı'))) || h.includes('etkin') || h.includes('etken')),
    manufacturer: headers.findIndex(h => h.includes('firma') || h.includes('üretici') || h.includes('uretici')),
    prescription: headers.findIndex(h => h.includes('recete') || h.includes('reçete')),
  };

  const list = [];

  for (let i = headerIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || !row[colIndices.name]) continue;

    const rawName = (row[colIndices.name] || '').toString().trim();
    if (!rawName) continue;

    const barcode = cleanBarcode(row[colIndices.barcode]);
    if (!barcode) continue;

    const genericName = colIndices.genericName >= 0 && row[colIndices.genericName] ? row[colIndices.genericName].toString().trim() : '';
    const atcCode = colIndices.atcCode >= 0 && row[colIndices.atcCode] ? row[colIndices.atcCode].toString().trim() : '';
    const manufacturer = colIndices.manufacturer >= 0 && row[colIndices.manufacturer] ? row[colIndices.manufacturer].toString().trim() : 'Bilinmiyor';
    const prescriptionType = colIndices.prescription >= 0 && row[colIndices.prescription] ? row[colIndices.prescription].toString().trim() : '';
    const dosage = extractDosage(rawName);
    const form = detectForm(rawName);

    list.push({
      barcode,
      name: rawName,
      genericName: genericName || undefined,
      atcCode: atcCode || undefined,
      dosage: dosage || undefined,
      form,
      manufacturer,
      prescriptionType: prescriptionType || undefined,
      status: statusLabel,
    });
  }

  return list;
}

function generateTITCKData(excelFilePath, outputFilePath) {
  console.log(`Excel okunuyor: ${excelFilePath}`);
  const wb = XLSX.readFile(excelFilePath);

  const medicineMap = {};

  // 1. Önce Pasif İlaçları Ekle (Eski ambalajlar, yedek olarak)
  const passiveSheet = wb.Sheets['PASİF ÜRÜNLER LİSTESİ'];
  if (passiveSheet) {
    const passiveList = parseSheetRows(passiveSheet, 'Pasif');
    passiveList.forEach(m => {
      medicineMap[m.barcode] = m;
    });
    console.log(`Pasif sayfasından ${passiveList.length} ilaç yüklendi.`);
  }

  // 2. Sonra Aktif İlaçları Ekle (Üzerine yazar, aktif öncelikli)
  const activeSheet = wb.Sheets['AKTİF ÜRÜNLER LİSTESİ'] || wb.Sheets[wb.SheetNames[0]];
  if (activeSheet) {
    const activeList = parseSheetRows(activeSheet, 'Aktif');
    activeList.forEach(m => {
      medicineMap[m.barcode] = m;
    });
    console.log(`Aktif sayfasından ${activeList.length} ilaç yüklendi.`);
  }

  // 3. Yeni Eklenenleri Ekle
  const newSheet = wb.Sheets['LİSTEYE YENİ EKLENEN ÜRÜNLER'];
  if (newSheet) {
    const newList = parseSheetRows(newSheet, 'Yeni');
    newList.forEach(m => {
      medicineMap[m.barcode] = m;
    });
    console.log(`Yeni Eklenenler sayfasından ${newList.length} ilaç yüklendi.`);
  }

  const outDir = path.dirname(outputFilePath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outputFilePath, JSON.stringify(medicineMap));
  const stats = fs.statSync(outputFilePath);

  console.log(`\n✅ ${outputFilePath} başarıyla oluşturuldu.`);
  console.log(`📦 Toplam Benzersiz İlaç Sayısı: ${Object.keys(medicineMap).length}`);
  console.log(`📊 Dosya Boyutu: ${(stats.size / 1024 / 1024).toFixed(2)} MB (${stats.size} bytes)\n`);

  return { uniqueBarcodes: Object.keys(medicineMap).length, fileSize: stats.size };
}

if (require.main === module) {
  const excelPath = path.join(__dirname, 'data', 'titck_ilac_listesi.xlsx');
  const outPath = path.join(__dirname, '..', 'src', 'assets', 'data', 'titck_medicines.json');
  generateTITCKData(excelPath, outPath);
}

module.exports = { generateTITCKData, detectForm, extractDosage, cleanBarcode };
