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
  /**
   * v1.8.4 — Hesap silme. Verilmezse satır GÖSTERİLMEZ (misafir oturumda
   * silinecek bir hesap yok). Opsiyonel olması bilinçli: zorunlu yapmak,
   * misafir akışında anlamsız bir satır üretirdi.
   */
  onDeleteAccountPress?: () => void;
}

export const AccountSection: React.FC<AccountSectionProps> = ({
  userEmail,
  lastSyncFormatted,
  isSyncing,
  onSyncPress,
  onLogoutPress,
  onDeleteAccountPress,
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
        label={language === 'tr' ? 'Şimdi Senkronize Et' : 'Sync Now'}
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
        label={language === 'tr' ? 'Çıkış Yap' : 'Logout'}
        description={language === 'tr' ? 'Hesabınızdan çıkış yapın' : 'Sign out of your account'}
        labelColor={colors.error || '#EF4444'}
        onPress={onLogoutPress}
        showChevron
        chevronColor={colors.error || '#EF4444'}
      />

      {/*
        v1.8.4 — Hesap ve veri silme.
        Google Play, hesap olusturmaya izin veren uygulamalarda uygulama
        ICINDE bir hesap silme yolu ZORUNLU tutuyor; bu satir olmadigi icin
        yayin engeliydi. Ayrica KVKK md. 11-e / GDPR md. 17 "silinme hakki".
        "Cikis Yap"in ALTINDA duruyor: yikici olan asagida, gunluk olan
        yukarida.
      */}
      {onDeleteAccountPress ? (
        <SettingRow
          icon={{ name: 'trash-outline', color: '#DC2626' }}
          label={language === 'tr' ? 'Hesabımı ve Verilerimi Sil' : 'Delete My Account and Data'}
          description={
            language === 'tr' ? 'Kalıcı olarak siler, geri alınamaz' : 'Permanent, cannot be undone'
          }
          labelColor="#DC2626"
          onPress={onDeleteAccountPress}
          showChevron
          chevronColor="#DC2626"
        />
      ) : null}
    </SettingsSection>
  );
};
