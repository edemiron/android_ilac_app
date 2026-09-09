import { ImageStyle, TextStyle, ViewStyle } from 'react-native';

type StyleDefinition = Record<string, ViewStyle | TextStyle | ImageStyle>;

// Mock React Native
jest.mock('react-native', () => ({
  StyleSheet: {
    create: <T extends StyleDefinition>(styles: T): T => styles,
    hairlineWidth: 1,
  },
  Platform: {
    OS: 'ios',
  },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  Switch: 'Switch',
  LayoutAnimation: {
    configureNext: jest.fn(),
    Presets: {
      easeInEaseOut: {},
    },
  },
  ActivityIndicator: 'ActivityIndicator',
  Linking: {
    openURL: jest.fn(),
  },
}));

// Mock dependencies
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#4ECDC4',
      text: '#1A1A2E',
      textMuted: '#999999',
      border: '#E0E0E0',
      divider: '#F0F0F0',
      card: '#FFFFFF',
      background: '#F8F9FA',
      textSecondary: '#666666',
      error: '#F44336',
    },
    isDark: false,
    theme: 'light',
    setTheme: jest.fn(),
  }),
}));

jest.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'tr',
    setLanguage: jest.fn(),
    t: (key: string) => key,
  }),
}));

// v1.8.1: '@expo/vector-icons' mock'u buradaydi ama uygulamada o paket hic
// kullanilmiyordu — ikonlar 'react-native-vector-icons' uzerinden geliyor ve o
// da jest.setup.js'te mock'lu. Var olmayan bir modulu mock'lamak, paketin
// bagimlilik listesinde tutulmasini hakli gosteren tek referanstiydi (~ikon
// fontlari + JS ile APK'da olu yuk). Paket kaldirildi, mock da kaldirildi.
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

describe('SettingRow Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export SettingRow component', () => {
    const { SettingRow } = require('../../../components/settings/SettingRow');
    expect(SettingRow).toBeDefined();
    expect(typeof SettingRow).toBe('function');
  });

  it('should export SettingIcon component', () => {
    const { SettingIcon } = require('../../../components/settings/SettingIcon');
    expect(SettingIcon).toBeDefined();
    expect(typeof SettingIcon).toBe('function');
  });

  it('should export SettingsSection component', () => {
    const { SettingsSection } = require('../../../components/settings/SettingsSection');
    expect(SettingsSection).toBeDefined();
    expect(typeof SettingsSection).toBe('function');
  });

  it('should create styles function', () => {
    const { createSettingsStyles } = require('../../../components/settings/styles');
    const mockColors = {
      primary: '#4ECDC4',
      text: '#1A1A2E',
      textMuted: '#999999',
      border: '#E0E0E0',
      divider: '#F0F0F0',
      card: '#FFFFFF',
      background: '#F8F9FA',
      textSecondary: '#666666',
    };

    const styles = createSettingsStyles(mockColors, false);

    expect(styles.container).toBeDefined();
    expect(styles.section).toBeDefined();
    expect(styles.settingRow).toBeDefined();
    expect(styles.pickerContainer).toBeDefined();
  });

  it('should export types', () => {
    const types = require('../../../components/settings/types');
    expect(types).toBeDefined();
  });
});
