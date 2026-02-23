export * from './drugInteraction';
export * from './turkishMedicineService';
export * from './caregiverService';
export * from './qrCodeService';
export * from './caregiverNotificationService';

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
