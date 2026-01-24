/**
 * TİTCK Excel dosyasını Firebase'e import eden script
 * 
 * TİTCK (Türkiye İlaç ve Tıbbi Cihaz Kurumu) resmi ilaç listesini
 * Firebase Firestore'a toplu olarak yükler.
 * 
 * Kullanım:
 *   1. TİTCK Excel dosyasını indirin:
 *      https://titck.gov.tr/dinamikmodul/82
 *      (Reçeteli/Reçetesiz ilaç listeleri)
 * 
 *   2. Dosyayı scripts/data/ klasörüne koyun
 * 
 *   3. Script'i çalıştırın:
 *      node scripts/importTITCK.js [dosya_yolu] [--dry-run] [--limit=100]
 * 
 * Parametreler:
 *   --dry-run  : Firebase'e yazmadan sadece parse et
 *   --limit=N  : İlk N kaydı işle
 *   --clear    : Önce mevcut verileri sil
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, writeBatch } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAKUg-0PsR-awOb-b3RjyrDo9UmNfsD45A",
  authDomain: "ilachatirlatici-15a71.firebaseapp.com",
  projectId: "ilachatirlatici-15a71",
  storageBucket: "ilachatirlatici-15a71.firebasestorage.app",
  messagingSenderId: "506876057044",
  appId: "1:506876057044:android:5d2d26ddbe32c8c4d53241",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Komut satırı argümanlarını parse et
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const clearFirst = args.includes('--clear');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
const filePath = args.find(a => !a.startsWith('--'));

// Form türü eşleştirme
const formMapping = {
  'TABLET': 'tablet',
  'FİLM TABLET': 'tablet',
  'ENTERİK KAPLI TABLET': 'tablet',
  'KAPSÜL': 'capsule',
  'ŞURUP': 'syrup',
  'SÜSPANSIYON': 'syrup',
  'DAMLA': 'drops',
  'GÖZ DAMLASI': 'drops',
  'KULAK DAMLASI': 'drops',
  'BURUN DAMLASI': 'drops',
  'AMPUL': 'injection',
  'FLAKON': 'injection',
  'ENJEKTÖR': 'injection',
  'KREM': 'cream',
  'JEL': 'cream',
  'MERHEM': 'cream',
  'POMAD': 'cream',
  'SPREY': 'spray',
  'İNHALER': 'inhaler',
  'ŞASE': 'powder',
  'TOZ': 'powder',
  'FİTİL': 'suppository',
  'SUPOZİTUAR': 'suppository',
  'PATCH': 'patch',
  'FLASTER': 'patch',
};

function detectForm(name) {
  const upperName = name.toUpperCase();
  for (const [key, value] of Object.entries(formMapping)) {
    if (upperName.includes(key)) {
      return value;
    }
  }
  return 'other';
}

function extractDosage(name) {
  // "500 MG", "100MG", "0.5 MG" gibi kalıpları yakala
  const dosageMatch = name.match(/(\d+[.,]?\d*)\s*(MG|MCG|ML|GR|G|IU|ÜNİTE)/i);
  if (dosageMatch) {
    return `${dosageMatch[1]}${dosageMatch[2].toLowerCase()}`;
  }
  return null;
}

function generateBarcode(ilacAdi, firma) {
  // Gerçek barkod yoksa, ilaç adından hash oluştur
  const str = `${ilacAdi}-${firma}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  // 13 haneli EAN-13 benzeri format
  return `869${Math.abs(hash).toString().padStart(10, '0').slice(0, 10)}`;
}

async function parseExcel(inputPath) {
  console.log(`Excel dosyası okunuyor: ${inputPath}\n`);
  
  const workbook = XLSX.readFile(inputPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // İlk satır başlık
  const headers = data[0];
  console.log('Sütunlar:', headers);
  console.log('');
  
  // Sütun indekslerini bul
  const colIndices = {
    barkod: headers.findIndex(h => h && (h.toLowerCase().includes('barkod') || h.toLowerCase().includes('barcode'))),
    ilacAdi: headers.findIndex(h => h && (h.toLowerCase().includes('ilaç adı') || h.toLowerCase().includes('ürün adı') || h.toLowerCase().includes('ilac adi'))),
    firma: headers.findIndex(h => h && (h.toLowerCase().includes('firma') || h.toLowerCase().includes('üretici'))),
    etkenMadde: headers.findIndex(h => h && (h.toLowerCase().includes('etken madde') || h.toLowerCase().includes('etkin madde'))),
    atcKodu: headers.findIndex(h => h && h.toLowerCase().includes('atc')),
    recete: headers.findIndex(h => h && h.toLowerCase().includes('reçete')),
  };
  
  console.log('Algılanan sütun indeksleri:', colIndices);
  console.log('');
  
  const medicines = [];
  
  // Veri satırlarını işle (başlık hariç)
  const rows = data.slice(1);
  const maxRows = limit ? Math.min(rows.length, limit) : rows.length;
  
  for (let i = 0; i < maxRows; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    
    // İlaç adı zorunlu
    const ilacAdi = colIndices.ilacAdi >= 0 ? row[colIndices.ilacAdi] : null;
    if (!ilacAdi || typeof ilacAdi !== 'string' || ilacAdi.trim() === '') continue;
    
    const firma = colIndices.firma >= 0 ? row[colIndices.firma] : 'Bilinmiyor';
    const etkenMadde = colIndices.etkenMadde >= 0 ? row[colIndices.etkenMadde] : null;
    
    // Barkod: varsa al, yoksa üret
    let barkod = colIndices.barkod >= 0 ? row[colIndices.barkod] : null;
    if (!barkod || barkod.toString().trim() === '') {
      barkod = generateBarcode(ilacAdi, firma);
    }
    barkod = barkod.toString().trim();
    
    const medicine = {
      barcode: barkod,
      name: ilacAdi.trim(),
      genericName: etkenMadde ? etkenMadde.trim() : null,
      dosage: extractDosage(ilacAdi),
      form: detectForm(ilacAdi),
      manufacturer: firma ? firma.trim() : 'Bilinmiyor',
      country: 'TR',
      isVerified: true,
      addedBy: 'titck_import',
      searchCount: 0,
      source: 'TITCK',
    };
    
    // Boş alanları kaldır
    Object.keys(medicine).forEach(key => {
      if (medicine[key] === null || medicine[key] === undefined) {
        delete medicine[key];
      }
    });
    
    medicines.push(medicine);
  }
  
  return medicines;
}

async function importToFirebase(medicines) {
  console.log(`\nFirebase'e ${medicines.length} ilaç yükleniyor...\n`);
  
  const collectionRef = collection(db, 'globalMedicines');
  let successCount = 0;
  let errorCount = 0;
  
  // Batch işlem için 500'lük gruplar
  const batchSize = 500;
  
  for (let i = 0; i < medicines.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = medicines.slice(i, i + batchSize);
    
    for (const medicine of chunk) {
      const docRef = doc(collectionRef, medicine.barcode);
      batch.set(docRef, {
        ...medicine,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    
    try {
      await batch.commit();
      successCount += chunk.length;
      console.log(`Batch ${Math.floor(i / batchSize) + 1}: ${chunk.length} kayıt eklendi (Toplam: ${successCount})`);
    } catch (error) {
      errorCount += chunk.length;
      console.error(`Batch ${Math.floor(i / batchSize) + 1} hatası: ${error.message}`);
    }
  }
  
  return { successCount, errorCount };
}

async function clearCollection() {
  console.log('Mevcut veriler siliniyor...\n');
  
  const collectionRef = collection(db, 'globalMedicines');
  const snapshot = await getDocs(collectionRef);
  
  const batchSize = 500;
  let deleted = 0;
  
  for (let i = 0; i < snapshot.docs.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = snapshot.docs.slice(i, i + batchSize);
    
    for (const docSnap of chunk) {
      batch.delete(doc(db, 'globalMedicines', docSnap.id));
    }
    
    await batch.commit();
    deleted += chunk.length;
    console.log(`${deleted} kayıt silindi...`);
  }
  
  console.log(`Toplam ${deleted} kayıt silindi.\n`);
}

async function main() {
  // Varsayılan dosya yolu
  let inputPath = filePath;
  
  if (!inputPath) {
    // scripts/data klasöründe Excel ara
    const dataDir = path.join(__dirname, 'data');
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
      if (files.length > 0) {
        inputPath = path.join(dataDir, files[0]);
        console.log(`Bulunan Excel dosyası: ${inputPath}`);
      }
    }
  }
  
  if (!inputPath) {
    console.log('Kullanım: node scripts/importTITCK.js <excel_dosyasi> [--dry-run] [--limit=N] [--clear]');
    console.log('');
    console.log('TİTCK Excel dosyasını indirmek için:');
    console.log('https://titck.gov.tr/dinamikmodul/82');
    console.log('');
    console.log('Örnek:');
    console.log('  node scripts/importTITCK.js scripts/data/ilac_listesi.xlsx');
    console.log('  node scripts/importTITCK.js scripts/data/ilac_listesi.xlsx --dry-run --limit=100');
    process.exit(1);
  }
  
  if (!fs.existsSync(inputPath)) {
    console.error(`Dosya bulunamadı: ${inputPath}`);
    process.exit(1);
  }
  
  console.log('='.repeat(60));
  console.log('TİTCK İlaç Listesi Import');
  console.log('='.repeat(60));
  console.log(`Dosya: ${inputPath}`);
  console.log(`Dry Run: ${dryRun ? 'Evet' : 'Hayır'}`);
  console.log(`Limit: ${limit || 'Yok'}`);
  console.log(`Önce Temizle: ${clearFirst ? 'Evet' : 'Hayır'}`);
  console.log('='.repeat(60));
  console.log('');
  
  // Excel'i parse et
  const medicines = await parseExcel(inputPath);
  
  console.log(`\n${medicines.length} ilaç parse edildi.`);
  
  // Örnek veri göster
  if (medicines.length > 0) {
    console.log('\nÖrnek kayıt:');
    console.log(JSON.stringify(medicines[0], null, 2));
  }
  
  if (dryRun) {
    console.log('\n[DRY RUN] Firebase\'e yazılmadı.');
    process.exit(0);
  }
  
  // Mevcut verileri sil
  if (clearFirst) {
    await clearCollection();
  }
  
  // Firebase'e yükle
  const { successCount, errorCount } = await importToFirebase(medicines);
  
  console.log('\n' + '='.repeat(60));
  console.log('SONUÇ');
  console.log('='.repeat(60));
  console.log(`Parse edilen: ${medicines.length}`);
  console.log(`Başarılı: ${successCount}`);
  console.log(`Hatalı: ${errorCount}`);
  console.log('='.repeat(60));
  
  process.exit(0);
}

main().catch(error => {
  console.error('Hata:', error);
  process.exit(1);
});
