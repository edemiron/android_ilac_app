import React from 'react';
import { SettingsSection } from './SettingsSection';
import { SettingRow } from './SettingRow';
import { useLanguage } from '../../contexts/LanguageContext';

interface AdditionalFeaturesSectionProps {
  onInteractionsPress: () => void;
  onSecurityPress: () => void;
  onTtsPress: () => void;
  onCaregiverPress?: () => void;
  ttsEnabled: boolean;
}

export const AdditionalFeaturesSection: React.FC<AdditionalFeaturesSectionProps> = ({
  onInteractionsPress,
  onSecurityPress,
  onTtsPress,
  onCaregiverPress,
  ttsEnabled,
}) => {
  const { language, t } = useLanguage();

  return (
    <SettingsSection
      icon="flash-outline"
      title={language === 'tr' ? 'Ek Özellikler' : 'Additional Features'}
    >
      <SettingRow
        icon={{ name: 'warning-outline', color: '#F59E0B' }}
        label={t('interaction_title')}
        description={
          language === 'tr'
            ? 'İlaçlarınız arasındaki etkileşimler'
            : 'Interactions between your medicines'
        }
        onPress={onInteractionsPress}
        showChevron
      />
      {onCaregiverPress && (
        <SettingRow
          icon={{ name: 'people-outline', color: '#8B5CF6' }}
          label={language === 'tr' ? 'Bakıcı Yönetimi' : 'Caregiver'}
          description={
            language === 'tr'
              ? 'Sevdikleriniz ilaç takipinizi görsün'
              : 'Share your medication schedule'
          }
          onPress={onCaregiverPress}
          showChevron
        />
      )}
      <SettingRow
        icon={{ name: 'lock-closed-outline', color: '#4ECDC4' }}
        label={language === 'tr' ? 'Güvenlik' : 'Security'}
        description={
          language === 'tr'
            ? 'PIN ve biyometrik kimlik doğrulama'
            : 'PIN and biometric authentication'
        }
        onPress={onSecurityPress}
        showChevron
      />
      <SettingRow
        icon={{ name: 'volume-high-outline', color: '#96CEB4' }}
        label={language === 'tr' ? 'Sesli Bildirimler' : 'Voice Notifications'}
        description={
          ttsEnabled
            ? language === 'tr'
              ? 'Sesli okuma aktif'
              : 'Voice reading enabled'
            : language === 'tr'
              ? 'Sesli okuma kapalı'
              : 'Voice reading disabled'
        }
        onPress={onTtsPress}
        showChevron
      />
    </SettingsSection>
  );
};
