/**
 * AccessibilitySection — Kolay Mod (Senior Mode) Ayarları
 */

import React from 'react';
import { Switch } from 'react-native';
import { SettingsSection, SettingRow } from '../../../components/settings';
import type { UserSettings } from '../../../types';

interface AccessibilitySectionProps {
  settings: UserSettings;
  updateSettings: (settings: Partial<UserSettings>) => void;
  isDark: boolean;
  language: string;
}

export function AccessibilitySection({
  settings,
  updateSettings,
  isDark,
  language,
}: AccessibilitySectionProps) {
  const isTr = language === 'tr';

  return (
    <SettingsSection
      icon="eye"
      title={isTr ? 'ERİŞİLEBİLİRLİK VE KOLAY MOD' : 'ACCESSIBILITY & EASY MODE'}
    >
      <SettingRow
        icon={{ name: 'glasses', color: '#10B981' }}
        label={isTr ? 'Kolay Mod (Büyük Yazı & Butonlar)' : 'Senior Mode (Large Text & Buttons)'}
        description={
          isTr
            ? 'Yaşlılar ve az görenler için dev butonlar'
            : 'Simplified, high-contrast UI for seniors'
        }
        rightElement={
          <Switch
            value={settings.seniorModeEnabled === true}
            onValueChange={val => updateSettings({ seniorModeEnabled: val })}
            trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: '#0D9488' }}
            thumbColor={settings.seniorModeEnabled ? '#FFFFFF' : '#F8FAFC'}
          />
        }
      />
    </SettingsSection>
  );
}
