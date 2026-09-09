import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SettingsSectionProps } from './types';
import { useTheme } from '../../contexts/ThemeContext';

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  icon,
  title,
  description,
  children,
  borderStyle,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.container}>
      {/* Group Title Badge */}
      {title && (
        <View style={styles.sectionHeader}>
          {icon && (
            <Ionicons
              name={icon.includes('-outline') ? icon : `${icon}-outline`}
              size={13}
              color={colors.primary}
              style={{ marginRight: 6 }}
            />
          )}
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
          {description ? (
            <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{description}</Text>
          ) : null}
        </View>
      )}

      {/* Inset Card Container */}
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: colors.card,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          },
          borderStyle,
        ]}
      >
        <View style={styles.body}>{children}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionSubtitle: {
    fontSize: 11,
    marginLeft: 8,
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  body: {
    overflow: 'hidden',
  },
});

export default SettingsSection;
