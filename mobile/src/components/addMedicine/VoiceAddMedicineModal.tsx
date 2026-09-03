/**
 * VoiceAddMedicineModal — Sesli Asistan ile Reçete & İlaç Doldurma Modalı
 *
 * Kullanıcının doğal Türkçe veya İngilizce olarak söylediği
 * reçete kalıplarını (örn: "Günde 2 kez tok karnına Parol 500")
 * analiz ederek form alanlarını otomatik doldurur.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  parseVoiceMedicinePrescription,
  ParsedVoiceMedicine,
} from '../../utils/voiceMedicineParser';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import type { ThemeColors } from '../../contexts/ThemeContext';

interface Props {
  visible: boolean;
  onApplyParsedMedicine: (data: ParsedVoiceMedicine) => void;
  onClose: () => void;
  colors: ThemeColors;
  language: 'tr' | 'en';
}

export function VoiceAddMedicineModal({
  visible,
  onApplyParsedMedicine,
  onClose,
  colors,
  language,
}: Props) {
  const isTr = language === 'tr';
  const [transcript, setTranscript] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedVoiceMedicine | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      ReactNativeHapticFeedback.trigger('impactLight');
      setTranscript('');
      setParsedResult(null);

      // Dalgalanma animasyonu
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible, pulseAnim]);

  const handleProcessText = (text: string) => {
    setTranscript(text);
    if (text.trim().length > 2) {
      const parsed = parseVoiceMedicinePrescription(text);
      setParsedResult(parsed);
    } else {
      setParsedResult(null);
    }
  };

  const handleApply = () => {
    if (parsedResult) {
      ReactNativeHapticFeedback.trigger('notificationSuccess');
      onApplyParsedMedicine(parsedResult);
      onClose();
    }
  };

  const samplePhrases = isTr
    ? [
        'Günde 2 kez tok karnına Parol 500',
        'Sabah akşam yemekten sonra Aspirin 100',
        'Günde bir defa aç karnına Nexium 40 mg',
        'Augmentin 1000 mg kapsül günde 2 defa 10 gün',
      ]
    : [
        'Take 500mg Parol twice daily with food',
        'Aspirin 100 once a day after meal',
        'Augmentin 1000 capsule twice daily for 10 days',
      ];

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          {/* Header */}
          <View style={styles.header}>
            {/*
              v1.7.4 (Faz 0.6): "Sesli asistan" iddiası kaldırıldı.
              Uygulamada konuşma tanıma kütüphanesi YOK; bu modalın tek girişi
              her zaman metin kutusuydu. Mikrofon ikonu + pulse animasyonu +
              "söyleyin" ifadesi kullanıcıya olmayan bir yetenek vaat ediyordu.
              Özellik (doğal cümleyi ayrıştırma) gerçek ve değerli olduğu için
              silinmedi; yalnızca dürüst şekilde adlandırıldı.
            */}
            <Text style={[styles.title, { color: colors.text }]}>
              {isTr ? 'Cümleyle İlaç Ekle' : 'Add Medicine by Sentence'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeIconBtn}
              accessibilityRole="button"
              accessibilityLabel="Kapat"
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Mikrofon ikonu ve pulse animasyonu kaldırıldı (bkz. yukarıdaki not) */}
            <View style={styles.micWrapper}>
              <View style={[styles.micCenter, { backgroundColor: colors.primary }]}>
                <Ionicons name="create-outline" size={36} color="#FFFFFF" />
              </View>
            </View>

            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {isTr
                ? 'İlacınızı, dozunu ve kullanım şeklini doğal bir cümleyle yazın:'
                : 'Type your medicine, dosage, and frequency naturally:'}
            </Text>

            {/* Metin Giriş / Dinleme Alanı */}
            <View
              style={[
                styles.inputBox,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={transcript}
                onChangeText={handleProcessText}
                placeholder={
                  isTr
                    ? 'Örn: Günde 2 kez tok karnına Parol 500'
                    : 'e.g. 500mg Parol twice daily after meal'
                }
                placeholderTextColor={colors.placeholder}
                multiline
              />
            </View>

            {/* Ayrıştırılan Değerlerin Önizlemesi */}
            {parsedResult && (parsedResult.name || parsedResult.frequency) ? (
              <View
                style={[
                  styles.previewBox,
                  { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' },
                ]}
              >
                <Text style={[styles.previewTitle, { color: colors.primary }]}>
                  {isTr ? '✓ Algılanan Reçete Bilgileri:' : '✓ Extracted Prescription Details:'}
                </Text>
                <View style={styles.tagWrap}>
                  {parsedResult.name ? (
                    <View style={[styles.tag, { backgroundColor: colors.card }]}>
                      <Text style={[styles.tagText, { color: colors.text }]}>
                        💊 {parsedResult.name}
                      </Text>
                    </View>
                  ) : null}
                  {parsedResult.dosageAmount ? (
                    <View style={[styles.tag, { backgroundColor: colors.card }]}>
                      <Text style={[styles.tagText, { color: colors.text }]}>
                        ⚖️ {parsedResult.dosageAmount} mg
                      </Text>
                    </View>
                  ) : null}
                  {parsedResult.frequency ? (
                    <View style={[styles.tag, { backgroundColor: colors.card }]}>
                      <Text style={[styles.tagText, { color: colors.text }]}>
                        ⏰ Günde {parsedResult.frequency}x
                      </Text>
                    </View>
                  ) : null}
                  {parsedResult.instruction ? (
                    <View style={[styles.tag, { backgroundColor: colors.card }]}>
                      <Text style={[styles.tagText, { color: colors.text }]}>
                        🍽️ {parsedResult.instruction}
                      </Text>
                    </View>
                  ) : null}
                  {parsedResult.durationDays ? (
                    <View style={[styles.tag, { backgroundColor: colors.card }]}>
                      <Text style={[styles.tagText, { color: colors.text }]}>
                        📅 {parsedResult.durationDays} Gün Kür
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* Örnek Cümle Çipleri */}
            <Text style={[styles.sampleTitle, { color: colors.textSecondary }]}>
              {isTr ? 'Veya hazır bir örneğe dokunun:' : 'Or tap a quick example:'}
            </Text>
            <View style={styles.sampleContainer}>
              {samplePhrases.map((phrase, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.sampleChip,
                    { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                  onPress={() => handleProcessText(phrase)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="sparkles"
                    size={14}
                    color={colors.primary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.sampleText, { color: colors.text }]}>{phrase}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Aksiyon Butonları */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.applyBtn,
                {
                  backgroundColor:
                    parsedResult && parsedResult.name ? colors.primary : colors.border,
                },
              ]}
              disabled={!parsedResult || !parsedResult.name}
              onPress={handleApply}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.applyBtnText}>
                {isTr ? 'Forma Otomatik Aktar' : 'Auto-fill Form'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeIconBtn: {
    padding: 4,
  },
  micWrapper: {
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  pulseCircle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  micCenter: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  inputBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    minHeight: 64,
    marginBottom: 14,
  },
  input: {
    fontSize: 15,
    minHeight: 40,
    textAlignVertical: 'top',
  },
  previewBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    elevation: 1,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sampleTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  sampleContainer: {
    gap: 8,
    marginBottom: 16,
  },
  sampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  sampleText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  footer: {
    marginTop: 8,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
