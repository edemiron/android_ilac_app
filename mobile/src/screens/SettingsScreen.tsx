import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, ScrollView, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { useAlert } from '../contexts/AlertContext';
import { useUserProfile, LayoutVariant } from '../hooks/useUserProfile';
import { useLowStockDismiss } from '../hooks/useLowStockDismiss';
import { AccentColorSection } from '../components/settings/AccentColorSection';
import { createScopedLogger } from '../utils/logger';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Sprint 11.4: Pure helper'lar ./SettingsScreen/helpers.ts'te tasindi.
import { DEV_MODE_TAP_COUNT, isDevModeTapExpired } from './SettingsScreen/helpers';

const _log = createScopedLogger('SettingsScreen');

export default function SettingsScreen() {
  const {
    navigation,
    colors,
    isDark,
    // eslint-disable-next-line unused-imports/no-unused-vars
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
    handleAddTestMedicine10s,
    handleDeleteTestMedicines,
    handleShowScheduledNotifications,
    handleClearAllData,
    handleSync,
    handleLogout,
    formatLastSync,
    formatTimeDisplay,
    getThemeLabel,
    getLanguageLabel,
  } = useSettingsScreen();

  // eslint-disable-next-line unused-imports/no-unused-vars
  const { t } = useLanguage();
  const { showInfo } = useAlert();
  const { setLayout } = useUserProfile();
  // Sprint 65A: Stok uyarısı reset
  const { reset: resetLowStock, isDismissed: isLowStockDismissed } = useLowStockDismiss();
  const handleResetLowStock = useCallback(async () => {
    await resetLowStock();
    showInfo(
      language === 'tr' ? 'Stok Uyarıları Sıfırlandı' : 'Stock Alerts Reset',
      language === 'tr'
        ? 'Tüm dismiss edilmiş uyarılar tekrar gösterilecek.'
        : 'All dismissed alerts will be shown again.'
    );
  }, [resetLowStock, showInfo, language]);
  const [isDevMode, setIsDevMode] = useState(false);
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);

  // Dev mode durumunu AsyncStorage'dan oku (kalıcı)
  useEffect(() => {
    AsyncStorage.getItem('dev-mode')
      .then(val => {
        if (val === 'true') setIsDevMode(true);
      })
      .catch(() => {});
  }, []);

  const handleVersionPress = useCallback(() => {
    const now = Date.now();

    if (isDevModeTapExpired(lastTapTimeRef.current, now)) {
      tapCountRef.current = 0;
    }

    lastTapTimeRef.current = now;
    tapCountRef.current += 1;

    if (tapCountRef.current >= DEV_MODE_TAP_COUNT) {
      tapCountRef.current = 0;
      const newDevMode = !isDevMode;
      setIsDevMode(newDevMode);
      AsyncStorage.setItem('dev-mode', newDevMode ? 'true' : 'false').catch(() => {});

      showInfo(
        newDevMode
          ? language === 'tr'
            ? 'Geliştirici Modu Açık'
            : 'Developer Mode Enabled'
          : language === 'tr'
            ? 'Geliştirici Modu Kapalı'
            : 'Developer Mode Disabled',
        newDevMode
          ? language === 'tr'
            ? 'Geliştirici test seçenekleri artık görünür.'
            : 'Developer test options are now visible.'
          : language === 'tr'
            ? 'Geliştirici test seçenekleri gizlendi.'
            : 'Developer test options are now hidden.'
      );
    }
  }, [isDevMode, language, showInfo]);

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
          showLayoutPicker={pickerState.showLayoutPicker}
          onThemePress={() => togglePicker('showThemePicker')}
          onLanguagePress={() => togglePicker('showLanguagePicker')}
          onLayoutPress={() => togglePicker('showLayoutPicker')}
          onThemeSelect={themeValue => {
            setTheme(themeValue);
            closePicker('showThemePicker');
          }}
          onLanguageSelect={lang => {
            setLanguage(lang);
            closePicker('showLanguagePicker');
          }}
          onLayoutSelect={async (layout: LayoutVariant) => {
            await setLayout(layout);
            closePicker('showLayoutPicker');
          }}
          getThemeLabel={getThemeLabel}
          getLanguageLabel={getLanguageLabel}
          getLayoutLabel={(layout: LayoutVariant) =>
            layout === 'A'
              ? language === 'tr'
                ? 'Detaylı'
                : 'Detailed'
              : language === 'tr'
                ? 'Sade'
                : 'Simple'
          }
          getLayoutDescription={(layout: LayoutVariant) =>
            layout === 'A'
              ? language === 'tr'
                ? 'Detaylı bilgi, gençler için ideal'
                : 'Detailed info, ideal for younger users'
              : language === 'tr'
                ? 'Büyük butonlar, yaşlılar için ideal'
                : 'Large buttons, ideal for elderly'
          }
        />

        <AccentColorSection />

        <NotificationSection
          settings={settings}
          showSnoozePicker={pickerState.showSnoozePicker}
          showSnoozeCountPicker={pickerState.showSnoozeCountPicker}
          showVolumePicker={pickerState.showVolumePicker}
          showConflictIntervalPicker={pickerState.showConflictIntervalPicker}
          onSettingChange={updateSettings}
          onSnoozePress={() => togglePicker('showSnoozePicker')}
          onSnoozeCountPress={() => togglePicker('showSnoozeCountPicker')}
          onVolumePress={() => togglePicker('showVolumePicker')}
          onConflictIntervalPress={() => togglePicker('showConflictIntervalPicker')}
          onTestNotification={handleTestNotification}
          onTestFullScreenAlarm={handleTestFullScreenAlarm}
          onTestVoice={handleTestVoice}
        />

        {isDevMode && (
          <DevTestSection
            onScheduleAlarm={handleScheduleTestAlarm}
            onAddTestMedicine={handleAddTestMedicine}
            onAddTestMedicine10s={handleAddTestMedicine10s}
            onDeleteTestMedicines={handleDeleteTestMedicines}
            onShowScheduledNotifications={handleShowScheduledNotifications}
            onClearAllData={handleClearAllData}
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

        <AdditionalFeaturesSection
          onInteractionsPress={() => navigation.navigate('Interactions')}
          onSecurityPress={() => navigation.navigate('Security')}
          onTtsPress={() => navigation.navigate('TtsSettings')}
          onCaregiverPress={() => navigation.navigate('Caregiver')}
          onResetLowStockPress={isLowStockDismissed ? handleResetLowStock : undefined}
          ttsEnabled={settings.ttsEnabled}
        />

        <AccountSection
          userEmail={user?.email}
          lastSyncFormatted={formatLastSync()}
          isSyncing={isSyncing}
          onSyncPress={handleSync}
          onLogoutPress={handleLogout}
        />

        <AboutSection onVersionPress={handleVersionPress} isDevMode={isDevMode} />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
