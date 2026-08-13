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
      backgroundColor: colors.card,
      marginTop: 16,
      marginHorizontal: 16,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0 : 0.05,
      shadowRadius: 4,
      elevation: isDark ? 0 : 1,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 4,
      gap: 8,
    },
    sectionIcon: {
      fontSize: 16,
      lineHeight: 20,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sectionDescription: {
      fontSize: 12,
      color: colors.textSecondary,
      paddingHorizontal: 16,
      paddingBottom: 8,
      lineHeight: 16,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 64,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.divider,
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
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      letterSpacing: -0.2,
    },
    settingDescription: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
      lineHeight: 17,
    },
    settingValueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    settingValue: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primary,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    pickerContainer: {
      backgroundColor: isDark ? colors.background : colors.card,
      marginHorizontal: 12,
      marginBottom: 8,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: isDark ? 1 : 0,
      borderColor: colors.divider,
    },
    pickerOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      minHeight: 48,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.divider,
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
      // Sprint 107.1: HeroCard primitive sarmalayıcı — borderRadius/padding/elevation HeroCard'da.
      // Sadece dış margin gerekli.
      marginTop: 16,
      marginHorizontal: 16,
    },
    // Sprint 107.1: premiumCardGradient / premiumCardContent / premiumIconContainer /
    // premiumTextContainer / premiumTitle / premiumSubtitle stilleri kaldırıldı —
    // HeroCard primitive bunları birebir karşılıyor.
  });

export type SettingsStyles = ReturnType<typeof createSettingsStyles>;
