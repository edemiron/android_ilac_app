import React from 'react';
import { SettingsSection } from './SettingsSection';
import { SettingRow } from './SettingRow';
import { useLanguage } from '../../contexts/LanguageContext';

interface BackupRestoreSectionProps {
  onExportBackup: () => void;
  onImportBackup: () => void;
  isExporting?: boolean;
}

export const BackupRestoreSection: React.FC<BackupRestoreSectionProps> = ({
  onExportBackup,
  onImportBackup,
  isExporting: _isExporting,
}) => {
  const { language } = useLanguage();
  const isTr = language === 'tr';

  return (
    <SettingsSection
      icon="cloud-download-outline"
      title={isTr ? 'Yedekleme ve Geri Yükleme' : 'Backup & Restore'}
    >
      <SettingRow
        icon={{ name: 'share-outline', color: '#0EA5E9' }}
        label={isTr ? 'Verileri Dışa Aktar (JSON)' : 'Export Data (JSON)'}
        description={
          isTr
            ? 'İlaçlarınızı, saatlerinizi ve geçmişinizi dosya olarak paylaşın veya kaydedin'
            : 'Share or save your medicines, schedules and logs as a file'
        }
        onPress={onExportBackup}
        showChevron
      />
      <SettingRow
        icon={{ name: 'refresh-circle-outline', color: '#10B981' }}
        label={isTr ? 'Yedekten Geri Yükle' : 'Restore from Backup'}
        description={
          isTr
            ? 'Daha önce aldığınız bir JSON yedek dosyasından verilerinizi yükleyin'
            : 'Load your data from a previously created JSON backup file'
        }
        onPress={onImportBackup}
        showChevron
      />
    </SettingsSection>
  );
};
