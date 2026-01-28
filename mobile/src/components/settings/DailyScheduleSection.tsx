import React from 'react';
import { Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SettingsSection } from './SettingsSection';
import { SettingRow } from './SettingRow';
import { useLanguage } from '../../contexts/LanguageContext';

interface DailyScheduleSectionProps {
  wakeUpTime: string;
  sleepTime: string;
  showWakeUpPicker: boolean;
  showSleepPicker: boolean;
  onWakeUpPress: () => void;
  onSleepPress: () => void;
  onWakeUpChange: (event: DateTimePickerEvent, date?: Date) => void;
  onSleepChange: (event: DateTimePickerEvent, date?: Date) => void;
  parseTimeToDate: (time: string) => Date;
  formatTimeDisplay: (time: string) => string;
}

export const DailyScheduleSection: React.FC<DailyScheduleSectionProps> = ({
  wakeUpTime,
  sleepTime,
  showWakeUpPicker,
  showSleepPicker,
  onWakeUpPress,
  onSleepPress,
  onWakeUpChange,
  onSleepChange,
  parseTimeToDate,
  formatTimeDisplay,
}) => {
  const { language, t } = useLanguage();

  return (
    <>
      <SettingsSection
        icon="time-outline"
        title={t('settings_general')}
        description={
          language === 'tr'
            ? 'Ilac saatleri bu zaman dilimine gore otomatik hesaplanir'
            : 'Medicine times are calculated based on these hours'
        }
      >
        <SettingRow
          icon={{ name: 'sunny', color: '#F59E0B' }}
          label={t('settings_wake_time')}
          description={language === 'tr' ? 'Gunun baslangici' : 'Start of day'}
          value={formatTimeDisplay(wakeUpTime)}
          onPress={onWakeUpPress}
          showChevron
        />
        <SettingRow
          icon={{ name: 'moon', color: '#6366F1' }}
          label={t('settings_sleep_time')}
          description={language === 'tr' ? 'Gunun bitisi' : 'End of day'}
          value={formatTimeDisplay(sleepTime)}
          onPress={onSleepPress}
          showChevron
        />
      </SettingsSection>

      {showWakeUpPicker && (
        <DateTimePicker
          value={parseTimeToDate(wakeUpTime)}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onWakeUpChange}
        />
      )}

      {showSleepPicker && (
        <DateTimePicker
          value={parseTimeToDate(sleepTime)}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onSleepChange}
        />
      )}
    </>
  );
};
