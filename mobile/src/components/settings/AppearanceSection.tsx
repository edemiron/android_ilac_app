import React from 'react';
import { LayoutAnimation } from 'react-native';
import { SettingsSection } from './SettingsSection';
import { SettingRow } from './SettingRow';
import { OptionPicker } from './OptionPicker';
import { useTheme, ThemeMode } from '../../contexts/ThemeContext';
import { useLanguage, Language } from '../../contexts/LanguageContext';

interface AppearanceSectionProps {
  showThemePicker: boolean;
  showLanguagePicker: boolean;
  onThemePress: () => void;
  onLanguagePress: () => void;
  onThemeSelect: (theme: ThemeMode) => void;
  onLanguageSelect: (lang: Language) => void;
  getThemeLabel: (theme: ThemeMode) => string;
  getLanguageLabel: (lang: Language) => string;
}

export const AppearanceSection: React.FC<AppearanceSectionProps> = ({
  showThemePicker,
  showLanguagePicker,
  onThemePress,
  onLanguagePress,
  onThemeSelect,
  onLanguageSelect,
  getThemeLabel,
  getLanguageLabel,
}) => {
  const { isDark, theme } = useTheme();
  const { language, t } = useLanguage();

  const handleThemePress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onThemePress();
  };

  const handleLanguagePress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onLanguagePress();
  };

  const handleThemeSelect = (themeValue: ThemeMode) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onThemeSelect(themeValue);
  };

  const handleLanguageSelect = (lang: Language) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onLanguageSelect(lang);
  };

  return (
    <SettingsSection icon="color-palette-outline" title={t('settings_appearance')}>
      <SettingRow
        icon={{ name: isDark ? 'moon' : 'sunny', color: isDark ? '#6366F1' : '#F59E0B' }}
        label={t('settings_theme')}
        description={language === 'tr' ? 'Uygulama temasi' : 'App theme'}
        value={getThemeLabel(theme)}
        onPress={handleThemePress}
        showChevron
        chevronDirection={showThemePicker ? 'up' : 'down'}
      />

      {showThemePicker && (
        <OptionPicker<ThemeMode>
          options={['light', 'dark', 'system']}
          selectedValue={theme}
          onSelect={handleThemeSelect}
          getLabel={getThemeLabel}
        />
      )}

      <SettingRow
        icon={{ name: 'globe-outline', color: '#10B981' }}
        label={t('settings_language')}
        description={language === 'tr' ? 'Uygulama dili' : 'App language'}
        value={getLanguageLabel(language)}
        onPress={handleLanguagePress}
        showChevron
        chevronDirection={showLanguagePicker ? 'up' : 'down'}
      />

      {showLanguagePicker && (
        <OptionPicker<Language>
          options={['tr', 'en']}
          selectedValue={language}
          onSelect={handleLanguageSelect}
          getLabel={getLanguageLabel}
        />
      )}
    </SettingsSection>
  );
};
