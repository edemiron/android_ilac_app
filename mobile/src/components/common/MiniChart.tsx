/**
 * MiniChart — Sprint 58.5.
 *
 * 7-günlük adherence mini bar chart. Custom SVG (recharts eklenmez).
 * react-native-svg tabanlı.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

export interface MiniChartDatum {
  dayLabel: string; // 'Pt', 'Sa', 'Ça', ...
  percentage: number; // 0-100
}

interface MiniChartProps {
  data: MiniChartDatum[];
  height?: number;
  title?: string;
}

const DEFAULT_HEIGHT = 80;
const BAR_GAP = 4;
const BAR_RADIUS = 4;

export function MiniChart({ data, height = DEFAULT_HEIGHT, title }: MiniChartProps) {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();

  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {language === 'tr' ? 'Veri yok' : 'No data'}
        </Text>
      </View>
    );
  }

  // Compute SVG dimensions — assume width 100% via aspect viewBox
  const barCount = data.length;
  const svgWidth = 100; // viewBox basis (will scale)
  const svgHeight = 100; // viewBox basis
  const totalGapWidth = BAR_GAP * (barCount - 1);
  const barWidth = (svgWidth - totalGapWidth) / barCount;

  const trackColor = isDark ? colors.surfaceContainerHigh : '#E2E8F0';

  return (
    <View
      style={styles.container}
      accessibilityRole="image"
      accessibilityLabel={
        title
          ? `${title}: ${data.map(d => `${d.dayLabel} ${d.percentage}%`).join(', ')}`
          : undefined
      }
    >
      {title && <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>}
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="none"
      >
        {data.map((d, i) => {
          const x = i * (barWidth + BAR_GAP);
          // Track (full height bar)
          const trackY = 0;
          const trackH = svgHeight;
          // Filled portion
          const fillH = (Math.max(0, Math.min(100, d.percentage)) / 100) * svgHeight;
          const fillY = svgHeight - fillH;
          return (
            <React.Fragment key={i}>
              <Rect
                x={x}
                y={trackY}
                width={barWidth}
                height={trackH}
                rx={BAR_RADIUS}
                ry={BAR_RADIUS}
                fill={trackColor}
              />
              {fillH > 0 && (
                <Rect
                  x={x}
                  y={fillY}
                  width={barWidth}
                  height={fillH}
                  rx={BAR_RADIUS}
                  ry={BAR_RADIUS}
                  fill={colors.primary}
                />
              )}
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={styles.labelRow}>
        {data.map((d, i) => (
          <View key={i} style={[styles.labelCell, { width: `${100 / barCount}%` }]}>
            <Text style={[styles.label, { color: colors.textMuted }]}>{d.dayLabel}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  labelCell: {
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  empty: {
    height: DEFAULT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
});
