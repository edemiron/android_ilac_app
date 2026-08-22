import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface CircularProgressProps {
  size?: number;
  strokeWidth?: number;
  progress?: number; // 0 to 100
  percentage?: number; // alias for progress
  color?: string;
  progressColor?: string; // alias for color
  trackColor?: string;
  textColor?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  size = 68,
  strokeWidth = 6.5,
  progress,
  percentage,
  color,
  progressColor,
  trackColor = '#E2E8F0',
  textColor,
}) => {
  const actualProgress = progress ?? percentage ?? 0;
  const actualColor = color ?? progressColor ?? '#0F766E';
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(100, Math.max(0, actualProgress));
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress Fill */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.textContainer}>
        <Text style={[styles.percentText, { color: textColor || color }]}>
          %{Math.round(clampedProgress)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  textContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
