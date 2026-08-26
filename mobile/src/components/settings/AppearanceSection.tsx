import React from 'react';
import { LayoutAnimation, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SettingsSection } from './SettingsSection';
import { SettingRow } from './SettingRow';
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

const LANGUAGES: {
  id: Language;
  name: string;
  nativeName: string;
  icon: string;
  color: string;
}[] = [
  {
    id: 'tr',
    name: 'Türkçe',
    nativeName: 'Varsayılan sistem dili',
    icon: 'globe',
    color: '#0284C7',
  },
  {
    id: 'en',
    name: 'English',
    nativeName: 'System language (English)',
    icon: 'globe-outline',
    color: '#6366F1',
  },
];

export const AppearanceSection: React.FC<AppearanceSectionProps> = ({
  showLanguagePicker,
  onLanguagePress,
  onThemeSelect,
  onLanguageSelect,
  getLanguageLabel,
}) => {
  const { isDark, theme, setTheme } = useTheme();
  const { language } = useLanguage();
  const isTr = language === 'tr';

  const handleLanguagePress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onLanguagePress();
  };

  const handleThemeSelect = (themeValue: ThemeMode) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTheme(themeValue);
    if (onThemeSelect) {
      onThemeSelect(themeValue);
    }
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
        description={isTr ? 'Uygulama arayüz lisanı' : 'App display language'}
        onPress={handleLanguagePress}
        showChevron
        chevronDirection={showLanguagePicker ? 'up' : 'down'}
      />

      {/* Dil Seçim Çekmecesi (Alarm Melodisi ile Birebir Aynı Lüks Tasarım) */}
      {showLanguagePicker && (
        <View
          style={[
            styles.drawerContainer,
            {
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.85)' : '#F0FDFA',
              borderColor: isDark ? 'rgba(2, 132, 199, 0.40)' : 'rgba(2, 132, 199, 0.25)',
            },
          ]}
        >
          {/* Çekmece Başlık Şeridi */}
          <View
            style={[
              styles.drawerHeader,
              {
                backgroundColor: isDark ? 'rgba(2, 132, 199, 0.15)' : 'rgba(2, 132, 199, 0.10)',
                borderBottomColor: isDark ? 'rgba(2, 132, 199, 0.25)' : 'rgba(2, 132, 199, 0.15)',
              },
            ]}
          >
            <Ionicons name="globe" size={13} color="#0284C7" style={{ marginRight: 6 }} />
            <Text style={[styles.drawerHeaderText, { color: isDark ? '#38BDF8' : '#0369A1' }]}>
              {isTr ? 'KULLANILABİLİR DİLLER' : 'AVAILABLE LANGUAGES'}
            </Text>
          </View>

          {LANGUAGES.map((lang, idx) => {
            const isSelected = language === lang.id;

            return (
              <TouchableOpacity
                key={lang.id}
                style={[
                  styles.drawerItem,
                  idx > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  },
                  isSelected && {
                    backgroundColor: isDark ? 'rgba(2, 132, 199, 0.22)' : 'rgba(2, 132, 199, 0.12)',
                  },
                ]}
                onPress={() => handleLanguageSelect(lang.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: isDark ? `${lang.color}25` : `${lang.color}15`,
                      borderColor: `${lang.color}40`,
                    },
                  ]}
                >
                  <Ionicons name={lang.icon as any} size={18} color={lang.color} />
                </View>

                <View style={styles.textCol}>
                  <Text
                    style={[
                      styles.itemTitle,
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
                    {lang.name}
                  </Text>
                  <Text style={[styles.itemDesc, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    {lang.nativeName}
                  </Text>
                </View>

                {isSelected && <Ionicons name="checkmark-circle" size={20} color="#0284C7" />}
              </TouchableOpacity>
            );
          })}
        </View>
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
  drawerContainer: {
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
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
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  textCol: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  itemDesc: {
    fontSize: 11.5,
    lineHeight: 15,
  },
});
