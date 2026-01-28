import React from 'react';
import { ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SettingsSection } from './SettingsSection';
import { SettingRow } from './SettingRow';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface AccountSectionProps {
  userEmail: string | null | undefined;
  lastSyncFormatted: string;
  isSyncing: boolean;
  onSyncPress: () => void;
  onLogoutPress: () => void;
}

export const AccountSection: React.FC<AccountSectionProps> = ({
  userEmail,
  lastSyncFormatted,
  isSyncing,
  onSyncPress,
  onLogoutPress,
}) => {
  const { colors } = useTheme();
  const { language } = useLanguage();

  return (
    <SettingsSection icon="person-outline" title={language === 'tr' ? 'Hesap' : 'Account'}>
      <SettingRow
        icon={{ name: 'mail-outline', color: '#3B82F6' }}
        label={language === 'tr' ? 'E-posta' : 'Email'}
        description={userEmail || '-'}
      />

      <SettingRow
        icon={{ name: 'cloud-outline', color: '#06B6D4' }}
        label={language === 'tr' ? 'Simdi Senkronize Et' : 'Sync Now'}
        description={`${language === 'tr' ? 'Son: ' : 'Last: '}${lastSyncFormatted}`}
        onPress={isSyncing ? undefined : onSyncPress}
        rightElement={
          isSyncing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="sync-outline" size={20} color={colors.primary} />
          )
        }
      />

      <SettingRow
        icon={{ name: 'log-out-outline', color: '#EF4444' }}
        label={language === 'tr' ? 'Cikis Yap' : 'Logout'}
        description={language === 'tr' ? 'Hesabinizdan cikis yapin' : 'Sign out of your account'}
        labelColor={colors.error || '#EF4444'}
        onPress={onLogoutPress}
        showChevron
        chevronColor={colors.error || '#EF4444'}
      />
    </SettingsSection>
  );
};
