/**
 * `formatCaregiverNotification` — v1.7.1 onarimi.
 *
 * Basliklarda tanimsiz bir `${patient}` degiskeni kullaniliyordu; her bakici
 * bildirimi formatlanirken `ReferenceError: patient is not defined`
 * firlatiyordu (tsc: 5x "Cannot find name 'patient'", ESLint: no-undef).
 * Bu test hem onarimi hem de hasta adi bos geldiginde ne olacagini sabitler.
 */

// Bu servis modul grafiginde expo-notifications / secure-store / firebase
// var; test yalnizca SAF bicimlendirme fonksiyonunu olcuyor, o yuzden yan
// etkili baglantilari kesiyoruz.
jest.mock('expo-notifications', () => ({ setNotificationHandler: jest.fn() }), {
  virtual: true,
});
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn() }), {
  virtual: true,
});
jest.mock('@react-native-firebase/messaging', () => ({ __esModule: true, default: () => ({}) }));
jest.mock('../../services/caregiverService', () => ({ updateCaregiverFcmToken: jest.fn() }));

import {
  formatCaregiverNotification,
  type CaregiverNotificationData,
} from '../../services/caregiverNotificationService';

const base: CaregiverNotificationData = {
  type: 'missed',
  patientId: 'p1',
  patientName: 'Ayşe',
  medicineName: 'PAROL PLUS',
  scheduledTime: '09:00',
  message: 'yedek mesaj',
  timestamp: '2026-09-02T09:05:00Z',
};

describe('formatCaregiverNotification', () => {
  it.each([
    ['missed', '⚠️ Ayşe İlacını Kaçırdı'],
    ['skipped', '⚠️ Ayşe İlacını Atladı'],
    ['taken', '🎉 Ayşe İlacını Aldı!'],
    ['snoozed', '⏰ Ayşe İlacını Erteliyor'],
    ['schedule_updated', '📋 Ayşe İlaç Programı Güncellendi'],
  ] as const)('%s tipinde hasta adini basliga koyar', (type, expectedTitle) => {
    const result = formatCaregiverNotification({ ...base, type });

    expect(result.title).toBe(expectedTitle);
    expect(result.title).not.toContain('undefined');
  });

  it('hasta adi yoksa notr bir ifadeye duser', () => {
    const result = formatCaregiverNotification({ ...base, patientName: undefined });

    expect(result.title).toBe('⚠️ Hastanız İlacını Kaçırdı');
  });

  it('bosluktan olusan hasta adini bos kabul eder', () => {
    const result = formatCaregiverNotification({ ...base, patientName: '   ' });

    expect(result.title).toBe('⚠️ Hastanız İlacını Kaçırdı');
  });

  it('ilac adi ve saati govdeye koyar', () => {
    const result = formatCaregiverNotification(base);

    expect(result.body).toBe('PAROL PLUS (09:00) saatinde ilaç alınmadı.');
  });

  it('ISO zaman damgasini HH:mm bicimine cevirir', () => {
    const result = formatCaregiverNotification({
      ...base,
      scheduledTime: '2026-09-02T09:30:00',
    });

    expect(result.body).toContain('(09:30)');
  });
});
