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
import { hasEmoji } from '../helpers/emoji';

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
  // v1.8.2: Bu tablo eskiden basliklari EMOJILERIYLE birlikte tam eslesme
  // olarak sabitliyordu ('🎉 Ayşe İlacını Aldı!'). Emojiyi kaldirmak ve
  // kutlama tonunu duzeltmek davranissal bir gerileme olmadigi halde bes
  // testi kirdi — testin kilitledigi sey susleme, testin ODAGI ise hasta
  // adinin basliga girmesiydi (v1.7.1'de `${patient}` tanimsizdi ve her
  // baslik ReferenceError firlatiyordu). Artik ODAK dogrulaniyor.
  it.each([
    ['missed', 'kaçırdı'],
    ['skipped', 'atladı'],
    ['taken', 'aldı'],
    ['snoozed', 'erteledi'],
    ['schedule_updated', 'programı güncellendi'],
  ] as const)('%s tipinde hasta adini basliga koyar', (type, expectedPhrase) => {
    const result = formatCaregiverNotification({ ...base, type });

    expect(result.title).toContain('Ayşe');
    expect(result.title).toContain(expectedPhrase);
    expect(result.title).not.toContain('undefined');
  });

  // Denetim maddesi 20/22: bakici bildirimlerinde emoji yok, kutlama yok.
  // `🎉 ... Aldı!` bir dozun alinmasini basari gibi sunuyordu; gunde 3-4 kez
  // konfeti atmak "atlandi" bildirimlerinin agirligini da degersizlestiriyor.
  it('hicbir baslik emoji veya unlem icermiyor', () => {
    const types = ['missed', 'skipped', 'taken', 'snoozed', 'schedule_updated'] as const;

    const offenders = types
      .map(type => formatCaregiverNotification({ ...base, type }).title)
      .filter(title => hasEmoji(title) || title.includes('!'));

    expect(offenders).toEqual([]);
  });

  it('hasta adi yoksa notr bir ifadeye duser', () => {
    const result = formatCaregiverNotification({ ...base, patientName: undefined });

    expect(result.title).toContain('Hastanız');
    expect(result.title).toContain('kaçırdı');
  });

  it('bosluktan olusan hasta adini bos kabul eder', () => {
    const result = formatCaregiverNotification({ ...base, patientName: '   ' });

    expect(result.title).toContain('Hastanız');
    expect(result.title).toContain('kaçırdı');
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
