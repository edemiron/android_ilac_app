import React from 'react';
import { View, Text } from 'react-native';
import { SettingsSectionProps } from './types';
import { useTheme } from '../../contexts/ThemeContext';
import { createSettingsStyles } from './styles';

// Icon name to emoji map for section headers
const SECTION_ICONS: Record<string, string> = {
  'time-outline': '⏰',
  'notifications-outline': '🔔',
  'notifications': '🔔',
  'color-palette-outline': '🎨',
  'information-circle-outline': 'ℹ️',
  'person-outline': '👤',
  'flash-outline': '⚡',
  'moon-outline': '🌙',
};

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  icon,
  title,
  description,
  children,
  borderStyle,
}) => {
  const { colors, isDark } = useTheme();
  const styles = createSettingsStyles(colors, isDark);

  const iconEmoji = SECTION_ICONS[icon] || '•';

  return (
    <View style={[styles.section, borderStyle]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{iconEmoji}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {description && <Text style={styles.sectionDescription}>{description}</Text>}
      {children}
    </View>
  );
};
