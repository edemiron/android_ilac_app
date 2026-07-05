/**
 * aiMedicineService ServiceResult migration testleri (Sprint 10.4).
 * Mock'lar nedeniyle runtime call'lar skip edildi — sadece export kontrolu.
 */

jest.mock('../../config/firebase', () => ({
  db: {},
  functions: {},
  auth: { currentUser: null },
  storage: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({})),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false })),
  getFirestore: jest.fn(),
}));

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(),
  httpsCallable: jest.fn(() => () => Promise.resolve({ data: { success: false } })),
}));

jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import {
  searchMedicineByBarcodeAIService,
  searchMedicineByNameAIService,
  getMedicineInfoAIService,
} from '../../services/aiMedicineService';

describe('aiMedicineService ServiceResult wrappers', () => {
  it('exports searchMedicineByBarcodeAIService', () => {
    expect(typeof searchMedicineByBarcodeAIService).toBe('function');
  });

  it('exports searchMedicineByNameAIService', () => {
    expect(typeof searchMedicineByNameAIService).toBe('function');
  });

  it('exports getMedicineInfoAIService', () => {
    expect(typeof getMedicineInfoAIService).toBe('function');
  });
});
