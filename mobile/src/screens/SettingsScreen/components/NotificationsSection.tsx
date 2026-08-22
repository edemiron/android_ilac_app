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
  return (
    <SettingsSection
      icon="notifications-outline"
      title={language === 'tr' ? 'Bildirimler' : 'Notifications'}
    >
      <SettingRow
        icon={{ name: 'volume-high-outline', color: '#0284C7' }}
        label={language === 'tr' ? 'Alarm Sesi' : 'Alarm Sound'}
        value={language === 'tr' ? 'Soft Chime' : 'Soft Chime'}
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
        icon={{ name: 'notifications-outline', color: '#0284C7' }}
        label={language === 'tr' ? 'Kritik Hatırlatıcılar' : 'Critical Alerts'}
        description={language === 'tr' ? 'Sessiz modda bile çalar' : 'Rings even in silent mode'}
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
        icon={{ name: 'people-outline', color: '#0284C7' }}
        label={language === 'tr' ? 'Bakıcı Bildirimleri' : 'Caregiver Alerts'}
        description={language === 'tr' ? 'Aile ve bakıcı takibi' : 'Family & caregiver tracking'}
        onPress={() => navigation.navigate('Caregiver')}
        showChevron
      />

      <SettingRow
        icon={{ name: 'time-outline', color: '#0284C7' }}
        label={language === 'tr' ? 'Sesli Bildirimler' : 'Voice Announcements'}
        description={language === 'tr' ? 'İlaç isimlerini sesli oku' : 'Speak medicine names'}
        onPress={() => navigation.navigate('TtsSettings')}
        showChevron
      />
    </SettingsSection>
  );
}
