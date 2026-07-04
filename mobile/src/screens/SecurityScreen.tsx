import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useMedicineStore } from '../stores/medicineStore';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  checkBiometricAvailability,
  authenticateWithBiometrics,
  savePin,
  verifyPin,
  clearPin,
  isValidPin,
  isPinSet,
  saveSecuritySettings,
  getBiometricTypeName,
} from '../utils/security';
import { createScopedLogger } from '../utils/logger';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { triggerHaptic } from './SecurityScreen/helpers';

const log = createScopedLogger('SecurityScreen');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

import { ViewStyle } from 'react-native';

// Kart bileşeni
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

const Card: React.FC<CardProps> = ({ children, style }) => {
  // eslint-disable-next-line unused-imports/no-unused-vars
  const { colors, isDark } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: isDark ? '#16213E' : '#fff' }, style]}>
      {children}
    </View>
  );
};

// Ayar satırı bileşeni
interface SettingRowProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: React.ReactNode;
  onPress?: () => void;
  showArrow?: boolean;
  isFirst?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({
  icon,
  iconColor = '#4ECDC4',
  title,
  subtitle,
  value,
  onPress,
  showArrow = false,
  isFirst = false,
}) => {
  // eslint-disable-next-line unused-imports/no-unused-vars
  const { colors, isDark } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.settingRow,
        !isFirst && styles.settingRowBorder,
        { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: isDark ? '#fff' : '#1a1a1a' }]}>{title}</Text>
        {subtitle && (
          <Text
            style={[styles.settingSubtitle, { color: isDark ? 'rgba(255,255,255,0.6)' : '#666' }]}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {value && <View style={styles.valueContainer}>{value}</View>}
      {showArrow && (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={isDark ? 'rgba(255,255,255,0.4)' : '#999'}
        />
      )}
    </TouchableOpacity>
  );
};

