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
  return (
    <SettingsSection
      icon="sparkles-outline"
      title={language === 'tr' ? 'Erişilebilirlik & Kolay Mod' : 'Accessibility & Simple Mode'}
    >
      <SettingRow
        icon={{ name: 'sparkles', color: '#0D9488' }}
        label={
          language === 'tr'
            ? 'Kolay Mod (Büyük Yazı & Butonlar)'
            : 'Senior Mode (Large Text & Buttons)'
        }
        description={
          language === 'tr'
            ? 'Yaşlılar için sadeleştirilmiş dev arayüz'
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
