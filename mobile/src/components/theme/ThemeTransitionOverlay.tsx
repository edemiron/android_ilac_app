/**
 * ThemeTransitionOverlay — Sprint 104.5 (Klinik Göz Konforu & Fotofobi Kalkanı)
 *
 * Koyu ve açık mod arasında geçiş yapılırken ekranın aniden parlamasını veya kararmasını
 * (Instant Flash) önleyerek 250ms akıcı cross-fade geçiş efekti sunar.
 *
 * Özellikle gece uyanıp ilaç alan yaşlı hastaların ani ışık kamaşması (fotofobi) yaşamasını
 * engeller. pointerEvents="none" sayesinde dokunma etkileşimlerini asla engellemez.
 */

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Animated } from 'react-native';
import { useThemeSafe, lightColors, darkColors } from '../../contexts/ThemeContext';

export function ThemeTransitionOverlay() {
  const themeContext = useThemeSafe();
  const isDark = themeContext?.isDark ?? false;

  const prevIsDarkRef = useRef<boolean | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [overlayColor, setOverlayColor] = useState<string>('transparent');
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // İlk render'da animasyon tetikleme
    if (prevIsDarkRef.current === null) {
      prevIsDarkRef.current = isDark;
      return;
    }

    // Durum değişmediyse işlem yapma
    if (prevIsDarkRef.current === isDark) {
      return;
    }

    // Önceki tema rengini perde rengi yap (açıktan koyuya geçerken beyaz perde solar,
    // koyudan açığa geçerken koyu perde solar)
    const oldBg = prevIsDarkRef.current ? darkColors.background : lightColors.background;
    prevIsDarkRef.current = isDark;

    setOverlayColor(oldBg);
    setIsTransitioning(true);
    fadeAnim.setValue(1);

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsTransitioning(false);
      }
    });
  }, [isDark, fadeAnim]);

  if (!isTransitioning) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        styles.overlay,
        {
          backgroundColor: overlayColor,
          opacity: fadeAnim,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 99999,
  },
});
