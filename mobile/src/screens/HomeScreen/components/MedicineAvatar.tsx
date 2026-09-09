/**
 * MedicineAvatar.tsx — Sprint 98 Karol-inspired redesign.
 *
 * İlacın ilk harfini renkli daire içinde gösteren avatar.
 * medicine.imageUri varsa Image gösterir (parity korunur), yoksa harf avatar.
 *
 * Reusable: TimelineItem, CurrentDoseCard, expiryMedicineItem.
 */

import React from 'react';
import {
  Text,
  Image,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { MotiView } from 'moti';
import { motiTransitions } from '../../../theme/moti-config';

export interface MedicineAvatarProps {
  /** İlacın adı — ilk karakter avatar olarak gösterilir. */
  name: string;
  /** İlacın tema rengi (hex). */
  color: string;
  /** Avatar boyutu (px). default 44. */
  size?: number;
  /** İşlem tamamlandıysa (taken/skipped) düşük opacity. */
  isCompleted?: boolean;
  /** İlaç fotoğrafı varsa Image gösterilir. */
  imageUri?: string | null;
  style?: StyleProp<ViewStyle>;
}

export function MedicineAvatar({
  name,
  color,
  size = 44,
  isCompleted = false,
  imageUri,
  style,
}: MedicineAvatarProps) {
  const initial = (name?.charAt(0) ?? '?').toUpperCase();
  const fontSize = Math.round(size * 0.45);
  const borderRadius = size / 2;

  // imageUri varsa fotoğraf göster
  if (imageUri) {
    return (
      // Sprint 100: mount pop-in (scale 0.8 → 1, spring)
      <MotiView
        from={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: isCompleted ? 0.55 : 1 }}
        transition={motiTransitions.expressive}
        style={style}
      >
        <Image
          source={{ uri: imageUri }}
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius,
              opacity: isCompleted ? 0.55 : 1,
            },
          ]}
          accessibilityIgnoresInvertColors
        />
      </MotiView>
    );
  }

  return (
    // Sprint 100: mount pop-in (scale 0.8 → 1, spring)
    <MotiView
      from={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: isCompleted ? 0.55 : 1 }}
      transition={motiTransitions.expressive}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: color + '25', // %15 alpha tint
          opacity: isCompleted ? 0.55 : 1,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={`${name} avatar`}
    >
      <Text
        style={[
          styles.initial,
          {
            fontSize,
            color,
          },
        ]}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {initial}
      </Text>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  image: {
    resizeMode: 'cover',
  },
});
