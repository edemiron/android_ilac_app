/**
 * ProfileSection — Profil ve Hesap Bilgileri, PIN/Güvenlik Ayarları
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
  return (
    <SettingsSection icon="person-outline" title={language === 'tr' ? 'Profil' : 'Profile'}>
      <SettingRow
        icon={{ name: 'person-outline', color: '#0284C7' }}
        label={language === 'tr' ? 'Hesap Bilgileri' : 'Account Details'}
        value={user?.email ? user.email.split('@')[0] : language === 'tr' ? 'Misafir' : 'Guest'}
        description={user?.email || (language === 'tr' ? 'Giriş yapılmadı' : 'Not signed in')}
        onPress={isSyncing ? undefined : onSync}
        showChevron
      />

      <SettingRow
        icon={{ name: 'lock-closed-outline', color: '#0284C7' }}
        label={language === 'tr' ? 'Şifre Değiştir' : 'Security & PIN'}
        description={language === 'tr' ? 'PIN ve Biyometrik Kilit' : 'PIN & Biometric Lock'}
        onPress={() => navigation.navigate('Security')}
        showChevron
      />
    </SettingsSection>
  );
}
