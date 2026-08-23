/**
 * NotificationsSection — Alarm Sesi, Kritik Hatırlatıcılar, Bakıcı ve TTS Bildirimleri
 */

import React from 'react';
import { Switch } from 'react-native';
import { SettingsSection, SettingRow, OptionPicker } from '../../../components/settings';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, UserSettings } from '../../../types';

interface NotificationsSectionProps {
  settings: UserSettings;
  updateSettings: (settings: Partial<UserSettings>) => void;
  pickerState: { showVolumePicker?: boolean };
  togglePicker: (picker: 'showVolumePicker') => void;
  closePicker: (picker: 'showVolumePicker') => void;
  isDark: boolean;
  navigation: NativeStackNavigationProp<RootStackParamList>;
  language: string;
}

export function NotificationsSection({
  settings,
  updateSettings,
  pickerState,
  togglePicker,
  closePicker,
  isDark,
  navigation,
  language,
}: NotificationsSectionProps) {
  const isTr = language === 'tr';

  return (
    <SettingsSection
      icon="notifications"
      title={isTr ? 'BİLDİRİMLER VE SESLER' : 'NOTIFICATIONS & AUDIO'}
    >
      <SettingRow
        icon={{ name: 'volume-high', color: '#F59E0B' }}
        label={isTr ? 'Alarm Sesi & Melodi' : 'Alarm Sound'}
        value={isTr ? 'Soft Chime' : 'Soft Chime'}
        description={
          isTr
            ? `Ses Seviyesi: %${settings.alarmVolume || 70}`
            : `Volume: ${settings.alarmVolume || 70}%`
        }
        onPress={() => togglePicker('showVolumePicker')}
        showChevron
        chevronDirection={pickerState.showVolumePicker ? 'up' : 'down'}
      />

      {pickerState.showVolumePicker && (
        <OptionPicker<number>
          options={[30, 50, 70, 85, 100]}
          selectedValue={settings.alarmVolume || 70}
          onSelect={vol => {
            updateSettings({ alarmVolume: vol });
            closePicker('showVolumePicker');
          }}
          getLabel={vol => `%${vol} (${vol < 50 ? 'Düşük' : vol > 80 ? 'Maksimum' : 'Orta'})`}
        />
      )}

      <SettingRow
        icon={{ name: 'notifications', color: '#EF4444' }}
        label={isTr ? 'Kritik Hatırlatıcılar' : 'Critical Alerts'}
        description={
          isTr ? 'Sessiz modda ve kilit ekranında çalar' : 'Rings even in silent & lock screen'
        }
        rightElement={
          <Switch
            value={settings.fullScreenAlarmEnabled !== false}
            onValueChange={val => updateSettings({ fullScreenAlarmEnabled: val })}
            trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: '#0F766E' }}
            thumbColor={settings.fullScreenAlarmEnabled !== false ? '#FFFFFF' : '#F8FAFC'}
          />
        }
      />

      <SettingRow
        icon={{ name: 'people', color: '#0D9488' }}
        label={isTr ? 'Aile & Bakıcı Takibi' : 'Caregiver Alerts'}
        description={
          isTr ? 'Yakınlarınız için anlık doz bildirimleri' : 'Instant notifications for family'
        }
        onPress={() => navigation.navigate('Caregiver')}
        showChevron
      />

      <SettingRow
        icon={{ name: 'mic', color: '#6366F1' }}
        label={isTr ? 'Sesli Bildirimler (TTS)' : 'Voice Announcements'}
        description={
          isTr ? 'İlaç isimlerini ve dozları sesli oku' : 'Speak medicine names & dosages'
        }
        onPress={() => navigation.navigate('TtsSettings')}
        showChevron
      />
    </SettingsSection>
  );
}
