const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'src', 'assets', 'data', 'titck_medicines.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

function normalize(str) {
  return (str || '')
    .replace(/İ/g, 'i').replace(/I/g, 'ı').replace(/ı/g, 'i')
    .replace(/Ğ/g, 'g').replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u').replace(/ü/g, 'u')
    .replace(/Ş/g, 's').replace(/ş/g, 's')
    .replace(/Ö/g, 'o').replace(/ö/g, 'o')
    .replace(/Ç/g, 'c').replace(/ç/g, 'c')
    .toLowerCase()
    .trim();
}

function search(query, limit = 8) {
  const q = normalize(query);
  if (!q || q.length < 1) return [];

  const results = [];
  const entries = Object.entries(data);

  for (const [barcode, med] of entries) {
    const nameNorm = normalize(med.name);
    const genericNorm = normalize(med.genericName);

    let score = 0;
    if (nameNorm === q) {
      score = 100;
    } else if (nameNorm.startsWith(q)) {
      score = 90;
    } else {
      const words = nameNorm.split(/\s+/);
      if (words.some(w => w.startsWith(q))) {
        score = 80;
      } else if (nameNorm.includes(q)) {
        score = 65;
      } else if (genericNorm && (genericNorm.startsWith(q) || genericNorm.includes(q))) {
        score = 50;
      }
    }

    if (score > 0) {
      results.push({
        id: barcode,
        barcode,
        name: med.name,
        dosage: med.dosage || '',
        form: med.form || 'other',
        manufacturer: med.manufacturer || 'Bilinmiyor',
        genericName: med.genericName,
        prescriptionType: med.prescriptionType,
        matchScore: score,
      });
    }
  }

  // Sort by score desc, then shortest name asc
  results.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return a.name.length - b.name.length;
  });

  return results.slice(0, limit);
}

const testQueries = ['pa', 'par', 'parol', 'asp', 'arv', 'dol', 'aug', 'mela', 'cor'];
testQueries.forEach(tq => {
  const t0 = performance.now();
  const res = search(tq, 4);
  const t1 = performance.now();
  console.log(`Query: "${tq}" (${(t1 - t0).toFixed(2)} ms, ${res.length} matches):`);
  res.forEach(r => console.log(`  - [${r.matchScore}%] ${r.name} | Doz: ${r.dosage} | Form: ${r.form} | Firma: ${r.manufacturer}`));
  console.log('');
});
