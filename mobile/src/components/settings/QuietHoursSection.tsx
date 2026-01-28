import React from 'react';
import { Switch, LayoutAnimation, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SettingsSection } from './SettingsSection';
import { SettingRow } from './SettingRow';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Settings } from './types';

interface QuietHoursSectionProps {
  settings: Settings;
  showQuietStartPicker: boolean;
  showQuietEndPicker: boolean;
  onSettingChange: (updates: Partial<Settings>) => void;
  onQuietStartPress: () => void;
  onQuietEndPress: () => void;
  onQuietStartChange: (event: DateTimePickerEvent, date?: Date) => void;
  onQuietEndChange: (event: DateTimePickerEvent, date?: Date) => void;
  parseTimeToDate: (time: string) => Date;
  formatTimeDisplay: (time: string) => string;
}

export const QuietHoursSection: React.FC<QuietHoursSectionProps> = ({
  settings,
  showQuietStartPicker,
  showQuietEndPicker,
  onSettingChange,
  onQuietStartPress,
  onQuietEndPress,
  onQuietStartChange,
  onQuietEndChange,
  parseTimeToDate,
  formatTimeDisplay,
}) => {
  const { colors } = useTheme();
  const { language } = useLanguage();

  const handleQuietHoursToggle = (value: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onSettingChange({ quietHoursEnabled: value });
  };

  return (
    <>
      <SettingsSection
        icon="moon-outline"
        title={language === 'tr' ? 'Gece Modu' : 'Quiet Hours'}
        description={
          language === 'tr'
            ? 'Belirtilen saatlerde tam ekran alarm devre dışı kalır'
            : 'Full screen alarm is disabled during these hours'
        }
      >
        <SettingRow
          icon={{ name: 'bed-outline', color: '#6366F1' }}
          label={language === 'tr' ? 'Gece Modu' : 'Quiet Hours'}
          description={language === 'tr' ? 'Sessiz saatleri etkinleştir' : 'Enable quiet hours'}
          rightElement={
            <Switch
              value={settings.quietHoursEnabled || false}
              onValueChange={handleQuietHoursToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          }
        />

        {settings.quietHoursEnabled && (
          <>
            <SettingRow
              icon={{ name: 'notifications-off-outline', color: '#8B5CF6' }}
              label={language === 'tr' ? 'Başlangıç Saati' : 'Start Time'}
              description={
                language === 'tr' ? 'Gece modunun başladığı saat' : 'When quiet hours begin'
              }
              value={formatTimeDisplay(settings.quietHoursStart || '23:00')}
              onPress={onQuietStartPress}
              showChevron
            />

            <SettingRow
              icon={{ name: 'notifications-outline', color: '#10B981' }}
              label={language === 'tr' ? 'Bitiş Saati' : 'End Time'}
              description={language === 'tr' ? 'Gece modunun bittiği saat' : 'When quiet hours end'}
              value={formatTimeDisplay(settings.quietHoursEnd || '07:00')}
              onPress={onQuietEndPress}
              showChevron
            />
          </>
        )}
      </SettingsSection>

      {showQuietStartPicker && (
        <DateTimePicker
          value={parseTimeToDate(settings.quietHoursStart || '23:00')}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onQuietStartChange}
        />
      )}

      {showQuietEndPicker && (
        <DateTimePicker
          value={parseTimeToDate(settings.quietHoursEnd || '07:00')}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onQuietEndChange}
        />
      )}
    </>
  );
};
