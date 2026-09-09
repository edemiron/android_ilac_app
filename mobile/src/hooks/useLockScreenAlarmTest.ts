/**
 * useLockScreenAlarmTest — testAlarm motorunun paylaşımlı durumuna React köprüsü.
 *
 * "armed" durumu ve zamanlayıcı motorun içinde; bu hook yalnızca abone olur.
 * Böylece test butonu hangi ekranda olursa olsun aynı durumu gösterir ve
 * component unmount olduğunda zamanlayıcı motor tarafından temizlenir.
 */

import { useCallback, useEffect, useState } from 'react';

import {
  cancelLockScreenAlarmTest,
  getTestAlarmRunState,
  runLockScreenAlarmTest,
  subscribeTestAlarmRunState,
  type TestAlarmResult,
  type TestAlarmRunState,
} from '../utils/notifications/testAlarm';

export interface UseLockScreenAlarmTestResult extends TestAlarmRunState {
  /** Testi başlat. Ayarlar motor tarafından store'dan okunur. */
  run: (seconds: number) => Promise<TestAlarmResult>;
  cancel: () => Promise<void>;
  /** Buton pasif olmalı mı? */
  isBusy: boolean;
}

export function useLockScreenAlarmTest(language: 'tr' | 'en' = 'tr'): UseLockScreenAlarmTestResult {
  const [state, setState] = useState<TestAlarmRunState>(getTestAlarmRunState());

  useEffect(() => {
    const unsubscribe = subscribeTestAlarmRunState(setState);
    setState(getTestAlarmRunState());
    return unsubscribe;
  }, []);

  const run = useCallback(
    (seconds: number) => runLockScreenAlarmTest({ seconds, language }),
    [language]
  );

  return {
    ...state,
    run,
    cancel: cancelLockScreenAlarmTest,
    isBusy: state.isRunning || state.isArmed,
  };
}
