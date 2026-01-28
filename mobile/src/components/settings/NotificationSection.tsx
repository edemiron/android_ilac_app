import React from 'react';
import { Switch, LayoutAnimation } from 'react-native';
import { SettingsSection } from './SettingsSection';
import { SettingRow } from './SettingRow';
import { OptionPicker } from './OptionPicker';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Settings } from './types';

interface NotificationSectionProps {
  settings: Settings;
  showSnoozePicker: boolean;
  showVolumePicker: boolean;
  showConflictIntervalPicker: boolean;
  onSettingChange: (updates: Partial<Settings>) => void;
  onSnoozePress: () => void;
  onVolumePress: () => void;
  onConflictIntervalPress: () => void;
  onTestNotification: () => void;
  onTestFullScreenAlarm: () => void;
  onTestVoice: () => void;
}

const VOLUME_OPTIONS = [
  { value: 30, labelTr: 'Düşük', labelEn: 'Low' },
  { value: 50, labelTr: 'Orta', labelEn: 'Medium' },
  { value: 70, labelTr: 'Yüksek', labelEn: 'High' },
  { value: 85, labelTr: 'Çok Yüksek', labelEn: 'Very High' },
  { value: 100, labelTr: 'Maksimum', labelEn: 'Maximum' },
];

const CONFLICT_INTERVAL_OPTIONS = [5, 10, 15, 20, 30];

