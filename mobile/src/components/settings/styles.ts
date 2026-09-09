import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../contexts/ThemeContext';

export const createSettingsStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    section: {
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
      marginTop: 14,
      marginHorizontal: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0 : 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingVertical: 12,
      backgroundColor: isDark ? '#1E293B' : '#E9EEF5',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? '#334155' : '#E2E8F0',
    },
    sectionIcon: {
      fontSize: 16,
      lineHeight: 20,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: isDark ? '#F1F5F9' : '#1E293B',
      letterSpacing: -0.2,
    },
    sectionDescription: {
      fontSize: 12,
      color: isDark ? '#94A3B8' : '#64748B',
      marginTop: 2,
      lineHeight: 16,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      minHeight: 60,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: isDark ? '#334155' : '#F1F5F9',
    },
    settingInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    settingTextContainer: {
      flex: 1,
    },
    settingLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      letterSpacing: -0.2,
    },
    settingDescription: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
      lineHeight: 16,
    },
    settingValueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    settingValue: {
      fontSize: 14,
      fontWeight: '500',
      color: isDark ? '#94A3B8' : '#64748B',
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    pickerContainer: {
      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
      marginHorizontal: 12,
      marginBottom: 8,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
    },
    pickerOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      minHeight: 48,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? '#334155' : '#E2E8F0',
    },
    pickerOptionActive: {
      backgroundColor: colors.primary + '15',
    },
    pickerOptionText: {
      fontSize: 15,
      color: colors.text,
    },
    pickerOptionTextActive: {
      color: colors.primary,
      fontWeight: '600',
    },
    premiumCard: {
      marginTop: 16,
      marginHorizontal: 16,
    },
  });

export type SettingsStyles = ReturnType<typeof createSettingsStyles>;
