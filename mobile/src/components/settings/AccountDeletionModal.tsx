/**
 * Hesap ve veri silme onay ekranı.
 *
 * Tasarım kararları ve gerekçeleri:
 *
 * - **Neyin silineceği kalem kalem yazılı** (`DELETED_DATA_ITEMS`). KVKK
 *   aydınlatma yükümlülüğü somutluk istiyor; "tüm verileriniz" yeterli değil.
 * - **Onay kelimesi elle yazılıyor.** İki dokunuşluk bir "Emin misiniz?"
 *   diyaloğu bir ilaç uygulamasında yeterli değil: kullanıcı okumadan
 *   onaylıyor. Yazma eylemi okumaya zorluyor.
 * - **Yıkıcı düğme SAĞDA ve pasif başlıyor.** Onay kelimesi doğru yazılana
 *   kadar gerçekten `disabled` — v1.7.7'de "görünen ama basılabilen"
 *   düğmelerin yol açtığı hatayı tekrarlamamak için `accessibilityState` de
 *   ayarlanıyor.
 * - **Vazgeç düğmesi her zaman erişilebilir**, silme sürerken bile devre dışı
 *   bırakılmıyor mu? Bırakılıyor: silme başladıktan sonra iptal etmek
 *   mümkün değil ve iptal edilebilirmiş gibi görünen bir düğme yalan olurdu.
 */

import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { DELETED_DATA_ITEMS, DELETION_CONFIRMATION_WORD } from '../../domain/accountDeletion';
import { MIN_FONT_SIZE } from '../../theme/a11y';
import type { AccountDeletionPhase } from '../../hooks/useAccountDeletion';

interface AccountDeletionModalProps {
  visible: boolean;
  phase: AccountDeletionPhase;
  errorMessage: string | null;
  confirmationInput: string;
  canDelete: boolean;
  onChangeConfirmation: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AccountDeletionModal: React.FC<AccountDeletionModalProps> = ({
  visible,
  phase,
  errorMessage,
  confirmationInput,
  canDelete,
  onChangeConfirmation,
  onConfirm,
  onCancel,
}) => {
  // Gizliyken hicbir sey kurulmuyor. Iki gerekce:
  // 1. React Native `Modal`, `visible={false}` iken bile cocuklarini MONTE
  //    ediyor; yani gorunmeyen bir onay ekrani her Ayarlar render'inda
  //    bosuna kuruluyordu.
  // 2. Yalnizca bu yuzden SettingsScreen testi kirildi: gizli modal
  //    `useTheme()` cagiriyor ve o testte ThemeProvider yok.
  // Erken cikis hook'lardan ONCE geliyor; bilerek, cunku bilesen ya tamamen
  // kurulur ya hic kurulmaz — kosullu hook sorunu olusmuyor.
  if (!visible) return null;

  return (
    <AccountDeletionSheet
      {...{
        phase,
        errorMessage,
        confirmationInput,
        canDelete,
        onChangeConfirmation,
        onConfirm,
        onCancel,
      }}
    />
  );
};

type SheetProps = Omit<AccountDeletionModalProps, 'visible'>;

const AccountDeletionSheet: React.FC<SheetProps> = ({
  phase,
  errorMessage,
  confirmationInput,
  canDelete,
  onChangeConfirmation,
  onConfirm,
  onCancel,
}) => {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();

  const isTr = language === 'tr';
  const isDeleting = phase === 'deleting';
  const word = DELETION_CONFIRMATION_WORD[isTr ? 'tr' : 'en'];
  const items = DELETED_DATA_ITEMS[isTr ? 'tr' : 'en'];
  const danger = colors.error || '#DC2626';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
          <View style={styles.header}>
            <Ionicons name="warning-outline" size={28} color={danger} />
            <Text style={[styles.title, { color: colors.text }]}>
              {isTr ? 'Hesabımı ve Verilerimi Sil' : 'Delete My Account and Data'}
            </Text>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            <Text style={[styles.lead, { color: colors.text }]}>
              {isTr
                ? 'Bu işlem GERİ ALINAMAZ. Silinen veriler bulut yedeğinden kurtarılamaz.'
                : 'This CANNOT be undone. Deleted data cannot be recovered from any backup.'}
            </Text>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary || colors.text }]}>
              {isTr ? 'Silinecekler:' : 'What will be deleted:'}
            </Text>

            {items.map(item => (
              <View key={item} style={styles.itemRow}>
                <Ionicons name="close-circle-outline" size={18} color={danger} />
                <Text style={[styles.itemText, { color: colors.text }]}>{item}</Text>
              </View>
            ))}

            <Text style={[styles.sectionLabel, { color: colors.textSecondary || colors.text }]}>
              {isTr ? `Onaylamak için aşağıya ${word} yazın:` : `Type ${word} below to confirm:`}
            </Text>

            <TextInput
              value={confirmationInput}
              onChangeText={onChangeConfirmation}
              editable={!isDeleting}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={word}
              placeholderTextColor={colors.textSecondary || '#9CA3AF'}
              accessibilityLabel={isTr ? `Onay kelimesi: ${word}` : `Confirmation word: ${word}`}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: canDelete ? danger : colors.border || '#D1D5DB',
                  backgroundColor: isDark ? '#111827' : '#F9FAFB',
                },
              ]}
            />

            {errorMessage ? (
              <Text style={[styles.error, { color: danger }]}>{errorMessage}</Text>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={onCancel}
              disabled={isDeleting}
              accessibilityRole="button"
              accessibilityState={{ disabled: isDeleting }}
              style={[styles.button, styles.cancelButton, isDeleting && styles.buttonDisabled]}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>
                {isTr ? 'Vazgeç' : 'Cancel'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              disabled={!canDelete || isDeleting}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canDelete || isDeleting }}
              style={[
                styles.button,
                { backgroundColor: danger },
                (!canDelete || isDeleting) && styles.buttonDisabled,
              ]}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={[styles.buttonText, styles.dangerText]}>
                  {isTr ? 'Kalıcı Olarak Sil' : 'Delete Permanently'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  sheet: {
    borderRadius: 20,
    paddingTop: 20,
    paddingBottom: 16,
    maxHeight: '86%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 19,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: 20,
  },
  bodyContent: {
    paddingBottom: 8,
  },
  lead: {
    fontSize: MIN_FONT_SIZE + 1,
    lineHeight: 21,
    fontWeight: '600',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: MIN_FONT_SIZE,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  itemText: {
    flex: 1,
    fontSize: MIN_FONT_SIZE,
    lineHeight: 20,
  },
  input: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 14,
    // Sabit `height` YOK: sistem yazi olcegi buyudugunde kirpmasin.
    minHeight: 52,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
  },
  error: {
    fontSize: MIN_FONT_SIZE,
    lineHeight: 20,
    marginTop: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#9CA3AF',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    fontSize: MIN_FONT_SIZE + 1,
    fontWeight: '700',
  },
  dangerText: {
    color: '#FFFFFF',
  },
});
