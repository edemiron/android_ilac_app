/**
 * useAppFonts — Sprint 103.2 (Clinical Clarity typography)
 *
 * ThemedText'in kullandığı 4 weight'i yükler. Yüklenene kadar `false` döner;
 * App.tsx bu bayrakla <LoadingScreen /> fallback'ini yönetir (native splash yerine).
 * Error durumunda ErrorBoundary'ye fırlatır (App.tsx'te ErrorBoundary zaten var).
 *
 * Font kaynağı: assets/fonts/*.woff2 (fontsource mirror, OFL 1.1 licensed)
 * Format: woff2 (compressed latin subset, ~75KB toplam 4 dosya).
 *
 * TypeScript notu: Sprint 102.8'deki hata kök nedeni = expo-font paket eksikliği
 * (transitive dep, npm ci sonrası kaybolabilir). Bu sprintte explicit dependency
 * yapıldı → require() Metro'da module ID (number) döner, FontSource ile uyumlu.
 */

import { useEffect } from 'react';
import { useFonts } from 'expo-font';

export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    HankenGroteskBold: require('../../assets/fonts/HankenGrotesk-Bold.woff2'),
    HankenGroteskSemiBold: require('../../assets/fonts/HankenGrotesk-SemiBold.woff2'),
    InterRegular: require('../../assets/fonts/Inter-Regular.woff2'),
    InterMedium: require('../../assets/fonts/Inter-Medium.woff2'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  return loaded;
}
