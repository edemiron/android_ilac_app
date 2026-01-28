export * from './drugInteraction';
export * from './aiMedicineService';
export * from './turkishMedicineService';
export * from './hybridBarcodeService';

// globalMedicineService ve medicineSearchOrchestrator'da searchByBarcode çakışması var
// Orchestrator versiyonunu ana export olarak kullan (hibrit arama)
export {
  searchByBarcode,
  searchByName,
  type SearchSource,
  type SearchResult,
  type SearchProgress,
  type SearchProgressCallback,
} from './medicineSearchOrchestrator';

// globalMedicineService'ten çakışmayan exportları al
export {
  autocomplete,
  getMedicineById,
  getMedicineByBarcode,
  addMedicine,
  updateMedicine,
  verifyMedicine,
  getPopularMedicines,
  barcodeExists,
} from './globalMedicineService';
