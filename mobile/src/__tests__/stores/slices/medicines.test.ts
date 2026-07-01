import { useMedicinesStore } from '../../../stores/slices/medicines';
import type { Medicine } from '../../../types';

describe('MedicinesSlice', () => {
  beforeEach(() => {
    useMedicinesStore.setState({ medicines: [], reminderTimes: [] });
  });

  const baseMedicine: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt' | 'isActive'> &
    Partial<Pick<Medicine, 'id' | 'customTimes' | 'isActive'>> = {
    name: 'Aspirin',
    dosage: '500mg',
    frequency: 2,
    color: '#FF6B6B',
    startDate: '2024-01-01',
  };

  describe('addMedicine', () => {
    it('adds medicine with generated ID', () => {
      const id = useMedicinesStore.getState().addMedicine(baseMedicine);
      const { medicines } = useMedicinesStore.getState();

      expect(medicines).toHaveLength(1);
      expect(medicines[0].id).toBe(id);
      expect(medicines[0].name).toBe('Aspirin');
    });

    it('preserves explicit ID when provided', () => {
      const id = useMedicinesStore.getState().addMedicine({ ...baseMedicine, id: 'fixed-id' });
      const { medicines } = useMedicinesStore.getState();

      expect(id).toBe('fixed-id');
      expect(medicines[0].id).toBe('fixed-id');
    });

    it('sets isActive to true by default', () => {
      useMedicinesStore.getState().addMedicine(baseMedicine);
      const { medicines } = useMedicinesStore.getState();

      expect(medicines[0].isActive).toBe(true);
    });

    it('uses first unused color from MEDICINE_COLORS palette', () => {
      useMedicinesStore.setState({
        medicines: [
          {
            ...baseMedicine,
            id: 'm1',
            isActive: true,
            color: '#FF6B6B',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          } as Medicine,
        ],
        reminderTimes: [],
      });
      useMedicinesStore.getState().addMedicine({ ...baseMedicine, color: '' });

      const { medicines } = useMedicinesStore.getState();
      expect(medicines[1].color).not.toBe('#FF6B6B');
    });

    it('uses customTimes with ${id}_${index} format', () => {
      const id = useMedicinesStore.getState().addMedicine({
        ...baseMedicine,
        customTimes: ['08:00', '14:00', '20:00'],
      });
      const { reminderTimes } = useMedicinesStore.getState();

      const medicineReminders = reminderTimes.filter(rt => rt.medicineId === id);
      expect(medicineReminders).toHaveLength(3);
      expect(medicineReminders[0].id).toBe(`${id}_0`);
      expect(medicineReminders[1].id).toBe(`${id}_1`);
      expect(medicineReminders[2].id).toBe(`${id}_2`);
      expect(medicineReminders.map(r => r.time)).toEqual(['08:00', '14:00', '20:00']);
    });

    it('uses settings.wakeUpTime/sleepTime when provided', () => {
      const id = useMedicinesStore.getState().addMedicine(baseMedicine, {
        wakeUpTime: '06:00',
        sleepTime: '22:00',
      });
      const { reminderTimes } = useMedicinesStore.getState();

      const medicineReminders = reminderTimes.filter(rt => rt.medicineId === id);
      expect(medicineReminders.length).toBeGreaterThan(0);
    });
  });

  describe('updateMedicine', () => {
    it('updates medicine properties and updatedAt', () => {
      const id = useMedicinesStore.getState().addMedicine(baseMedicine);
      const before = Date.now();

      useMedicinesStore.getState().updateMedicine(id, { name: 'Updated' });

      const { medicines } = useMedicinesStore.getState();
      expect(medicines[0].name).toBe('Updated');
      expect(new Date(medicines[0].updatedAt).getTime()).toBeGreaterThanOrEqual(before);
    });

    it('does not modify other medicines', () => {
      const id1 = useMedicinesStore.getState().addMedicine(baseMedicine);
      const id2 = useMedicinesStore.getState().addMedicine({ ...baseMedicine, name: 'Other' });

      useMedicinesStore.getState().updateMedicine(id1, { name: 'First' });

      const { medicines } = useMedicinesStore.getState();
      expect(medicines.find(m => m.id === id2)?.name).toBe('Other');
    });
  });

  describe('deleteMedicine', () => {
    it('removes medicine and its reminder times', () => {
      const id = useMedicinesStore.getState().addMedicine(baseMedicine);
      useMedicinesStore.getState().deleteMedicine(id);

      const state = useMedicinesStore.getState();
      expect(state.medicines).toHaveLength(0);
      expect(state.reminderTimes.filter(rt => rt.medicineId === id)).toHaveLength(0);
    });
  });

  describe('toggleMedicineActive', () => {
    it('toggles isActive from true to false and back', () => {
      const id = useMedicinesStore.getState().addMedicine(baseMedicine);
      expect(useMedicinesStore.getState().medicines[0].isActive).toBe(true);

      useMedicinesStore.getState().toggleMedicineActive(id);
      expect(useMedicinesStore.getState().medicines[0].isActive).toBe(false);

      useMedicinesStore.getState().toggleMedicineActive(id);
      expect(useMedicinesStore.getState().medicines[0].isActive).toBe(true);
    });
  });

  describe('getMedicineById', () => {
    it('returns medicine by id', () => {
      const id = useMedicinesStore.getState().addMedicine(baseMedicine);
      const found = useMedicinesStore.getState().getMedicineById(id);
      expect(found?.name).toBe('Aspirin');
    });

    it('returns undefined for non-existent id', () => {
      const found = useMedicinesStore.getState().getMedicineById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('getReminderTimesForMedicine', () => {
    it('returns reminder times for given medicine', () => {
      const id = useMedicinesStore.getState().addMedicine({
        ...baseMedicine,
        customTimes: ['08:00', '20:00'],
      });
      const reminders = useMedicinesStore.getState().getReminderTimesForMedicine(id);
      expect(reminders).toHaveLength(2);
    });
  });

  describe('addReminderTime', () => {
    it('adds reminder time with generated id', () => {
      const id = useMedicinesStore
        .getState()
        .addReminderTime({ medicineId: 'm1', time: '10:00', isEnabled: true });
      expect(id).toBeDefined();
      expect(useMedicinesStore.getState().reminderTimes.find(rt => rt.id === id)?.time).toBe(
        '10:00'
      );
    });
  });

  describe('getNextAvailableColor', () => {
    it('returns first unused color when medicines list is empty', () => {
      const color = useMedicinesStore.getState().getNextAvailableColor();
      expect(color).toBe('#FF6B6B');
    });

    it('returns unused color when one is available', () => {
      useMedicinesStore.setState({
        medicines: [
          {
            ...baseMedicine,
            id: 'm1',
            isActive: true,
            color: '#FF6B6B',
            createdAt: '',
            updatedAt: '',
          } as Medicine,
        ],
        reminderTimes: [],
      });
      const color = useMedicinesStore.getState().getNextAvailableColor();
      expect(color).not.toBe('#FF6B6B');
    });

    it('returns least-used color when all colors are used', () => {
      // 8 MEDICINE_COLORS var, hepsini aktif ilaçlara ata
      const colors = [
        '#FF6B6B',
        '#4ECDC4',
        '#45B7D1',
        '#96CEB4',
        '#FFD93D',
        '#C9A0DC',
        '#FF8C69',
        '#98D8C8',
      ];
      useMedicinesStore.setState({
        medicines: colors.map((c, i) => ({
          ...baseMedicine,
          id: `m${i}`,
          isActive: true,
          color: c,
          createdAt: '',
          updatedAt: '',
        })) as Medicine[],
        reminderTimes: [],
      });
      const color = useMedicinesStore.getState().getNextAvailableColor();
      expect(colors).toContain(color);
    });
  });

  describe('clearAllMedicines', () => {
    it('clears all medicines and reminder times', () => {
      useMedicinesStore.getState().addMedicine(baseMedicine);
      useMedicinesStore.getState().clearAllMedicines();

      const state = useMedicinesStore.getState();
      expect(state.medicines).toHaveLength(0);
      expect(state.reminderTimes).toHaveLength(0);
    });
  });
});
