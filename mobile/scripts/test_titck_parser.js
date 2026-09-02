const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, 'data', 'titck_ilac_listesi.xlsx');
console.log('Reading Excel file:', excelPath);

const wb = XLSX.readFile(excelPath);
console.log('Available Sheets:', wb.SheetNames);

const formMapping = {
  'TABLET': 'tablet',
  'FİLM TABLET': 'tablet',
  'ENTERİK KAPLI TABLET': 'tablet',
  'ÇİĞNEME TABLETİ': 'tablet',
  'EFERVESAN TABLET': 'tablet',
  'DRAJE': 'tablet',
  'KAPSÜL': 'capsule',
  'SERT KAPSÜL': 'capsule',
  'YUMUŞAK KAPSÜL': 'capsule',
  'ŞURUP': 'syrup',
  'SÜSPANSİYON': 'syrup',
  'SÜSPANSIYON': 'syrup',
  'SOLÜSYON': 'syrup',
  'DAMLA': 'drops',
  'GÖZ DAMLASI': 'drops',
  'KULAK DAMLASI': 'drops',
  'BURUN DAMLASI': 'drops',
  'AMPUL': 'injection',
  'FLAKON': 'injection',
  'ENJEKTÖR': 'injection',
  'ENJEKSİYON': 'injection',
  'KULLANIMA HAZIR ENJEKTÖR': 'injection',
  'KULLANIMA HAZIR ENJEKSIYON': 'injection',
  'KREM': 'cream',
  'JEL': 'cream',
  'MERHEM': 'cream',
  'POMAD': 'cream',
  'LOSYON': 'cream',
  'SPREY': 'spray',
  'BURUN SPREYİ': 'spray',
  'AĞIZ SPREYİ': 'spray',
  'İNHALER': 'inhaler',
  'INHALER': 'inhaler',
  'İNHALASYON': 'inhaler',
  'ŞASE': 'powder',
  'TOZ': 'powder',
  'GRANÜL': 'powder',
  'FİTİL': 'suppository',
  'SUPOZİTUAR': 'suppository',
  'OVÜL': 'suppository',
  'PATCH': 'patch',
  'BANT': 'patch',
  'FLASTER': 'patch',
  'SERUM': 'injection',
};

function detectForm(name) {
  const upperName = (name || '').toLocaleUpperCase('tr-TR');
  for (const [key, value] of Object.entries(formMapping)) {
    if (upperName.includes(key)) {
      return value;
    }
  }
  return 'other';
}

function extractDosage(name) {
  if (!name) return null;
  const dosageMatch = name.match(/(\d+[.,]?\d*)\s*(MG\/ML|MCG\/ML|MG|MCG|ML|GR|G|IU|ÜNİTE|IU\/ML|MG\/G|MCG\/DOZ|MG\/DOZ)/i);
  if (dosageMatch) {
    return `${dosageMatch[1]} ${dosageMatch[2].toUpperCase()}`.trim();
  }
  return null;
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

function parseSheet(sheetName) {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    console.log(`Sheet "${sheetName}" not found!`);
    return [];
  }

  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\nParsing Sheet "${sheetName}" (${rawRows.length} raw rows)...`);

  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(10, rawRows.length); i++) {
    const row = rawRows[i];
    if (!row) continue;
    const rowStr = row.map(c => (c || '').toString().toLowerCase()).join(' ');
    if (rowStr.includes('ilaç') || rowStr.includes('barkod') || rowStr.includes('ilac')) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    console.log(`Could not find header row in sheet "${sheetName}"!`);
    return [];
  }

  const headers = rawRows[headerRowIndex].map(h => (h || '').toString().replace(/\r\n|\n|\r/g, ' ').trim());
  console.log(`Header row at index ${headerRowIndex}:`, headers);

  function normalizeHeader(str) {
    return (str || '')
      .replace(/İ/g, 'i')
      .replace(/I/g, 'ı')
      .toLowerCase()
      .replace(/[\r\n]+/g, ' ')
      .trim();
  }

  const normalizedHeaders = headers.map(normalizeHeader);

  const colIndices = {
    name: normalizedHeaders.findIndex(h => h.includes('ilac') || h.includes('ilaç') || h.includes('urun') || h.includes('ürün')),
    barcode: normalizedHeaders.findIndex(h => h.includes('barkod') || h.includes('barcode')),
    atcCode: normalizedHeaders.findIndex(h => h.includes('atc') && h.includes('kod')),
    genericName: normalizedHeaders.findIndex(h => (h.includes('atc') && (h.includes('ad') || h.includes('adı'))) || h.includes('etkin') || h.includes('etken')),
    manufacturer: normalizedHeaders.findIndex(h => h.includes('firma') || h.includes('üretici') || h.includes('uretici')),
    prescription: normalizedHeaders.findIndex(h => h.includes('recete') || h.includes('reçete')),
    status: normalizedHeaders.findIndex(h => h.includes('durum')),
  };

  console.log('Column indices:', colIndices);

  const medicines = [];
  const rows = rawRows.slice(headerRowIndex + 1);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawName = colIndices.name >= 0 ? row[colIndices.name] : null;
    if (!rawName || typeof rawName !== 'string' || rawName.trim() === '') continue;

    const name = rawName.trim();
    const barcode = colIndices.barcode >= 0 ? cleanBarcode(row[colIndices.barcode]) : null;
    if (!barcode) continue;

    const atcCode = colIndices.atcCode >= 0 && row[colIndices.atcCode] ? row[colIndices.atcCode].toString().trim() : undefined;
    const genericName = colIndices.genericName >= 0 && row[colIndices.genericName] ? row[colIndices.genericName].toString().trim() : undefined;
    const manufacturer = colIndices.manufacturer >= 0 && row[colIndices.manufacturer] ? row[colIndices.manufacturer].toString().trim() : 'Bilinmiyor';
    const prescriptionType = colIndices.prescription >= 0 && row[colIndices.prescription] ? row[colIndices.prescription].toString().trim() : undefined;
    const dosage = extractDosage(name) || undefined;
    const form = detectForm(name);

    medicines.push({
      barcode,
      name,
      genericName,
      atcCode,
      dosage,
      form,
      manufacturer,
      prescriptionType,
      country: 'TR',
      isVerified: true,
      source: 'TITCK',
    });
  }

  return medicines;
}

const activeMeds = parseSheet('AKTİF ÜRÜNLER LİSTESİ');
console.log(`Parsed ${activeMeds.length} active medicines.`);

const barcodeMap = new Map();
activeMeds.forEach(m => {
  barcodeMap.set(m.barcode, m);
});

console.log(`Unique Barcodes: ${barcodeMap.size}`);

// Print some famous samples
const sampleSearches = ['8699522958566', '8699514013181', '8681801092092', '8685025150064', '8684907601427'];
console.log('\n--- Sample Verification ---');
sampleSearches.forEach(b => {
  const found = barcodeMap.get(b);
  if (found) {
    console.log(`[FOUND] Barcode ${b} => ${found.name}\n  - Etken Madde: ${found.genericName}\n  - Form: ${found.form}\n  - Doz: ${found.dosage}\n  - Firma: ${found.manufacturer}\n  - Reçete: ${found.prescriptionType}`);
  } else {
    console.log(`[NOT FOUND] Barcode ${b}`);
  }
});
