/**
 * caregiverService tests — Sprint 7
 * Firebase mock'lu. isValidInviteCode pure function test edilir.
 */

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn().mockResolvedValue(undefined),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  deleteDoc: jest.fn().mockResolvedValue(undefined),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(),
  getDocs: jest.fn().mockResolvedValue({ docs: [] }),
}));

jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('../../utils/notifications', () => ({
  scheduleMedicineNotification: jest.fn(),
}));

import { isValidInviteCode, acceptCaregiverInvite } from '../../services/caregiverService';
import { getDoc, setDoc, updateDoc } from 'firebase/firestore';

describe('caregiverService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isValidInviteCode', () => {
    it('accepts 6-character alphanumeric codes (excluding I, O, Q)', () => {
      expect(isValidInviteCode('ABC123')).toBe(true);
      expect(isValidInviteCode('XYZ789')).toBe(true);
      expect(isValidInviteCode('123456')).toBe(true);
    });

    it('rejects codes with invalid characters (lowercase, special)', () => {
      expect(isValidInviteCode('abc123')).toBe(false); // lowercase
      expect(isValidInviteCode('Abc123')).toBe(false); // mixed case
      expect(isValidInviteCode('AB-123')).toBe(false); // special char
      expect(isValidInviteCode('AB 123')).toBe(false); // space
    });

    it('rejects codes with wrong length', () => {
      expect(isValidInviteCode('ABC')).toBe(false);
      expect(isValidInviteCode('ABCDE')).toBe(false);
      expect(isValidInviteCode('ABCDEFGHI')).toBe(false); // 9 chars
      expect(isValidInviteCode('')).toBe(false);
    });
  });

  describe('acceptCaregiverInvite', () => {
    it('successfully accepts invite, records relationship and updates invite with caregiverId', async () => {
      (getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          id: '7A1ECC',
          patientId: 'patient_user_456',
          patientName: 'Ahmet',
          caregiverEmail: 'kardes@example.com',
          status: 'pending',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          permissions: { canViewSchedule: true, canViewHistory: true, canReceiveAlerts: true },
        }),
      });

      const res = await acceptCaregiverInvite('7A1ECC', 'caregiver_user_789', 'Mehmet');
      expect(res.success).toBe(true);

      // Verify setDoc called for relationship
      expect(setDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          patientId: 'patient_user_456',
          caregiverId: 'caregiver_user_789',
          caregiverName: 'Mehmet',
          status: 'active',
        })
      );

      // Verify updateDoc called with caregiverId and accepted status for Firestore rules compliance
      expect(updateDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          status: 'accepted',
          caregiverId: 'caregiver_user_789',
          caregiverName: 'Mehmet',
        })
      );
    });

    it('rejects self-invites when patient tries to accept their own invite', async () => {
      (getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          id: '7A1ECC',
          patientId: 'same_user_123',
          patientName: 'Ahmet',
          caregiverEmail: 'kardes@example.com',
          status: 'pending',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          permissions: { canViewSchedule: true, canViewHistory: true, canReceiveAlerts: true },
        }),
      });

      const res = await acceptCaregiverInvite('7A1ECC', 'same_user_123', 'Ahmet');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Kendi oluşturduğunuz davet kodunu kullanamazsınız');
    });

    it('handles permission-denied error gracefully with clear Turkish explanation', async () => {
      (getDoc as jest.Mock).mockRejectedValueOnce({
        code: 'permission-denied',
        message: 'Missing or insufficient permissions.',
      });

      const res = await acceptCaregiverInvite('7A1ECC', 'caregiver_user_789', 'Mehmet');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Yetkisiz erişim. Lütfen Google veya E-posta ile giriş');
    });
  });
});
