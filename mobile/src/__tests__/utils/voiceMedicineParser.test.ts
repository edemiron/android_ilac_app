import { parseVoiceMedicinePrescription } from '../../utils/voiceMedicineParser';

describe('voiceMedicineParser', () => {
  it('should parse Turkish voice prescription "Günde 2 kez tok karnına Parol 500"', () => {
    const result = parseVoiceMedicinePrescription('Günde 2 kez tok karnına Parol 500');
    expect(result.name).toBe('Parol');
    expect(result.dosageAmount).toBe('500');
    expect(result.frequency).toBe(2);
    expect(result.instruction).toBe('after_meal');
  });

  it('should parse prescription with form and duration "Augmentin 1000 mg kapsül günde 2 defa yemekle birlikte 10 gün"', () => {
    const result = parseVoiceMedicinePrescription(
      'Augmentin 1000 mg kapsül günde 2 defa yemekle birlikte 10 gün'
    );
    expect(result.name).toBe('Augmentin');
    expect(result.dosageAmount).toBe('1000');
    expect(result.medicineForm).toBe('capsule');
    expect(result.frequency).toBe(2);
    expect(result.instruction).toBe('with_meal');
    expect(result.durationDays).toBe(10);
  });

  it('should parse "Sabah akşam yemekten sonra Aspirin 100"', () => {
    const result = parseVoiceMedicinePrescription('Sabah akşam yemekten sonra Aspirin 100');
    expect(result.name).toBe('Aspirin');
    expect(result.dosageAmount).toBe('100');
    expect(result.frequency).toBe(2);
    expect(result.instruction).toBe('after_meal');
  });

  it('should parse "Günde bir defa aç karnına Nexium 40 mg"', () => {
    const result = parseVoiceMedicinePrescription('Günde bir defa aç karnına Nexium 40 mg');
    expect(result.name).toBe('Nexium');
    expect(result.dosageAmount).toBe('40');
    expect(result.frequency).toBe(1);
    expect(result.instruction).toBe('empty_stomach');
  });

  it('should parse "Günde 3 kere şurup Calpol 120 ml 1 hafta"', () => {
    const result = parseVoiceMedicinePrescription('Günde 3 kere şurup Calpol 120 ml 1 hafta');
    expect(result.name).toBe('Calpol');
    expect(result.medicineForm).toBe('syrup');
    expect(result.frequency).toBe(3);
    expect(result.durationDays).toBe(7);
  });

  it('should handle empty or invalid input', () => {
    expect(parseVoiceMedicinePrescription('')).toEqual({ rawText: '' });
    expect(parseVoiceMedicinePrescription(null as any)).toEqual({ rawText: '' });
  });
});
