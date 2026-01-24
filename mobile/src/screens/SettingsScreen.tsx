import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  Linking,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMedicineStore } from '../stores/medicineStore';
import { sendTestNotification, requestNotificationPermissions, scheduleTestAlarmNotification } from '../utils/notifications';
import { speak } from '../utils/speech';
import { useTheme, ThemeMode } from '../contexts/ThemeContext';
import { useLanguage, Language } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { format } from 'date-fns';

// Android için LayoutAnimation'ı etkinleştir
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// İkon bileşeni - emoji yerine vector icon
interface SettingIconProps {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size?: number;
}

const SettingIcon: React.FC<SettingIconProps> = ({ name, color, size = 22 }) => (
  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: color + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
    <Ionicons name={name} size={size} color={color} />
  </View>
);

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark, theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { settings, updateSettings, syncToCloud, syncFromCloud, isSyncing, lastSyncAt } = useMedicineStore();
  const { user, logout } = useAuth();
  const { isPremium, subscription, remainingDays, monthlyPrice, yearlyPrice } = useSubscription();
  
  const [showWakeUpPicker, setShowWakeUpPicker] = useState(false);
  const [showSleepPicker, setShowSleepPicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showSnoozePicker, setShowSnoozePicker] = useState(false);
  const [showQuietStartPicker, setShowQuietStartPicker] = useState(false);
  const [showQuietEndPicker, setShowQuietEndPicker] = useState(false);

  const parseTimeToDate = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const handleWakeUpChange = (event: any, selectedDate?: Date) => {
    setShowWakeUpPicker(Platform.OS === 'ios');
    if (selectedDate) {
      const timeStr = format(selectedDate, 'HH:mm');
      updateSettings({ wakeUpTime: timeStr });
    }
  };

  const handleSleepChange = (event: any, selectedDate?: Date) => {
    setShowSleepPicker(Platform.OS === 'ios');
    if (selectedDate) {
      const timeStr = format(selectedDate, 'HH:mm');
      updateSettings({ sleepTime: timeStr });
    }
  };

  const handleQuietStartChange = (event: any, selectedDate?: Date) => {
    setShowQuietStartPicker(Platform.OS === 'ios');
    if (selectedDate) {
      const timeStr = format(selectedDate, 'HH:mm');
      updateSettings({ quietHoursStart: timeStr });
    }
  };

  const handleQuietEndChange = (event: any, selectedDate?: Date) => {
    setShowQuietEndPicker(Platform.OS === 'ios');
    if (selectedDate) {
      const timeStr = format(selectedDate, 'HH:mm');
      updateSettings({ quietHoursEnd: timeStr });
    }
  };

  const handleTestNotification = async () => {
    const hasPermission = await requestNotificationPermissions();
    if (hasPermission) {
      await sendTestNotification();
      Alert.alert(t('success'), language === 'tr' 
        ? '2 saniye içinde test bildirimi alacaksınız.' 
        : 'You will receive a test notification in 2 seconds.');
    } else {
      Alert.alert(
        t('settings_notification_permission'),
        language === 'tr' 
          ? 'Bildirimlerin çalışması için izin vermeniz gerekiyor.' 
          : 'You need to grant permission for notifications to work.',
        [
          { text: t('cancel'), style: 'cancel' },
          { text: t('settings_open_settings'), onPress: () => Linking.openSettings() },
        ]
      );
    }
  };

  const handleTestVoice = async () => {
    const message = language === 'tr' 
      ? 'İlaç zamanı! Aspirin, 500 miligram. Yemekten sonra alınız.'
      : 'Medicine time! Aspirin, 500 milligrams. Take after meal.';
    await speak(message, language);
  };

  const handleTestFullScreenAlarm = () => {
    Alert.alert(
      language === 'tr' ? 'Tam Ekran Alarm Testi' : 'Full Screen Alarm Test',
      language === 'tr' 
        ? '2 saniye sonra tam ekran alarm açılacak.' 
        : 'Full screen alarm will open in 2 seconds.',
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: language === 'tr' ? 'Başlat' : 'Start', 
          onPress: () => {
            setTimeout(() => {
              // Test için sahte ilaç verileriyle alarm ekranını aç
              navigation.navigate('Alarm', {
                medicineId: 'test-medicine',
                reminderTimeId: 'test-reminder',
                scheduledTime: new Date().toISOString(),
              });
            }, 2000);
          }
        },
      ]
    );
  };

  const handleScheduleTestAlarm = async (minutes: number) => {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      Alert.alert(
        t('settings_notification_permission'),
        language === 'tr' 
          ? 'Bildirimlerin çalışması için izin vermeniz gerekiyor.' 
          : 'You need to grant permission for notifications to work.',
        [
          { text: t('cancel'), style: 'cancel' },
          { text: t('settings_open_settings'), onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    try {
      await scheduleTestAlarmNotification(minutes, language);
      
      const scheduledTime = new Date(Date.now() + minutes * 60 * 1000);
      const timeStr = format(scheduledTime, 'HH:mm');
      
      Alert.alert(
        language === 'tr' ? 'Alarm Planlandı' : 'Alarm Scheduled',
        language === 'tr' 
          ? `Test alarmı saat ${timeStr} (${minutes} dakika sonra) çalacak.\n\nTelefonu sessiz moda alarak test edebilirsiniz.`
          : `Test alarm will ring at ${timeStr} (in ${minutes} minutes).\n\nYou can test by putting your phone in silent mode.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Test alarm planlama hatası:', error);
      const errorMessage = error?.message || error?.toString() || 'Bilinmeyen hata';
      Alert.alert(
        t('error'),
        language === 'tr' 
          ? `Alarm planlanamadı.\n\nHata: ${errorMessage}` 
          : `Failed to schedule alarm.\n\nError: ${errorMessage}`
      );
    }
  };

  const handleSync = async () => {
    try {
      await syncToCloud();
      Alert.alert(
        t('success'),
        language === 'tr' 
          ? 'Verileriniz buluta yedeklendi.' 
          : 'Your data has been backed up to cloud.'
      );
    } catch (error: any) {
      const errorMessage = error.message || (language === 'tr' 
        ? 'Senkronizasyon başarısız oldu.' 
        : 'Sync failed.');
      Alert.alert(t('error'), errorMessage);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      language === 'tr' ? 'Çıkış Yap' : 'Logout',
      language === 'tr' 
        ? 'Hesabınızdan çıkış yapmak istediğinize emin misiniz?' 
        : 'Are you sure you want to logout?',
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: language === 'tr' ? 'Çıkış Yap' : 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Önce verileri senkronize et
              await syncToCloud();
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        },
      ]
    );
  };

  const formatLastSync = () => {
    if (!lastSyncAt) {
      return language === 'tr' ? 'Henüz senkronize edilmedi' : 'Never synced';
    }
    const date = new Date(lastSyncAt);
    return format(date, 'dd.MM.yyyy HH:mm');
  };

  const formatTimeDisplay = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const getThemeLabel = (themeValue: ThemeMode) => {
    switch (themeValue) {
      case 'light': return t('settings_theme_light');
      case 'dark': return t('settings_theme_dark');
      case 'system': return t('settings_theme_system');
    }
  };

  const getLanguageLabel = (lang: Language) => {
    return lang === 'tr' ? 'Türkçe' : 'English';
  };

  const styles = createStyles(colors, isDark);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView}>
        {/* Premium Card - Modernized */}
        <TouchableOpacity
          style={[
            styles.premiumCard,
            { 
              backgroundColor: isPremium ? '#FFD700' : colors.primary,
              borderWidth: isPremium ? 0 : 0,
            },
          ]}
          onPress={() => navigation.navigate('Premium')}
          activeOpacity={0.8}
        >
          <View style={styles.premiumCardContent}>
            <View style={[styles.premiumIconContainer, { backgroundColor: isPremium ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' }]}>
              <MaterialCommunityIcons 
                name={isPremium ? "crown" : "star-four-points"} 
                size={24} 
                color={isPremium ? '#1A1A2E' : '#FFFFFF'} 
              />
            </View>
            <View style={styles.premiumTextContainer}>
              <Text style={[styles.premiumTitle, { color: isPremium ? '#1A1A2E' : '#FFFFFF' }]}>
                {isPremium 
                  ? (language === 'tr' ? 'Premium Üyesiniz!' : "You're Premium!")
                  : (language === 'tr' ? 'Premium\'a Geçin' : 'Go Premium')}
              </Text>
              <Text style={[styles.premiumSubtitle, { color: isPremium ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)' }]}>
                {isPremium 
                  ? (remainingDays !== null 
                      ? `${remainingDays} ${language === 'tr' ? 'gün kaldı' : 'days remaining'}`
                      : (language === 'tr' ? 'Tüm özelliklerin keyfini çıkarın' : 'Enjoy all features'))
                  : (language === 'tr' 
                      ? `Sınırsız ilaç, reklamsız kullanım`
                      : `Unlimited meds, ad-free`)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={isPremium ? '#1A1A2E' : '#FFFFFF'} />
          </View>
        </TouchableOpacity>

        {/* Günlük Program */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('settings_general')}</Text>
          </View>
          <Text style={styles.sectionDescription}>
            {language === 'tr' 
              ? 'İlaç saatleri bu zaman dilimine göre otomatik hesaplanır' 
              : 'Medicine times are calculated based on these hours'}
          </Text>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowWakeUpPicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <SettingIcon name="sunny" color="#F59E0B" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>{t('settings_wake_time')}</Text>
                <Text style={styles.settingDescription}>
                  {language === 'tr' ? 'Günün başlangıcı' : 'Start of day'}
                </Text>
              </View>
            </View>
            <View style={styles.settingValueContainer}>
              <Text style={styles.settingValue}>{formatTimeDisplay(settings.wakeUpTime)}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowSleepPicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <SettingIcon name="moon" color="#6366F1" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>{t('settings_sleep_time')}</Text>
                <Text style={styles.settingDescription}>
                  {language === 'tr' ? 'Günün bitişi' : 'End of day'}
                </Text>
              </View>
            </View>
            <View style={styles.settingValueContainer}>
              <Text style={styles.settingValue}>{formatTimeDisplay(settings.sleepTime)}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Görünüm Ayarları */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="color-palette-outline" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('settings_appearance')}</Text>
          </View>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setShowThemePicker(!showThemePicker);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <SettingIcon name={isDark ? "moon" : "sunny"} color={isDark ? "#6366F1" : "#F59E0B"} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>{t('settings_theme')}</Text>
                <Text style={styles.settingDescription}>
                  {language === 'tr' ? 'Uygulama teması' : 'App theme'}
                </Text>
              </View>
            </View>
            <View style={styles.settingValueContainer}>
              <Text style={styles.settingValue}>{getThemeLabel(theme)}</Text>
              <Ionicons name={showThemePicker ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {showThemePicker && (
            <View style={styles.pickerContainer}>
              {(['light', 'dark', 'system'] as ThemeMode[]).map((themeOption) => (
                <TouchableOpacity
                  key={themeOption}
                  style={[
                    styles.pickerOption,
                    theme === themeOption && styles.pickerOptionActive,
                  ]}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setTheme(themeOption);
                    setShowThemePicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    theme === themeOption && styles.pickerOptionTextActive,
                  ]}>
                    {getThemeLabel(themeOption)}
                  </Text>
                  {theme === themeOption && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setShowLanguagePicker(!showLanguagePicker);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <SettingIcon name="globe-outline" color="#10B981" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>{t('settings_language')}</Text>
                <Text style={styles.settingDescription}>
                  {language === 'tr' ? 'Uygulama dili' : 'App language'}
                </Text>
              </View>
            </View>
            <View style={styles.settingValueContainer}>
              <Text style={styles.settingValue}>{getLanguageLabel(language)}</Text>
              <Ionicons name={showLanguagePicker ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {showLanguagePicker && (
            <View style={styles.pickerContainer}>
              {(['tr', 'en'] as Language[]).map((langOption) => (
                <TouchableOpacity
                  key={langOption}
                  style={[
                    styles.pickerOption,
                    language === langOption && styles.pickerOptionActive,
                  ]}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setLanguage(langOption);
                    setShowLanguagePicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    language === langOption && styles.pickerOptionTextActive,
                  ]}>
                    {getLanguageLabel(langOption)}
                  </Text>
                  {language === langOption && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Bildirim Ayarları */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications-outline" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('settings_notifications')}</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <SettingIcon name="phone-portrait-outline" color="#8B5CF6" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>{t('settings_vibration')}</Text>
                <Text style={styles.settingDescription}>
                  {language === 'tr' ? 'Hatırlatmalarda titret' : 'Vibrate on reminders'}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.vibrationEnabled}
              onValueChange={(value) => updateSettings({ vibrationEnabled: value })}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <SettingIcon name="expand-outline" color="#EC4899" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>{t('settings_fullscreen_alarm')}</Text>
                <Text style={styles.settingDescription}>
                  {language === 'tr' ? 'Kilit ekranında göster' : 'Show on lock screen'}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.fullScreenAlarmEnabled}
              onValueChange={(value) => updateSettings({ fullScreenAlarmEnabled: value })}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Alarm Modu - Sessizde bile çal */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <SettingIcon name="volume-high" color="#EF4444" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>
                  {language === 'tr' ? 'Alarm Modu' : 'Alarm Mode'}
                </Text>
                <Text style={styles.settingDescription}>
                  {language === 'tr' 
                    ? 'Telefon sessizde bile ses çıkar' 
                    : 'Sound plays even in silent mode'}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.alarmModeEnabled ?? true}
              onValueChange={(value) => updateSettings({ alarmModeEnabled: value })}
              trackColor={{ false: colors.border, true: '#EF4444' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Erteleme Süresi */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setShowSnoozePicker(!showSnoozePicker);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <SettingIcon name="time-outline" color="#F59E0B" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>
                  {language === 'tr' ? 'Erteleme Süresi' : 'Snooze Duration'}
                </Text>
                <Text style={styles.settingDescription}>
                  {language === 'tr' ? 'Alarm ertelendiğinde bekleme süresi' : 'Wait time when alarm is snoozed'}
                </Text>
              </View>
            </View>
            <View style={styles.settingValueContainer}>
              <Text style={styles.settingValue}>
                {settings.snoozeDuration || 5} {language === 'tr' ? 'dk' : 'min'}
              </Text>
              <Ionicons name={showSnoozePicker ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          {showSnoozePicker && (
            <View style={styles.pickerContainer}>
              {[5, 10, 15, 30].map((duration) => (
                <TouchableOpacity
                  key={duration}
                  style={[
                    styles.pickerOption,
                    settings.snoozeDuration === duration && styles.pickerOptionActive,
                  ]}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    updateSettings({ snoozeDuration: duration });
                    setShowSnoozePicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    settings.snoozeDuration === duration && styles.pickerOptionTextActive,
                  ]}>
                    {duration} {language === 'tr' ? 'dakika' : 'minutes'}
                  </Text>
                  {settings.snoozeDuration === duration && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.settingRowButton}
            onPress={handleTestNotification}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <SettingIcon name="notifications-outline" color="#3B82F6" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>{t('settings_test_notification')}</Text>
                <Text style={styles.settingDescription}>
                  {language === 'tr' ? 'Bildirimlerin çalıştığını kontrol et' : 'Test if notifications work'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRowButton}
            onPress={handleTestFullScreenAlarm}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <SettingIcon name="alarm-outline" color="#EF4444" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>
                  {language === 'tr' ? 'Tam Ekran Alarm Testi' : 'Full Screen Alarm Test'}
                </Text>
                <Text style={styles.settingDescription}>
                  {language === 'tr' ? '2 saniye sonra alarm ekranı açılır' : 'Alarm screen opens after 2 seconds'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRowButton}
            onPress={handleTestVoice}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <SettingIcon name="volume-high-outline" color="#10B981" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>{t('settings_voice_reminder')}</Text>
                <Text style={styles.settingDescription}>
                  {language === 'tr' ? 'Sesli hatırlatmayı test et' : 'Test voice reminder'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* DEV: Manuel Alarm Testi - Canlıda silinecek */}
        <View style={[styles.section, { borderWidth: 2, borderColor: '#F59E0B', borderStyle: 'dashed' }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="construct-outline" size={18} color="#F59E0B" />
            <Text style={[styles.sectionTitle, { color: '#F59E0B' }]}>
              {language === 'tr' ? 'Geliştirici Test' : 'Developer Test'}
            </Text>
          </View>
          <Text style={styles.sectionDescription}>
            {language === 'tr' 
              ? 'Bu bölüm test amaçlıdır. Canlıya alınmadan önce silinecektir.' 
              : 'This section is for testing. Will be removed before production.'}
          </Text>

          <TouchableOpacity
            style={styles.settingRowButton}
            onPress={() => handleScheduleTestAlarm(0.25)}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <SettingIcon name="flash-outline" color="#EF4444" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>
                  {language === 'tr' ? '15 Saniye Sonra Alarm' : 'Alarm in 15 Seconds'}
                </Text>
                <Text style={styles.settingDescription}>
                  {language === 'tr' ? 'Hızlı test' : 'Quick test'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRowButton}
            onPress={() => handleScheduleTestAlarm(1)}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <SettingIcon name="timer-outline" color="#F59E0B" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>
                  {language === 'tr' ? '1 Dakika Sonra Alarm' : 'Alarm in 1 Minute'}
                </Text>
                <Text style={styles.settingDescription}>
                  {language === 'tr' ? 'Gerçek bildirim ile test et' : 'Test with real notification'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRowButton}
            onPress={() => handleScheduleTestAlarm(2)}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <SettingIcon name="timer-outline" color="#F59E0B" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>
                  {language === 'tr' ? '2 Dakika Sonra Alarm' : 'Alarm in 2 Minutes'}
                </Text>
                <Text style={styles.settingDescription}>
                  {language === 'tr' ? 'Uygulamayı kapatarak test et' : 'Test by closing the app'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRowButton}
            onPress={() => handleScheduleTestAlarm(5)}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <SettingIcon name="timer-outline" color="#F59E0B" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>
                  {language === 'tr' ? '5 Dakika Sonra Alarm' : 'Alarm in 5 Minutes'}
                </Text>
                <Text style={styles.settingDescription}>
                  {language === 'tr' ? 'Sessiz modda test et' : 'Test in silent mode'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Gece Modu / Sessiz Saatler */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="moon-outline" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>
              {language === 'tr' ? 'Gece Modu' : 'Quiet Hours'}
            </Text>
          </View>
          <Text style={styles.sectionDescription}>
            {language === 'tr' 
              ? 'Belirtilen saatlerde tam ekran alarm devre dışı kalır' 
              : 'Full screen alarm is disabled during these hours'}
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <SettingIcon name="bed-outline" color="#6366F1" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>
                  {language === 'tr' ? 'Gece Modu' : 'Quiet Hours'}
                </Text>
                <Text style={styles.settingDescription}>
                  {language === 'tr' ? 'Sessiz saatleri etkinleştir' : 'Enable quiet hours'}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.quietHoursEnabled || false}
              onValueChange={(value) => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                updateSettings({ quietHoursEnabled: value });
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {settings.quietHoursEnabled && (
            <>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => setShowQuietStartPicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.settingInfo}>
                  <SettingIcon name="notifications-off-outline" color="#8B5CF6" />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>
                      {language === 'tr' ? 'Başlangıç Saati' : 'Start Time'}
                    </Text>
                    <Text style={styles.settingDescription}>
                      {language === 'tr' ? 'Gece modunun başladığı saat' : 'When quiet hours begin'}
                    </Text>
                  </View>
                </View>
                <View style={styles.settingValueContainer}>
                  <Text style={styles.settingValue}>
                    {formatTimeDisplay(settings.quietHoursStart || '23:00')}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => setShowQuietEndPicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.settingInfo}>
                  <SettingIcon name="notifications-outline" color="#10B981" />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>
                      {language === 'tr' ? 'Bitiş Saati' : 'End Time'}
                    </Text>
                    <Text style={styles.settingDescription}>
                      {language === 'tr' ? 'Gece modunun bittiği saat' : 'When quiet hours end'}
                    </Text>
                  </View>
                </View>
                <View style={styles.settingValueContainer}>
                  <Text style={styles.settingValue}>
                    {formatTimeDisplay(settings.quietHoursEnd || '07:00')}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Ek Özellikler */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flash-outline" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>
              {language === 'tr' ? 'Ek Özellikler' : 'Additional Features'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.settingRowButton}
            onPress={() => navigation.navigate('Interactions')}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <SettingIcon name="warning-outline" color="#F59E0B" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>{t('interaction_title')}</Text>
                <Text style={styles.settingDescription}>
                  {language === 'tr' ? 'İlaçlarınız arasındaki etkileşimler' : 'Interactions between your medicines'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Hesap ve Senkronizasyon */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>
              {language === 'tr' ? 'Hesap' : 'Account'}
            </Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <SettingIcon name="mail-outline" color="#3B82F6" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>
                  {language === 'tr' ? 'E-posta' : 'Email'}
                </Text>
                <Text style={styles.settingDescription}>
                  {user?.email || '-'}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.settingRowButton}
            onPress={handleSync}
            disabled={isSyncing}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <SettingIcon name="cloud-outline" color="#06B6D4" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>
                  {language === 'tr' ? 'Şimdi Senkronize Et' : 'Sync Now'}
                </Text>
                <Text style={styles.settingDescription}>
                  {language === 'tr' ? 'Son: ' : 'Last: '}{formatLastSync()}
                </Text>
              </View>
            </View>
            {isSyncing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="sync-outline" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRowButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <SettingIcon name="log-out-outline" color="#EF4444" />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingLabel, { color: colors.error || '#EF4444' }]}>
                  {language === 'tr' ? 'Çıkış Yap' : 'Logout'}
                </Text>
                <Text style={styles.settingDescription}>
                  {language === 'tr' ? 'Hesabınızdan çıkış yapın' : 'Sign out of your account'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.error || '#EF4444'} />
          </TouchableOpacity>
        </View>

        {/* Uygulama Bilgisi */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>{t('settings_about')}</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <SettingIcon name="code-slash-outline" color="#8B5CF6" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>{t('settings_version')}</Text>
              </View>
            </View>
            <Text style={styles.settingValue}>1.0.2</Text>
          </View>

          <TouchableOpacity
            style={styles.settingRowButton}
            onPress={() => Linking.openURL('https://t.me/eDemirON')}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <SettingIcon name="logo-telegram" color="#0088CC" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>
                  {language === 'tr' ? 'Geliştirici' : 'Developer'}
                </Text>
                <Text style={styles.settingDescription}>@eDemirON</Text>
              </View>
            </View>
            <Ionicons name="open-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRowButton}
            onPress={() => Linking.openURL('https://t.me/demiryasin')}
            activeOpacity={0.7}
          >
            <View style={styles.settingInfo}>
              <SettingIcon name="logo-telegram" color="#0088CC" />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>
                  {language === 'tr' ? 'Geliştirici' : 'Developer'}
                </Text>
                <Text style={styles.settingDescription}>@demiryasin</Text>
              </View>
            </View>
            <Ionicons name="open-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Time Pickers */}
        {showWakeUpPicker && (
          <DateTimePicker
            value={parseTimeToDate(settings.wakeUpTime)}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleWakeUpChange}
          />
        )}

        {showSleepPicker && (
          <DateTimePicker
            value={parseTimeToDate(settings.sleepTime)}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleSleepChange}
          />
        )}

        {showQuietStartPicker && (
          <DateTimePicker
            value={parseTimeToDate(settings.quietHoursStart || '23:00')}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleQuietStartChange}
          />
        )}

        {showQuietEndPicker && (
          <DateTimePicker
            value={parseTimeToDate(settings.quietHoursEnd || '07:00')}
            mode="time"
            is24Hour={true}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleQuietEndChange}
          />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  // Premium Card
  premiumCard: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  premiumCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  premiumTextContainer: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  premiumSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  // Section
  section: {
    backgroundColor: colors.card,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 4,
    elevation: isDark ? 0 : 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    paddingHorizontal: 16,
    paddingBottom: 8,
    lineHeight: 16,
  },
  // Setting Row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 64, // Touch target minimum
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  settingRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 64, // Touch target minimum
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    letterSpacing: -0.2,
  },
  settingDescription: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 17,
  },
  settingValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  // Picker
  pickerContainer: {
    backgroundColor: isDark ? colors.background : colors.card,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: isDark ? 1 : 0,
    borderColor: colors.divider,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  pickerOptionActive: {
    backgroundColor: colors.primary + '15',
  },
  pickerOptionText: {
    fontSize: 15,
    color: colors.text,
  },
  pickerOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});
