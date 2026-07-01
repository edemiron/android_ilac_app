import { useLogsStore } from '../../../stores/slices/logs';
import type { MedicineLog } from '../../../types';

describe('LogsSlice', () => {
  beforeEach(() => {
    useLogsStore.setState({ medicineLogs: [] });
  });

  describe('logMedicineTaken', () => {
    it('creates taken log with generated ID and takenAt', () => {
      const id = useLogsStore.getState().logMedicineTaken('rt-1', '2024-06-25T08:00:00Z');
      const { medicineLogs } = useLogsStore.getState();

      expect(medicineLogs).toHaveLength(1);
      expect(medicineLogs[0].id).toBe(id);
      expect(medicineLogs[0].status).toBe('taken');
      expect(medicineLogs[0].takenAt).toBeDefined();
    });

    it('uses provided medicineId', () => {
      const id = useLogsStore.getState().logMedicineTaken('rt-1', '2024-06-25T08:00:00Z', {
        medicineId: 'med-1',
      });
      const { medicineLogs } = useLogsStore.getState();
      expect(medicineLogs[0].medicineId).toBe('med-1');
    });

    it('uses provided note', () => {
      useLogsStore.getState().logMedicineTaken('rt-1', '2024-06-25T08:00:00Z', {
        note: 'with food',
      });
      const { medicineLogs } = useLogsStore.getState();
      expect(medicineLogs[0].note).toBe('with food');
    });
  });

  describe('logMedicineSkipped', () => {
    it('creates skipped log with status', () => {
      const id = useLogsStore.getState().logMedicineSkipped('rt-2', '2024-06-25T10:00:00Z');
      const { medicineLogs } = useLogsStore.getState();
      expect(medicineLogs[0].status).toBe('skipped');
      expect(medicineLogs[0].id).toBe(id);
    });
  });

  describe('logMedicineMissed', () => {
    it('creates missed log with status', () => {
      const id = useLogsStore.getState().logMedicineMissed('rt-3', '2024-06-25T12:00:00Z');
      const { medicineLogs } = useLogsStore.getState();
      expect(medicineLogs[0].status).toBe('missed');
      expect(medicineLogs[0].id).toBe(id);
    });
  });

  describe('deleteLog', () => {
    it('removes log by id', () => {
      const id = useLogsStore.getState().logMedicineTaken('rt-1', '2024-06-25T08:00:00Z');
      useLogsStore.getState().deleteLog(id);
      expect(useLogsStore.getState().medicineLogs).toHaveLength(0);
    });

    it('does not modify others when deleting non-existent log', () => {
      const id1 = useLogsStore.getState().logMedicineTaken('rt-1', '2024-06-25T08:00:00Z');
      const id2 = useLogsStore.getState().logMedicineTaken('rt-2', '2024-06-25T10:00:00Z');

      useLogsStore.getState().deleteLog('non-existent');

      const { medicineLogs } = useLogsStore.getState();
      expect(medicineLogs).toHaveLength(2);
      expect(medicineLogs.map(l => l.id)).toEqual([id1, id2]);
    });
  });

  describe('replaceMedicineLogs', () => {
    it('replaces medicineLogs with provided array', () => {
      useLogsStore.getState().logMedicineTaken('rt-1', '2024-06-25T08:00:00Z');
      const newLogs: MedicineLog[] = [
        {
          id: 'log-new',
          medicineId: 'med-1',
          reminderTimeId: 'rt-1',
          scheduledTime: '2024-06-25T08:00:00Z',
          status: 'taken',
          takenAt: '2024-06-25T08:01:00Z',
        },
      ];
      useLogsStore.getState().replaceMedicineLogs(newLogs);
      expect(useLogsStore.getState().medicineLogs).toEqual(newLogs);
    });

    it('accepts empty array to clear all logs', () => {
      useLogsStore.getState().logMedicineTaken('rt-1', '2024-06-25T08:00:00Z');
      useLogsStore.getState().replaceMedicineLogs([]);
      expect(useLogsStore.getState().medicineLogs).toHaveLength(0);
    });
  });

  describe('clearAllLogs', () => {
    it('clears all medicineLogs', () => {
      useLogsStore.getState().logMedicineTaken('rt-1', '2024-06-25T08:00:00Z');
      useLogsStore.getState().logMedicineSkipped('rt-2', '2024-06-25T10:00:00Z');
      useLogsStore.getState().clearAllLogs();
      expect(useLogsStore.getState().medicineLogs).toHaveLength(0);
    });
  });
});
