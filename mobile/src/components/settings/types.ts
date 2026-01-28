import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { ThemeColors } from '../../contexts/ThemeContext';
import { Language, TranslationKey } from '../../contexts/LanguageContext';
import type Ionicons from 'react-native-vector-icons/Ionicons';

export interface SettingIconProps {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size?: number;
}

export interface SettingRowProps {
  icon: SettingIconProps;
  label: string;
  description?: string;
  value?: string;
  onPress?: () => void;
  rightElement?: ReactNode;
  showChevron?: boolean;
  chevronDirection?: 'forward' | 'up' | 'down';
  labelColor?: string;
  chevronColor?: string;
}

export interface SettingsSectionProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  children: ReactNode;
  borderStyle?: object;
}

export interface SettingsContextData {
  colors: ThemeColors;
  isDark: boolean;
  language: Language;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  styles: ReturnType<typeof StyleSheet.create>;
}

export interface TimePickerState {
  showWakeUpPicker: boolean;
  showSleepPicker: boolean;
  showQuietStartPicker: boolean;
  showQuietEndPicker: boolean;
}

export interface DropdownPickerState {
  showThemePicker: boolean;
  showLanguagePicker: boolean;
  showSnoozePicker: boolean;
}

export interface Settings {
  wakeUpTime: string;
  sleepTime: string;
  vibrationEnabled: boolean;
  fullScreenAlarmEnabled: boolean;
  alarmModeEnabled?: boolean;
  alarmVolume?: number;
  snoozeDuration?: number;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  conflictIntervalMinutes?: number;
}
