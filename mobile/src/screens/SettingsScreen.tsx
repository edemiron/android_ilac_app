import React, { useState, useCallback, useRef } from 'react';
import { View, ScrollView, Platform, UIManager, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PremiumCard,
  DailyScheduleSection,
  AppearanceSection,
  NotificationSection,
  DevTestSection,
  QuietHoursSection,
  AdditionalFeaturesSection,
  AccountSection,
  AboutSection,
  createSettingsStyles,
} from '../components/settings';
import { useSettingsScreen } from '../hooks/useSettingsScreen';
import { useLanguage } from '../contexts/LanguageContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DEV_MODE_TAP_COUNT = 5;
const DEV_MODE_TAP_TIMEOUT = 3000;

export default function SettingsScreen() {
  const {
    navigation,
    colors,
    isDark,
    theme,
    setTheme,
    language,
    setLanguage,
    settings,
    updateSettings,
    isSyncing,
    user,
    isPremium,
    remainingDays,
    pickerState,
    togglePicker,
    closePicker,
    parseTimeToDate,
    handleTimeChange,
    handleTestNotification,
    handleTestVoice,
    handleTestFullScreenAlarm,
    handleScheduleTestAlarm,
    handleAddTestMedicine,
    handleDeleteTestMedicines,
    handleShowScheduledNotifications,
    handleSync,
    handleLogout,
    formatLastSync,
    formatTimeDisplay,
    getThemeLabel,
    getLanguageLabel,
  } = useSettingsScreen();

  const { t } = useLanguage();
  const [isDevMode, setIsDevMode] = useState(false);
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);

  const handleVersionPress = useCallback(() => {
    const now = Date.now();
    
    if (now - lastTapTimeRef.current > DEV_MODE_TAP_TIMEOUT) {
      tapCountRef.current = 0;
    }
    
    lastTapTimeRef.current = now;
    tapCountRef.current += 1;
    
    if (tapCountRef.current >= DEV_MODE_TAP_COUNT) {
      tapCountRef.current = 0;
      const newDevMode = !isDevMode;
      setIsDevMode(newDevMode);
      
      Alert.alert(
        newDevMode 
          ? (language === 'tr' ? 'Geliştirici Modu Açık' : 'Developer Mode Enabled')
          : (language === 'tr' ? 'Geliştirici Modu Kapalı' : 'Developer Mode Disabled'),
        newDevMode
          ? (language === 'tr' ? 'Geliştirici test seçenekleri artık görünür.' : 'Developer test options are now visible.')
          : (language === 'tr' ? 'Geliştirici test seçenekleri gizlendi.' : 'Developer test options are now hidden.')
      );
    }
  }, [isDevMode, language]);

  const styles = createSettingsStyles(colors, isDark);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView}>
        <PremiumCard
          isPremium={isPremium}
          remainingDays={remainingDays}
          onPress={() => navigation.navigate('Premium')}
        />

        <DailyScheduleSection
          wakeUpTime={settings.wakeUpTime}
          sleepTime={settings.sleepTime}
          showWakeUpPicker={pickerState.showWakeUpPicker}
          showSleepPicker={pickerState.showSleepPicker}
          onWakeUpPress={() => togglePicker('showWakeUpPicker')}
          onSleepPress={() => togglePicker('showSleepPicker')}
          onWakeUpChange={handleTimeChange('wakeUpTime')}
          onSleepChange={handleTimeChange('sleepTime')}
          parseTimeToDate={parseTimeToDate}
          formatTimeDisplay={formatTimeDisplay}
        />

        <AppearanceSection
          showThemePicker={pickerState.showThemePicker}
          showLanguagePicker={pickerState.showLanguagePicker}
          onThemePress={() => togglePicker('showThemePicker')}
          onLanguagePress={() => togglePicker('showLanguagePicker')}
          onThemeSelect={(themeValue) => {
            setTheme(themeValue);
            closePicker('showThemePicker');
          }}
          onLanguageSelect={(lang) => {
            setLanguage(lang);
            closePicker('showLanguagePicker');
          }}
          getThemeLabel={getThemeLabel}
          getLanguageLabel={getLanguageLabel}
        />

        <NotificationSection
          settings={settings}
          showSnoozePicker={pickerState.showSnoozePicker}
          showVolumePicker={pickerState.showVolumePicker}
          onSettingChange={updateSettings}
          onSnoozePress={() => togglePicker('showSnoozePicker')}
          onVolumePress={() => togglePicker('showVolumePicker')}
          onTestNotification={handleTestNotification}
          onTestFullScreenAlarm={handleTestFullScreenAlarm}
          onTestVoice={handleTestVoice}
        />

        {isDevMode && (
          <DevTestSection 
            onScheduleAlarm={handleScheduleTestAlarm}
            onAddTestMedicine={handleAddTestMedicine}
            onDeleteTestMedicines={handleDeleteTestMedicines}
            onShowScheduledNotifications={handleShowScheduledNotifications}
          />
        )}

        <QuietHoursSection
          settings={settings}
          showQuietStartPicker={pickerState.showQuietStartPicker}
          showQuietEndPicker={pickerState.showQuietEndPicker}
          onSettingChange={updateSettings}
          onQuietStartPress={() => togglePicker('showQuietStartPicker')}
          onQuietEndPress={() => togglePicker('showQuietEndPicker')}
          onQuietStartChange={handleTimeChange('quietHoursStart')}
          onQuietEndChange={handleTimeChange('quietHoursEnd')}
          parseTimeToDate={parseTimeToDate}
          formatTimeDisplay={formatTimeDisplay}
        />

        <AdditionalFeaturesSection onInteractionsPress={() => navigation.navigate('Interactions')} />

        <AccountSection
          userEmail={user?.email}
          lastSyncFormatted={formatLastSync()}
          isSyncing={isSyncing}
          onSyncPress={handleSync}
          onLogoutPress={handleLogout}
        />

        <AboutSection 
          onVersionPress={handleVersionPress}
          isDevMode={isDevMode}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
