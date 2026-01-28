import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SettingIcon } from './SettingIcon';
import { SettingRowProps } from './types';
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

  const getChevronName = (): keyof typeof Ionicons.glyphMap => {
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
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};
