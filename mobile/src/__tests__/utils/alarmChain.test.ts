/**
 * alarmChain tests.
 *
 * Bu modul alarm zincirinin devamliligindan sorumlu: calan alarmin bir
 * sonraki tekrarini kurar. Guard'lari yanlis olursa ya zincir kopar (doz
 * kacar) ya da yanlis bildirim tipleri icin gereksiz alarm kurulur.
 */

const mockRescheduleNextOccurrence = jest.fn();

jest.mock('../../utils/bootHandler', () => ({
  rescheduleNextOccurrence: (...args: unknown[]) => mockRescheduleNextOccurrence(...args),
}));

jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { rescheduleFiredAlarm } from '../../utils/alarmChain';

const validAlarm = {
  id: 'alarm-med-1-rt-1',
  data: { medicineId: 'med-1', reminderTimeId: 'rt-1' },
};

describe('rescheduleFiredAlarm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRescheduleNextOccurrence.mockResolvedValue('alarm-med-1-rt-1');
  });

  it('gecerli ilac alarminda sonraki tekrari kurar', async () => {
    const result = await rescheduleFiredAlarm(validAlarm);

    expect(mockRescheduleNextOccurrence).toHaveBeenCalledWith('med-1', 'rt-1');
    expect(result).toBe('alarm-med-1-rt-1');
  });

  it('medicineId yoksa atlar', async () => {
    const result = await rescheduleFiredAlarm({
      id: 'alarm-x-y',
      data: { reminderTimeId: 'rt-1' },
    });

    expect(mockRescheduleNextOccurrence).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('reminderTimeId yoksa atlar', async () => {
    const result = await rescheduleFiredAlarm({
      id: 'alarm-x-y',
      data: { medicineId: 'med-1' },
    });

    expect(mockRescheduleNextOccurrence).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('notification undefined ise atlar', async () => {
    const result = await rescheduleFiredAlarm(undefined);

    expect(mockRescheduleNextOccurrence).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  // Erteleme bildirimlerinin kendi akisi var; zincirlenirse ayni doz icin
  // hem snooze hem gunluk alarm kurulur.
  it.each([
    ['string', 'true'],
    ['boolean', true],
  ])('isSnooze (%s) ise atlar', async (_label, isSnooze) => {
    const result = await rescheduleFiredAlarm({
      id: 'alarm-med-1-rt-1',
      data: { medicineId: 'med-1', reminderTimeId: 'rt-1', isSnooze },
    });

    expect(mockRescheduleNextOccurrence).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  // Yalnizca 'alarm-' prefixli gercek ilac alarmlari zincirlenir.
  it.each([['expiry-med-1'], ['snooze-med-1-rt-1-abc'], ['persistent-med-1'], ['some-other-id']])(
    'id "%s" alarm- ile baslamiyorsa atlar',
    async id => {
      const result = await rescheduleFiredAlarm({
        id,
        data: { medicineId: 'med-1', reminderTimeId: 'rt-1' },
      });

      expect(mockRescheduleNextOccurrence).not.toHaveBeenCalled();
      expect(result).toBeNull();
    }
  );

  it('id yoksa atlar', async () => {
    const result = await rescheduleFiredAlarm({
      data: { medicineId: 'med-1', reminderTimeId: 'rt-1' },
    });

    expect(mockRescheduleNextOccurrence).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  // Zincir hatasi cagirana sizmamali: alarm ekraninin acilmasini engellemesin.
  it('rescheduleNextOccurrence hata atarsa null doner, hata sizmaz', async () => {
    mockRescheduleNextOccurrence.mockRejectedValue(new Error('storage read failed'));

    await expect(rescheduleFiredAlarm(validAlarm)).resolves.toBeNull();
  });

  it('rescheduleNextOccurrence null donerse null doner', async () => {
    mockRescheduleNextOccurrence.mockResolvedValue(null);

    const result = await rescheduleFiredAlarm(validAlarm);

    expect(mockRescheduleNextOccurrence).toHaveBeenCalledWith('med-1', 'rt-1');
    expect(result).toBeNull();
  });
});
