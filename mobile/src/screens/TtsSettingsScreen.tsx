import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { useMedicineStore } from '../stores/medicineStore';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import Tts from 'react-native-tts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('TtsSettings');

export default function TtsSettingsScreen() {
  const { language } = useLanguage();
  const store = useMedicineStore();
  const insets = useSafeAreaInsets();

  const settings = store.settings || {};
  const updateSettings = store.updateSettings || (() => {});
  const [isTesting, setIsTesting] = useState(false);

  const ttsEnabled = settings.ttsEnabled ?? false;
  const ttsSpeakMedicineName = settings.ttsSpeakMedicineName ?? true;
  const ttsSpeakDosage = settings.ttsSpeakDosage ?? true;
  const ttsSpeakInstructions = settings.ttsSpeakInstructions ?? true;
  const ttsRepeatCount = settings.ttsRepeatCount ?? 1;
  const ttsVolume = settings.ttsVolume ?? 80;

  const triggerHaptic = (type: 'light' | 'success') => {
    try {
      ReactNativeHapticFeedback.trigger(
        type === 'success' ? 'notificationSuccess' : 'impactLight',
        { enableVibrateFallback: true }
      );
    } catch (e) {
      log.debug('Haptic feedback error', e);
    }
  };

  const handleToggleTts = (enabled: boolean) => {
    updateSettings({ ttsEnabled: enabled });
    triggerHaptic('light');
  };

  const handleToggleSpeakName = (enabled: boolean) => {
    updateSettings({ ttsSpeakMedicineName: enabled });
    triggerHaptic('light');
  };

  const handleToggleSpeakDosage = (enabled: boolean) => {
    updateSettings({ ttsSpeakDosage: enabled });
    triggerHaptic('light');
  };

  const handleToggleSpeakInstructions = (enabled: boolean) => {
    updateSettings({ ttsSpeakInstructions: enabled });
    triggerHaptic('light');
  };

  const handleVolumeChange = (delta: number) => {
    const newValue = Math.max(0, Math.min(100, ttsVolume + delta));
    updateSettings({ ttsVolume: newValue });
  };

  const handleRepeatCountChange = (count: number) => {
    updateSettings({ ttsRepeatCount: count });
    triggerHaptic('light');
  };

  const handleTestVoice = async () => {
    if (isTesting) {
      try {
        await Tts.stop();
      } catch (e) {
        log.debug('TTS stop error', e);
      }
      setIsTesting(false);
      return;
    }

    setIsTesting(true);
    triggerHaptic('success');

    try {
      await Tts.setDefaultLanguage(language === 'tr' ? 'tr-TR' : 'en-US');
      await Tts.setDefaultRate(0.5);
      await Tts.setDefaultPitch(1.0);

      const message =
        language === 'tr'
          ? 'Sesli bildirim sistemi çalışıyor'
          : 'Voice notification system is working';

      Tts.addEventListener('tts-finish', () => setIsTesting(false));
      await Tts.speak(message);
    } catch {
      setIsTesting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Text style={styles.headerIcon}>🔊</Text>
        </View>
        <Text style={styles.headerTitle}>
          {language === 'tr' ? 'Sesli Bildirimler' : 'Voice Notifications'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {language === 'tr'
            ? 'Alarm sırasında ilaç bilgilerini sesli olarak duyurun'
            : 'Announce medicine information during alarms'}
        </Text>
      </View>

      {/* Main Toggle Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBg, { backgroundColor: '#E8F5E9' }]}>
            <Text style={styles.iconText}>🔔</Text>
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>
              {language === 'tr' ? 'Sesli Bildirim' : 'Voice Notification'}
            </Text>
            <Text style={styles.cardSubtitle}>
              {ttsEnabled
                ? language === 'tr'
                  ? 'Aktif'
                  : 'Enabled'
                : language === 'tr'
                  ? 'Pasif'
                  : 'Disabled'}
            </Text>
          </View>
          <Switch
            value={ttsEnabled}
            onValueChange={handleToggleTts}
            trackColor={{ false: '#E0E0E0', true: '#4ECDC4' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {ttsEnabled && (
        <>
          {/* What to Speak Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBg, { backgroundColor: '#E3F2FD' }]}>
                <Text style={styles.iconText}>📝</Text>
              </View>
              <Text style={styles.cardTitle}>
                {language === 'tr' ? 'Ne Söylensin?' : 'What to Speak?'}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.optionRow}>
              <Text style={styles.optionText}>
                {language === 'tr' ? '💊 İlaç Adı' : '💊 Medicine Name'}
              </Text>
              <Switch
                value={ttsSpeakMedicineName}
                onValueChange={handleToggleSpeakName}
                trackColor={{ false: '#E0E0E0', true: '#4ECDC4' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.optionRow}>
              <Text style={styles.optionText}>{language === 'tr' ? '💉 Dozaj' : '💉 Dosage'}</Text>
              <Switch
                value={ttsSpeakDosage}
                onValueChange={handleToggleSpeakDosage}
                trackColor={{ false: '#E0E0E0', true: '#4ECDC4' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.optionRow}>
              <Text style={styles.optionText}>
                {language === 'tr' ? '📋 Talimatlar' : '📋 Instructions'}
              </Text>
              <Switch
                value={ttsSpeakInstructions}
                onValueChange={handleToggleSpeakInstructions}
                trackColor={{ false: '#E0E0E0', true: '#4ECDC4' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Repeat Count Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBg, { backgroundColor: '#FFF3E0' }]}>
                <Text style={styles.iconText}>🔁</Text>
              </View>
              <Text style={styles.cardTitle}>
                {language === 'tr' ? 'Tekrar Sayısı' : 'Repeat Count'}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.repeatContainer}>
              {[1, 2, 3].map(count => (
                <TouchableOpacity
                  key={count}
                  style={[
                    styles.repeatButton,
                    ttsRepeatCount === count && styles.repeatButtonActive,
                  ]}
                  onPress={() => handleRepeatCountChange(count)}
                >
                  <Text
                    style={[
                      styles.repeatButtonText,
                      ttsRepeatCount === count && styles.repeatButtonTextActive,
                    ]}
                  >
                    {count}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Volume Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBg, { backgroundColor: '#FCE4EC' }]}>
                <Text style={styles.iconText}>🔊</Text>
              </View>
              <Text style={styles.cardTitle}>
                {language === 'tr' ? 'Ses Seviyesi' : 'Volume Level'}
              </Text>
              <Text style={styles.volumePercent}>{ttsVolume}%</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.sliderContainer}>
              <TouchableOpacity style={styles.sliderButton} onPress={() => handleVolumeChange(-10)}>
                <Text style={styles.sliderButtonText}>−</Text>
              </TouchableOpacity>
              <View style={styles.sliderTrack}>
                <View style={[styles.sliderFill, { width: `${ttsVolume}%` }]} />
              </View>
              <TouchableOpacity style={styles.sliderButton} onPress={() => handleVolumeChange(10)}>
                <Text style={styles.sliderButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Test Button */}
          <TouchableOpacity
            style={[styles.testButton, isTesting && styles.testButtonActive]}
            onPress={handleTestVoice}
          >
            <Text style={styles.testButtonText}>
              {isTesting ? '⏹️ ' : '▶️ '}
              {isTesting
                ? language === 'tr'
                  ? 'Durdur'
                  : 'Stop'
                : language === 'tr'
                  ? 'Sesi Test Et'
                  : 'Test Voice'}
            </Text>
          </TouchableOpacity>

          {/* Preview Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBg, { backgroundColor: '#E8EAF6' }]}>
                <Text style={styles.iconText}>👁️</Text>
              </View>
              <Text style={styles.cardTitle}>{language === 'tr' ? 'Önizleme' : 'Preview'}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.previewContent}>
              <Text style={styles.previewQuote}>"</Text>
              <Text style={styles.previewText}>
                {language === 'tr' ? 'İlaç zamanı! ' : 'Medicine time! '}
                {ttsSpeakMedicineName && (language === 'tr' ? 'Aspirin, ' : 'Aspirin, ')}
                {ttsSpeakDosage && '500mg. '}
                {ttsSpeakInstructions &&
                  (language === 'tr' ? 'Yemekten sonra alınız.' : 'Take after meal.')}
              </Text>
              <Text style={styles.previewQuote}>"</Text>
            </View>
          </View>
        </>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerIcon: {
    fontSize: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingLeft: 20,
  },
  optionText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  repeatContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  repeatButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  repeatButtonActive: {
    backgroundColor: '#4ECDC4',
  },
  repeatButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  repeatButtonTextActive: {
    color: '#fff',
  },
  volumePercent: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4ECDC4',
    marginLeft: 'auto',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  sliderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderButtonText: {
    fontSize: 20,
    color: '#666',
    fontWeight: '300',
  },
  sliderTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#4ECDC4',
    borderRadius: 4,
  },
  testButton: {
    backgroundColor: '#4ECDC4',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  testButtonActive: {
    backgroundColor: '#FF6B6B',
    shadowColor: '#FF6B6B',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  previewContent: {
    padding: 16,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  previewQuote: {
    fontSize: 24,
    color: '#4ECDC4',
    fontWeight: 'bold',
    lineHeight: 28,
  },
  previewText: {
    flex: 1,
    color: '#1A1A2E',
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 24,
    marginHorizontal: 8,
    paddingTop: 2,
  },
  bottomPadding: {
    height: 60,
  },
});
