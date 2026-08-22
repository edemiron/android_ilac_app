/**
 * DataSecuritySection — Veri Yedekleme, PDF Rapor, İlaç Etkileşimleri ve Eczaneler
 */

import React from 'react';
import { SettingsSection, SettingRow } from '../../../components/settings';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../types';

interface DataSecuritySectionProps {
  onExportBackup: () => void;
  navigation: NativeStackNavigationProp<RootStackParamList>;
  language: string;
}

export function DataSecuritySection({
  onExportBackup,
  navigation,
  language,
}: DataSecuritySectionProps) {
  return (
    <SettingsSection
      icon="shield-outline"
      title={language === 'tr' ? 'Güvenlik & Veri' : 'Security & Data'}
    >
      <SettingRow
        icon={{ name: 'cloud-upload-outline', color: '#0284C7' }}
        label={language === 'tr' ? 'Veri Yedekleme' : 'Data Backup'}
        description={
          language === 'tr' ? 'JSON yedeği oluştur ve paylaş' : 'Create & share JSON backup'
        }
        onPress={onExportBackup}
        showChevron
      />

      <SettingRow
        icon={{ name: 'document-text-outline', color: '#0284C7' }}
        label={language === 'tr' ? 'PDF Rapor Ayarları' : 'PDF Report Settings'}
        description={
          language === 'tr' ? 'Doktor için ilaç uyum raporu' : 'Medication adherence report'
        }
        onPress={() => navigation.navigate('Statistics' as never)}
        showChevron
      />

      <SettingRow
        icon={{ name: 'flask-outline', color: '#0284C7' }}
        label={language === 'tr' ? 'İlaç Etkileşimleri' : 'Drug Interactions'}
        description={
          language === 'tr' ? 'Çapraz ilaç etkileşim kontrolü' : 'Check cross-drug interactions'
        }
        onPress={() => navigation.navigate('Interactions')}
        showChevron
      />

      <SettingRow
        icon={{ name: 'medkit-outline', color: '#0284C7' }}
        label={language === 'tr' ? 'Nöbetçi Eczaneler' : 'On-Duty Pharmacies'}
        description={language === 'tr' ? 'Yakındaki açık eczaneler' : 'Nearby open pharmacies'}
        onPress={() => navigation.navigate('DutyPharmacy')}
        showChevron
      />
    </SettingsSection>
  );
}
