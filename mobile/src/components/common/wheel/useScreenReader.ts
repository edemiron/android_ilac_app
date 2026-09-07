import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * useScreenReaderEnabled — Bellek sızıntısız ekran okuyucu durumu dinleyicisi.
 * INV-11: Abonelik her zaman cleanup'ta remove() edilir.
 */
export function useScreenReaderEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isScreenReaderEnabled()
      .then((v: boolean) => {
        if (mounted) setEnabled(v);
      })
      .catch(() => {
        /* sessizce düş, varsayılan false */
      });

    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', (v: boolean) => {
      if (mounted) setEnabled(v);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return enabled;
}
