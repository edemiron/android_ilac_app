/**
 * CaregiverEnterCodeCard — Bakıcı Davet Kodu Girme ve QR Tarama Kartı
 *
 * 2026 Modern Bakıcı Bağlantı Arayüzü:
 * - 6 haneli davet kodu girişi (Büyük harf, otomatik formatlama)
 * - QR Kod Tarama entegrasyonu
 * - Anında doğrulama ve hasta takip çemberine bağlanma
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface CaregiverEnterCodeCardProps {
  code: string;
  onChangeCode: (text: string) => void;
  onSubmitCode: () => void;
  onScanQR: () => void;
  isLoading: boolean;
  colors: ThemeColors;
  isDark: boolean;
  language: string;
}

export function CaregiverEnterCodeCard({
  code,
  onChangeCode,
  onSubmitCode,
  onScanQR,
  isLoading,
  colors,
  isDark,
  language,
}: CaregiverEnterCodeCardProps) {
  const isTr = language === 'tr';
  const isValidLength = code.trim().length === 6;
  const isEnabled = isValidLength && !isLoading;

  const handleTextChange = (text: string) => {
    // Sadece alfanümerik büyük harf, max 6 karakter
    const clean = text
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
    onChangeCode(clean);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {isTr ? '🔑 Bir Yakınınızın Takibine Katılın' : '🔑 Connect to a Loved One'}
      </Text>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            shadowColor: colors.shadow,
          },
        ]}
      >
        {/* Açıklama */}
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
          {isTr
            ? 'Takip etmek istediğiniz hastanın paylaştığı 6 haneli davet kodunu girin veya QR kodunu taratın.'
            : 'Enter the 6-character invite code or scan the QR code shared by the patient.'}
        </Text>

        {/* Kod Giriş Satırı */}
        <View
          style={[
            styles.inputRow,
            {
              backgroundColor: colors.inputBackground,
              borderColor:
                code.length === 6
                  ? colors.primary
                  : isDark
                    ? 'rgba(255, 255, 255, 0.12)'
                    : '#E2E8F0',
            },
          ]}
        >
          <Ionicons
            name="key-outline"
            size={22}
            color={code.length === 6 ? colors.primary : colors.textSecondary}
            style={styles.inputIcon}
          />
          <TextInput
            style={[
              styles.codeInput,
              {
                color: colors.text,
              },
            ]}
            placeholder={isTr ? 'Örn: 53DD4F' : 'Ex: 53DD4F'}
            placeholderTextColor={colors.textSecondary}
            value={code}
            onChangeText={handleTextChange}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            returnKeyType="done"
            onSubmitEditing={isValidLength ? onSubmitCode : undefined}
          />
          {code.length > 0 && (
            <TouchableOpacity
              onPress={() => onChangeCode('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.clearBtn}
            >
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Butonlar Grubu: Bağlan & QR Tara */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: isEnabled
                  ? colors.primary
                  : isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : '#F1F5F9',
                borderWidth: isEnabled ? 0 : 1,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1',
                elevation: isEnabled ? 2 : 0,
              },
            ]}
            onPress={onSubmitCode}
            disabled={!isEnabled}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={19}
                  color={isEnabled ? '#FFFFFF' : isDark ? 'rgba(255, 255, 255, 0.35)' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.submitButtonText,
                    {
                      color: isEnabled
                        ? '#FFFFFF'
                        : isDark
                          ? 'rgba(255, 255, 255, 0.35)'
                          : '#94A3B8',
                    },
                  ]}
                >
                  {isTr ? 'Bağlan ve Takip Et' : 'Connect & Track'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.qrScanButton,
              {
                backgroundColor: isDark ? colors.inputBackground : '#F8FAFC',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1',
              },
            ]}
            onPress={onScanQR}
            activeOpacity={0.7}
          >
            <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
            <Text style={[styles.qrScanButtonText, { color: colors.text }]}>
              {isTr ? 'QR Tara' : 'Scan QR'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Güvenlik & KVKK Rozeti */}
        <View
          style={[
            styles.infoBox,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F0FDF4',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#DCFCE7',
            },
          ]}
        >
          <Ionicons name="shield-checkmark-outline" size={16} color="#16A34A" />
          <Text style={[styles.infoText, { color: isDark ? colors.textSecondary : '#166534' }]}>
            {isTr
              ? 'Bağlantı kurulduğunda hastanın izin verdiği ölçüde (Takvim, Geçmiş, Doz Bildirimleri) sağlık verilerini canlı izleyebilirsiniz.'
              : 'Once linked, you will receive real-time updates and adherence logs as permitted by the patient.'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  card: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  codeInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 3,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    gap: 8,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '700',
    backgroundColor: 'transparent',
    letterSpacing: -0.1,
  },
  qrScanButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  qrScanButtonText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
});
