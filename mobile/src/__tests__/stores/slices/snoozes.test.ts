import { useSnoozesStore } from '../../../stores/slices/snoozes';
import type { Snooze } from '../../../types';

const baseSnooze: Omit<Snooze, 'id' | 'isActive' | 'createdAt'> = {
  medicineId: 'med-1',
  reminderTimeId: 'rt-1',
  originalScheduledTime: '2024-06-25T08:00:00Z',
  triggerTime: '2024-06-25T08:05:00Z',
  notificationId: 'notif-1',
  snoozeCount: 1,
};

describe('SnoozesSlice', () => {
  beforeEach(() => {
    useSnoozesStore.setState({ snoozes: [] });
  });

  describe('createSnooze', () => {
    it('creates snooze with generated id and isActive=true', () => {
      const id = useSnoozesStore.getState().createSnooze(baseSnooze);
      const { snoozes } = useSnoozesStore.getState();
      expect(snoozes).toHaveLength(1);
      expect(snoozes[0].id).toBe(id);
      expect(snoozes[0].isActive).toBe(true);
      expect(snoozes[0].createdAt).toBeDefined();
    });

    it('creates multiple snoozes', () => {
      useSnoozesStore.getState().createSnooze(baseSnooze);
      useSnoozesStore.getState().createSnooze({
        ...baseSnooze,
        reminderTimeId: 'rt-2',
        snoozeCount: 2,
      });
      expect(useSnoozesStore.getState().snoozes).toHaveLength(2);
    });
  });

  describe('deactivateSnooze', () => {
    it('sets isActive=false for given snooze', () => {
      const id = useSnoozesStore.getState().createSnooze(baseSnooze);
      useSnoozesStore.getState().deactivateSnooze(id);
      expect(useSnoozesStore.getState().snoozes[0].isActive).toBe(false);
    });

    it('does not modify other snoozes', () => {
      const id1 = useSnoozesStore.getState().createSnooze(baseSnooze);
      const id2 = useSnoozesStore.getState().createSnooze({
        ...baseSnooze,
        reminderTimeId: 'rt-2',
      });
      useSnoozesStore.getState().deactivateSnooze(id1);

      const { snoozes } = useSnoozesStore.getState();
      expect(snoozes.find(s => s.id === id1)?.isActive).toBe(false);
      expect(snoozes.find(s => s.id === id2)?.isActive).toBe(true);
    });
  });

  describe('deactivateAllSnoozes', () => {
    it('sets isActive=false for all snoozes', () => {
      useSnoozesStore.getState().createSnooze(baseSnooze);
      useSnoozesStore.getState().createSnooze({ ...baseSnooze, reminderTimeId: 'rt-2' });

      useSnoozesStore.getState().deactivateAllSnoozes();

      const { snoozes } = useSnoozesStore.getState();
      expect(snoozes.every(s => !s.isActive)).toBe(true);
    });
  });

  describe('cleanupStaleSnoozes', () => {
    it('removes snoozes with past triggerTime', () => {
      // Future snooze (should remain)
      const future = new Date(Date.now() + 3600 * 1000).toISOString();
      useSnoozesStore.getState().createSnooze({ ...baseSnooze, triggerTime: future });

      // Past snooze (should be removed)
      const past = new Date(Date.now() - 3600 * 1000).toISOString();
      useSnoozesStore.getState().createSnooze({
        ...baseSnooze,
        triggerTime: past,
        reminderTimeId: 'rt-stale',
      });

      const cleaned = useSnoozesStore.getState().cleanupStaleSnoozes();
      expect(cleaned).toBe(1);
      expect(useSnoozesStore.getState().snoozes).toHaveLength(1);
    });

    it('returns 0 when no stale snoozes', () => {
      const future = new Date(Date.now() + 3600 * 1000).toISOString();
      useSnoozesStore.getState().createSnooze({ ...baseSnooze, triggerTime: future });

      const cleaned = useSnoozesStore.getState().cleanupStaleSnoozes();
      expect(cleaned).toBe(0);
    });
  });

  describe('clearAllSnoozes', () => {
    it('removes all snoozes', () => {
      useSnoozesStore.getState().createSnooze(baseSnooze);
      useSnoozesStore.getState().clearAllSnoozes();
      expect(useSnoozesStore.getState().snoozes).toHaveLength(0);
    });
  });
});
