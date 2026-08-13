import React from 'react';
import { Text } from 'react-native';
import { SettingsSectionProps } from './types';
import { ListSection } from '../common/ListSection';

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

/**
 * SettingsSection — Sprint 107.2 ListSection migration.
 *
 * Settings ekranı section wrapper. ListSection primitive'i (variant=settings)
 * kullanır — iOS grouped list pattern.
 */
export const SettingsSection: React.FC<SettingsSectionProps> = ({
  icon,
  title,
  description,
  children,
  borderStyle,
}) => {
  const iconEmoji = SECTION_ICONS[icon] || '•';

  return (
    <ListSection
      variant="settings"
      icon={<Text>{iconEmoji}</Text>}
      title={title}
      subtitle={description}
      style={borderStyle}
    >
      {children}
    </ListSection>
  );
};