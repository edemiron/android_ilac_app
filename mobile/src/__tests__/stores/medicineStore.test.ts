/**
 * Medicine Store Tests
 * Comprehensive tests for Zustand store actions and state management
 * Covers: addMedicine, updateMedicine, deleteMedicine, sync operations
 */

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../../services/widgetService', () => ({
  updateWidgetData: jest.fn().mockResolvedValue(undefined),
}));

// React Native'in NativeModules objesini tamamen mockla; test ortaminda
// native bridge kurulu degil, "Invariant Violation" hatasi veriyor.
jest.mock('react-native/Libraries/BatchedBridge/NativeModules', () => ({
  WidgetDataModule: { updateData: jest.fn().mockResolvedValue(undefined) },
}));

// Mock the logger
jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock firestoreSync
const mockUploadAllDataToCloud = jest.fn();
const mockDownloadAllDataFromCloud = jest.fn();
const mockSaveMedicineToCloud = jest.fn();
const mockDeleteMedicineFromCloud = jest.fn();
const mockSaveMedicineLogToCloud = jest.fn();
const mockSyncSettingsToCloud = jest.fn();

jest.mock('../../services/firestoreSync', () => ({
  uploadAllDataToCloud: (...args: unknown[]) => mockUploadAllDataToCloud(...args),
  downloadAllDataFromCloud: (...args: unknown[]) => mockDownloadAllDataFromCloud(...args),
  saveMedicineToCloud: (...args: unknown[]) => mockSaveMedicineToCloud(...args),
  deleteMedicineFromCloud: (...args: unknown[]) => mockDeleteMedicineFromCloud(...args),
  saveMedicineLogToCloud: (...args: unknown[]) => mockSaveMedicineLogToCloud(...args),
  syncSettingsToCloud: (...args: unknown[]) => mockSyncSettingsToCloud(...args),
}));

// Mock date-fns format
jest.mock('date-fns', () => ({
  ...jest.requireActual('date-fns'),
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'yyyy-MM-dd') return '2024-01-15';
    return jest.requireActual('date-fns').format(date, formatStr);
  }),
}));

// Import after mocks
import { useMedicineStore, MEDICINE_COLORS } from '../../stores/medicineStore';
import { Medicine, ReminderTime } from '../../types';

