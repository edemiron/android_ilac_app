import React from 'react';
import { LayoutAnimation, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
  showLanguagePicker,
  onLanguagePress,
  onThemeSelect,
  onLanguageSelect,
  getLanguageLabel,
}) => {
  const { isDark, theme } = useTheme();
  const { language } = useLanguage();
  const isTr = language === 'tr';

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

  const themeOptions: { value: ThemeMode; labelTr: string; labelEn: string }[] = [
    { value: 'light', labelTr: 'Açık', labelEn: 'Light' },
    { value: 'dark', labelTr: 'Koyu', labelEn: 'Dark' },
    { value: 'system', labelTr: 'Oto', labelEn: 'Auto' },
  ];

  return (
    <SettingsSection
      icon="color-palette"
      title={isTr ? 'GÖRÜNÜM VE KİŞİSELLEŞTİRME' : 'APPEARANCE & PREFERENCES'}
    >
      {/* Karanlık Mod (Dark Mode) Row */}
      <SettingRow
        icon={{ name: 'moon', color: '#6366F1' }}
        label={isTr ? 'Uygulama Teması' : 'App Theme'}
        description={isTr ? 'Açık, koyu veya sistem teması' : 'Light, dark or system theme'}
        rightElement={
          <View
            style={[
              styles.segmentedContainer,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
              },
            ]}
          >
            {themeOptions.map(opt => {
              const isSelected = theme === opt.value;
              const label = isTr ? opt.labelTr : opt.labelEn;

              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.segmentButton,
                    isSelected && [
                      styles.segmentButtonActive,
                      {
                        backgroundColor: isDark ? '#0D9488' : '#FFFFFF',
                      },
                    ],
                  ]}
                  onPress={() => handleThemeSelect(opt.value)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      {
                        color: isSelected
                          ? isDark
                            ? '#FFFFFF'
                            : '#0F172A'
                          : isDark
                            ? '#94A3B8'
                            : '#64748B',
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        }
      />

      {/* Dil (Language) Row */}
      <SettingRow
        icon={{ name: 'globe', color: '#0284C7' }}
        label={isTr ? 'Uygulama Dili' : 'Language'}
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

const styles = StyleSheet.create({
  segmentedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderRadius: 18,
    gap: 2,
  },
  segmentButton: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
  },
});

export default AppearanceSection;
