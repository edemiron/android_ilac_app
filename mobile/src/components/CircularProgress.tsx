import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  progressColor?: string;
  trackColor?: string;
  textColor?: string;
  backgroundColor?: string;
}

/**
 * Dairesel ilerleme göstergesi.
 * SVG tabanlı, yüzdelik değere göre stroke-dasharray/offset hesaplaması yapar.
 * Saat 12 pozisyonundan başlar, saat yönünde ilerler.
 */
export const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size = 70,
  strokeWidth = 8,
  progressColor = '#2D9596',
  trackColor = '#E8F4F4',
  textColor,
  backgroundColor = '#F0F9F9',
}) => {
  // Yüzdeyi 0-100 arasında sınırla
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  // Daire hesaplamaları
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;

  // Dairenin merkezi
  const center = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Arka plan daire (iç alan) */}
      <View
        style={[
          styles.innerCircle,
          {
            width: size - strokeWidth * 2,
            height: size - strokeWidth * 2,
            borderRadius: (size - strokeWidth * 2) / 2,
            backgroundColor: backgroundColor,
          },
        ]}
      />

      {/* SVG Progress Circle */}
      <Svg width={size} height={size} style={styles.svgContainer}>
        {/* Track (arka plan halkası) */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress (ilerleme halkası) */}
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
          // Saat 12 pozisyonundan baslamak icin -90 derece dondur
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>

      {/* Merkez yuzde metni */}
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
});

export default CircularProgress;
