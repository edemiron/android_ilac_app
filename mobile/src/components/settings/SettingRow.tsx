import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SettingIcon } from './SettingIcon';
import { SettingRowProps } from './types';
import { useHaptics } from '../../hooks/useHaptics';
import { useTheme } from '../../contexts/ThemeContext';
import { createSettingsStyles } from './styles';

export const SettingRow: React.FC<SettingRowProps> = ({
  icon,
  label,
  description,
  value,
  onPress,
  rightElement,
  showChevron = false,
  chevronDirection = 'forward',
  labelColor,
  chevronColor,
}) => {
  const { colors, isDark } = useTheme();
  const styles = createSettingsStyles(colors, isDark);

  const getChevronName = (): string => {
    switch (chevronDirection) {
      case 'up':
        return 'chevron-up';
      case 'down':
        return 'chevron-down';
      default:
        return 'chevron-forward';
    }
  };

  const content = (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <SettingIcon {...icon} />
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingLabel, labelColor ? { color: labelColor } : undefined]}>
            {label}
          </Text>
          {description && <Text style={styles.settingDescription}>{description}</Text>}
        </View>
      </View>
      {rightElement ? (
        rightElement
      ) : value || showChevron ? (
        <View style={styles.settingValueContainer}>
          {value && <Text style={styles.settingValue}>{value}</Text>}
          {showChevron && (
            <Ionicons
              name={getChevronName()}
              size={value ? 16 : 18}
              color={chevronColor || colors.textMuted}
            />
          )}
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <HapticSettingRow
        onPress={onPress}
        label={label}
        description={description}
        chevronDirection={chevronDirection}
      >
        {content}
      </HapticSettingRow>
    );
  }

  return (
    <View accessibilityLabel={label} accessibilityRole="text">
      {content}
    </View>
  );
};

/**
 * HapticSettingRow — Sprint 64: light haptic on press.
 */
function HapticSettingRow({
  onPress,
  label,
  description,
  chevronDirection,
  children,
}: {
  onPress: () => void;
  label: string;
  description?: string;
  chevronDirection?: 'up' | 'down' | 'forward';
  children: React.ReactNode;
}) {
  const haptics = useHaptics();
  const handlePress = useCallback(() => {
    haptics.light();
    onPress();
  }, [haptics, onPress]);
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityLabel={label}
      accessibilityHint={description || `${label} ayarını değiştirmek için dokunun`}
      accessibilityRole="button"
      accessibilityState={{ expanded: chevronDirection === 'down' }}
    >
      {children}
    </TouchableOpacity>
  );
}
