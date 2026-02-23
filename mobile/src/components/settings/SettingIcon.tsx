import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SettingIconProps } from './types';

// Icon name to emoji map - tüm ayarlar simgeleri
const ICON_EMOJI: Record<string, string> = {
  // Bildirimler
  'notifications-outline': '🔔',
  'notifications': '🔔',
  'notifications-off-outline': '🔕',
  'alarm-outline': '⏰',
  'alarm': '⏰',
  'phone-portrait-outline': '📱',
  'volume-high-outline': '🔊',
  'volume-high': '🔊',
  'volume-medium-outline': '🔉',
  'time-outline': '⏰',

  // Güvenlik
  'lock-closed-outline': '🔒',
  'lock-closed': '🔒',
  'lock-open-outline': '🔓',
  'finger-print-outline': '👆',

  // Ayarlar/Görünüm
  'moon-outline': '🌙',
  'sunny-outline': '☀️',
  'moon': '🌙',
  'sunny': '☀️',
  'globe-outline': '🌍',
  'color-palette-outline': '🎨',

  // Sağlık/İlaç
  'flask-outline': '💊',
  'warning-outline': '⚠️',
  'warning': '⚠️',
  'fitness-outline': '💪',
  'add-circle-outline': '➕',

  // İnsanlar
  'people-outline': '👥',
  'people': '👥',
  'person-outline': '👤',
  'person-add-outline': '👤',

  // Diğer
  'cloud-outline': '☁️',
  'mail-outline': '✉️',
  'log-out-outline': '🚪',
  'refresh-outline': '🔄',
  'expand-outline': '⬆️',
  'git-branch-outline': '⑂',
  'bed-outline': '🛏️',
  'timer-outline': '⏱️',
  'nuclear-outline': '☢️',
  'bug-outline': '🐛',
  'trash-outline': '🗑️',
  'code-slash-outline': '💻',
  'chatbubble-ellipses-outline': '💬',
  'information-circle-outline': 'ℹ️',
  'flash-outline': '⚡',

  // Chevron için (kullanılmıyor ama tanımlı olsun)
  'chevron-forward': '›',
  'chevron-up': '↑',
  'chevron-down': '↓',
};

export const SettingIcon: React.FC<SettingIconProps> = ({ name, color }) => {
  const emoji = ICON_EMOJI[name] || ICON_EMOJI[name?.replace('-outline', '')] || '•';

  return (
    <View style={styles.iconContainer}>
      <Text style={styles.iconEmoji}>{emoji}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconEmoji: {
    fontSize: 20,
    lineHeight: 24,
  },
});
