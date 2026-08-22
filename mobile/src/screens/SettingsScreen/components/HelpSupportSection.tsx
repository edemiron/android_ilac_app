/**
 * HelpSupportSection — SSS (FAQ), Sürüm Bilgisi ve Dev Mode Tetikleyici
 */

import React from 'react';
import { SettingsSection, SettingRow } from '../../../components/settings';

interface HelpSupportSectionProps {
  onFAQPress: () => void;
  onVersionPress: () => void;
  language: string;
}

export function HelpSupportSection({
  onFAQPress,
  onVersionPress,
  language,
}: HelpSupportSectionProps) {
  return (
    <SettingsSection
      icon="help-circle-outline"
      title={language === 'tr' ? 'Yardım & Destek' : 'Help & Support'}
    >
      <SettingRow
        icon={{ name: 'help-circle-outline', color: '#0284C7' }}
        label={language === 'tr' ? 'Sıkça Sorulan Sorular' : 'FAQ'}
        description={language === 'tr' ? 'Kullanım ipuçları ve yardım' : 'Tips and user guide'}
        onPress={onFAQPress}
        showChevron
      />

      <SettingRow
        icon={{ name: 'headset-outline', color: '#0284C7' }}
        label={language === 'tr' ? 'Bize Ulaşın & Hakkında' : 'Contact Us & About'}
        description={
          language === 'tr'
            ? 'Sürüm 1.3.2 (Geliştirici modu için dokun)'
            : 'Version 1.3.2 (Tap for dev mode)'
        }
        onPress={onVersionPress}
        showChevron
      />
    </SettingsSection>
  );
}
