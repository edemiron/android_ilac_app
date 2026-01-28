import React from 'react';
import { SettingsSection } from './SettingsSection';
import { SettingRow } from './SettingRow';
import { useLanguage } from '../../contexts/LanguageContext';

interface AdditionalFeaturesSectionProps {
  onInteractionsPress: () => void;
}

export const AdditionalFeaturesSection: React.FC<AdditionalFeaturesSectionProps> = ({
  onInteractionsPress,
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
    </SettingsSection>
  );
};
