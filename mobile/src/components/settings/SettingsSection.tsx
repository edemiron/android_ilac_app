import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SettingsSectionProps } from './types';
import { useTheme } from '../../contexts/ThemeContext';

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  description,
  children,
  borderStyle,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.sectionCard,
        {
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          borderColor: isDark ? '#334155' : '#E2E8F0',
        },
        borderStyle,
      ]}
    >
      {/* Tinted Top Header Bar */}
      <View
        style={[
          styles.headerBar,
          {
            backgroundColor: isDark ? '#1E293B' : '#E9EEF5',
            borderBottomColor: isDark ? '#334155' : '#E2E8F0',
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: isDark ? '#F1F5F9' : '#1E293B' }]}>{title}</Text>
        {description ? (
          <Text style={[styles.headerSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            {description}
          </Text>
        ) : null}
      </View>

      {/* Card Content Rows */}
      <View style={styles.body}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 2,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  headerBar: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  body: {
    paddingVertical: 2,
  },
});

export default SettingsSection;