export const NotificationSection: React.FC<NotificationSectionProps> = ({
  settings,
  showSnoozePicker,
  showVolumePicker,
  showConflictIntervalPicker,
  onSettingChange,
  onSnoozePress,
  onVolumePress,
  onConflictIntervalPress,
  onTestNotification,
  onTestFullScreenAlarm,
  onTestVoice,
}) => {
  const { colors } = useTheme();
  const { language, t } = useLanguage();

  const handleSnoozePress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onSnoozePress();
  };

  const handleVolumePress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onVolumePress();
  };

  const handleConflictIntervalPress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onConflictIntervalPress();
  };

  const handleSnoozeSelect = (duration: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onSettingChange({ snoozeDuration: duration });
  };

  const handleVolumeSelect = (volume: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onSettingChange({ alarmVolume: volume });
  };

  const handleConflictIntervalSelect = (interval: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onSettingChange({ conflictIntervalMinutes: interval });
  };

  const getSnoozeDurationLabel = (duration: number) => {
    if (duration < 1) {
      const seconds = Math.round(duration * 60);
      return `${seconds} ${language === 'tr' ? 'saniye' : 'seconds'}`;
    }
    return `${duration} ${language === 'tr' ? 'dakika' : 'minutes'}`;
  };

  const getVolumeLabel = (volume: number) => {
    const option = VOLUME_OPTIONS.find(o => o.value === volume);
    if (option) {
      return language === 'tr' ? option.labelTr : option.labelEn;
    }
    return `%${volume}`;
  };

  const getVolumeLabelForPicker = (volume: number) => {
    const option = VOLUME_OPTIONS.find(o => o.value === volume);
    if (option) {
      return `${language === 'tr' ? option.labelTr : option.labelEn} (%${volume})`;
    }
    return `%${volume}`;
  };

  const getConflictIntervalLabel = (interval: number) => {
    return `${interval} ${language === 'tr' ? 'dk' : 'min'}`;
  };

  return (
    <SettingsSection icon="notifications-outline" title={t('settings_notifications')}>
      <SettingRow
        icon={{ name: 'phone-portrait-outline', color: '#8B5CF6' }}
        label={t('settings_vibration')}
        description={language === 'tr' ? 'Hatırlatmalarda titret' : 'Vibrate on reminders'}
        rightElement={
          <Switch
            value={settings.vibrationEnabled}
            onValueChange={value => onSettingChange({ vibrationEnabled: value })}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        }
      />

      <SettingRow
        icon={{ name: 'expand-outline', color: '#EC4899' }}
        label={t('settings_fullscreen_alarm')}
        description={language === 'tr' ? 'Kilit ekranında göster' : 'Show on lock screen'}
        rightElement={
          <Switch
            value={settings.fullScreenAlarmEnabled}
            onValueChange={value => onSettingChange({ fullScreenAlarmEnabled: value })}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        }
      />

      <SettingRow
        icon={{ name: 'volume-high', color: '#EF4444' }}
        label={language === 'tr' ? 'Alarm Modu' : 'Alarm Mode'}
        description={
          language === 'tr' ? 'Telefon sessizde bile ses çıkar' : 'Sound plays even in silent mode'
        }
        rightElement={
          <Switch
            value={settings.alarmModeEnabled ?? true}
            onValueChange={value => onSettingChange({ alarmModeEnabled: value })}
            trackColor={{ false: colors.border, true: '#EF4444' }}
            thumbColor="#FFFFFF"
          />
        }
      />

      <SettingRow
        icon={{ name: 'volume-medium-outline', color: '#8B5CF6' }}
        label={language === 'tr' ? 'Alarm Ses Seviyesi' : 'Alarm Volume'}
        description={
          language === 'tr' ? 'Telefondan bağımsız ses seviyesi' : 'Volume independent of phone'
        }
        value={getVolumeLabel(settings.alarmVolume ?? 80)}
        onPress={handleVolumePress}
        showChevron
        chevronDirection={showVolumePicker ? 'up' : 'down'}
      />

      {showVolumePicker && (
        <OptionPicker<number>
          options={VOLUME_OPTIONS.map(o => o.value)}
          selectedValue={settings.alarmVolume ?? 80}
          onSelect={handleVolumeSelect}
          getLabel={getVolumeLabelForPicker}
        />
      )}

      <SettingRow
        icon={{ name: 'time-outline', color: '#F59E0B' }}
        label={language === 'tr' ? 'Erteleme Süresi' : 'Snooze Duration'}
        description={
          language === 'tr'
            ? 'Alarm ertelendiğinde bekleme süresi'
            : 'Wait time when alarm is snoozed'
        }
        value={
          (settings.snoozeDuration || 5) < 1
            ? `${Math.round((settings.snoozeDuration || 5) * 60)} ${language === 'tr' ? 'sn' : 'sec'}`
            : `${settings.snoozeDuration || 5} ${language === 'tr' ? 'dk' : 'min'}`
        }
        onPress={handleSnoozePress}
        showChevron
        chevronDirection={showSnoozePicker ? 'up' : 'down'}
      />

      {showSnoozePicker && (
        <OptionPicker<number>
          options={[0.25, 5, 10, 15, 30]}
          selectedValue={settings.snoozeDuration || 5}
          onSelect={handleSnoozeSelect}
          getLabel={getSnoozeDurationLabel}
        />
      )}

      <SettingRow
        icon={{ name: 'git-branch-outline', color: '#06B6D4' }}
        label={t('settings_conflict_interval')}
        description={t('settings_conflict_interval_desc')}
        value={getConflictIntervalLabel(settings.conflictIntervalMinutes || 10)}
        onPress={handleConflictIntervalPress}
        showChevron
        chevronDirection={showConflictIntervalPicker ? 'up' : 'down'}
      />

      {showConflictIntervalPicker && (
        <OptionPicker<number>
          options={CONFLICT_INTERVAL_OPTIONS}
          selectedValue={settings.conflictIntervalMinutes || 10}
          onSelect={handleConflictIntervalSelect}
          getLabel={getConflictIntervalLabel}
        />
      )}

      <SettingRow
        icon={{ name: 'notifications-outline', color: '#3B82F6' }}
        label={t('settings_test_notification')}
        description={
          language === 'tr' ? 'Bildirimlerin çalıştığını kontrol et' : 'Test if notifications work'
        }
        onPress={onTestNotification}
        showChevron
      />

      <SettingRow
        icon={{ name: 'alarm-outline', color: '#EF4444' }}
        label={language === 'tr' ? 'Tam Ekran Alarm Testi' : 'Full Screen Alarm Test'}
        description={
          language === 'tr'
            ? '2 saniye sonra alarm ekranı açılır'
            : 'Alarm screen opens after 2 seconds'
        }
        onPress={onTestFullScreenAlarm}
        showChevron
      />

      <SettingRow
        icon={{ name: 'volume-high-outline', color: '#10B981' }}
        label={t('settings_voice_reminder')}
        description={language === 'tr' ? 'Sesli hatırlatmayı test et' : 'Test voice reminder'}
        onPress={onTestVoice}
        showChevron
      />
    </SettingsSection>
  );
};
