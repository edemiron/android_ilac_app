import {
  getDaysUntilExpiry,
  getPrescriptionStatus,
  savePrescription,
  getPrescriptions,
  updatePrescription,
  deletePrescription,
} from '../../services/prescriptionService';
import type { PrescriptionInput } from '../../types/prescription';

describe('PrescriptionService', () => {
  describe('getDaysUntilExpiry & getPrescriptionStatus', () => {
    it('returns positive days and active status for future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const futureStr = futureDate.toISOString().split('T')[0];

      const days = getDaysUntilExpiry(futureStr);
      expect(days).toBeGreaterThanOrEqual(29);

      const status = getPrescriptionStatus(futureStr);
      expect(status.status).toBe('active');
      expect(status.color).toBe('#10B981');
    });

    it('returns expiring_soon status for dates within 7 days', () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 3);
      const soonStr = soonDate.toISOString().split('T')[0];

      const status = getPrescriptionStatus(soonStr);
      expect(status.status).toBe('expiring_soon');
      expect(status.color).toBe('#F59E0B');
    });

    it('returns expired status for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const pastStr = pastDate.toISOString().split('T')[0];

      const status = getPrescriptionStatus(pastStr);
      expect(status.status).toBe('expired');
      expect(status.color).toBe('#EF4444');
    });
  });

  describe('CRUD operations', () => {
    it('saves, retrieves, updates, and deletes prescriptions', async () => {
      const input: PrescriptionInput = {
        title: 'Hipertansiyon Reçetesi',
        prescriptionCode: 'E-REC-12345',
        doctorName: 'Dr. Ali Veli',
        hospitalName: 'Devlet Hastanesi',
        prescribedDate: '2026-08-01',
        expiryDate: '2026-09-01',
        medicineIds: ['med-1'],
        notes: 'Günde 1 kez',
        isActive: true,
      };

      const saved = await savePrescription(input);
      expect(saved.id).toBeTruthy();
      expect(saved.title).toBe('Hipertansiyon Reçetesi');

      const all = await getPrescriptions();
      expect(all.length).toBeGreaterThan(0);
      expect(all.some(p => p.id === saved.id)).toBe(true);

      const updated = await updatePrescription(saved.id, { title: 'Güncellenmiş Reçete' });
      expect(updated?.title).toBe('Güncellenmiş Reçete');

      const deleted = await deletePrescription(saved.id);
      expect(deleted).toBe(true);

      const afterDelete = await getPrescriptions();
      expect(afterDelete.some(p => p.id === saved.id)).toBe(false);
    });
  });
});
