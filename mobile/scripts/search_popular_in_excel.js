const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, 'data', 'titck_ilac_listesi.xlsx');
const wb = XLSX.readFile(excelPath);

console.log('Sheets:', wb.SheetNames);
const keywords = ['parol', 'aspirin', 'arveles', 'augmentin', 'dolorex', 'aprol', 'coraspin', 'majezik', 'novalgin', 'muscoril', 'cipro', 'parasetamol', 'amoksisilin'];

wb.SheetNames.forEach(sheetName => {
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\nSheet "${sheetName}": ${rows.length} rows`);
  
  keywords.forEach(kw => {
    const matches = rows.filter(r => r && r.some(c => c && c.toString().toLowerCase().includes(kw)));
    if (matches.length > 0) {
      console.log(`  - Match for "${kw}": ${matches.length} found. Sample: ${matches[0][0]}`);
    }
  });
});
