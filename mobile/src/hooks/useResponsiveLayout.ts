/**
 * useResponsiveLayout — Tablet (Samsung Tab S7 FE) ve Telefon (Xiaomi) Uyum Kancası
 *
 * Geniş ekranlarda (Tablet >= 600dp / 768dp) arayüzün aşırı yayılmasını ve kenarlarda
 * devasa ölü boşluklar oluşmasını engelleyerek merkezlenmiş ergonomik genişlik ve
 * adaptif ölçekleme sunar.
 */

import * as RN from 'react-native';

export interface ResponsiveLayout {
  width: number;
  height: number;
  isTablet: boolean;
  isLandscape: boolean;
  numColumns: number;
  contentMaxWidth: number;
  horizontalPadding: number;
  fontSizeMultiplier: number;
}

export function useResponsiveLayout(): ResponsiveLayout {
  let width = 390;
  let height = 844;

  // Hook kuralı: `useWindowDimensions` HER render'da ve KOŞULSUZ çağrılmalı.
  // Önceki sürüm bunu `if (typeof useDims === 'function')` içinde çağırıyordu;
  // koşul render'lar arasında değişirse React'in hook sırası bozulur ve
  // "Rendered fewer hooks than expected" ile çöker. Koşul artık yalnızca
  // hook-OLMAYAN yedek yolu (`Dimensions.get`) sarıyor, hook çağrısının
  // kendisi her zaman çalışıyor.
  try {
    const dims = RN.useWindowDimensions();
    if (dims && Number.isFinite(dims.width) && Number.isFinite(dims.height)) {
      width = dims.width;
      height = dims.height;
    }
  } catch {
    // `useWindowDimensions`'ın hiç var olmadığı kısmi mock'lu ortamlar için
    // hook dışı yedek.
    try {
      const dims = RN.Dimensions.get('window');
      if (dims && Number.isFinite(dims.width) && Number.isFinite(dims.height)) {
        width = dims.width;
        height = dims.height;
      }
    } catch {
      // Varsayılan telefon boyutları korunur.
    }
  }
  const minDimension = Math.min(width, height);
  const isLandscape = width > height;

  // 600dp üzeri tablet (Samsung Tab S7 FE min 800-1000dp)
  const isTablet = minDimension >= 600 || width >= 768;
  const numColumns = isTablet ? 2 : 1;
  const contentMaxWidth = isTablet ? 980 : width;
  const horizontalPadding = isTablet ? 24 : 16;
  const fontSizeMultiplier = isTablet ? 1.15 : 1.0;

  return {
    width,
    height,
    isTablet,
    isLandscape,
    numColumns,
    contentMaxWidth,
    horizontalPadding,
    fontSizeMultiplier,
  };
}
