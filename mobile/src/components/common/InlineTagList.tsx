/**
 * InlineTagList — Sprint 107.4 (Radikal UI Mimarisi).
 *
 * Birden fazla Pill/chip'i yatayda sıralayan container. MedicineRow'da 4 ayrı
 * badge (3 expiry + 1 stock), TimelineItem'da time chips vb. bu primitive'i
 * kullanır.
 *
 * Davranış: sıfır (Pill render birebir korunur, layout sarmalayıcı).
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Pill, type PillVariant, type PillSize } from './Pill';
import { spacing } from '../../theme/tokens';

export interface InlineTagItem {
  key: string;
  label: string;
  icon?: string;
  variant?: PillVariant;
  size?: PillSize;
  accessibilityLabel?: string;
}

export interface InlineTagListProps {
  items: InlineTagItem[];
  /** Default tag size (override edilmezse hepsine uygulanır). */
  size?: PillSize;
  /** Tag'ler arasına • middot koy. */
  separator?: boolean;
  /** Taşarsa wrap et (default: nowrap horizontal ScrollView'sız). */
  wrap?: boolean;
  /** Test ID. */
  testID?: string;
  /** Dış container stili. */
  style?: StyleProp<ViewStyle>;
}

export function InlineTagList({
  items,
  size = 'sm',
  separator = false,
  wrap = false,
  testID,
  style,
}: InlineTagListProps) {
  if (items.length === 0) return null;

  const containerStyle: StyleProp<ViewStyle> = [
    wrap ? styles.wrap : styles.row,
    style,
  ];

  return (
    <View style={containerStyle} testID={testID}>
      {items.map((item, index) => (
        <React.Fragment key={item.key}>
          <Pill
            label={item.label}
            icon={item.icon}
            variant={item.variant}
            size={item.size ?? size}
            accessibilityElementsHidden={false}
          />
          {separator && index < items.length - 1 && (
            <Text style={styles.separator}>•</Text>
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    rowGap: spacing.xs,
    columnGap: spacing.xs,
  },
  separator: {
    fontSize: 12,
    color: '#9CA3AF',
    marginHorizontal: 2,
  },
});