import React from 'react';
import { View, Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SettingsSectionProps } from './types';
import { useTheme } from '../../contexts/ThemeContext';
import { createSettingsStyles } from './styles';

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  icon,
  title,
  description,
  children,
  borderStyle,
}) => {
  const { colors, isDark } = useTheme();
  const styles = createSettingsStyles(colors, isDark);

  return (
    <View style={[styles.section, borderStyle]}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={18} color={colors.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {description && <Text style={styles.sectionDescription}>{description}</Text>}
      {children}
    </View>
  );
};
