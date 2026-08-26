/**
 * ProfileSection — Hesap Bilgileri, PIN/Güvenlik Ayarları
 */

import React from 'react';
import { SettingsSection, SettingRow } from '../../../components/settings';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../types';

interface ProfileSectionProps {
  user: { email?: string | null; displayName?: string | null } | null;
  isSyncing: boolean;
  onSync: () => void;
  navigation: NativeStackNavigationProp<RootStackParamList>;
  language: string;
}

export function ProfileSection({
  user,
  isSyncing,
  onSync,
  navigation,
  language,
}: ProfileSectionProps) {
  const isTr = language === 'tr';

  return (
    <SettingsSection icon="person" title={isTr ? 'HESAP VE GÜVENLİK' : 'ACCOUNT & SECURITY'}>
      <SettingRow
        icon={{ name: 'person', color: '#0284C7' }}
        label={isTr ? 'Hesap Bilgileri' : 'Account Details'}
        description={
          user?.email ||
          (isTr ? 'Misafir Hesap • Giriş Yap / Kayıt Ol' : 'Guest Account • Sign In / Register')
        }
        value={isSyncing ? (isTr ? 'Eşitleniyor...' : 'Syncing...') : undefined}
        onPress={isSyncing ? undefined : user?.email ? onSync : () => navigation.navigate('Login')}
        showChevron
      />

      <SettingRow
        icon={{ name: 'lock-closed', color: '#8B5CF6' }}
        label={isTr ? 'Güvenlik & PIN Kilidi' : 'Security & PIN Lock'}
        description={isTr ? 'PIN ve Biyometrik Parmak İzi' : 'PIN & Biometric Fingerprint'}
        onPress={() => navigation.navigate('Security')}
        showChevron
      />
    </SettingsSection>
  );
}