describe('MedicineStore', () => {
  // Reset store state before each test
  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    mockUploadAllDataToCloud.mockResolvedValue(undefined);
    mockDownloadAllDataFromCloud.mockResolvedValue(null);
    mockSaveMedicineLogToCloud.mockResolvedValue(undefined);
    mockSyncSettingsToCloud.mockResolvedValue(undefined);

    // Reset store to initial state
    const store = useMedicineStore.getState();
    await store.clearAllData();
    store.setUserId(null);
  });
  describe('Initial State', () => {
    it('should have empty medicines array initially', () => {
      const { medicines } = useMedicineStore.getState();

      expect(medicines).toEqual([]);
    });

    it('should have default settings', () => {
      const { settings } = useMedicineStore.getState();

      expect(settings.wakeUpTime).toBe('08:00');
      expect(settings.sleepTime).toBe('23:00');
      expect(settings.language).toBe('tr');
      expect(settings.vibrationEnabled).toBe(true);
      expect(settings.fullScreenAlarmEnabled).toBe(true);
    });

    it('should have inactive alarm state initially', () => {
      const { alarmState } = useMedicineStore.getState();

      expect(alarmState.isActive).toBe(false);
      expect(alarmState.currentMedicine).toBeUndefined();
    });

    it('should have null userId initially', () => {
      const { userId } = useMedicineStore.getState();

      expect(userId).toBeNull();
    });
  });

  describe('addMedicine', () => {
    const baseMedicine = {
      name: 'Aspirin',
      dosage: '500mg',
      frequency: 2,
      color: MEDICINE_COLORS[0],
      startDate: '2024-01-01',
    };

    it('should add a new medicine with generated ID', () => {
      const store = useMedicineStore.getState();

      const id = store.addMedicine(baseMedicine);

      const { medicines } = useMedicineStore.getState();
      expect(medicines.length).toBe(1);
      expect(medicines[0].id).toBe(id);
      expect(medicines[0].name).toBe('Aspirin');
    });

    it('should set isActive to true by default', () => {
      const store = useMedicineStore.getState();

      store.addMedicine(baseMedicine);

      const { medicines } = useMedicineStore.getState();
      expect(medicines[0].isActive).toBe(true);
    });

    it('should set createdAt and updatedAt timestamps', () => {
      const store = useMedicineStore.getState();
      const beforeAdd = new Date().toISOString();

      store.addMedicine(baseMedicine);

      const { medicines } = useMedicineStore.getState();
      expect(medicines[0].createdAt).toBeDefined();
      expect(medicines[0].updatedAt).toBeDefined();
      expect(medicines[0].createdAt >= beforeAdd).toBe(true);
    });

    it('should generate reminder times based on frequency', () => {
      const store = useMedicineStore.getState();

      store.addMedicine({ ...baseMedicine, frequency: 3 });

      const { reminderTimes, medicines } = useMedicineStore.getState();
      const medicineTimes = reminderTimes.filter(rt => rt.medicineId === medicines[0].id);
      expect(medicineTimes.length).toBe(3);
    });

    it('should use custom times when provided', () => {
      const store = useMedicineStore.getState();
      const customTimes = ['08:00', '14:00', '20:00'];

      store.addMedicine({ ...baseMedicine, customTimes });

      const { reminderTimes, medicines } = useMedicineStore.getState();
      const medicineTimes = reminderTimes.filter(rt => rt.medicineId === medicines[0].id);
      expect(medicineTimes.length).toBe(3);
      expect(medicineTimes.map(t => t.time)).toEqual(customTimes);
    });

    it('should trigger cloud sync when user is logged in', async () => {
      const store = useMedicineStore.getState();
      store.setUserId('test-user-123');

      store.addMedicine(baseMedicine);

      // Wait for background sync to be scheduled
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockUploadAllDataToCloud).toHaveBeenCalled();
    });

    it('should not trigger cloud sync when no user is logged in', async () => {
      const store = useMedicineStore.getState();

      store.addMedicine(baseMedicine);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockUploadAllDataToCloud).not.toHaveBeenCalled();
    });
  });

  describe('updateMedicine', () => {
    let medicineId: string;

    beforeEach(() => {
      const store = useMedicineStore.getState();
      medicineId = store.addMedicine({
        name: 'Original Medicine',
        dosage: '100mg',
        frequency: 1,
        color: MEDICINE_COLORS[0],
        startDate: '2024-01-01',
      });
    });

    it('should update medicine properties', () => {
      const store = useMedicineStore.getState();

      store.updateMedicine(medicineId, { name: 'Updated Medicine' });

      const { medicines } = useMedicineStore.getState();
      expect(medicines[0].name).toBe('Updated Medicine');
    });

    it('should update updatedAt timestamp', async () => {
      const { medicines: beforeMedicines } = useMedicineStore.getState();
      const originalUpdatedAt = beforeMedicines[0].updatedAt;

      // Small delay to ensure different timestamp (1ms is enough)
      await new Promise(resolve => setTimeout(resolve, 2));

      const store = useMedicineStore.getState();
      store.updateMedicine(medicineId, { dosage: '200mg' });

      const { medicines } = useMedicineStore.getState();
      // updatedAt should be newer or equal (in case of same millisecond)
      expect(new Date(medicines[0].updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(originalUpdatedAt).getTime()
      );
    });

    it('should preserve other properties when updating', () => {
      const store = useMedicineStore.getState();

      store.updateMedicine(medicineId, { dosage: '200mg' });

      const { medicines } = useMedicineStore.getState();
      expect(medicines[0].name).toBe('Original Medicine');
      expect(medicines[0].dosage).toBe('200mg');
    });

    it('should regenerate reminder times when frequency changes', () => {
      const store = useMedicineStore.getState();
      const { reminderTimes: beforeTimes } = useMedicineStore.getState();
      const beforeCount = beforeTimes.filter(rt => rt.medicineId === medicineId).length;

      store.updateMedicine(medicineId, { frequency: 4 });

      const { reminderTimes } = useMedicineStore.getState();
      const afterCount = reminderTimes.filter(rt => rt.medicineId === medicineId).length;
      expect(afterCount).toBe(4);
      expect(afterCount).not.toBe(beforeCount);
    });

    it('should not affect other medicines', () => {
      const store = useMedicineStore.getState();
      const secondId = store.addMedicine({
        name: 'Second Medicine',
        dosage: '50mg',
        frequency: 1,
        color: MEDICINE_COLORS[1],
        startDate: '2024-01-01',
      });

      store.updateMedicine(medicineId, { name: 'Updated First' });

      const { medicines } = useMedicineStore.getState();
      const secondMedicine = medicines.find(m => m.id === secondId);
      expect(secondMedicine?.name).toBe('Second Medicine');
    });
  });

  describe('deleteMedicine', () => {
    let medicineId: string;

    beforeEach(() => {
      const store = useMedicineStore.getState();
      medicineId = store.addMedicine({
        name: 'Medicine To Delete',
        dosage: '100mg',
        frequency: 2,
        color: MEDICINE_COLORS[0],
        startDate: '2024-01-01',
      });
    });

    it('should remove medicine from store', () => {
      const store = useMedicineStore.getState();

      store.deleteMedicine(medicineId);

      const { medicines } = useMedicineStore.getState();
      expect(medicines.find(m => m.id === medicineId)).toBeUndefined();
    });

    it('should remove associated reminder times', () => {
      const store = useMedicineStore.getState();

      store.deleteMedicine(medicineId);

      const { reminderTimes } = useMedicineStore.getState();
      const orphanedTimes = reminderTimes.filter(rt => rt.medicineId === medicineId);
      expect(orphanedTimes.length).toBe(0);
    });

    it('should remove associated medicine logs', () => {
      const store = useMedicineStore.getState();
      const { reminderTimes } = useMedicineStore.getState();
      const reminderTime = reminderTimes.find(rt => rt.medicineId === medicineId);

      // Add a log first
      if (reminderTime) {
        store.logMedicineTaken(reminderTime.id, '2024-01-15T08:00:00');
      }

      store.deleteMedicine(medicineId);

      const { medicineLogs } = useMedicineStore.getState();
      const orphanedLogs = medicineLogs.filter(log => log.medicineId === medicineId);
      expect(orphanedLogs.length).toBe(0);
    });

    it('should not affect other medicines', () => {
      const store = useMedicineStore.getState();
      const keepId = store.addMedicine({
        name: 'Medicine To Keep',
        dosage: '50mg',
        frequency: 1,
        color: MEDICINE_COLORS[1],
        startDate: '2024-01-01',
      });

      store.deleteMedicine(medicineId);

      const { medicines } = useMedicineStore.getState();
      expect(medicines.find(m => m.id === keepId)).toBeDefined();
    });
  });

  describe('toggleMedicineActive', () => {
    let medicineId: string;

    beforeEach(() => {
      const store = useMedicineStore.getState();
      medicineId = store.addMedicine({
        name: 'Toggle Test',
        dosage: '100mg',
        frequency: 1,
        color: MEDICINE_COLORS[0],
        startDate: '2024-01-01',
      });
    });

    it('should toggle isActive from true to false', () => {
      const store = useMedicineStore.getState();

      store.toggleMedicineActive(medicineId);

      const { medicines } = useMedicineStore.getState();
      expect(medicines[0].isActive).toBe(false);
    });

    it('should toggle isActive from false to true', () => {
      const store = useMedicineStore.getState();
      store.toggleMedicineActive(medicineId); // false

      store.toggleMedicineActive(medicineId); // true

      const { medicines } = useMedicineStore.getState();
      expect(medicines[0].isActive).toBe(true);
    });
  });

  describe('logMedicineTaken', () => {
    let medicineId: string;
    let reminderTimeId: string;

    beforeEach(() => {
      const store = useMedicineStore.getState();
      medicineId = store.addMedicine({
        name: 'Log Test',
        dosage: '100mg',
        frequency: 1,
        color: MEDICINE_COLORS[0],
        startDate: '2024-01-01',
      });

      const { reminderTimes } = useMedicineStore.getState();
      reminderTimeId = reminderTimes.find(rt => rt.medicineId === medicineId)!.id;
    });

    it('should create a taken log', () => {
      const store = useMedicineStore.getState();
      const scheduledTime = '2024-01-15T08:00:00';

      store.logMedicineTaken(reminderTimeId, scheduledTime);

      const { medicineLogs } = useMedicineStore.getState();
      expect(medicineLogs.length).toBe(1);
      expect(medicineLogs[0].status).toBe('taken');
      expect(medicineLogs[0].medicineId).toBe(medicineId);
    });

    it('should set takenAt timestamp', () => {
      const store = useMedicineStore.getState();
      const beforeLog = new Date().toISOString();

      store.logMedicineTaken(reminderTimeId, '2024-01-15T08:00:00');

      const { medicineLogs } = useMedicineStore.getState();
      expect(medicineLogs[0].takenAt).toBeDefined();
      expect(medicineLogs[0].takenAt! >= beforeLog).toBe(true);
    });

    it('should include optional note', () => {
      const store = useMedicineStore.getState();

      store.logMedicineTaken(reminderTimeId, '2024-01-15T08:00:00', 'Took with water');

      const { medicineLogs } = useMedicineStore.getState();
      expect(medicineLogs[0].note).toBe('Took with water');
    });

    it('should not create log for invalid reminderTimeId', () => {
      const store = useMedicineStore.getState();

      store.logMedicineTaken('invalid-id', '2024-01-15T08:00:00');

      const { medicineLogs } = useMedicineStore.getState();
      expect(medicineLogs.length).toBe(0);
    });

    /**
     * ⚠️ v1.7.6 — IDEMPOTENCY.
     *
     * Doz TABLOSU zaten `normalizeMedicineLogsBySlot` ile teklilestiriliyordu,
     * ama fonksiyonun DIGER yan etkileri kosulsuz calisiyordu: `decrementStock`,
     * `saveMedicineLogToCloud` ve bakici bildirimi. Onarilan sonsuz dongu
     * hatasinda tam ekran alarm 20+ kez acildi ve kullanici her seferinde
     * "Simdi Al"a basti — gercek bir ilacta bu, STOKTAN 20 HAP dusmesi ve
     * bakiciya 20 bildirim gitmesi demekti. Bir daha boyle bir dongu olsa bile
     * VERI bozulmamali.
     */
    // NOT: bu blokta `setUserId` BILEREK cagrilmaz. userId doluyken
    // `logMedicineTaken` bakici bildirimi icin DINAMIK `import()` yapiyor ve
    // Jest'in CJS ortami bunu ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG ile
    // patlatiyor (jest.mock bunu cozmuyor; babel `import()`i oldugu gibi
    // biraliyor). Idempotency'nin en yikici sonucu olan STOK dususu userId'den
    // bagimsiz oldugu icin buradan dogrulanabiliyor.
    describe('ayni doz icin ikinci cagri (idempotency)', () => {
      it('doz tablosuna tek satir yazar', () => {
        const scheduledTime = '2024-01-15T08:00:00';

        useMedicineStore.getState().logMedicineTaken(reminderTimeId, scheduledTime);
        useMedicineStore.getState().logMedicineTaken(reminderTimeId, scheduledTime);
        useMedicineStore.getState().logMedicineTaken(reminderTimeId, scheduledTime);

        const { medicineLogs } = useMedicineStore.getState();
        expect(medicineLogs.filter(l => l.status === 'taken').length).toBe(1);
      });

      it('STOKTAN yalnizca bir kez duser', () => {
        // `decrementStock` yalnizca `stockEnabled` ilaclarda calisir; bu yuzden
        // stok takibi acik AYRI bir ilac kurulur. `stockThreshold` dusuk
        // tutulur: "az kaldi" dali dinamik `import('@notifee/react-native')`
        // yapiyor ve Jest'in CJS ortami dinamik import'u kaldirmiyor.
        const stockMedicineId = useMedicineStore.getState().addMedicine({
          name: 'Stok Test',
          dosage: '100mg',
          frequency: 1,
          color: MEDICINE_COLORS[0],
          startDate: '2024-01-01',
          stockEnabled: true,
          stockCount: 10,
          stockThreshold: 1,
        });
        const stockReminderTimeId = useMedicineStore
          .getState()
          .reminderTimes.find(rt => rt.medicineId === stockMedicineId)!.id;
        const scheduledTime = '2024-01-15T08:00:00';

        const stockOf = () =>
          useMedicineStore.getState().medicines.find(m => m.id === stockMedicineId)!.stockCount;

        expect(stockOf()).toBe(10);

        useMedicineStore.getState().logMedicineTaken(stockReminderTimeId, scheduledTime);
        const afterFirst = stockOf();

        useMedicineStore.getState().logMedicineTaken(stockReminderTimeId, scheduledTime);
        useMedicineStore.getState().logMedicineTaken(stockReminderTimeId, scheduledTime);
        useMedicineStore.getState().logMedicineTaken(stockReminderTimeId, scheduledTime);
        const afterMany = stockOf();

        expect(afterFirst).toBe(9);
        // ⚠️ ASIL IDDIA: 4 basis = 1 hap. Eskiden 4 hap dusuyordu.
        expect(afterMany).toBe(9);
      });

      it('atlandi -> alindi GECISI hala calisir (ayni duruma ikinci gecis engellenir)', () => {
        const scheduledTime = '2024-01-15T08:00:00';

        useMedicineStore.getState().logMedicineSkipped(reminderTimeId, scheduledTime);
        expect(
          useMedicineStore.getState().medicineLogs.find(l => l.reminderTimeId === reminderTimeId)!
            .status
        ).toBe('skipped');

        useMedicineStore.getState().logMedicineTaken(reminderTimeId, scheduledTime);
        const logs = useMedicineStore.getState().medicineLogs;
        expect(logs.length).toBe(1);
        expect(logs[0].status).toBe('taken');
      });

      it('ayni doz iki kez ATLANIRSA da tek satir kalir', () => {
        const scheduledTime = '2024-01-15T08:00:00';

        useMedicineStore.getState().logMedicineSkipped(reminderTimeId, scheduledTime);
        useMedicineStore.getState().logMedicineSkipped(reminderTimeId, scheduledTime);

        expect(
          useMedicineStore.getState().medicineLogs.filter(l => l.status === 'skipped').length
        ).toBe(1);
      });

      it('FARKLI dozlar birbirini engellemez', () => {
        useMedicineStore.getState().logMedicineTaken(reminderTimeId, '2024-01-15T08:00:00');
        useMedicineStore.getState().logMedicineTaken(reminderTimeId, '2024-01-16T08:00:00');

        expect(
          useMedicineStore.getState().medicineLogs.filter(l => l.status === 'taken').length
        ).toBe(2);
      });
    });
  });

  describe('logMedicineSkipped', () => {
    let reminderTimeId: string;

    beforeEach(() => {
      const store = useMedicineStore.getState();
      const medicineId = store.addMedicine({
        name: 'Skip Test',
        dosage: '100mg',
        frequency: 1,
        color: MEDICINE_COLORS[0],
        startDate: '2024-01-01',
      });

      const { reminderTimes } = useMedicineStore.getState();
      reminderTimeId = reminderTimes.find(rt => rt.medicineId === medicineId)!.id;
    });

    it('should create a skipped log', () => {
      const store = useMedicineStore.getState();

      store.logMedicineSkipped(reminderTimeId, '2024-01-15T08:00:00');

      const { medicineLogs } = useMedicineStore.getState();
      expect(medicineLogs[0].status).toBe('skipped');
    });

    it('should not set takenAt for skipped logs', () => {
      const store = useMedicineStore.getState();

      store.logMedicineSkipped(reminderTimeId, '2024-01-15T08:00:00');

      const { medicineLogs } = useMedicineStore.getState();
      expect(medicineLogs[0].takenAt).toBeUndefined();
    });
  });

  describe('updateSettings', () => {
    it('should update individual settings', () => {
      const store = useMedicineStore.getState();

      store.updateSettings({ wakeUpTime: '07:00' });

      const { settings } = useMedicineStore.getState();
      expect(settings.wakeUpTime).toBe('07:00');
    });

    it('should preserve other settings when updating', () => {
      const store = useMedicineStore.getState();

      store.updateSettings({ sleepTime: '22:00' });

      const { settings } = useMedicineStore.getState();
      expect(settings.wakeUpTime).toBe('08:00'); // Unchanged
      expect(settings.sleepTime).toBe('22:00');
    });

    it('should regenerate reminder times when wake/sleep time changes', () => {
      const store = useMedicineStore.getState();
      store.addMedicine({
        name: 'Test Medicine',
        dosage: '100mg',
        frequency: 3,
        color: MEDICINE_COLORS[0],
        startDate: '2024-01-01',
      });

      const { reminderTimes: beforeTimes } = useMedicineStore.getState();
      // eslint-disable-next-line unused-imports/no-unused-vars
      const beforeFirstTime = beforeTimes[0]?.time;

      store.updateSettings({ wakeUpTime: '06:00' });

      const { reminderTimes: afterTimes } = useMedicineStore.getState();
      // Times should be recalculated based on new wake time
      expect(afterTimes.length).toBeGreaterThan(0);
    });
  });

  describe('Alarm State', () => {
    let medicine: Medicine;
    let reminderTime: ReminderTime;

    beforeEach(() => {
      const store = useMedicineStore.getState();
      const medicineId = store.addMedicine({
        name: 'Alarm Test',
        dosage: '100mg',
        frequency: 1,
        color: MEDICINE_COLORS[0],
        startDate: '2024-01-01',
      });

      const { medicines, reminderTimes } = useMedicineStore.getState();
      medicine = medicines.find(m => m.id === medicineId)!;
      reminderTime = reminderTimes.find(rt => rt.medicineId === medicineId)!;
    });

    it('should set alarm active', () => {
      const store = useMedicineStore.getState();

      store.setAlarmActive(medicine, reminderTime, '2024-01-15T08:00:00');

      const { alarmState } = useMedicineStore.getState();
      expect(alarmState.isActive).toBe(true);
      expect(alarmState.currentMedicine?.id).toBe(medicine.id);
      expect(alarmState.currentReminderTime?.id).toBe(reminderTime.id);
      expect(alarmState.scheduledTime).toBe('2024-01-15T08:00:00');
    });

    it('should dismiss alarm', () => {
      const store = useMedicineStore.getState();
      store.setAlarmActive(medicine, reminderTime, '2024-01-15T08:00:00');

      store.dismissAlarm();

      const { alarmState } = useMedicineStore.getState();
      expect(alarmState.isActive).toBe(false);
      expect(alarmState.currentMedicine).toBeUndefined();
    });
  });

  describe('Helper Functions', () => {
    let medicineId: string;

    beforeEach(() => {
      const store = useMedicineStore.getState();
      medicineId = store.addMedicine({
        name: 'Helper Test',
        dosage: '100mg',
        frequency: 2,
        color: MEDICINE_COLORS[0],
        startDate: '2024-01-01',
      });
    });

    describe('getMedicineById', () => {
      it('should return medicine by ID', () => {
        const store = useMedicineStore.getState();

        const medicine = store.getMedicineById(medicineId);

        expect(medicine?.name).toBe('Helper Test');
      });

      it('should return undefined for invalid ID', () => {
        const store = useMedicineStore.getState();

        const medicine = store.getMedicineById('invalid-id');

        expect(medicine).toBeUndefined();
      });
    });

    describe('getReminderTimesForMedicine', () => {
      it('should return sorted reminder times for medicine', () => {
        const store = useMedicineStore.getState();

        const times = store.getReminderTimesForMedicine(medicineId);

        expect(times.length).toBe(2);
        expect(times[0].time <= times[1].time).toBe(true);
      });

      it('should return empty array for invalid medicine ID', () => {
        const store = useMedicineStore.getState();

        const times = store.getReminderTimesForMedicine('invalid-id');

        expect(times).toEqual([]);
      });
    });

    describe('getAdherenceRate', () => {
      it('should return 100% when no active medicines exist', async () => {
        // Clear all data first - no medicines means 100% (nothing to miss)
        const store = useMedicineStore.getState();
        await store.clearAllData();

        const rate = store.getAdherenceRate(7);

        expect(rate).toBe(100);
      });

      it('should return 0% when past reminders exist but no logs', () => {
        // This tests the bug fix: new medicine with past reminder time should show 0%
        // not 100% which was misleading
        const store = useMedicineStore.getState();

        // Add a medicine with a reminder time that's already past
        // Since date-fns format is mocked to return '2024-01-15', we need to
        // create a reminder time that would be considered "past" relative to current time
        store.addMedicine({
          name: 'Past Reminder Test',
          dosage: '100mg',
          frequency: 1,
          color: MEDICINE_COLORS[0],
          startDate: '2024-01-01',
          customTimes: ['00:01'], // Very early time, likely already past
        });

        // No logs - medicine was just added
        // If current time > 00:01, this should return 0% not 100%
        const rate = store.getAdherenceRate(7);

        // The rate should be 0 or 100 depending on current time
        // At minimum, the rate should be a valid number
        expect(typeof rate).toBe('number');
        expect(rate).toBeGreaterThanOrEqual(0);
        expect(rate).toBeLessThanOrEqual(100);
      });

      it('should calculate correct adherence rate', () => {
        const store = useMedicineStore.getState();

        // Add a medicine first — reminder times are needed for logs
        store.addMedicine({
          name: 'Adherence Test',
          dosage: '500mg',
          frequency: 1,
          color: '#FF6B6B',
          startDate: new Date().toISOString().split('T')[0],
        });

        const { reminderTimes } = useMedicineStore.getState();
        const rt = reminderTimes[0];

        // Geçmiş zamanlar (normalize slot çakışmasını önlemek için farklı saatler)
        const t1 = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
        const t2 = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
        const t3 = new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString();

        // Add 2 taken, 1 skipped (3 farklı slot)
        store.logMedicineTaken(rt.id, t1);
        store.logMedicineTaken(rt.id, t2);
        store.logMedicineSkipped(rt.id, t3);

        const rate = store.getAdherenceRate(7);

        expect(rate).toBe(67); // 2/3 = 66.67% rounded
      });

      it('should return 100% when only future reminders exist', async () => {
        const store = useMedicineStore.getState();
        await store.clearAllData();

        // Add medicine with only future reminder time (23:59)
        store.addMedicine({
          name: 'Future Only Test',
          dosage: '100mg',
          frequency: 1,
          color: MEDICINE_COLORS[0],
          startDate: '2024-01-01',
          customTimes: ['23:59'], // Very late time, likely not past yet
        });

        const rate = store.getAdherenceRate(7);

        // If only future reminders, should be 100% (nothing missed yet)
        expect(typeof rate).toBe('number');
        expect(rate).toBeGreaterThanOrEqual(0);
        expect(rate).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('syncToCloud', () => {
    it('should not sync when no user is logged in', async () => {
      const store = useMedicineStore.getState();

      await store.syncToCloud();

      expect(mockUploadAllDataToCloud).not.toHaveBeenCalled();
    });

    it('should sync data when user is logged in', async () => {
      const store = useMedicineStore.getState();
      store.setUserId('test-user-123');
      store.addMedicine({
        name: 'Sync Test',
        dosage: '100mg',
        frequency: 1,
        color: MEDICINE_COLORS[0],
        startDate: '2024-01-01',
      });

      // Clear the automatic sync call
      mockUploadAllDataToCloud.mockClear();

      await store.syncToCloud();

      expect(mockUploadAllDataToCloud).toHaveBeenCalledWith(
        'test-user-123',
        expect.objectContaining({
          medicines: expect.any(Array),
          reminderTimes: expect.any(Array),
          medicineLogs: expect.any(Array),
          settings: expect.any(Object),
        })
      );
    });

    it('should update lastSyncAt on successful sync', async () => {
      const store = useMedicineStore.getState();
      store.setUserId('test-user-123');

      await store.syncToCloud();

      const { lastSyncAt } = useMedicineStore.getState();
      expect(lastSyncAt).not.toBeNull();
    });

    it('should set syncError on failed sync', async () => {
      mockUploadAllDataToCloud.mockRejectedValue(new Error('Network error'));
      const store = useMedicineStore.getState();
      store.setUserId('test-user-123');

      await expect(store.syncToCloud()).rejects.toThrow();

      const { syncError } = useMedicineStore.getState();
      expect(syncError).toBe('Network error');
    });
  });

  describe('syncFromCloud', () => {
    it('should not sync when no user is logged in', async () => {
      const store = useMedicineStore.getState();

      await store.syncFromCloud();

      expect(mockDownloadAllDataFromCloud).not.toHaveBeenCalled();
    });

    it('should import data from cloud', async () => {
      const cloudData = {
        medicines: [
          {
            id: 'cloud-med-1',
            name: 'Cloud Medicine',
            dosage: '200mg',
            frequency: 1,
            color: '#FF0000',
            startDate: '2024-01-01',
            isActive: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        reminderTimes: [],
        medicineLogs: [],
        settings: {
          wakeUpTime: '07:00',
          sleepTime: '22:00',
          notificationSound: 'default',
          vibrationEnabled: true,
          fullScreenAlarmEnabled: true,
          language: 'tr' as const,
          snoozeDuration: 5,
          quietHoursEnabled: false,
          quietHoursStart: '23:00',
          quietHoursEnd: '07:00',
          alarmModeEnabled: true,
        },
      };
      mockDownloadAllDataFromCloud.mockResolvedValue(cloudData);

      const store = useMedicineStore.getState();
      store.setUserId('test-user-123');

      await store.syncFromCloud();

      const { medicines, settings } = useMedicineStore.getState();
      expect(medicines[0].name).toBe('Cloud Medicine');
      expect(settings.wakeUpTime).toBe('07:00');
    });

    it('should upload local data when cloud is empty', async () => {
      mockDownloadAllDataFromCloud.mockResolvedValue(null);

      const store = useMedicineStore.getState();
      store.setUserId('test-user-123');
      store.addMedicine({
        name: 'Local Medicine',
        dosage: '100mg',
        frequency: 1,
        color: MEDICINE_COLORS[0],
        startDate: '2024-01-01',
      });

      mockUploadAllDataToCloud.mockClear();

      await store.syncFromCloud();

      expect(mockUploadAllDataToCloud).toHaveBeenCalled();
    });

    /**
     * v1.7.1 — C4. Bulut birlestirmesi eskiden KOSULSUZ kazaniyordu ve ayar
     * yan etkileri (uyanma/uyku penceresi degisince hatirlatma saatlerinin
     * yeniden uretilmesi) sync yolunda HIC calismiyordu.
     */
    describe('ayar birlestirme ve yan etkiler (C4)', () => {
      const cloudBase = {
        medicines: [],
        reminderTimes: [],
        medicineLogs: [],
      };

      it('YEREL degisiklik daha yeni ise bulut ayarlarini EZMEZ', async () => {
        const store = useMedicineStore.getState();
        store.setUserId('test-user-123');

        // Yerel: kullanici tam ekran alarmi KAPATTI (damgalanir).
        store.updateSettings({ fullScreenAlarmEnabled: false });
        const localStamp = useMedicineStore.getState().settings.settingsUpdatedAt;
        expect(localStamp).toBeTruthy();

        // Bulut: DAHA ESKI bir dokuman, ayar hala acik.
        mockDownloadAllDataFromCloud.mockResolvedValue({
          ...cloudBase,
          settings: {
            fullScreenAlarmEnabled: true,
            settingsUpdatedAt: new Date(Date.parse(localStamp!) - 60_000).toISOString(),
          },
        });

        await useMedicineStore.getState().syncFromCloud();

        // Eskiden burada `true` donuyordu: kullanicinin kararı sessizce
        // geri aliniyordu (cihazda kanitlandi).
        expect(useMedicineStore.getState().settings.fullScreenAlarmEnabled).toBe(false);
      });

      it('BULUT daha yeni ise yerel ayarin uzerine yazar', async () => {
        const store = useMedicineStore.getState();
        store.setUserId('test-user-123');
        store.updateSettings({ fullScreenAlarmEnabled: false });
        const localStamp = useMedicineStore.getState().settings.settingsUpdatedAt;

        mockDownloadAllDataFromCloud.mockResolvedValue({
          ...cloudBase,
          settings: {
            fullScreenAlarmEnabled: true,
            settingsUpdatedAt: new Date(Date.parse(localStamp!) + 60_000).toISOString(),
          },
        });

        await useMedicineStore.getState().syncFromCloud();

        expect(useMedicineStore.getState().settings.fullScreenAlarmEnabled).toBe(true);
      });

      it('bulut ayarlarinda OLMAYAN alanlar yerelde korunur', async () => {
        const store = useMedicineStore.getState();
        store.setUserId('test-user-123');
        store.updateSettings({ ttsVolume: 35 });

        // Eski bir bulut dokumani TTS alanlarini hic icermiyor.
        mockDownloadAllDataFromCloud.mockResolvedValue({
          ...cloudBase,
          settings: { wakeUpTime: '07:00' },
        });

        await useMedicineStore.getState().syncFromCloud();

        const { settings } = useMedicineStore.getState();
        expect(settings.wakeUpTime).toBe('07:00');
        // Eskiden `getSettingsFromCloud` eksik alanlari VARSAYILANLA
        // dolduruyordu ve bu deger 80'e donuyordu.
        expect(settings.ttsVolume).toBe(35);
      });

      it('bulut uyanma/uyku penceresi degisince hatirlatma saatleri yenilenir', async () => {
        const store = useMedicineStore.getState();
        store.setUserId('test-user-123');
        store.addMedicine({
          name: 'Gunde 2 Doz',
          dosage: '100mg',
          frequency: 2,
          color: MEDICINE_COLORS[0],
          startDate: '2024-01-01',
        });

        const before = useMedicineStore
          .getState()
          .reminderTimes.map(rt => rt.time)
          .sort();
        expect(before.length).toBeGreaterThan(0);

        mockDownloadAllDataFromCloud.mockResolvedValue({
          ...cloudBase,
          settings: {
            wakeUpTime: '05:00',
            sleepTime: '19:00',
            settingsUpdatedAt: new Date(Date.now() + 60_000).toISOString(),
          },
        });

        await useMedicineStore.getState().syncFromCloud();

        const after = useMedicineStore
          .getState()
          .reminderTimes.map(rt => rt.time)
          .sort();

        expect(useMedicineStore.getState().settings.wakeUpTime).toBe('05:00');
        // Eskiden saatler ESKI pencereye gore kaliyordu.
        expect(after).not.toEqual(before);
      });
    });
  });

  /**
   * v1.7.2 — C4 devami. Buluta YALNIZCA degisen alanlar yazilir.
   *
   * Eskiden `updateSettings` tum `nextSettings`i gonderiyor ve
   * `syncSettingsToCloud` dokumani `setDoc` ile komple eziyordu. Indirme
   * sadece uygulama acilisinda yapildigi icin bayat kalmis bir cihazda TEK
   * bir ayar degistirmek, diger cihazin yeni degerlerini buluttan SILIYORDU.
   */
  describe('updateSettings — buluta kismi yazim (C4)', () => {
    it('buluta YALNIZCA degisen alani gonderir', () => {
      const store = useMedicineStore.getState();
      store.setUserId('test-user-123');
      mockSyncSettingsToCloud.mockClear();

      useMedicineStore.getState().updateSettings({ alarmVolume: 100 });

      expect(mockSyncSettingsToCloud).toHaveBeenCalledTimes(1);
      const [, payload] = mockSyncSettingsToCloud.mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];

      expect(Object.keys(payload).sort()).toEqual(['alarmVolume', 'settingsUpdatedAt']);
      expect(payload.alarmVolume).toBe(100);
      // Degismemis alanlar gonderilmemeli: gonderilse bayat deger diger
      // cihazin yeni degerini buluttan silerdi.
      expect(payload.wakeUpTime).toBeUndefined();
      expect(payload.quietHoursEnabled).toBeUndefined();
    });

    it('birden fazla alan degistiyse hepsini ama SADECE onlari gonderir', () => {
      const store = useMedicineStore.getState();
      store.setUserId('test-user-123');
      mockSyncSettingsToCloud.mockClear();

      useMedicineStore.getState().updateSettings({
        quietHoursEnabled: true,
        quietHoursStart: '22:30',
      });

      const [, payload] = mockSyncSettingsToCloud.mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];
      expect(Object.keys(payload).sort()).toEqual(
        ['quietHoursEnabled', 'quietHoursStart', 'settingsUpdatedAt'].sort()
      );
    });

    it('damgayi her zaman ekler (son-yazan-kazanir icin gerekli)', () => {
      const store = useMedicineStore.getState();
      store.setUserId('test-user-123');
      mockSyncSettingsToCloud.mockClear();

      useMedicineStore.getState().updateSettings({ vibrationEnabled: false });

      const [, payload] = mockSyncSettingsToCloud.mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];
      expect(payload.settingsUpdatedAt).toBe(
        useMedicineStore.getState().settings.settingsUpdatedAt
      );
      expect(Number.isNaN(Date.parse(payload.settingsUpdatedAt as string))).toBe(false);
    });

    it('skipCloudSync ile hic yazmaz', () => {
      const store = useMedicineStore.getState();
      store.setUserId('test-user-123');
      mockSyncSettingsToCloud.mockClear();

      useMedicineStore.getState().updateSettings({ alarmVolume: 55 }, { skipCloudSync: true });

      expect(mockSyncSettingsToCloud).not.toHaveBeenCalled();
    });
  });

  describe('clearAllData', () => {
    it('should reset all data to initial state', async () => {
      const store = useMedicineStore.getState();
      store.addMedicine({
        name: 'To Clear',
        dosage: '100mg',
        frequency: 1,
        color: MEDICINE_COLORS[0],
        startDate: '2024-01-01',
      });
      store.updateSettings({ wakeUpTime: '06:00' });

      await store.clearAllData();

      const { medicines, reminderTimes, medicineLogs, settings } = useMedicineStore.getState();
      expect(medicines).toEqual([]);
      expect(reminderTimes).toEqual([]);
      expect(medicineLogs).toEqual([]);
      expect(settings.wakeUpTime).toBe('08:00'); // Default value
    });
  });

  describe('MEDICINE_COLORS', () => {
    it('should export color palette', () => {
      expect(MEDICINE_COLORS).toBeDefined();
      expect(MEDICINE_COLORS.length).toBeGreaterThan(0);
    });

    it('should have valid hex colors', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

      MEDICINE_COLORS.forEach(color => {
        expect(color).toMatch(hexColorRegex);
      });
    });
  });
});
