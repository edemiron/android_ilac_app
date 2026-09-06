import { useMedicalIdStore } from '../../stores/medicalIdStore';

describe('medicalIdStore', () => {
  beforeEach(() => {
    useMedicalIdStore.getState().clearMedicalId();
  });

  it('initializes with default empty values', () => {
    const data = useMedicalIdStore.getState().data;
    expect(data.fullName).toBe('');
    expect(data.bloodType).toBe('unknown');
    expect(data.emergencyContacts).toEqual([]);
    expect(data.showOnLockScreen).toBe(false);
  });

  it('updates personal medical info correctly', () => {
    useMedicalIdStore.getState().updateMedicalId({
      fullName: 'Ahmet Yılmaz',
      bloodType: 'A+',
      birthDate: '1965-05-14',
      allergies: ['Penisilin', 'Aspirin'],
      chronicConditions: ['Hipertansiyon', 'Tip 2 Diyabet'],
      organDonor: true,
      showOnLockScreen: true,
    });

    const data = useMedicalIdStore.getState().data;
    expect(data.fullName).toBe('Ahmet Yılmaz');
    expect(data.bloodType).toBe('A+');
    expect(data.allergies).toHaveLength(2);
    expect(data.chronicConditions).toContain('Hipertansiyon');
    expect(data.organDonor).toBe(true);
    expect(data.showOnLockScreen).toBe(true);
  });

  it('manages emergency contacts', () => {
    const contact1 = useMedicalIdStore.getState().addEmergencyContact({
      name: 'Ayşe Yılmaz',
      relationship: 'Eşi',
      phone: '05551112233',
    });

    expect(contact1.id).toBeDefined();
    expect(useMedicalIdStore.getState().data.emergencyContacts).toHaveLength(1);

    const contact2 = useMedicalIdStore.getState().addEmergencyContact({
      name: 'Mehmet Yılmaz',
      relationship: 'Oğlu',
      phone: '05552223344',
    });

    expect(useMedicalIdStore.getState().data.emergencyContacts).toHaveLength(2);

    useMedicalIdStore.getState().removeEmergencyContact(contact1.id);
    const remaining = useMedicalIdStore.getState().data.emergencyContacts;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(contact2.id);
  });

  it('clears all data on clearMedicalId', () => {
    useMedicalIdStore.getState().updateMedicalId({
      fullName: 'Deneme',
      bloodType: '0-',
    });

    useMedicalIdStore.getState().clearMedicalId();
    expect(useMedicalIdStore.getState().data.fullName).toBe('');
    expect(useMedicalIdStore.getState().data.bloodType).toBe('unknown');
  });
});
