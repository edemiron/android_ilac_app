import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SettingRow } from './SettingRow';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface DevTestSectionProps {
  onScheduleAlarm: (minutes: number) => void;
  onAddTestMedicine: () => void;
  onAddTestMedicine10s: () => void;
  onDeleteTestMedicines: () => void;
  onShowScheduledNotifications: () => void;
  onClearAllData?: () => void;
}

export const DevTestSection: React.FC<DevTestSectionProps> = ({
  onScheduleAlarm,
  onAddTestMedicine,
  onAddTestMedicine10s,
  onDeleteTestMedicines,
  onShowScheduledNotifications,
  onClearAllData,
}) => {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const isTr = language === 'tr';

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Ionicons name="construct" size={14} color="#F59E0B" style={{ marginRight: 6 }} />
        <Text style={styles.sectionTitle}>
          {isTr ? 'GELİŞTİRİCİ TEST LABORATUVARI' : 'DEVELOPER TEST LAB'}
        </Text>
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#FFFFFF',
            borderColor: '#F59E0B',
          },
        ]}
      >
        <Text style={[styles.description, { color: colors.textMuted }]}>
          {isTr
            ? 'Bu bölüm test amaçlıdır. Canlı sürümde gizlenecektir.'
            : 'This section is for testing. Hidden in production.'}
        </Text>

        {/* Test İlaç Butonları */}
        <SettingRow
          icon={{ name: 'add-circle', color: '#10B981' }}
          label={isTr ? 'Test İlacı Ekle (1dk)' : 'Add Test Medicine (1min)'}
          description={isTr ? '1 dakika sonra alarm çalar' : 'Alarm in 1 minute'}
          onPress={onAddTestMedicine}
          showChevron
        />

        <SettingRow
          icon={{ name: 'add-circle', color: '#06B6D4' }}
          label={isTr ? 'Test İlacı Ekle (10sn)' : 'Add Test Medicine (10s)'}
          description={isTr ? '10 saniye sonra alarm çalar' : 'Alarm in 10 seconds'}
          onPress={onAddTestMedicine10s}
          showChevron
        />

        <SettingRow
          icon={{ name: 'trash', color: '#EF4444' }}
          label={isTr ? 'Test İlaçlarını Sil' : 'Delete Test Medicines'}
          description={isTr ? 'TEST- ile başlayan ilaçları siler' : 'Delete TEST- medicines'}
          onPress={onDeleteTestMedicines}
          showChevron
        />

        <SettingRow
          icon={{ name: 'bug', color: '#8B5CF6' }}
          label={isTr ? 'Planlanmış Bildirimler' : 'Scheduled Notifications'}
          description={
            isTr ? 'Tüm bildirim kuyruğunu gösterir' : 'Show all scheduled notifications'
          }
          onPress={onShowScheduledNotifications}
          showChevron
        />

        {/* Alarm Test Butonları */}
        <SettingRow
          icon={{ name: 'flash', color: '#EF4444' }}
          label={isTr ? '5 Saniye Sonra Alarm' : 'Alarm in 5 Seconds'}
          description={isTr ? 'Hızlı tetikleme testi' : 'Fast trigger test'}
          onPress={() => onScheduleAlarm(5 / 60)}
          showChevron
        />

        <SettingRow
          icon={{ name: 'timer', color: '#F59E0B' }}
          label={isTr ? '1 Dakika Sonra Alarm' : 'Alarm in 1 Minute'}
          description={isTr ? 'Tam döngü testi' : 'Full cycle test'}
          onPress={() => onScheduleAlarm(1)}
          showChevron
        />

        {/* Firebase Temizlik */}
        {onClearAllData && (
          <SettingRow
            icon={{ name: 'nuclear', color: '#DC2626' }}
            label={isTr ? '⚠️ Tüm Verileri Sıfırla' : '⚠️ Clear All Data'}
            description={isTr ? 'İlaçlar ve logları sıfırlar' : 'Resets medicines and logs'}
            onPress={onClearAllData}
            showChevron
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#F59E0B',
    letterSpacing: 0.4,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  description: {
    fontSize: 11.5,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
});

export default DevTestSection;
