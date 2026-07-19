import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  progressColor?: string;
  trackColor?: string;
  textColor?: string;
  backgroundColor?: string;
  accessibilityLabel?: string;
  /** Sprint 73A: %0 iken "Başla" yazısı + ikon göster */
  emptyStateLabel?: string;
}

/**
 * Dairesel ilerleme göstergesi.
 * SVG tabanlı, yüzdelik değere göre stroke-dasharray/offset hesaplaması yapar.
 * Saat 12 pozisyonundan başlar, saat yönünde ilerler.
 *
 * Sprint 73A: %0 durumunda özel "empty state" gösterimi — kompakt play
 * ikonu + "Başla" metni. %100 dolu ise checkmark + "Mükemmel!" rozeti.
 */
export const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size = 70,
  strokeWidth = 8,
  progressColor = '#2D9596',
  trackColor = '#E8F4F4',
  textColor,
  backgroundColor = '#F0F9F9',
  accessibilityLabel,
  emptyStateLabel,
}) => {
  // Yüzdeyi 0-100 arasında sınırla
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  // Daire hesaplamaları
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;

  // Dairenin merkezi
  const center = size / 2;
  const isEmpty = clampedPercentage === 0;
  const isFull = clampedPercentage === 100;

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ now: Math.round(clampedPercentage), min: 0, max: 100 }}
      accessibilityLabel={
        accessibilityLabel ??
        (isEmpty
          ? (emptyStateLabel ?? 'Henüz başlanmadı')
          : isFull
            ? 'Tamamlandı'
            : `${Math.round(clampedPercentage)} percent`)
      }
    >
      {/* Arka plan daire (iç alan) */}
      <View
        style={[
          styles.innerCircle,
          {
            width: size - strokeWidth * 2,
            height: size - strokeWidth * 2,
            borderRadius: (size - strokeWidth * 2) / 2,
            backgroundColor: isEmpty
              ? 'transparent'
              : isFull
                ? progressColor + '20'
                : backgroundColor,
          },
        ]}
      />

      {/* SVG Progress Circle */}
      {!isEmpty && (
        <Svg width={size} height={size} style={styles.svgContainer}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={progressColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation={-90}
            origin={`${center}, ${center}`}
          />
        </Svg>
      )}

      {/* Sprint 73A: Empty state — play ikonu + "Başla" metni */}
      {isEmpty && emptyStateLabel && (
        <View style={styles.textContainer}>
          <Ionicons
            name="play-circle"
            size={size * 0.32}
            color={progressColor}
            style={styles.emptyIcon}
          />
          <Text
            style={[
              styles.emptyLabel,
              { color: textColor || progressColor, fontSize: size * 0.14 },
            ]}
            numberOfLines={1}
          >
            {emptyStateLabel}
          </Text>
        </View>
      )}

      {/* Sprint 73A: Full state — checkmark + "Tamam" */}
      {isFull && (
        <View style={styles.textContainer}>
          <Ionicons name="checkmark-circle" size={size * 0.4} color={progressColor} />
        </View>
      )}

      {/* Merkez yuzde metni (sadece orta aralikta goster) */}
      {!isEmpty && !isFull && (
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.percentageText,
              { color: textColor || progressColor, fontSize: size * 0.22 },
            ]}
          >
            {Math.round(clampedPercentage)}%
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgContainer: {
    position: 'absolute',
  },
  innerCircle: {
    position: 'absolute',
  },
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  emptyIcon: {
    marginBottom: 2,
  },
  emptyLabel: {
    fontWeight: '700',
  },
});

export default CircularProgress;
