import {
  buildAlarmNotificationId,
  buildSnoozeNotificationId,
  getAlarmKey,
  getNotificationIdForAlarmData,
  hasAlarmBeenLoggedToday,
  handleIncomingAlarmNavigation,
  AlarmNavigationData,
  AlarmNavigationDependencies,
  AlarmNavigationStore,
} from '../../utils/alarmNavigation';
import type { Medicine, ReminderTime, Snooze, MedicineLog } from '../../types';

describe('alarmNavigation utils', () => {
  describe('buildAlarmNotificationId', () => {
    it('formats as alarm-{medicineId}-{reminderTimeId}', () => {
      expect(buildAlarmNotificationId('med-1', 'rt-1')).toBe('alarm-med-1-rt-1');
    });
  });

  describe('buildSnoozeNotificationId', () => {
    it('formats as snooze-{medicineId}-{reminderTimeId}', () => {
      expect(buildSnoozeNotificationId('med-1', 'rt-1')).toBe('snooze-med-1-rt-1');
    });
  });

  describe('getAlarmKey', () => {
    it('builds minute-level unique key', () => {
      const data: AlarmNavigationData = {
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-06-25T08:00:00Z',
      };
      const now = new Date('2024-06-25T08:00:30Z');
      const key = getAlarmKey(data, now);
      expect(key).toContain('med-1');
      expect(key).toContain('rt-1');
      // Dakika seviyesinde — ayni dakika icinde ayni key
    });

    /**
     * ⚠️ v1.7.4 — BU TEST ESKIDEN HATAYI SABITLIYORDU.
     * Adi "produces different keys for different minutes" idi ve
     * `expect(key1).not.toBe(key2)` diyordu. Yani anahtarin duvar saati
     * dakikasina baglı olmasi BILEREK dogrulaniyordu. Oysa ayni calmanin
     * girisleri saniyeler arayla gelir; calma dakika sinirina denk gelince
     * iki yol iki FARKLI anahtar uretiyor, tekillestirme tutmuyor ve alarm
     * ekrani ust uste iki kez aciliyordu (bkz. utils/notifications/alarmDedup.ts).
     * Dogru iddia bunun TERSI: anahtar YALNIZCA dozun kimligine baglidir.
     */
    it('ayni doz icin anahtar duvar saatinden BAGIMSIZDIR (dakika siniri regresyonu)', () => {
      const data: AlarmNavigationData = {
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-06-25T08:00:00Z',
      };
      const key1 = getAlarmKey(data, new Date('2024-06-25T08:00:59.800Z'));
      const key2 = getAlarmKey(data, new Date('2024-06-25T08:01:00.300Z'));
      expect(key1).toBe(key2);
      expect(key1).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it('erteleme calmasi ana alarmdan ayri anahtar alir', () => {
      const base: AlarmNavigationData = {
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-06-25T08:00:00Z',
      };
      const now = new Date('2024-06-25T08:00:30Z');
      expect(getAlarmKey({ ...base, isSnooze: 'true', snoozeId: 'sn-1' }, now)).not.toBe(
        getAlarmKey(base, now)
      );
    });
  });

  describe('getNotificationIdForAlarmData', () => {
    /**
     * v1.7.1: eskiden 2 parametreli `snooze-<med>-<rt>` uretiliyordu ve bu test
     * o degeri PINLIYORDU. Ama `scheduleSnoozeNotification` (ve boot geri
     * yuklemesi) bildirimi 3 parametreli `snooze-<med>-<rt>-<snoozeId>`
     * kimligiyle olusturuyor — yani `dismissCurrentNotification` var olmayan
     * bir kimligi iptal ediyor, erteleme bildirimi ekranda kaliyordu.
     */
    it('returns the 3-part snooze ID (matches the notification actually created)', () => {
      const data: AlarmNavigationData = {
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-06-25T08:00:00Z',
        isSnooze: 'true',
        snoozeId: 'snooze-1',
      };
      expect(getNotificationIdForAlarmData(data)).toBe('snooze-med-1-rt-1-snooze-1');
    });

    it('returns alarm ID when isSnooze is false or missing', () => {
      const data: AlarmNavigationData = {
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-06-25T08:00:00Z',
      };
      expect(getNotificationIdForAlarmData(data)).toBe('alarm-med-1-rt-1');
    });
  });

  describe('hasAlarmBeenLoggedToday', () => {
    it('returns true when log exists for today with taken status', () => {
      const logs: AlarmNavigationStore['medicineLogs'] = [
        {
          medicineId: 'med-1',
          reminderTimeId: 'rt-1',
          scheduledTime: '2024-06-25T08:00:00Z',
          status: 'taken',
        },
      ];
      const data: AlarmNavigationData = {
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-06-25T08:00:00Z',
      };
      expect(hasAlarmBeenLoggedToday(logs, data, new Date('2024-06-25T10:00:00Z'))).toBe(true);
    });

    it('returns false when no log exists', () => {
      const data: AlarmNavigationData = {
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-06-25T08:00:00Z',
      };
      expect(hasAlarmBeenLoggedToday([], data, new Date('2024-06-25T10:00:00Z'))).toBe(false);
    });

    // ⚠️ v1.7.4 REGRESYON — bu test eskiden YANLIS POZITIF geciyordu.
    // Fixture'da `medicineId` YOKTU (tip de zorunlu tutmuyordu), kod ise
    // `(log as any).medicineId === data.medicineId` OR dalina bakiyordu.
    // Gercek hayatta `medicineId` her logda dolu oldugu icin bu senaryo
    // (ayni ilacin SABAH dozu alinmis, AKSAM dozu bekliyor) uretimde `true`
    // donuyor ve aksam alarmi hic calmiyordu. Fixture artik gercekci.
    it('returns false when log exists but for different reminderTimeId (ayni ilacin baska dozu)', () => {
      const logs: AlarmNavigationStore['medicineLogs'] = [
        {
          medicineId: 'med-1',
          reminderTimeId: 'rt-OTHER',
          scheduledTime: '2024-06-25T08:00:00Z',
          status: 'taken',
        },
      ];
      const data: AlarmNavigationData = {
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-06-25T20:00:00Z',
      };
      expect(hasAlarmBeenLoggedToday(logs, data, new Date('2024-06-25T20:00:00Z'))).toBe(false);
    });

    it('atlanan doz da cozumlenmis sayilir (ayni reminderTimeId)', () => {
      const logs: AlarmNavigationStore['medicineLogs'] = [
        {
          medicineId: 'med-1',
          reminderTimeId: 'rt-1',
          scheduledTime: '2024-06-25T08:00:00Z',
          status: 'skipped',
        },
      ];
      const data: AlarmNavigationData = {
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-06-25T08:00:00Z',
      };
      expect(hasAlarmBeenLoggedToday(logs, data, new Date('2024-06-25T10:00:00Z'))).toBe(true);
    });

    it('bekleyen (pending) log alarmi susturmaz', () => {
      const logs: AlarmNavigationStore['medicineLogs'] = [
        {
          medicineId: 'med-1',
          reminderTimeId: 'rt-1',
          scheduledTime: '2024-06-25T08:00:00Z',
          status: 'pending',
        },
      ];
      const data: AlarmNavigationData = {
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-06-25T08:00:00Z',
      };
      expect(hasAlarmBeenLoggedToday(logs, data, new Date('2024-06-25T10:00:00Z'))).toBe(false);
    });
  });

  describe('handleIncomingAlarmNavigation (Sprint 6)', () => {
    const mockMedicine: Medicine = {
      id: 'med-1',
      name: 'Test Med',
      dosage: '500mg',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      isActive: true,
      color: '#FF6B6B',
      frequency: { type: 'daily' } as unknown as Medicine['frequency'],
    } as unknown as Medicine;

    const mockReminderTime: ReminderTime = {
      id: 'rt-1',
      medicineId: 'med-1',
      time: '08:00',
      isEnabled: true,
    };

    function makeDeps(
      overrides?: Partial<AlarmNavigationDependencies>
    ): AlarmNavigationDependencies {
      const activeKeys = new Set<string>();
      const store: AlarmNavigationStore = {
        getMedicineById: jest.fn().mockReturnValue(mockMedicine),
        getReminderTimesForMedicine: jest.fn().mockReturnValue([mockReminderTime]),
        medicineLogs: [],
        snoozes: [] as Snooze[],
        setAlarmActive: jest.fn(),
        deactivateSnooze: jest.fn(),
      };

      return {
        now: () => new Date('2024-06-25T08:00:30Z'),
        isAlarmHandled: jest.fn().mockResolvedValue(false),
        navigationReady: true,
        setPendingAlarm: jest.fn(),
        activeAlarmKeys: activeKeys,
        scheduleAlarmKeyCleanup: jest.fn(),
        navigateToAlarmScreen: jest.fn(),
        cancelMedicineNotifications: jest.fn().mockResolvedValue(undefined),
        storeState: store,
        logger: { debug: jest.fn(), warn: jest.fn() },
        ...overrides,
      };
    }

    const baseData: AlarmNavigationData = {
      medicineId: 'med-1',
      reminderTimeId: 'rt-1',
      scheduledTime: '2024-06-25T08:00:00Z',
    };

    it('returns "handled" when isAlarmHandled is true', async () => {
      const deps = makeDeps({
        isAlarmHandled: jest
          .fn()
          .mockResolvedValue(true) as AlarmNavigationDependencies['isAlarmHandled'],
      });

      const result = await handleIncomingAlarmNavigation(baseData, deps);

      expect(result).toBe('handled');
      expect(deps.navigateToAlarmScreen).not.toHaveBeenCalled();
    });

    it('returns "queued" and calls setPendingAlarm when navigation not ready', async () => {
      const deps = makeDeps({ navigationReady: false });

      const result = await handleIncomingAlarmNavigation(baseData, deps);

      expect(result).toBe('queued');
      expect(deps.setPendingAlarm).toHaveBeenCalledWith(baseData);
      expect(deps.navigateToAlarmScreen).not.toHaveBeenCalled();
    });

    it('returns "duplicate" when alarm key already in active set', async () => {
      const deps = makeDeps();
      // Pre-populate active keys with the alarm key. Pure function uses
      // date-fns format(now, 'yyyy-MM-dd-HH-mm') which respects local timezone.
      // With now = 2024-06-25T08:00:30Z, the format yields local time.
      // We compute it via the same format for consistency.
      const alarmKey = getAlarmKey(baseData, new Date('2024-06-25T08:00:30Z'));
      deps.activeAlarmKeys.add(alarmKey);

      const result = await handleIncomingAlarmNavigation(baseData, deps);

      expect(result).toBe('duplicate');
      expect(deps.navigateToAlarmScreen).not.toHaveBeenCalled();
    });

    it('returns "dismissed" and cancels notifications when medicine is missing', async () => {
      const deps = makeDeps();
      (deps.storeState.getMedicineById as jest.Mock).mockReturnValue(undefined);

      const result = await handleIncomingAlarmNavigation(baseData, deps);

      expect(result).toBe('dismissed');
      expect(deps.cancelMedicineNotifications).toHaveBeenCalledWith('med-1');
      expect(deps.navigateToAlarmScreen).not.toHaveBeenCalled();
    });

    it('returns "dismissed" and deactivates snooze when alarm already logged today', async () => {
      const snooze: Snooze = {
        id: 'sn-1',
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        originalScheduledTime: '2024-06-25T08:00:00Z',
        triggerTime: '2024-06-25T08:05:00Z',
        isActive: true,
        createdAt: '2024-06-25T08:00:00Z',
        notificationId: 'notif-1',
        snoozeCount: 1,
      };
      const loggedToday: MedicineLog = {
        id: 'log-1',
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-06-25T08:00:00Z',
        status: 'taken',
        takenAt: '2024-06-25T08:01:00Z',
      };
      const deps = makeDeps({
        storeState: {
          ...makeDeps().storeState,
          medicineLogs: [loggedToday],
          snoozes: [snooze],
        },
      });
      const dataWithSnooze: AlarmNavigationData = {
        ...baseData,
        isSnooze: 'true',
        snoozeId: 'sn-1',
      };

      const result = await handleIncomingAlarmNavigation(dataWithSnooze, deps);

      expect(result).toBe('dismissed');
      expect(deps.storeState.deactivateSnooze).toHaveBeenCalledWith('sn-1');
      expect(deps.navigateToAlarmScreen).not.toHaveBeenCalled();
    });

    it('returns "dismissed" when snooze is inactive', async () => {
      const inactiveSnooze: Snooze = {
        id: 'sn-1',
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        originalScheduledTime: '2024-06-25T08:00:00Z',
        triggerTime: '2024-06-25T08:05:00Z',
        isActive: false,
        createdAt: '2024-06-25T08:00:00Z',
        notificationId: 'notif-1',
        snoozeCount: 1,
      };
      const deps = makeDeps({
        storeState: {
          ...makeDeps().storeState,
          snoozes: [inactiveSnooze],
        },
      });
      const dataWithSnooze: AlarmNavigationData = {
        ...baseData,
        isSnooze: 'true',
        snoozeId: 'sn-1',
      };

      const result = await handleIncomingAlarmNavigation(dataWithSnooze, deps);

      expect(result).toBe('dismissed');
      expect(deps.navigateToAlarmScreen).not.toHaveBeenCalled();
    });

    it('returns "navigated" with all side effects when valid', async () => {
      const deps = makeDeps();

      const result = await handleIncomingAlarmNavigation(baseData, deps);

      expect(result).toBe('navigated');
      expect(deps.navigateToAlarmScreen).toHaveBeenCalledWith({
        medicineId: 'med-1',
        reminderTimeId: 'rt-1',
        scheduledTime: '2024-06-25T08:00:00Z',
        snoozeCount: undefined,
        originalScheduledTime: undefined,
        isSnooze: undefined,
        snoozeId: undefined,
      });
      expect(deps.scheduleAlarmKeyCleanup).toHaveBeenCalledTimes(1);
      expect(deps.storeState.setAlarmActive).toHaveBeenCalledWith(
        mockMedicine,
        mockReminderTime,
        '2024-06-25T08:00:00Z'
      );
      // Active keys should include the alarm key
      const expectedKey = getAlarmKey(baseData, new Date('2024-06-25T08:00:30Z'));
      expect(deps.activeAlarmKeys.has(expectedKey)).toBe(true);
    });

    it('parses snoozeCount as integer when present', async () => {
      const deps = makeDeps();
      const dataWithCount: AlarmNavigationData = {
        ...baseData,
        snoozeCount: '3',
      };

      const result = await handleIncomingAlarmNavigation(dataWithCount, deps);

      expect(result).toBe('navigated');
      expect(deps.navigateToAlarmScreen).toHaveBeenCalledWith(
        expect.objectContaining({ snoozeCount: 3 })
      );
    });

    it('rejects premature alarms scheduled > 15 minutes in the future', async () => {
      // Alarm 12:00'de ama su an 08:00 (4 saat once sahte tetikleme geldi)
      const mockReminder12: ReminderTime = {
        ...mockReminderTime,
        id: 'rt-12',
        time: '12:00',
      };
      const deps = makeDeps({
        now: () => new Date('2024-06-25T08:00:00Z'),
        storeState: {
          ...makeDeps().storeState,
          getReminderTimesForMedicine: jest.fn().mockReturnValue([mockReminder12]),
        },
      });
      const prematureData: AlarmNavigationData = {
        medicineId: 'med-1',
        reminderTimeId: 'rt-12',
        scheduledTime: '2024-06-25T12:00:00Z',
      };

      const result = await handleIncomingAlarmNavigation(prematureData, deps);

      expect(result).toBe('dismissed');
      expect(deps.navigateToAlarmScreen).not.toHaveBeenCalled();
    });

    it('returns "navigated" in test mode without store checks', async () => {
      const deps = makeDeps();
      const testModeData: AlarmNavigationData = {
        ...baseData,
        medicineId: 'test-medicine',
      };

      const result = await handleIncomingAlarmNavigation(testModeData, deps);

      expect(result).toBe('navigated');
      expect(deps.storeState.getMedicineById).not.toHaveBeenCalled();
      expect(deps.navigateToAlarmScreen).toHaveBeenCalled();
    });
  });
});
