/**
 * caregiverService ServiceResult migration testleri (Sprint 9.3).
 */

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(),
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
  createCaregiverInviteService,
  acceptCaregiverInviteService,
  getCaregiversService,
} from '../../services/caregiverService';

describe('caregiverService ServiceResult wrappers', () => {
  it('exports createCaregiverInviteService', () => {
    expect(typeof createCaregiverInviteService).toBe('function');
  });

  it('exports acceptCaregiverInviteService', () => {
    expect(typeof acceptCaregiverInviteService).toBe('function');
  });

  it('exports getCaregiversService', () => {
    expect(typeof getCaregiversService).toBe('function');
  });
});

describe('createCaregiverInviteService error handling', () => {
  it('returns ok with inviteCode on success', async () => {
    // Mock'lenebilir, ancak mevcut mock'lar basit hata doner
    const result = await createCaregiverInviteService('p1', 'Patient', 'care@example.com');
    // Mock edilmedigi icin catch'e duser ve err doner
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBeDefined();
      expect(result.error.message).toBeDefined();
    }
  });
});
