/**
 * Firebase'e test ilaç verisi ekleyen script
 * 
 * Kullanım: node scripts/seedMedicines.js
 * 
 * NOT: Firebase Security Rules anonymous write'a izin vermeli
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDocs, deleteDoc } = require('firebase/firestore');

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

// Test ilaç verileri - Türkiye'de yaygın ilaçlar
const testMedicines = [
  {
    barcode: "8699525610171",
    name: "NOVAQUA %1,4 + %0,6 TEK DOZLUK GÖZ DAMLASI",
    genericName: "Sodyum hyaluronat + Polietilen glikol",
    dosage: "0.4ml x 30",
    form: "drops",
    manufacturer: "DEVA HOLDING A.Ş.",
    country: "TR",
    isVerified: true,
    addedBy: "admin",
    searchCount: 0,
  },
  {
    barcode: "8699546090488",
    name: "PAROL 500 MG 20 TABLET",
    genericName: "Parasetamol",
    dosage: "500mg",
    form: "tablet",
    manufacturer: "ATABAY İLAÇ FABRİKASI A.Ş.",
    country: "TR",
    isVerified: true,
    addedBy: "admin",
    searchCount: 0,
  },
  {
    barcode: "8699504090161",
    name: "MAJEZIK 100 MG 30 FİLM TABLET",
    genericName: "Flurbiprofen",
    dosage: "100mg",
    form: "tablet",
    manufacturer: "SANOVEL İLAÇ SAN. VE TİC. A.Ş.",
    country: "TR",
    isVerified: true,
    addedBy: "admin",
    searchCount: 0,
  },
  {
    barcode: "8699525090027",
    name: "NUROFEN 200 MG 20 DRAJE",
    genericName: "İbuprofen",
    dosage: "200mg",
    form: "tablet",
    manufacturer: "RECKITT BENCKISER",
    country: "TR",
    isVerified: true,
    addedBy: "admin",
    searchCount: 0,
  },
  {
    barcode: "8699828090014",
    name: "AUGMENTIN BID 1000 MG 14 FİLM TABLET",
    genericName: "Amoksisilin + Klavulanik asit",
    dosage: "1000mg",
    form: "tablet",
    manufacturer: "GLAXOSMITHKLINE",
    country: "TR",
    isVerified: true,
    addedBy: "admin",
    searchCount: 0,
  },
  {
    barcode: "8699809090019",
    name: "ASPIRIN 500 MG 20 TABLET",
    genericName: "Asetilsalisilik asit",
    dosage: "500mg",
    form: "tablet",
    manufacturer: "BAYER TÜRK KİMYA SAN. LTD. ŞTİ.",
    country: "TR",
    isVerified: true,
    addedBy: "admin",
    searchCount: 0,
  },
  {
    barcode: "8699532090034",
    name: "VOLTAREN 50 MG 20 ENTERİK KAPLI TABLET",
    genericName: "Diklofenak sodyum",
    dosage: "50mg",
    form: "tablet",
    manufacturer: "NOVARTIS",
    country: "TR",
    isVerified: true,
    addedBy: "admin",
    searchCount: 0,
  },
  {
    barcode: "8699522090051",
    name: "TYLOL HOT 500/30/4 MG 12 ŞASE",
    genericName: "Parasetamol + Fenilefrin + Klorfeniramin",
    dosage: "500mg/30mg/4mg",
    form: "powder",
    manufacturer: "NOBEL İLAÇ",
    country: "TR",
    isVerified: true,
    addedBy: "admin",
    searchCount: 0,
  },
  {
    barcode: "8699578090068",
    name: "CALPOL 120MG/5ML 150ML ŞURUP",
    genericName: "Parasetamol",
    dosage: "120mg/5ml",
    form: "syrup",
    manufacturer: "GLAXOSMITHKLINE",
    country: "TR",
    isVerified: true,
    addedBy: "admin",
    searchCount: 0,
  },
  {
    barcode: "8699536090085",
    name: "NEXIUM 20 MG 28 ENTERİK KAPLI PELLET TABLET",
    genericName: "Esomeprazol",
    dosage: "20mg",
    form: "tablet",
    manufacturer: "ASTRAZENECA",
    country: "TR",
    isVerified: true,
    addedBy: "admin",
    searchCount: 0,
  },
  {
    barcode: "8699541090102",
    name: "XANAX 0.5 MG 30 TABLET",
    genericName: "Alprazolam",
    dosage: "0.5mg",
    form: "tablet",
    manufacturer: "PFIZER",
    country: "TR",
    isVerified: true,
    addedBy: "admin",
    searchCount: 0,
  },
  {
    barcode: "8699505090119",
    name: "CORASPIN 100 MG 30 ENTERİK KAPLI TABLET",
    genericName: "Asetilsalisilik asit",
    dosage: "100mg",
    form: "tablet",
    manufacturer: "BAYER TÜRK KİMYA SAN. LTD. ŞTİ.",
    country: "TR",
    isVerified: true,
    addedBy: "admin",
    searchCount: 0,
  },
  {
    barcode: "8699512090136",
    name: "ARVELES 25 MG 20 FİLM TABLET",
    genericName: "Deksketoprofen",
    dosage: "25mg",
    form: "tablet",
    manufacturer: "UFSA İLAÇ SAN.",
    country: "TR",
    isVerified: true,
    addedBy: "admin",
    searchCount: 0,
  },
  {
    barcode: "8699519090153",
    name: "APRANAX FORT 550 MG 20 FİLM TABLET",
    genericName: "Naproksen sodyum",
    dosage: "550mg",
    form: "tablet",
    manufacturer: "ABDI İBRAHİM",
    country: "TR",
    isVerified: true,
    addedBy: "admin",
    searchCount: 0,
  },
  {
    barcode: "8699526090170",
    name: "VERMIDON 500 MG 20 TABLET",
    genericName: "Parasetamol",
    dosage: "500mg",
    form: "tablet",
    manufacturer: "KOÇAK FARMA",
    country: "TR",
    isVerified: true,
    addedBy: "admin",
    searchCount: 0,
  },
];

async function seedMedicines() {
  console.log('Firebase\'e ilaç verileri ekleniyor...\n');
  
  const collectionRef = collection(db, 'globalMedicines');
  let successCount = 0;
  let errorCount = 0;
  
  for (const medicine of testMedicines) {
    try {
      const docData = {
        ...medicine,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Barkod'u document ID olarak kullan
      await setDoc(doc(collectionRef, medicine.barcode), docData);
      
      console.log(`✓ ${medicine.name}`);
      successCount++;
    } catch (error) {
      console.error(`✗ ${medicine.name}: ${error.message}`);
      errorCount++;
    }
  }
  
  console.log(`\n========================================`);
  console.log(`Toplam: ${testMedicines.length}`);
  console.log(`Başarılı: ${successCount}`);
  console.log(`Hatalı: ${errorCount}`);
  console.log(`========================================\n`);
  
  process.exit(0);
}

async function listMedicines() {
  console.log('Mevcut ilaçlar listeleniyor...\n');
  
  const collectionRef = collection(db, 'globalMedicines');
  const snapshot = await getDocs(collectionRef);
  
  if (snapshot.empty) {
    console.log('Koleksiyon boş.');
    return;
  }
  
  snapshot.forEach((doc) => {
    const data = doc.data();
    console.log(`${doc.id}: ${data.name}`);
  });
  
  console.log(`\nToplam: ${snapshot.size} ilaç`);
}

async function clearMedicines() {
  console.log('Tüm ilaçlar siliniyor...\n');
  
  const collectionRef = collection(db, 'globalMedicines');
  const snapshot = await getDocs(collectionRef);
  
  for (const docSnap of snapshot.docs) {
    await deleteDoc(doc(db, 'globalMedicines', docSnap.id));
    console.log(`Silindi: ${docSnap.id}`);
  }
  
  console.log('\nTüm veriler silindi.');
}

// Komut satırı argümanlarını kontrol et
const args = process.argv.slice(2);
const command = args[0] || 'seed';

switch (command) {
  case 'seed':
    seedMedicines();
    break;
  case 'list':
    listMedicines().then(() => process.exit(0));
    break;
  case 'clear':
    clearMedicines().then(() => process.exit(0));
    break;
  default:
    console.log('Kullanım:');
    console.log('  node scripts/seedMedicines.js seed  - Veritabanına test verisi ekle');
    console.log('  node scripts/seedMedicines.js list  - Mevcut verileri listele');
    console.log('  node scripts/seedMedicines.js clear - Tüm verileri sil');
    process.exit(0);
}
