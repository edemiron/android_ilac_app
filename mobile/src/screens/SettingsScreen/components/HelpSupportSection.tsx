/**
 * HelpSupportSection — SSS (FAQ), Sürüm Bilgisi ve Geliştirici Modu
 */

import React from 'react';
import { SettingsSection, SettingRow } from '../../../components/settings';
import { APP_VERSION } from '../../../config/version';

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
  const isTr = language === 'tr';

  return (
    <SettingsSection icon="help-circle" title={isTr ? 'YARDIM VE HAKKINDA' : 'HELP & ABOUT'}>
      <SettingRow
        icon={{ name: 'help-circle', color: '#0284C7' }}
        label={isTr ? 'Sıkça Sorulan Sorular' : 'FAQ'}
        description={isTr ? 'Kullanım ipuçları ve rehber' : 'Tips and user guide'}
        onPress={onFAQPress}
        showChevron
      />

      <SettingRow
        icon={{ name: 'information-circle', color: '#64748B' }}
        label={isTr ? 'Bize Ulaşın & Uygulama Hakkında' : 'Contact Us & About'}
        description={
          isTr
            ? `Sürüm ${APP_VERSION} (Geliştirici modu için 7 kez dokunun)`
            : `Version ${APP_VERSION} (Tap 7 times for dev mode)`
        }
        onPress={onVersionPress}
        showChevron
      />
    </SettingsSection>
  );
}
