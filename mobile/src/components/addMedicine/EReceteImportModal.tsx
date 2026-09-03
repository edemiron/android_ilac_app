/**
 * EReceteImportModal.tsx — Türkiye E-Reçete Hızlı İçe Aktarma Modalı (Sprint 104)
 *
 * Klavye açıldığında otomatik yukarı kayan (keyboard-adaptive), panodan tek dokunuşla
 * yapıştırma destekli ve SGK SMS metinlerini anında ayrıştıran modern modal.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Keyboard,
  Platform,
  Pressable,
  KeyboardEvent,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { parseEReceteInput } from '../../utils/ereceteParser';
import { EReceteData, EReceteItem } from '../../types';
import type { ThemeColors } from '../../contexts/ThemeContext';

interface EReceteImportModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectMedicine: (item: EReceteItem, recipeNo: string) => void;
  colors: ThemeColors;
  language: 'tr' | 'en';
}

export function EReceteImportModal({
  visible,
  onClose,
  onSelectMedicine,
  colors,
  language,
}: EReceteImportModalProps) {
  const [inputText, setInputText] = useState('');
  const [parsedData, setParsedData] = useState<EReceteData | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const onShow = (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
    };
    const onHide = () => {
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      onShow
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      onHide
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleParse = () => {
    if (!inputText.trim()) return;
    const result = parseEReceteInput(inputText);
    setParsedData(result);
    Keyboard.dismiss();
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text && text.trim()) {
        setInputText(text.trim());
        const result = parseEReceteInput(text.trim());
        if (result) {
          setParsedData(result);
        }
      }
    } catch {
      // Panodan okuma hatası sessizce yutulur
    }
  };

  const handleApply = (item: EReceteItem) => {
    onSelectMedicine(item, parsedData?.recipeNo || 'E-RECETE');
    onClose();
    setInputText('');
    setParsedData(null);
  };

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              marginBottom: keyboardHeight > 0 ? keyboardHeight : 0,
            },
          ]}
        >
          {/* Sürükleme Tutamacı */}
          <View style={styles.dragHandle} />

          {/* Başlık ve Kapat Butonu */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.headerIcon}>🇹🇷</Text>
              <Text style={[styles.title, { color: colors.text }]}>
                {language === 'tr' ? 'E-Reçete Hızlı İçe Aktarma' : 'E-Prescription Quick Import'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Kapat"
            >
              <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.subtitleRow}>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {language === 'tr'
                  ? 'Doktorunuzdan gelen SMS metnini veya E-Reçete kodunu yapıştırın:'
                  : 'Paste your prescription SMS text or E-Prescription code:'}
              </Text>
              <TouchableOpacity
                style={[
                  styles.pasteChip,
                  { backgroundColor: colors.primary + '18', borderColor: colors.primary },
                ]}
                onPress={handlePasteFromClipboard}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="clipboard-outline"
                  size={14}
                  color={colors.primary}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.pasteChipText, { color: colors.primary }]}>
                  {language === 'tr' ? 'Panodan Yapıştır' : 'Paste'}
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder={
                language === 'tr'
                  ? 'Örn: Sn. Hasta, 9AB87C nolu reçeteniz: 1. PAROL 500 MG (3x1 Tok)...'
                  : 'e.g. Recipe 9AB87C: 1. PAROL 500 MG (3x1 After meal)...'
              }
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              value={inputText}
              onChangeText={setInputText}
            />

            <TouchableOpacity
              style={[styles.parseButton, { backgroundColor: colors.primary }]}
              onPress={handleParse}
              activeOpacity={0.8}
            >
              <Ionicons name="flash" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.parseButtonText}>
                {language === 'tr' ? 'Reçeteyi Çözümle' : 'Parse Prescription'}
              </Text>
            </TouchableOpacity>

            {/* Ayrıştırılan İlaçlar Listesi */}
            {parsedData && (
              <View style={styles.resultContainer}>
                <View style={styles.recipeBadge}>
                  <Text style={styles.recipeBadgeText}>
                    📋 {language === 'tr' ? 'Reçete No:' : 'Prescription #'} {parsedData.recipeNo}
                  </Text>
                </View>

                {parsedData.medicines.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {language === 'tr'
                      ? 'Reçete kodu algılandı. İlaç adını aratarak devam edebilirsiniz.'
                      : 'Code detected. Search medicine name to continue.'}
                  </Text>
                ) : (
                  parsedData.medicines.map((med, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.medItem,
                        { backgroundColor: colors.background, borderColor: colors.border },
                      ]}
                      onPress={() => handleApply(med)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.medInfo}>
                        <Text style={[styles.medName, { color: colors.text }]}>{med.name}</Text>
                        <Text style={[styles.medDosage, { color: colors.primary }]}>
                          {med.dosage} • Günde {med.frequency} kez
                        </Text>
                      </View>
                      <View style={[styles.applyChip, { backgroundColor: colors.primary }]}>
                        <Text style={styles.applyChipText}>
                          {language === 'tr' ? 'Forma Ekle' : 'Add to Form'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    maxHeight: '85%',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(156, 163, 175, 0.5)',
    alignSelf: 'center',
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  scrollBody: {
    maxHeight: 450,
  },
  scrollContent: {
    paddingBottom: 10,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  pasteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  pasteChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 75,
    maxHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  parseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  parseButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  resultContainer: {
    marginTop: 4,
  },
  recipeBadge: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  recipeBadgeText: {
    color: '#1D4ED8',
    fontWeight: '600',
    fontSize: 12,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 10,
  },
  medItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  medInfo: {
    flex: 1,
    marginRight: 8,
  },
  medName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  medDosage: {
    fontSize: 12,
    fontWeight: '600',
  },
  applyChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  applyChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});
