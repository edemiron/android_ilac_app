/**
 * notifications/ids tests — Sprint 3 ek testler
 * Pure helper'lar: ID builders + validators
 */

import {
  buildSnoozeNotificationId,
  getSnoozeNotificationId,
  getAlarmNotificationId,
  buildAlarmNotificationId,
  isAlarmNotificationId,
  isSnoozeNotificationId,
  belongsToMedicine,
  extractDisplayedMedicineId,
} from '../../utils/notifications/ids';

describe('buildSnoozeNotificationId (3-parametreli)', () => {
  it('combines medicine + reminder + snooze id with prefix', () => {
    expect(buildSnoozeNotificationId('med-1', 'rt-1', 'snooze-1')).toBe(
      'snooze-med-1-rt-1-snooze-1'
    );
  });
});

describe('getSnoozeNotificationId (2-parametreli)', () => {
  it('combines medicine + reminder with prefix', () => {
    expect(getSnoozeNotificationId('med-1', 'rt-1')).toBe('snooze-med-1-rt-1');
  });

  it('differs from 3-parametreli when snoozeId eklenir', () => {
    expect(getSnoozeNotificationId('med-1', 'rt-1')).not.toBe(
      buildSnoozeNotificationId('med-1', 'rt-1', 'any')
    );
  });
});

describe('getAlarmNotificationId', () => {
  it('combines medicine + reminder with alarm prefix', () => {
    expect(getAlarmNotificationId('med-1', 'rt-1')).toBe('alarm-med-1-rt-1');
  });
});

describe('buildAlarmNotificationId (3-parametreli)', () => {
  it('combines medicine.id + reminderTime.id with alarm prefix', () => {
    expect(buildAlarmNotificationId({ id: 'med-1' }, { id: 'rt-1' })).toBe(
      'alarm-med-1-rt-1'
    );
  });

  it('matches getAlarmNotificationId output', () => {
    expect(buildAlarmNotificationId({ id: 'med-1' }, { id: 'rt-1' })).toBe(
      getAlarmNotificationId('med-1', 'rt-1')
    );
  });
});

describe('isAlarmNotificationId', () => {
  it('returns true for alarm- prefixed ids', () => {
    expect(isAlarmNotificationId('alarm-med-1-rt-1')).toBe(true);
  });

  it('returns false for snooze- prefixed ids', () => {
    expect(isSnoozeNotificationId('alarm-med-1-rt-1')).toBe(false);
    expect(isAlarmNotificationId('snooze-med-1-rt-1-snooze-1')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isAlarmNotificationId(undefined)).toBe(false);
  });
});

describe('isSnoozeNotificationId', () => {
  it('returns true for snooze- prefixed ids', () => {
    expect(isSnoozeNotificationId('snooze-med-1-rt-1-snooze-1')).toBe(true);
  });

  it('returns false for alarm- prefixed ids', () => {
    expect(isSnoozeNotificationId('alarm-med-1-rt-1')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isSnoozeNotificationId(undefined)).toBe(false);
  });
});

describe('belongsToMedicine', () => {
  it('returns true for alarm notification of matching medicine', () => {
    expect(belongsToMedicine('alarm-med-1-rt-1', 'med-1')).toBe(true);
  });

  it('returns true for snooze notification of matching medicine', () => {
    expect(belongsToMedicine('snooze-med-1-rt-1-snooze-1', 'med-1')).toBe(true);
  });

  it('returns false for different medicine', () => {
    expect(belongsToMedicine('alarm-med-1-rt-1', 'med-2')).toBe(false);
    expect(belongsToMedicine('snooze-med-1-rt-1-snooze-1', 'med-2')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(belongsToMedicine(undefined, 'med-1')).toBe(false);
  });

  it('does not match partial medicine id', () => {
    // med-1 prefix'i med-10 ile de baslar; strict matching gerekli
    expect(belongsToMedicine('alarm-med-10-rt-1', 'med-1')).toBe(false);
  });
});

describe('extractDisplayedMedicineId', () => {
  it('returns medicineId when present in notification.data', () => {
    expect(
      extractDisplayedMedicineId({
        notification: { data: { medicineId: 'med-1' } },
      })
    ).toBe('med-1');
  });

  it('returns undefined when notification is missing', () => {
    expect(extractDisplayedMedicineId(undefined)).toBeUndefined();
  });

  it('returns undefined when data is missing', () => {
    expect(extractDisplayedMedicineId({ notification: {} })).toBeUndefined();
  });

  it('returns undefined when medicineId is not a string', () => {
    expect(
      extractDisplayedMedicineId({
        notification: { data: { medicineId: 42 } },
      })
    ).toBeUndefined();
  });
});
