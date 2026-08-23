/**
 * NotificationsSection — Alarm Melodisi Seçimi, Canlı Ses Seviyesi Testi, Kritik Hatırlatıcılar, Bakıcı ve TTS
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SettingsSection, SettingRow, OptionPicker } from '../../../components/settings';
import {
  ALARM_SOUND_LIST,
  getSoundDisplayName,
  previewAlarmSound,
  stopAlarmSound,
} from '../../../utils/alarmSoundManager';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, UserSettings, AlarmSoundType } from '../../../types';

interface NotificationsSectionProps {
  settings: UserSettings;
  updateSettings: (settings: Partial<UserSettings>) => void;
  pickerState: { showVolumePicker?: boolean; showSoundPicker?: boolean };
  togglePicker: (picker: 'showVolumePicker' | 'showSoundPicker') => void;
  closePicker: (picker: 'showVolumePicker' | 'showSoundPicker') => void;
  isDark: boolean;
  navigation: NativeStackNavigationProp<RootStackParamList>;
  language: string;
}

export function NotificationsSection({
  settings,
  updateSettings,
  pickerState,
  togglePicker,
  closePicker,
  isDark,
  navigation,
  language,
}: NotificationsSectionProps) {
  const isTr = language === 'tr';
  const currentSoundId = settings.alarmSound || 'soft_chime';
  const currentSoundName = getSoundDisplayName(currentSoundId, language);

  // Unmount anında sesi durdur
  useEffect(() => {
    return () => {
      stopAlarmSound();
    };
  }, []);

  const handleSelectSound = (soundId: AlarmSoundType) => {
    updateSettings({ alarmSound: soundId });
    previewAlarmSound(settings.alarmVolume || 80, soundId, 2500);
  };

  const handleSelectVolume = (volume: number) => {
    updateSettings({ alarmVolume: volume });
    closePicker('showVolumePicker');
    previewAlarmSound(volume, currentSoundId, 2000);
  };

  return (
    <SettingsSection
      icon="notifications"
      title={isTr ? 'BİLDİRİMLER VE SESLER' : 'NOTIFICATIONS & AUDIO'}
    >
      {/* 1. Alarm Melodisi Seçimi */}
      <SettingRow
        icon={{ name: 'musical-notes', color: '#0D9488' }}
        label={isTr ? 'Alarm Melodisi' : 'Alarm Melody'}
        value={currentSoundName}
        description={isTr ? 'İlaç vaktinde çalacak melodi' : 'Melody to play at pill time'}
        onPress={() => togglePicker('showSoundPicker')}
        showChevron
        chevronDirection={pickerState.showSoundPicker ? 'up' : 'down'}
      />

      {/* Melodi Seçim Listesi (Belirgin İçe Gömülü Çekmece Kapsülü) */}
      {pickerState.showSoundPicker && (
        <View
          style={[
            styles.soundListContainer,
            {
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : '#F0FDFA',
              borderColor: isDark ? 'rgba(13, 148, 136, 0.40)' : 'rgba(13, 148, 136, 0.25)',
            },
          ]}
        >
          {/* Çekmece Başlık Şeridi */}
          <View
            style={[
              styles.drawerHeader,
              {
                backgroundColor: isDark ? 'rgba(13, 148, 136, 0.15)' : 'rgba(13, 148, 136, 0.10)',
                borderBottomColor: isDark ? 'rgba(13, 148, 136, 0.25)' : 'rgba(13, 148, 136, 0.15)',
              },
            ]}
          >
            <Ionicons name="musical-notes" size={13} color="#0D9488" style={{ marginRight: 6 }} />
            <Text style={[styles.drawerHeaderText, { color: isDark ? '#2DD4BF' : '#0F766E' }]}>
              {isTr ? 'SEÇİLEBİLİR İLAÇ MELODİLERİ' : 'SELECTABLE REMINDER MELODIES'}
            </Text>
          </View>

          {ALARM_SOUND_LIST.map((sound, idx) => {
            const isSelected = currentSoundId === sound.id;

            return (
              <TouchableOpacity
                key={sound.id}
                style={[
                  styles.soundItem,
                  idx > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  },
                  isSelected && {
                    backgroundColor: isDark
                      ? 'rgba(13, 148, 136, 0.22)'
                      : 'rgba(13, 148, 136, 0.12)',
                  },
                ]}
                onPress={() => handleSelectSound(sound.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.soundIconBox,
                    {
                      backgroundColor: isDark ? `${sound.color}25` : `${sound.color}15`,
                      borderColor: `${sound.color}40`,
                    },
                  ]}
                >
                  <Ionicons name={sound.icon as any} size={18} color={sound.color} />
                </View>

                <View style={styles.soundTextCol}>
                  <Text
                    style={[
                      styles.soundTitle,
                      {
                        color: isSelected
                          ? isDark
                            ? '#FFFFFF'
                            : '#0F172A'
                          : isDark
                            ? '#E2E8F0'
                            : '#1E293B',
                        fontWeight: isSelected ? '700' : '600',
                      },
                    ]}
                  >
                    {isTr ? sound.nameTr : sound.nameEn}
                  </Text>
                  <Text style={[styles.soundDesc, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    {isTr ? sound.descriptionTr : sound.descriptionEn}
                  </Text>
                </View>

                {/* Önizle Butonu & Seçim İkonu */}
                <View style={styles.actionCol}>
                  <TouchableOpacity
                    style={[
                      styles.previewButton,
                      {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
                      },
                    ]}
                    onPress={() => previewAlarmSound(settings.alarmVolume || 80, sound.id, 2500)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="play" size={12} color="#0D9488" />
                    <Text style={[styles.previewText, { color: '#0D9488' }]}>
                      {isTr ? 'Dinle' : 'Play'}
                    </Text>
                  </TouchableOpacity>

                  {isSelected && <Ionicons name="checkmark-circle" size={20} color="#0D9488" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* 2. Ses Seviyesi & Canlı Test */}
      <SettingRow
        icon={{ name: 'volume-high', color: '#F59E0B' }}
        label={isTr ? 'Ses Seviyesi & Test' : 'Alarm Volume & Test'}
        value={`%${settings.alarmVolume || 80}`}
        description={isTr ? 'Dokununca canlı ses testi çalar' : 'Plays live sound test'}
        onPress={() => togglePicker('showVolumePicker')}
        showChevron
        chevronDirection={pickerState.showVolumePicker ? 'up' : 'down'}
      />

      {pickerState.showVolumePicker && (
        <OptionPicker<number>
          options={[30, 50, 70, 85, 100]}
          selectedValue={settings.alarmVolume || 80}
          onSelect={handleSelectVolume}
          getLabel={vol =>
            `%${vol} (${
              vol <= 30
                ? isTr
                  ? 'Düşük / Gece'
                  : 'Low / Night'
                : vol <= 50
                  ? isTr
                    ? 'Orta'
                    : 'Medium'
                  : vol <= 70
                    ? isTr
                      ? 'Standart'
                      : 'Standard'
                    : vol <= 85
                      ? isTr
                        ? 'Yüksek'
                        : 'Loud'
                      : isTr
                        ? 'Maksimum (Derin Uyku)'
                        : 'Maximum'
            })`
          }
        />
      )}

      {/* 3. Kritik Hatırlatıcılar */}
      <SettingRow
        icon={{ name: 'notifications', color: '#EF4444' }}
        label={isTr ? 'Kritik Hatırlatıcılar' : 'Critical Alerts'}
        description={
          isTr ? 'Sessiz modda ve kilit ekranında çalar' : 'Rings even in silent & lock screen'
        }
        rightElement={
          <Switch
            value={settings.fullScreenAlarmEnabled !== false}
            onValueChange={val => updateSettings({ fullScreenAlarmEnabled: val })}
            trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: '#0F766E' }}
            thumbColor={settings.fullScreenAlarmEnabled !== false ? '#FFFFFF' : '#F8FAFC'}
          />
        }
      />

      {/* 4. Aile & Bakıcı Takibi */}
      <SettingRow
        icon={{ name: 'people', color: '#0D9488' }}
        label={isTr ? 'Aile & Bakıcı Takibi' : 'Caregiver Alerts'}
        description={
          isTr ? 'Yakınlarınız için anlık doz bildirimleri' : 'Instant notifications for family'
        }
        onPress={() => navigation.navigate('Caregiver')}
        showChevron
      />

      {/* 5. Sesli Bildirimler (TTS) */}
      <SettingRow
        icon={{ name: 'mic', color: '#6366F1' }}
        label={isTr ? 'Sesli Bildirimler (TTS)' : 'Voice Announcements'}
        description={
          isTr ? 'İlaç isimlerini ve dozları sesli oku' : 'Speak medicine names & dosages'
        }
        onPress={() => navigation.navigate('TtsSettings')}
        showChevron
      />
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  soundListContainer: {
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  drawerHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  soundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  soundIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  soundTextCol: {
    flex: 1,
    marginRight: 8,
  },
  soundTitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  soundDesc: {
    fontSize: 11.5,
    lineHeight: 15,
  },
  actionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  previewText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
