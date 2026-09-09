import React from 'react';
import { View, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SettingIconProps } from './types';
import { useTheme } from '../../contexts/ThemeContext';

export const SettingIcon: React.FC<SettingIconProps> = ({
  name,
  color,
  size = 18,
  backgroundColor,
}) => {
  const { isDark } = useTheme();

  const defaultIconColor = isDark ? '#38BDF8' : '#0284C7';
  const iconColor = color || defaultIconColor;

  const bg = backgroundColor || (isDark ? `${iconColor}22` : `${iconColor}15`);

  const borderColor = isDark ? `${iconColor}40` : `${iconColor}30`;

  const iconName = name?.includes('-outline') ? name : `${name}-outline`;

  return (
    <View
      style={[
        styles.iconContainer,
        {
          backgroundColor: bg,
          borderColor,
        },
      ]}
    >
      <Ionicons name={iconName as any} size={size} color={iconColor} />
    </View>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
  },
});

export default SettingIcon;
