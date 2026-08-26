import React from 'react';
import { Switch, LayoutAnimation } from 'react-native';
import { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SettingsSection } from './SettingsSection';
import { SettingRow } from './SettingRow';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Settings } from './types';
import { WheelTimePickerModal } from '../common/WheelTimePickerModal';

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

      <WheelTimePickerModal
        visible={showQuietStartPicker}
        initialTime={settings.quietHoursStart || '23:00'}
        title={language === 'tr' ? 'Gece Modu Başlangıç' : 'Quiet Hours Start'}
        onConfirm={(timeStr, h, m) => {
          const d = new Date();
          d.setHours(h, m, 0, 0);
          onQuietStartChange(
            {
              type: 'set',
              nativeEvent: { timestamp: d.getTime() },
            } as unknown as DateTimePickerEvent,
            d
          );
        }}
        onCancel={() =>
          onQuietStartChange({
            type: 'dismissed',
            nativeEvent: {},
          } as unknown as DateTimePickerEvent)
        }
      />

      <WheelTimePickerModal
        visible={showQuietEndPicker}
        initialTime={settings.quietHoursEnd || '07:00'}
        title={language === 'tr' ? 'Gece Modu Bitiş' : 'Quiet Hours End'}
        onConfirm={(timeStr, h, m) => {
          const d = new Date();
          d.setHours(h, m, 0, 0);
          onQuietEndChange(
            {
              type: 'set',
              nativeEvent: { timestamp: d.getTime() },
            } as unknown as DateTimePickerEvent,
            d
          );
        }}
        onCancel={() =>
          onQuietEndChange({ type: 'dismissed', nativeEvent: {} } as unknown as DateTimePickerEvent)
        }
      />
    </>
  );
};
