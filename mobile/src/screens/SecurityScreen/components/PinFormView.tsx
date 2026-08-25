/**
 * PinFormView — 2026 Modern PIN Oluşturma & Değiştirme Formu
 *
 * 2026 Sağlık & Güvenlik UI Standartları:
 * - Tek, ferah ve güvenli başlık (Double-header çakışması yok)
 * - 6 Haneli interaktif basamak kutucukları (Pill Boxes [ ● ][ ● ][ ● ][ · ][ · ][ · ])
 * - Aktif basamak odaklanma efekti (Teal Glow)
 * - Canlı PIN güç analizi ve anlık eşleşme rozetleri (Real-time Validation)
 * - Göz (Göster/Gizle) ergonomisi
 * - Büyük, erişilebilir dokunmatik butonlar (WCAG AAA)
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { PinMode } from '../hooks/useSecurityController';
import type { ThemeColors } from '../../../contexts/ThemeContext';
import { withAlpha, ALPHA } from '../../../utils/colors';

const WEAK_PINS = [
  '123456',
  '654321',
  '000000',
  '111111',
  '222222',
  '333333',
  '444444',
  '555555',
  '666666',
  '777777',
  '888888',
  '999999',
  '123123',
  '121212',
];

interface PinFormViewProps {
  pinMode: PinMode;
  onBack: () => void;
  pin: string;
  onChangePin: (text: string) => void;
  confirmPin: string;
  onChangeConfirmPin: (text: string) => void;
  oldPin: string;
  onChangeOldPin: (text: string) => void;
  showPin: boolean;
  onToggleShowPin: () => void;
  hasPin: boolean;
  onSave: () => void;
  onRemovePin: () => void;
  colors: ThemeColors;
  language: string;
}

interface PinDigitRowProps {
  value: string;
  onChangeText: (text: string) => void;
  showPin: boolean;
  colors: ThemeColors;
  isFocused: boolean;
  onFocus: () => void;
}

function PinDigitRow({
  value,
  onChangeText,
  showPin,
  colors,
  isFocused,
  onFocus,
}: PinDigitRowProps) {
  const inputRef = useRef<TextInput>(null);

  const handleBoxPress = () => {
    onFocus();
    inputRef.current?.focus();
  };

  const digits = Array.from({ length: 6 }, (_, index) => {
    const char = value[index];
    const isCurrentActive = isFocused && index === value.length;
    const isFilled = Boolean(char);

    return (
      <View
        key={index}
        style={[
          styles.digitBox,
          {
            backgroundColor: isFilled ? withAlpha(colors.primary, 0.08) : colors.inputBackground,
            borderColor: isCurrentActive
              ? colors.primary
              : isFilled
                ? withAlpha(colors.primary, 0.4)
                : withAlpha(colors.text, 0.15),
          },
          isCurrentActive && {
            borderWidth: 2,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.35,
            shadowRadius: 6,
            elevation: 3,
          },
        ]}
      >
        {isFilled ? (
          showPin ? (
            <Text style={[styles.digitText, { color: colors.text }]}>{char}</Text>
          ) : (
            <View style={[styles.bulletDot, { backgroundColor: colors.primary }]} />
          )
        ) : isCurrentActive ? (
          <View style={[styles.cursorBar, { backgroundColor: colors.primary }]} />
        ) : null}
      </View>
    );
  });

  return (
    <TouchableOpacity activeOpacity={1} onPress={handleBoxPress} style={styles.digitRowContainer}>
      <View style={styles.digitRow}>{digits}</View>
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={text => {
          const clean = text.replace(/[^0-9]/g, '').slice(0, 6);
          onChangeText(clean);
        }}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus={isFocused}
        onFocus={onFocus}
        caretHidden
      />
    </TouchableOpacity>
  );
}

export function PinFormView({
  pinMode,
  onBack,
  pin,
  onChangePin,
  confirmPin,
  onChangeConfirmPin,
  oldPin,
  onChangeOldPin,
  showPin,
  onToggleShowPin,
  hasPin,
  onSave,
  onRemovePin,
  colors,
  language,
}: PinFormViewProps) {
  const isTr = language === 'tr';
  const [activeField, setActiveField] = useState<'old' | 'pin' | 'confirm'>(
    pinMode === 'change' ? 'old' : 'pin'
  );

  const isWeak = WEAK_PINS.includes(pin);
  const isPinComplete = pin.length === 6;
  const isConfirmComplete = confirmPin.length === 6;
  const isMatch = isPinComplete && isConfirmComplete && pin === confirmPin;
  const isMismatch = isConfirmComplete && pin !== confirmPin;
  const isOldPinValid = pinMode !== 'change' || oldPin.length === 6;

  const canSave = isPinComplete && isMatch && !isWeak && isOldPinValid;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* 1. Üst Başlık Çubuğu */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backButton, { backgroundColor: colors.card }]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Geri Dön"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleGroup}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {pinMode === 'create'
              ? isTr
                ? '6 Haneli PIN Belirleyin'
                : 'Set 6-Digit PIN'
              : isTr
                ? 'PIN Kodunu Değiştirin'
                : 'Change PIN Code'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {isTr
              ? 'Sağlık verilerinizi ve uygulama açılışını korumak için kullanılır.'
              : 'Protects your health data and locks the app.'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 2. PIN Giriş Kartı */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: withAlpha(colors.text, ALPHA.veil),
            },
          ]}
        >
          {/* Göster / Gizle Butonu */}
          <View style={styles.cardTopRow}>
            <View style={styles.shieldBadge}>
              <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
              <Text style={[styles.shieldBadgeText, { color: colors.primary }]}>
                {isTr ? 'Uçtan Uca Şifreli' : 'Encrypted'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.toggleShowButton, { backgroundColor: colors.inputBackground }]}
              onPress={onToggleShowPin}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showPin ? 'eye-off-outline' : 'eye-outline'}
                size={16}
                color={colors.primary}
              />
              <Text style={[styles.toggleShowText, { color: colors.primary }]}>
                {showPin ? (isTr ? 'Gizle' : 'Hide') : isTr ? 'Göster' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* A) MEVCUT PIN (Sadece Değiştir Modunda) */}
          {pinMode === 'change' && (
            <View style={styles.fieldSection}>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                  {isTr ? 'Mevcut PIN' : 'Current PIN'}
                </Text>
                <Text style={[styles.counterText, { color: colors.textSecondary }]}>
                  {oldPin.length}/6
                </Text>
              </View>
              <PinDigitRow
                value={oldPin}
                onChangeText={onChangeOldPin}
                showPin={showPin}
                colors={colors}
                isFocused={activeField === 'old'}
                onFocus={() => setActiveField('old')}
              />
            </View>
          )}

          {/* B) YENİ PIN */}
          <View style={styles.fieldSection}>
            <View style={styles.labelRow}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                {pinMode === 'change'
                  ? isTr
                    ? 'Yeni PIN'
                    : 'New PIN'
                  : isTr
                    ? 'Güvenlik PIN’i'
                    : 'Security PIN'}
              </Text>
              <Text style={[styles.counterText, { color: colors.textSecondary }]}>
                {pin.length}/6
              </Text>
            </View>
            <PinDigitRow
              value={pin}
              onChangeText={onChangePin}
              showPin={showPin}
              colors={colors}
              isFocused={activeField === 'pin'}
              onFocus={() => setActiveField('pin')}
            />

            {/* PIN Güç Bildirimi */}
            {isPinComplete && (
              <View
                style={[
                  styles.badgeRow,
                  {
                    backgroundColor: isWeak
                      ? withAlpha(colors.error || '#EF4444', 0.12)
                      : withAlpha(colors.success || '#10B981', 0.12),
                  },
                ]}
              >
                <Ionicons
                  name={isWeak ? 'alert-circle' : 'checkmark-circle'}
                  size={16}
                  color={isWeak ? colors.error || '#EF4444' : colors.success || '#10B981'}
                />
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color: isWeak ? colors.error || '#EF4444' : colors.success || '#10B981',
                    },
                  ]}
                >
                  {isWeak
                    ? isTr
                      ? 'Zayıf PIN: 123456 gibi ardışık veya aynı rakamları seçmeyin.'
                      : 'Weak PIN: Avoid sequential or repeated numbers.'
                    : isTr
                      ? 'Güçlü ve Güvenli PIN'
                      : 'Strong and Secure PIN'}
                </Text>
              </View>
            )}
          </View>

          {/* C) PIN TEKRAR */}
          <View style={styles.fieldSection}>
            <View style={styles.labelRow}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                {isTr ? 'PIN Tekrar (Doğrulama)' : 'Confirm PIN'}
              </Text>
              <Text style={[styles.counterText, { color: colors.textSecondary }]}>
                {confirmPin.length}/6
              </Text>
            </View>
            <PinDigitRow
              value={confirmPin}
              onChangeText={onChangeConfirmPin}
              showPin={showPin}
              colors={colors}
              isFocused={activeField === 'confirm'}
              onFocus={() => setActiveField('confirm')}
            />

            {/* PIN Eşleşme Bildirimi */}
            {confirmPin.length > 0 && (
              <View
                style={[
                  styles.badgeRow,
                  {
                    backgroundColor: isMatch
                      ? withAlpha(colors.success || '#10B981', 0.12)
                      : isMismatch
                        ? withAlpha(colors.error || '#EF4444', 0.12)
                        : withAlpha(colors.primary, 0.08),
                  },
                ]}
              >
                <Ionicons
                  name={
                    isMatch
                      ? 'checkmark-done-circle'
                      : isMismatch
                        ? 'close-circle'
                        : 'ellipsis-horizontal-circle'
                  }
                  size={16}
                  color={
                    isMatch
                      ? colors.success || '#10B981'
                      : isMismatch
                        ? colors.error || '#EF4444'
                        : colors.primary
                  }
                />
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color: isMatch
                        ? colors.success || '#10B981'
                        : isMismatch
                          ? colors.error || '#EF4444'
                          : colors.primary,
                    },
                  ]}
                >
                  {isMatch
                    ? isTr
                      ? 'PIN kodları eşleşti ✅'
                      : 'PIN codes match ✅'
                    : isMismatch
                      ? isTr
                        ? 'PIN kodları birbiriyle uyuşmuyor ❌'
                        : 'PIN codes do not match ❌'
                      : isTr
                        ? 'PIN kodunu tekrar yazın...'
                        : 'Re-enter PIN code...'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* 3. Kaydet & Onayla Butonu */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            {
              backgroundColor: canSave ? colors.primary : withAlpha(colors.primary, 0.4),
              shadowColor: colors.primary,
            },
          ]}
          onPress={onSave}
          disabled={!canSave}
          activeOpacity={0.8}
        >
          <Ionicons name="lock-closed" size={20} color="#FFFFFF" style={styles.buttonIcon} />
          <Text style={styles.saveButtonText}>
            {pinMode === 'create'
              ? isTr
                ? 'PIN’i Kaydet ve Kilidi Aç'
                : 'Save PIN & Enable Lock'
              : isTr
                ? 'Yeni PIN’i Güncelle'
                : 'Update PIN Code'}
          </Text>
        </TouchableOpacity>

        {/* 4. PIN Kaldırma Butonu (Varsa) */}
        {hasPin && pinMode !== 'create' && (
          <TouchableOpacity
            style={[
              styles.removeButton,
              {
                borderColor: withAlpha(colors.error || '#EF4444', 0.4),
                backgroundColor: withAlpha(colors.error || '#EF4444', 0.06),
              },
            ]}
            onPress={onRemovePin}
            activeOpacity={0.7}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={colors.error || '#EF4444'}
              style={styles.buttonIcon}
            />
            <Text style={[styles.removeButtonText, { color: colors.error || '#EF4444' }]}>
              {isTr ? 'PIN Korumasını Kaldır' : 'Remove PIN Protection'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12.5,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  shieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shieldBadgeText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  toggleShowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  toggleShowText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  fieldSection: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  counterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  digitRowContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  digitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  digitBox: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitText: {
    fontSize: 22,
    fontWeight: '700',
  },
  bulletDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  cursorBar: {
    width: 2,
    height: 22,
    borderRadius: 1,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '700',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
