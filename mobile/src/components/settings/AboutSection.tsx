import React from 'react';
import { Linking } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SettingsSection } from './SettingsSection';
import { SettingRow } from './SettingRow';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppVersion } from '../../hooks/useAppVersion';

interface AboutSectionProps {
  onVersionPress?: () => void;
  isDevMode?: boolean;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ onVersionPress, isDevMode }) => {
  const { colors } = useTheme();
  const { language, t } = useLanguage();
  const { fullVersion } = useAppVersion(); // UCES: Auto-sync with build.gradle

  const openTelegram = (handle: string) => {
    Linking.openURL(`https://t.me/${handle}`);
  };

  return (
    <SettingsSection icon="information-circle-outline" title={t('settings_about')}>
      <SettingRow
        icon={{ name: 'code-slash-outline', color: '#8B5CF6' }}
        label={t('settings_version')}
        value={isDevMode ? `${fullVersion} (Dev)` : fullVersion}
        onPress={onVersionPress}
      />

      <SettingRow
        icon={{ name: 'chatbubble-ellipses-outline', color: '#0088CC' }}
        label={language === 'tr' ? 'Gelistirici' : 'Developer'}
        description="@eDemirON"
        onPress={() => openTelegram('eDemirON')}
        rightElement={<Ionicons name="open-outline" size={18} color={colors.textMuted} />}
      />

      <SettingRow
        icon={{ name: 'chatbubble-ellipses-outline', color: '#0088CC' }}
        label={language === 'tr' ? 'Gelistirici' : 'Developer'}
        description="@demiryasin"
        onPress={() => openTelegram('demiryasin')}
        rightElement={<Ionicons name="open-outline" size={18} color={colors.textMuted} />}
      />
    </SettingsSection>
  );
};
