/**
 * DataSecuritySection — Sağlık Araçları, Veri Yedekleme, Eczaneler ve Etkileşimler
 */

import React from 'react';
import { SettingsSection, SettingRow } from '../../../components/settings';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../types';

interface DataSecuritySectionProps {
  onExportBackup: () => void;
  navigation: NativeStackNavigationProp<RootStackParamList>;
  language: string;
  /**
   * v1.8.4 — Hesap ve veri silme. Verilmezse satır GÖSTERİLMEZ; misafir
   * oturumda silinecek bir sunucu hesabı yok.
   */
  onDeleteAccountPress?: () => void;
}

export function DataSecuritySection({
  onExportBackup,
  navigation,
  language,
  onDeleteAccountPress,
}: DataSecuritySectionProps) {
  const isTr = language === 'tr';

  return (
    <SettingsSection
      icon="shield-checkmark"
      title={isTr ? 'SAĞLIK ARAÇLARI VE VERİ' : 'HEALTH TOOLS & DATA'}
    >
      <SettingRow
        icon={{ name: 'cloud-upload', color: '#0284C7' }}
        label={isTr ? 'Veri Yedekleme & Aktarım' : 'Data Backup & Export'}
        description={isTr ? 'JSON ve Bulut yedeği oluştur' : 'Create JSON & Cloud backup'}
        onPress={onExportBackup}
        showChevron
      />

      <SettingRow
        icon={{ name: 'medkit', color: '#10B981' }}
        label={isTr ? 'Nöbetçi Eczaneler & Reçetelerim' : 'Duty Pharmacies & Prescriptions'}
        description={
          isTr
            ? 'Konum bazlı nöbetçi eczaneler ve reçete yenileme takibi'
            : 'Find duty pharmacies & manage prescription refills'
        }
        onPress={() => navigation.navigate('DutyPharmacy')}
        showChevron
      />

      <SettingRow
        icon={{ name: 'flask', color: '#F43F5E' }}
        label={isTr ? 'İlaç Etkileşim Kontrolü' : 'Drug Interactions'}
        description={isTr ? 'Çapraz ilaç etkileşimi analizi' : 'Cross-drug interaction analysis'}
        onPress={() => navigation.navigate('Interactions')}
        showChevron
      />

      <SettingRow
        icon={{ name: 'people', color: '#0D9488' }}
        label={isTr ? 'Aile & Bakıcı Takibi' : 'Caregiver & Family Link'}
        description={
          isTr ? 'Hasta & Bakıcı yönetimi ve canlı takip' : 'Patient & Caregiver tracking'
        }
        onPress={() => navigation.navigate('Caregiver')}
        showChevron
      />

      <SettingRow
        icon={{ name: 'document-text', color: '#8B5CF6' }}
        label={isTr ? 'Doktor & Eczacı PDF Raporu' : 'Doctor & Adherence Report'}
        description={isTr ? 'Resmi klinik tedavi dökümü' : 'Official clinical adherence export'}
        onPress={() => navigation.navigate('Statistics' as never)}
        showChevron
      />

      {/*
        v1.8.4 — HESAP VE VERI SILME.
        Google Play, hesap olusturmaya izin veren uygulamalarda uygulama
        ICINDE bir hesap silme yolu ZORUNLU tutuyor; bu yol hic yoktu ve
        yayin engeliydi (KVKK md. 11-e / GDPR md. 17 "silinme hakki").
        Bolumun EN ALTINDA: yikici olan en sonda durur.
      */}
      {onDeleteAccountPress ? (
        <SettingRow
          icon={{ name: 'trash-outline', color: '#DC2626' }}
          label={isTr ? 'Hesabımı ve Verilerimi Sil' : 'Delete My Account and Data'}
          description={isTr ? 'Kalıcı olarak siler, geri alınamaz' : 'Permanent, cannot be undone'}
          labelColor="#DC2626"
          onPress={onDeleteAccountPress}
          showChevron
          chevronColor="#DC2626"
        />
      ) : null}
    </SettingsSection>
  );
}
