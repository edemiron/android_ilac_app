/**
 * Test ilaç verisi ekleme scripti
 * 
 * Kullanım:
 * 1. Firebase Console'a git: https://console.firebase.google.com
 * 2. Firestore Database > globalMedicines koleksiyonuna git
 * 3. "Add document" tıkla
 * 4. Aşağıdaki verileri manuel olarak ekle
 * 
 * VEYA bu scripti Node.js ile çalıştır (firebase-admin gerekli)
 */

// NOVAQUA Göz Damlası - Test verisi
const testMedicine = {
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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

console.log("Firebase'e eklenecek veri:");
console.log(JSON.stringify(testMedicine, null, 2));

console.log("\n----------------------------");
console.log("Firebase Console'da manuel ekleme için:");
console.log("1. https://console.firebase.google.com adresine git");
console.log("2. ilachatirlatici-15a71 projesini seç");
console.log("3. Firestore Database > globalMedicines");
console.log("4. 'Add document' butonuna tıkla");
console.log("5. Document ID: 8699525610171 (veya Auto-ID)");
console.log("6. Yukarıdaki alanları ekle");
console.log("----------------------------\n");

// Ek test verileri
const additionalMedicines = [
  {
    barcode: "8699546090488",
    name: "PAROL 500 MG 20 TABLET",
    genericName: "Parasetamol",
    dosage: "500mg",
    form: "tablet",
    manufacturer: "ATABAY İLAÇ FABRİKASI A.Ş.",
    country: "TR"
  },
  {
    barcode: "8699504090161",
    name: "MAJEZIK 100 MG 30 FİLM TABLET",
    genericName: "Flurbiprofen",
    dosage: "100mg",
    form: "tablet",
    manufacturer: "SANOVEL İLAÇ SAN. VE TİC. A.Ş.",
    country: "TR"
  },
  {
    barcode: "8699525090027",
    name: "NUROFEN 200 MG 20 DRAJE",
    genericName: "İbuprofen",
    dosage: "200mg",
    form: "tablet",
    manufacturer: "RECKITT BENCKISER",
    country: "TR"
  },
  {
    barcode: "8699828090014",
    name: "AUGMENTIN BID 1000 MG 14 FİLM TABLET",
    genericName: "Amoksisilin + Klavulanik asit",
    dosage: "1000mg",
    form: "tablet",
    manufacturer: "GLAXOSMITHKLINE",
    country: "TR"
  }
];

console.log("Ek test ilaçları:");
additionalMedicines.forEach((med, i) => {
  console.log(`\n${i + 1}. ${med.name}`);
  console.log(`   Barkod: ${med.barcode}`);
});
