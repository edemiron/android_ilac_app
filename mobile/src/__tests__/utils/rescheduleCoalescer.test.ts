/**
 * `utils/notifications/rescheduleCoalescer.ts` sozlesme testleri.
 *
 * Kilitlenen uretim davranisi (v1.7.7): acilista UC bagimsiz yol "tum
 * alarmlari yeniden planla" isini tetikliyor ve her biri HER alarmi iptal
 * edip yeniden kuruyordu. Cihazda olculdu: 15 hatirlatma icin tek acilista
 * 45 iptal + 45 kurulum. Iptal penceresi o anda CALAN alarma denk gelirse doz
 * hatirlatmasi sessizce dusuyor.
 */

import {
  requestFullReschedule,
  COALESCE_WINDOW_MS,
  __resetRescheduleCoalescerForTests,
} from '../../utils/notifications/rescheduleCoalescer';

jest.useFakeTimers();

async function flush(): Promise<void> {
  jest.advanceTimersByTime(COALESCE_WINDOW_MS + 5);
  // Zincirdeki mikro-gorevlerin akmasi icin.
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  __resetRescheduleCoalescerForTests();
});

describe('requestFullReschedule', () => {
  it('UC ard arda istek TEK kosuya duser', async () => {
    const runner = jest.fn().mockResolvedValue(undefined);

    requestFullReschedule(runner, 'app-startup');
    requestFullReschedule(runner, 'cloud-sync');
    requestFullReschedule(runner, 'settings-change');

    expect(runner).not.toHaveBeenCalled(); // pencere henuz kapanmadi
    await flush();

    expect(runner).toHaveBeenCalledTimes(1);
  });

  it('pencere kapandiktan SONRA gelen istek yeni bir kosu baslatir', async () => {
    const runner = jest.fn().mockResolvedValue(undefined);

    requestFullReschedule(runner, 'ilk');
    await flush();
    expect(runner).toHaveBeenCalledTimes(1);

    requestFullReschedule(runner, 'ikinci');
    await flush();
    expect(runner).toHaveBeenCalledTimes(2);
  });

  it('kosu SURERKEN gelen istek KAYBEDILMEZ, bir kez daha calisir', async () => {
    let resolveFirst: (() => void) | null = null;
    const runner = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>(resolve => {
            resolveFirst = resolve;
          })
      )
      .mockResolvedValue(undefined);

    requestFullReschedule(runner, 'ilk');
    await flush();
    expect(runner).toHaveBeenCalledTimes(1);

    // Kosu surerken yeni durum geldi (orn. buluttan yeni ilac).
    requestFullReschedule(runner, 'kosu-sirasinda');
    expect(runner).toHaveBeenCalledTimes(1);

    resolveFirst!();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(runner).toHaveBeenCalledTimes(2);
  });

  it('runner PATLASA bile sonraki istekler calisabilir (kilitlenme yok)', async () => {
    const patlayan = jest.fn().mockRejectedValue(new Error('boom'));
    const saglam = jest.fn().mockResolvedValue(undefined);

    requestFullReschedule(patlayan, 'patlayan');
    await flush();
    expect(patlayan).toHaveBeenCalledTimes(1);

    requestFullReschedule(saglam, 'saglam');
    await flush();
    expect(saglam).toHaveBeenCalledTimes(1);
  });

  it('en SON verilen runner kullanilir (en guncel durum)', async () => {
    const eski = jest.fn().mockResolvedValue(undefined);
    const yeni = jest.fn().mockResolvedValue(undefined);

    requestFullReschedule(eski, 'eski');
    requestFullReschedule(yeni, 'yeni');
    await flush();

    expect(eski).not.toHaveBeenCalled();
    expect(yeni).toHaveBeenCalledTimes(1);
  });
});