export default function SecurityScreen() {
  // eslint-disable-next-line unused-imports/no-unused-vars
  const navigation = useNavigation<NavigationProp>();
  // eslint-disable-next-line unused-imports/no-unused-vars
  const { t, language } = useLanguage();
  const { colors, isDark } = useTheme();
  const { settings, updateSettings } = useMedicineStore();

  const [isLoading, setIsLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('');
  const [pinMode, setPinMode] = useState<'none' | 'create' | 'verify' | 'change'>('none');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [hasPin, setHasPin] = useState(false);

  useEffect(() => {
    loadSecurityStatus();
  }, []);

  const loadSecurityStatus = async () => {
    setIsLoading(true);
    try {
      const bioAvail = await checkBiometricAvailability();
      setBiometricAvailable(bioAvail.available);
      if (bioAvail.available && bioAvail.biometricsType.length > 0) {
        setBiometricType(getBiometricTypeName(bioAvail.biometricsType));
      }
      const pinSet = await isPinSet();
      setHasPin(pinSet);
    } catch (error) {
      log.error('Güvenlik durumu yükleme hatası', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSecurity = useCallback(
    async (enabled: boolean) => {
      if (enabled && !hasPin && !biometricAvailable) {
        Alert.alert(
          language === 'tr' ? 'Güvenlik Yöntemi Gerekli' : 'Security Method Required',
          language === 'tr'
            ? 'Güvenliği aktif etmek için PIN veya biyometrik kimlik doğrulama ayarlamalısınız.'
            : 'You need to set up PIN or biometric authentication to enable security.'
        );
        return;
      }
      updateSettings({ securityEnabled: enabled });
      await saveSecuritySettings({
        securityEnabled: enabled,
        securityType: settings.securityType,
        biometricsEnabled: settings.biometricsEnabled,
        lockTimeout: settings.lockTimeout,
      });
      triggerHaptic(enabled ? 'success' : 'light');
    },
    [hasPin, biometricAvailable, settings, language]
  );

  const handleToggleBiometric = useCallback(
    async (enabled: boolean) => {
      if (enabled && !biometricAvailable) {
        Alert.alert(
          language === 'tr' ? 'Biyometrik Kullanılamıyor' : 'Biometric Unavailable',
          language === 'tr'
            ? 'Cihazınız biyometrik kimlik doğrulamayı desteklemiyor.'
            : 'Your device does not support biometric authentication.'
        );
        return;
      }

      if (enabled) {
        const result = await authenticateWithBiometrics();
        if (!result.success) return;
      }

      updateSettings({
        biometricsEnabled: enabled,
        securityType: enabled ? (hasPin ? 'both' : 'biometric') : hasPin ? 'pin' : 'none',
      });
      await saveSecuritySettings({
        securityEnabled: settings.securityEnabled,
        securityType: enabled ? (hasPin ? 'both' : 'biometric') : hasPin ? 'pin' : 'none',
        biometricsEnabled: enabled,
        lockTimeout: settings.lockTimeout,
      });
      triggerHaptic(enabled ? 'success' : 'light');
    },
    [biometricAvailable, hasPin, settings, language]
  );

  const handleCreatePin = async () => {
    if (!isValidPin(pin)) {
      Alert.alert(
        language === 'tr' ? 'Geçersiz PIN' : 'Invalid PIN',
        language === 'tr' ? 'PIN 4-6 haneli olmalı.' : 'PIN must be 4-6 digits.'
      );
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert(
        language === 'tr' ? 'PIN Eşleşmiyor' : 'PIN Mismatch',
        language === 'tr' ? "PIN'ler birbiriyle eşleşmiyor." : 'PINs do not match.'
      );
      return;
    }

    // Zayıf PIN kontrolü
    const weakPins = [
      '1234',
      '1111',
      '0000',
      '1212',
      '7777',
      '1004',
      '2000',
      '4444',
      '2222',
      '3333',
      '5555',
      '6666',
      '8888',
      '9999',
      '123456',
      '654321',
    ];
    if (weakPins.includes(pin)) {
      Alert.alert(
        language === 'tr' ? 'Zayıf PIN' : 'Weak PIN',
        language === 'tr'
          ? 'Bu PIN çok yaygın kullanılıyor. Lütfen daha güvenli bir PIN seçin.'
          : 'This PIN is too common. Please choose a more secure PIN.'
      );
      return;
    }

    const saved = await savePin(pin);
    if (saved) {
      setHasPin(true);
      setPinMode('none');
      setPin('');
      setConfirmPin('');
      updateSettings({
        securityType: settings.biometricsEnabled ? 'both' : 'pin',
        securityEnabled: true,
      });
      triggerHaptic('success');
    } else {
      Alert.alert(
        language === 'tr' ? 'Hata' : 'Error',
        language === 'tr' ? 'PIN kaydedilemedi.' : 'Failed to save PIN.'
      );
    }
  };

  const handleChangePin = async () => {
    const verifyResult = await verifyPin(oldPin);
    if (!verifyResult.success) {
      Alert.alert(
        language === 'tr' ? 'Yanlış PIN' : 'Incorrect PIN',
        verifyResult.error || (language === 'tr' ? 'Mevcut PIN hatalı' : 'Current PIN is incorrect')
      );
      triggerHaptic('error');
      return;
    }
    if (!isValidPin(pin)) {
      Alert.alert(language === 'tr' ? 'Geçersiz PIN' : 'Invalid PIN');
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert(language === 'tr' ? 'PIN Eşleşmiyor' : 'PIN Mismatch');
      return;
    }

    // Zayıf PIN kontrolü
    const weakPins = [
      '1234',
      '1111',
      '0000',
      '1212',
      '7777',
      '1004',
      '2000',
      '4444',
      '2222',
      '3333',
      '5555',
      '6666',
      '8888',
      '9999',
      '123456',
      '654321',
    ];
    if (weakPins.includes(pin)) {
      Alert.alert(
        language === 'tr' ? 'Zayıf PIN' : 'Weak PIN',
        language === 'tr'
          ? 'Bu PIN çok yaygın kullanılıyor. Lütfen daha güvenli bir PIN seçin.'
          : 'This PIN is too common. Please choose a more secure PIN.'
      );
      return;
    }

    if (await savePin(pin)) {
      setPinMode('none');
      setPin('');
      setConfirmPin('');
      setOldPin('');
      triggerHaptic('success');
    }
  };

  const handleClearPin = () => {
    Alert.alert(
      language === 'tr' ? 'PIN Sil' : 'Remove PIN',
      language === 'tr' ? "PIN'i silmek istediğinize emin misiniz?" : 'Are you sure?',
      [
        { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
        {
          text: language === 'tr' ? 'Sil' : 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (await clearPin()) {
              setHasPin(false);
              updateSettings({
                securityType: settings.biometricsEnabled ? 'biometric' : 'none',
                securityEnabled: settings.biometricsEnabled,
              });
              triggerHaptic('success');
            }
          },
        },
      ]
    );
  };

  const handleTimeoutChange = async (timeout: number) => {
    updateSettings({ lockTimeout: timeout });
    await saveSecuritySettings({
      securityEnabled: settings.securityEnabled,
      securityType: settings.securityType,
      biometricsEnabled: settings.biometricsEnabled,
      lockTimeout: timeout,
    });
    triggerHaptic('light');
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#1A1A2E' : '#f5f5f5' }]}>
        <Text style={{ color: isDark ? '#fff' : '#333', marginTop: 100 }}>
          {language === 'tr' ? 'Yükleniyor...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  // PIN modu aktifse PIN ekranını göster
  if (pinMode !== 'none') {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#1A1A2E' : '#f5f5f5' }]}>
        <View style={styles.pinHeader}>
          <TouchableOpacity onPress={() => setPinMode('none')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#333'} />
          </TouchableOpacity>
          <Text style={[styles.pinTitle, { color: isDark ? '#fff' : '#333' }]}>
            {pinMode === 'create' && (language === 'tr' ? '🔢 PIN Ayarla' : '🔢 Set PIN')}
            {pinMode === 'change' && (language === 'tr' ? '🔢 PIN Değiştir' : '🔢 Change PIN')}
          </Text>
        </View>

        <Card style={styles.pinCard}>
          {pinMode === 'change' && (
            <View style={styles.pinInputContainer}>
              <Text style={[styles.pinLabel, { color: isDark ? '#fff' : '#333' }]}>
                {language === 'tr' ? 'Mevcut PIN' : 'Current PIN'}
              </Text>
              <TextInput
                style={[
                  styles.pinInput,
                  {
                    backgroundColor: isDark ? '#1A1A2E' : '#f0f0f0',
                    color: isDark ? '#fff' : '#333',
                  },
                ]}
                value={oldPin}
                onChangeText={t => setOldPin(t.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                secureTextEntry={!showPin}
                maxLength={6}
                placeholderTextColor="#999"
              />
            </View>
          )}

          <View style={styles.pinInputContainer}>
            <Text style={[styles.pinLabel, { color: isDark ? '#fff' : '#333' }]}>
              {pinMode === 'change'
                ? language === 'tr'
                  ? 'Yeni PIN'
                  : 'New PIN'
                : language === 'tr'
                  ? 'PIN'
                  : 'PIN'}
            </Text>
            <TextInput
              style={[
                styles.pinInput,
                {
                  backgroundColor: isDark ? '#1A1A2E' : '#f0f0f0',
                  color: isDark ? '#fff' : '#333',
                },
              ]}
              value={pin}
              onChangeText={t => setPin(t.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              secureTextEntry={!showPin}
              maxLength={6}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.pinInputContainer}>
            <Text style={[styles.pinLabel, { color: isDark ? '#fff' : '#333' }]}>
              {language === 'tr' ? 'PIN Tekrar' : 'Confirm PIN'}
            </Text>
            <TextInput
              style={[
                styles.pinInput,
                {
                  backgroundColor: isDark ? '#1A1A2E' : '#f0f0f0',
                  color: isDark ? '#fff' : '#333',
                },
              ]}
              value={confirmPin}
              onChangeText={t => setConfirmPin(t.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              secureTextEntry={!showPin}
              maxLength={6}
              placeholderTextColor="#999"
            />
          </View>

          <TouchableOpacity style={styles.showPinButton} onPress={() => setShowPin(!showPin)}>
            <Text style={{ color: colors.primary }}>
              {showPin
                ? language === 'tr'
                  ? '🙈 Gizle'
                  : '🙈 Hide'
                : language === 'tr'
                  ? '👁️ Göster'
                  : '👁️ Show'}
            </Text>
          </TouchableOpacity>
        </Card>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={pinMode === 'create' ? handleCreatePin : handleChangePin}
        >
          <Text style={styles.saveButtonText}>{language === 'tr' ? 'Kaydet' : 'Save'}</Text>
        </TouchableOpacity>

        {hasPin && pinMode !== 'create' && (
          <TouchableOpacity
            style={[styles.removeButton, { borderColor: colors.error }]}
            onPress={handleClearPin}
          >
            <Text style={{ color: colors.error }}>
              {language === 'tr' ? '🗑️ PIN Kaldır' : '🗑️ Remove PIN'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? '#1A1A2E' : '#f5f5f5' }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerEmoji]}>🔒</Text>
        <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#333' }]}>
          {language === 'tr' ? 'Güvenlik' : 'Security'}
        </Text>
        <Text style={[styles.headerSubtitle, { color: isDark ? 'rgba(255,255,255,0.6)' : '#666' }]}>
          {language === 'tr'
            ? 'Uygulama güvenliğini ve kilitleme ayarlarını yönetin'
            : 'Manage app security and lock settings'}
        </Text>
      </View>

      {/* Güvenlik Aktif */}
      <Card>
        <SettingRow
          icon="shield-checkmark"
          iconColor="#4ECDC4"
          title={language === 'tr' ? 'Güvenlik Aktif' : 'Security Enabled'}
          subtitle={
            language === 'tr'
              ? 'Uygulamayı açarken PIN veya biyometrik doğrulama iste'
              : 'Require authentication to open app'
          }
          value={
            <Switch
              value={settings.securityEnabled}
              onValueChange={handleToggleSecurity}
              trackColor={{ false: '#767577', true: '#4ECDC4' }}
              thumbColor="#fff"
            />
          }
          isFirst={true}
        />
      </Card>

      {/* Biyometrik */}
      {biometricAvailable && (
        <Card style={{ marginTop: 12 }}>
          <SettingRow
            icon="finger-print"
            iconColor="#96CEB4"
            title={biometricType}
            subtitle={
              language === 'tr'
                ? 'Parmak izi veya yüz tanıma ile hızlı erişim'
                : 'Quick access with biometrics'
            }
            value={
              <Switch
                value={settings.biometricsEnabled}
                onValueChange={handleToggleBiometric}
                trackColor={{ false: '#767577', true: '#96CEB4' }}
                thumbColor="#fff"
              />
            }
            isFirst={true}
          />
        </Card>
      )}

      {/* PIN Yönetimi */}
      <Card style={{ marginTop: 12 }}>
        <View
          style={[
            styles.cardHeader,
            { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
          ]}
        >
          <Ionicons name="keypad" size={20} color="#F59E0B" />
          <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#333', marginLeft: 8 }]}>
            {language === 'tr' ? 'PIN Yönetimi' : 'PIN Management'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.pinActionButton, { backgroundColor: isDark ? '#1A1A2E' : '#f0f0f0' }]}
          onPress={() => setPinMode(hasPin ? 'change' : 'create')}
        >
          <Ionicons name="keypad" size={18} color="#4ECDC4" />
          <Text style={[styles.pinActionText, { color: colors.primary, marginLeft: 8 }]}>
            {hasPin
              ? language === 'tr'
                ? 'PIN Değiştir'
                : 'Change PIN'
              : language === 'tr'
                ? 'PIN Ayarla'
                : 'Set PIN'}
          </Text>
        </TouchableOpacity>
      </Card>

      {/* Otomatik Kilit */}
      <Card style={{ marginTop: 12 }}>
        <View
          style={[
            styles.cardHeader,
            { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
          ]}
        >
          <Ionicons name="time" size={20} color="#8B5CF6" />
          <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#333', marginLeft: 8 }]}>
            {language === 'tr' ? 'Otomatik Kilit' : 'Auto-Lock'}
          </Text>
        </View>

        <Text style={[styles.cardSubtitle, { color: isDark ? 'rgba(255,255,255,0.6)' : '#666' }]}>
          {language === 'tr'
            ? 'Uygulama arka planda kaldığında ne kadar sonra kilitlensin'
            : 'Lock after app is in background'}
        </Text>

        <View style={styles.timeoutContainer}>
          // eslint-disable-next-line unused-imports/no-unused-vars
          {[0, 1, 5, 15, 30].map((minutes, index) => (
            <TouchableOpacity
              key={minutes}
              style={[
                styles.timeoutButton,
                settings.lockTimeout === minutes && {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                },
                {
                  backgroundColor:
                    settings.lockTimeout === minutes
                      ? colors.primary
                      : isDark
                        ? '#1A1A2E'
                        : '#f0f0f0',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e0e0e0',
                },
              ]}
              onPress={() => handleTimeoutChange(minutes)}
            >
              <Text
                style={[
                  styles.timeoutButtonText,
                  {
                    color:
                      settings.lockTimeout === minutes
                        ? '#fff'
                        : isDark
                          ? 'rgba(255,255,255,0.7)'
                          : '#666',
                  },
                ]}
              >
                {minutes === 0
                  ? language === 'tr'
                    ? 'Hemen'
                    : 'Now'
                  : `${minutes} ${language === 'tr' ? 'dk' : 'min'}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Güvenlik Durumu */}
      <Card style={{ marginTop: 12, marginBottom: 24 }}>
        <View
          style={[
            styles.cardHeader,
            { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
          ]}
        >
          <Ionicons name="information-circle" size={20} color="#6B7280" />
          <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#333', marginLeft: 8 }]}>
            {language === 'tr' ? 'Güvenlik Durumu' : 'Security Status'}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : '#666' }]}>
            {language === 'tr' ? 'PIN Ayarlı:' : 'PIN Set:'}
          </Text>
          <Text style={[styles.statusValue, { color: hasPin ? '#4ECDC4' : '#FF6B6B' }]}>
            {hasPin
              ? language === 'tr'
                ? '✓ Evet'
                : '✓ Yes'
              : language === 'tr'
                ? '✗ Hayır'
                : '✗ No'}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : '#666' }]}>
            {language === 'tr' ? 'Biyometrik:' : 'Biometric:'}
          </Text>
          <Text style={[styles.statusValue, { color: biometricAvailable ? '#4ECDC4' : '#FF6B6B' }]}>
            {biometricAvailable
              ? language === 'tr'
                ? '✓ Kullanılabilir'
                : '✓ Available'
              : language === 'tr'
                ? '✗ Kullanılamıyor'
                : '✗ Unavailable'}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : '#666' }]}>
            {language === 'tr' ? 'Güvenlik Tipi:' : 'Security Type:'}
          </Text>
          <Text style={[styles.statusValue, { color: isDark ? '#fff' : '#333' }]}>
            {settings.securityType === 'none' && (language === 'tr' ? 'Kapalı' : 'Disabled')}
            {settings.securityType === 'pin' && 'PIN'}
            {settings.securityType === 'biometric' && biometricType}
            {settings.securityType === 'both' &&
              (language === 'tr' ? 'PIN + Biyometrik' : 'PIN + Biometric')}
          </Text>
        </View>
      </Card>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  headerEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingRowBorder: {
    borderTopWidth: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
  },
  valueContainer: {
    marginLeft: 8,
  },
  pinActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  pinActionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  timeoutContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  timeoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 70,
    alignItems: 'center',
  },
  timeoutButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  statusLabel: {
    fontSize: 14,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  // PIN Mode Styles
  pinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  pinTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  pinCard: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
  },
  pinInputContainer: {
    marginBottom: 16,
  },
  pinLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  pinInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    letterSpacing: 8,
    textAlign: 'center',
  },
  showPinButton: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  saveButton: {
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  removeButton: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
});
