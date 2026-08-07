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
  View,
  Text,
  Image,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type ImageStyle,
} from 'react-native';

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
          style as StyleProp<ImageStyle>,
        ]}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View
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
    </View>
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
