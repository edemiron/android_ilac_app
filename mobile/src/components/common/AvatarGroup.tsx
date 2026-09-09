/**
 * AvatarGroup — Sprint 107.3 (Radikal UI Mimarisi).
 *
 * Overlapping avatar stack (Life360 + iOS grouped list pattern). CaregiverScreen
 * caregiver listelerinde + gelecekteki multi-user ekranlarda kullanılır.
 *
 * Davranış: sıfır — kod hareketi.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { withAlpha, ALPHA } from '../../utils/colors';
import { getInitials } from '../settings/getInitials';

export interface AvatarGroupItem {
  id: string;
  name: string;
  color?: string;
  initials?: string;
  onPress?: () => void;
}

export interface AvatarGroupProps {
  items: AvatarGroupItem[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const SIZE_MAP = {
  sm: { dim: 28, font: 11, border: 2, overlap: -8 },
  md: { dim: 36, font: 13, border: 2, overlap: -10 },
  lg: { dim: 48, font: 16, border: 2, overlap: -14 },
} as const;

export function AvatarGroup({
  items,
  maxVisible = 4,
  size = 'md',
  testID,
  style,
}: AvatarGroupProps) {
  const { colors } = useTheme();
  const { dim, font, border, overlap } = SIZE_MAP[size];

  const visibleItems = items.slice(0, maxVisible);
  const overflowCount = items.length - visibleItems.length;

  const containerStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    height: dim,
    paddingLeft: border,
  };

  return (
    <View style={[containerStyle, style]} testID={testID}>
      {visibleItems.map((item, index) => {
        const initials = item.initials ?? getInitials(item.name);
        const bg = item.color ?? colors.primaryContainer;
        const fg = item.color ? '#FFFFFF' : colors.onPrimaryContainer;

        const Wrapper = item.onPress ? TouchableOpacity : View;
        const wrapperProps = item.onPress
          ? ({
              onPress: item.onPress,
              accessibilityRole: 'button' as const,
              accessibilityLabel: item.name,
            } as React.ComponentProps<typeof TouchableOpacity>)
          : {};

        return (
          <Wrapper
            key={item.id}
            {...wrapperProps}
            style={[
              styles.avatar,
              {
                width: dim,
                height: dim,
                borderRadius: dim / 2,
                backgroundColor: bg,
                marginLeft: index === 0 ? 0 : overlap,
                borderWidth: border,
                borderColor: colors.card,
              },
            ]}
          >
            <Text style={[styles.initials, { color: fg, fontSize: font }]} numberOfLines={1}>
              {initials}
            </Text>
          </Wrapper>
        );
      })}
      {overflowCount > 0 && (
        <View
          style={[
            styles.avatar,
            {
              width: dim,
              height: dim,
              borderRadius: dim / 2,
              backgroundColor: withAlpha(colors.primary, ALPHA.veil),
              marginLeft: overlap,
              borderWidth: border,
              borderColor: colors.card,
            },
          ]}
          accessibilityLabel={`+${overflowCount} daha`}
        >
          <Text style={[styles.initials, { color: colors.primary, fontSize: font }]}>
            +{overflowCount}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
  },
});