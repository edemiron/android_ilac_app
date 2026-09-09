/**
 * parseAlarmNotificationId — `alarm-<medicineId>-<reminderTimeId>` geri çözümlemesi.
 *
 * Regresyon koruması: bu id ESKİDEN `split('-')[1]` ile çözümleniyordu ve
 * UUID ilaç kimliklerini bozuyordu; sonuçta native alarm ve tam ekran taşıyıcı
 * bildirim yanlış requestCode ile iptal edilmeye çalışılıp hiç iptal
 * edilmiyordu (cihaz logcat'iyle doğrulandı).
 */

import {
  parseAlarmNotificationId,
  getAlarmNotificationId,
  TEST_ALARM_TARGET,
} from '../../utils/notifications/ids';

describe('parseAlarmNotificationId', () => {
  const uuidMed = '01a057f1-3ae0-7679-9383-9b68f7198b59';
  const uuidReminder = '01a057f1-3ae0-7679-9383-9b68f7198b59_0';

  it('UUID ilaç kimliğini ve hatırlatma kimliğini doğru çözümler', () => {
    const id = getAlarmNotificationId(uuidMed, uuidReminder);
    expect(id).toBe(`alarm-${uuidMed}-${uuidReminder}`);

    const parsed = parseAlarmNotificationId(id, {
      medicineIds: [uuidMed],
      reminderTimeIds: [uuidReminder],
    });

    expect(parsed).toEqual({ medicineId: uuidMed, reminderTimeId: uuidReminder });
    // Eski hatalı davranış: medicineId === '01a057f1'
    expect(parsed?.medicineId).not.toBe('01a057f1');
  });

  it('test alarmının sabit çiftini bilinen kimlik olmadan da çözümler', () => {
    const id = getAlarmNotificationId(
      TEST_ALARM_TARGET.medicineId,
      TEST_ALARM_TARGET.reminderTimeId
    );
    expect(id).toBe('alarm-test-medicine-test-reminder');

    const parsed = parseAlarmNotificationId(id);

    expect(parsed).toEqual(TEST_ALARM_TARGET);
    // Eski hatalı davranış: { medicineId: 'test', reminderTimeId: 'medicine-test-reminder' }
    expect(parsed?.medicineId).not.toBe('test');
  });

  it('kısa kimlik uzun kimliğin öneki olsa bile en uzun eşleşmeyi seçer', () => {
    const shortMed = 'med';
    const longMed = 'med-2';
    const id = getAlarmNotificationId(longMed, 'rt-9');

    const parsed = parseAlarmNotificationId(id, {
      medicineIds: [shortMed, longMed],
      reminderTimeIds: ['rt-9', '2-rt-9'],
    });

    expect(parsed).toEqual({ medicineId: longMed, reminderTimeId: 'rt-9' });
  });

  it('hatırlatma silinmişse ilaç kimliği önekiyle çözümler', () => {
    const id = getAlarmNotificationId(uuidMed, 'silinmis-rt-1');

    const parsed = parseAlarmNotificationId(id, {
      medicineIds: [uuidMed],
      reminderTimeIds: [],
    });

    expect(parsed).toEqual({ medicineId: uuidMed, reminderTimeId: 'silinmis-rt-1' });
  });

  it('çözümlenemeyen id için null döner (yanlış kimlik ÜRETMEZ)', () => {
    const parsed = parseAlarmNotificationId(`alarm-${uuidMed}-${uuidReminder}`, {
      medicineIds: ['bambaska-bir-ilac'],
      reminderTimeIds: ['bambaska-bir-hatirlatma'],
    });

    expect(parsed).toBeNull();
  });

  it('alarm öneki olmayan id için null döner', () => {
    expect(parseAlarmNotificationId('snooze-abc-def', { medicineIds: ['abc'] })).toBeNull();
    expect(parseAlarmNotificationId('expiry-abc')).toBeNull();
    expect(parseAlarmNotificationId('alarm-')).toBeNull();
  });
});
