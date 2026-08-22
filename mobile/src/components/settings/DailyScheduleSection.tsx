import React from 'react';
import { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SettingsSection } from './SettingsSection';
import { SettingRow } from './SettingRow';
import { useLanguage } from '../../contexts/LanguageContext';
import { WheelTimePickerModal } from '../common/WheelTimePickerModal';

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
            ? 'İlaç saatleri bu zaman dilimine göre otomatik hesaplanır'
            : 'Medicine times are calculated based on these hours'
        }
      >
        <SettingRow
          icon={{ name: 'sunny', color: '#F59E0B' }}
          label={t('settings_wake_time')}
          description={language === 'tr' ? 'Günün başlangıcı' : 'Start of day'}
          value={formatTimeDisplay(wakeUpTime)}
          onPress={onWakeUpPress}
          showChevron
        />
        <SettingRow
          icon={{ name: 'moon', color: '#6366F1' }}
          label={t('settings_sleep_time')}
          description={language === 'tr' ? 'Günün bitişi' : 'End of day'}
          value={formatTimeDisplay(sleepTime)}
          onPress={onSleepPress}
          showChevron
        />
      </SettingsSection>

      <WheelTimePickerModal
        visible={showWakeUpPicker}
        initialTime={wakeUpTime}
        title={t('settings_wake_time')}
        onConfirm={(timeStr, h, m) => {
          const d = new Date();
          d.setHours(h, m, 0, 0);
          onWakeUpChange(
            {
              type: 'set',
              nativeEvent: { timestamp: d.getTime() },
            } as unknown as DateTimePickerEvent,
            d
          );
        }}
        onCancel={() =>
          onWakeUpChange({ type: 'dismissed', nativeEvent: {} } as unknown as DateTimePickerEvent)
        }
      />

      <WheelTimePickerModal
        visible={showSleepPicker}
        initialTime={sleepTime}
        title={t('settings_sleep_time')}
        onConfirm={(timeStr, h, m) => {
          const d = new Date();
          d.setHours(h, m, 0, 0);
          onSleepChange(
            {
              type: 'set',
              nativeEvent: { timestamp: d.getTime() },
            } as unknown as DateTimePickerEvent,
            d
          );
        }}
        onCancel={() =>
          onSleepChange({ type: 'dismissed', nativeEvent: {} } as unknown as DateTimePickerEvent)
        }
      />
    </>
  );
};
