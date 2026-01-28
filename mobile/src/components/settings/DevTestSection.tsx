import React from 'react';
import { View, Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SettingRow } from './SettingRow';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { createSettingsStyles } from './styles';

interface DevTestSectionProps {
  onScheduleAlarm: (minutes: number) => void;
  onAddTestMedicine: () => void;
  onDeleteTestMedicines: () => void;
  onShowScheduledNotifications: () => void;
}

export const DevTestSection: React.FC<DevTestSectionProps> = ({ 
  onScheduleAlarm,
  onAddTestMedicine,
  onDeleteTestMedicines,
  onShowScheduledNotifications,
}) => {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const styles = createSettingsStyles(colors, isDark);

  return (
    <View
      style={[styles.section, { borderWidth: 2, borderColor: '#F59E0B', borderStyle: 'dashed' }]}
    >
      <View style={styles.sectionHeader}>
        <Ionicons name="construct-outline" size={18} color="#F59E0B" />
        <Text style={[styles.sectionTitle, { color: '#F59E0B' }]}>
          {language === 'tr' ? 'Gelistirici Test' : 'Developer Test'}
        </Text>
      </View>
      <Text style={styles.sectionDescription}>
        {language === 'tr'
          ? 'Bu bolum test amaçlidir. Canliya alinmadan once silinecektir.'
          : 'This section is for testing. Will be removed before production.'}
      </Text>

      {/* Test İlaç Butonları */}
      <SettingRow
        icon={{ name: 'add-circle-outline', color: '#10B981' }}
        label={language === 'tr' ? 'Test Ilaci Ekle (1dk)' : 'Add Test Medicine (1min)'}
        description={language === 'tr' ? 'Random ilac, 1 dakika sonra alarm' : 'Random medicine, alarm in 1 minute'}
        onPress={onAddTestMedicine}
        showChevron
      />

      <SettingRow
        icon={{ name: 'trash-outline', color: '#EF4444' }}
        label={language === 'tr' ? 'Test Ilaclarini Sil' : 'Delete Test Medicines'}
        description={language === 'tr' ? 'TEST- ile baslayan ilaclari sil' : 'Delete medicines starting with TEST-'}
        onPress={onDeleteTestMedicines}
        showChevron
      />

      <SettingRow
        icon={{ name: 'bug-outline', color: '#8B5CF6' }}
        label={language === 'tr' ? 'Debug: Planlanmis Bildirimler' : 'Debug: Scheduled Notifications'}
        description={language === 'tr' ? 'Tum planlanan bildirimleri goster' : 'Show all scheduled notifications'}
        onPress={onShowScheduledNotifications}
        showChevron
      />

      <View style={{ height: 12 }} />

      {/* Alarm Test Butonları */}
      <SettingRow
        icon={{ name: 'flash-outline', color: '#EF4444' }}
        label={language === 'tr' ? '5 Saniye Sonra Alarm' : 'Alarm in 5 Seconds'}
        description={language === 'tr' ? 'En hizli test' : 'Fastest test'}
        onPress={() => onScheduleAlarm(5 / 60)}
        showChevron
      />

      <SettingRow
        icon={{ name: 'flash-outline', color: '#EF4444' }}
        label={language === 'tr' ? '10 Saniye Sonra Alarm' : 'Alarm in 10 Seconds'}
        description={language === 'tr' ? 'Hizli test' : 'Quick test'}
        onPress={() => onScheduleAlarm(10 / 60)}
        showChevron
      />

      <SettingRow
        icon={{ name: 'flash-outline', color: '#F59E0B' }}
        label={language === 'tr' ? '15 Saniye Sonra Alarm' : 'Alarm in 15 Seconds'}
        description={language === 'tr' ? 'Bildirim testi' : 'Notification test'}
        onPress={() => onScheduleAlarm(15 / 60)}
        showChevron
      />

      <SettingRow
        icon={{ name: 'timer-outline', color: '#F59E0B' }}
        label={language === 'tr' ? '1 Dakika Sonra Alarm' : 'Alarm in 1 Minute'}
        description={language === 'tr' ? 'Tam test' : 'Full test'}
        onPress={() => onScheduleAlarm(1)}
        showChevron
      />
    </View>
  );
};
