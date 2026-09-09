import { useSymptomStore } from '../../stores/symptomStore';

describe('symptomStore', () => {
  beforeEach(() => {
    useSymptomStore.getState().clearAllLogs();
  });

  it('adds and retrieves a blood pressure log', () => {
    const log = useSymptomStore.getState().addSymptomLog({
      type: 'blood_pressure',
      systolic: 125,
      diastolic: 82,
      pulse: 70,
      medicineName: 'Norvasc 5 mg',
    });

    expect(log.id).toBeDefined();
    expect(log.systolic).toBe(125);
    expect(log.diastolic).toBe(82);

    const logs = useSymptomStore.getState().getRecentLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].type).toBe('blood_pressure');
  });

  it('adds a side-effect symptom log and filters by medicineId', () => {
    useSymptomStore.getState().addSymptomLog({
      type: 'dizziness',
      severity: 'moderate',
      medicineId: 'med-123',
      medicineName: 'Ator 20 mg',
      notes: 'Hafif baş dönmesi oldu',
    });

    useSymptomStore.getState().addSymptomLog({
      type: 'headache',
      medicineId: 'med-456',
    });

    const medLogs = useSymptomStore.getState().getLogsByMedicineId('med-123');
    expect(medLogs.length).toBe(1);
    expect(medLogs[0].type).toBe('dizziness');
    expect(medLogs[0].notes).toContain('baş dönmesi');
  });

  it('deletes a log successfully', () => {
    const item = useSymptomStore.getState().addSymptomLog({
      type: 'nausea',
    });

    expect(useSymptomStore.getState().logs.length).toBe(1);
    useSymptomStore.getState().deleteSymptomLog(item.id);
    expect(useSymptomStore.getState().logs.length).toBe(0);
  });
});
