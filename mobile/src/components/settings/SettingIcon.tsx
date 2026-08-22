import React from 'react';
import { View, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SettingIconProps } from './types';
import { useTheme } from '../../contexts/ThemeContext';

export const SettingIcon: React.FC<SettingIconProps> = ({
  name,
  color,
  size = 20,
  backgroundColor,
}) => {
  const { isDark } = useTheme();

  // Consistent Google Stitch blue/teal accent
  const defaultIconColor = isDark ? '#38BDF8' : '#0284C7';
  const defaultBg = isDark ? 'rgba(56, 189, 248, 0.15)' : '#E0F2FE';

  const iconColor = color || defaultIconColor;
  const bg = backgroundColor || defaultBg;

  const iconName = name?.includes('-outline') ? name : `${name}-outline`;

  return (
    <View style={[styles.iconContainer, { backgroundColor: bg }]}>
      <Ionicons name={iconName as any} size={size} color={iconColor} />
    </View>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
});

export default SettingIcon;
