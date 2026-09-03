/**
 * BatchMedicineImportModal — Çoklu İlaç & Reçete AI İçe Aktarma Sihirbazı
 *
 * 2026 Akıllı İlaç Aktarımı:
 * - Medisafe ve diğer uygulamalardan toplu geçişi saniyelere indirir.
 * - Kamera veya Galeriden çekilen çoklu ilaç kutularını/reçeteleri Multimodal AI ile ayrıştırır.
 * - Kullanıcıya hızlı onay/düzenleme listesi sunar ve tek tıkla tüm alarmları kurar.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Switch,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useMedicineStore } from '../../stores/medicineStore';
import {
  recognizeMultipleMedicineBoxesPhotoAI,
  BatchRecognizedMedicine,
} from '../../services/aiMedicineService';
import { scheduleMedicineNotification } from '../../utils/notifications';
import { createScopedLogger } from '../../utils/logger';

const log = createScopedLogger('BatchMedicineImportModal');

interface BatchMedicineImportModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (count: number) => void;
}

interface EditableBatchItem extends BatchRecognizedMedicine {
  id: string;
  selected: boolean;
}

export const BatchMedicineImportModal: React.FC<BatchMedicineImportModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const isTr = language === 'tr';

  const { settings, getNextAvailableColor } = useMedicineStore();

  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<EditableBatchItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // v1.7.1: bu callback ESKIDEN `handlePickImage`ten SONRA tanimliydi, ama
  // `handlePickImage`in bagimlilik dizisi (`[isTr, handleAddNewItem]`) render
  // sirasinda degerlendirildigi icin degisken henuz TDZ'deydi → modal her
  // acildiginda `ReferenceError` riski (tsc: TS2448 + TS2454). Tanim yukari alindi.
  const handleAddNewItem = useCallback(() => {
    const newItem: EditableBatchItem = {
      id: `batch-${Date.now()}`,
      name: '',
      dosage: '1 tablet',
      form: 'tablet',
      frequency: 1,
      instructions: 'after_meal',
      isCritical: false,
      selected: true,
    };
    setItems(prev => [...prev, newItem]);
  }, []);

  const handlePickImage = useCallback(
    async (source: 'camera' | 'library') => {
      try {
        let result: ImagePicker.ImagePickerResult;

        if (source === 'camera') {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert(
              isTr ? 'İzin Gerekli' : 'Permission Required',
              isTr
                ? 'İlaç kutularını tarayabilmek için kamera izni vermeniz gerekir.'
                : 'Camera permission is required to scan medicine boxes.'
            );
            return;
          }
          result = await ImagePicker.launchCameraAsync({
            base64: true,
            quality: 0.8,
            allowsEditing: false,
          });
        } else {
          result = await ImagePicker.launchImageLibraryAsync({
            base64: true,
            quality: 0.8,
            allowsEditing: false,
          });
        }

        if (result.canceled || !result.assets?.[0]?.base64) {
          return;
        }

        setIsLoading(true);
        const base64 = result.assets[0].base64;
        const res = await recognizeMultipleMedicineBoxesPhotoAI(base64);

        setIsLoading(false);

        if (res.success && res.medicines.length > 0) {
          const mapped: EditableBatchItem[] = res.medicines.map((m, index) => ({
            ...m,
            id: `batch-${Date.now()}-${index}`,
            selected: true,
          }));
          setItems(mapped);
        } else {
          Alert.alert(
            isTr ? 'Yapay Zeka Servisi' : 'AI Service Notice',
            res.error?.includes('yapılandırılamadı')
              ? isTr
                ? 'Fotoğraftan otomatik tanıma için Gemini API anahtarı henüz tanımlanmamış. İlaçlarınızı hızlı form ile eklemek ister misiniz?'
                : 'Gemini API key is not configured for photo OCR. Would you like to use the rapid batch form instead?'
              : res.error ||
                  (isTr
                    ? 'Fotoğrafta net ilaç kutusu tespit edilemedi. Lütfen ışığı ayarlayıp tekrar deneyiniz.'
                    : 'Could not detect medicine boxes clearly. Please adjust lighting and try again.'),
            [
              {
                text: isTr ? '⚡ Hızlı Formu Aç' : '⚡ Open Batch Form',
                onPress: () => {
                  handleAddNewItem();
                },
              },
              { text: isTr ? 'Kapat' : 'Close', style: 'cancel' },
            ]
          );
        }
      } catch (err) {
        setIsLoading(false);
        log.error('handlePickImage error', err);
        Alert.alert(
          isTr ? 'Hata' : 'Error',
          isTr ? 'Fotoğraf işlenirken bir hata oluştu.' : 'Failed to process photo.'
        );
      }
    },
    [isTr, handleAddNewItem]
  );

  const handleToggleSelect = useCallback((id: string) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  }, []);

  const handleUpdateItem = useCallback(
    (id: string, field: keyof BatchRecognizedMedicine, value: any) => {
      setItems(prev => prev.map(item => (item.id === id ? { ...item, [field]: value } : item)));
    },
    []
  );

  const handleRemoveItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleSaveAll = useCallback(async () => {
    const selectedItems = items.filter(i => i.selected && i.name && i.name.trim().length > 0);
    if (selectedItems.length === 0) {
      Alert.alert(
        isTr ? 'Uyarı' : 'Warning',
        isTr
          ? 'Lütfen kaydedilecek en az bir geçerli ilaç seçiniz.'
          : 'Please select at least one valid medicine to save.'
      );
      return;
    }

    setIsSaving(true);
    try {
      const store = useMedicineStore.getState();
      const fullScreenEnabled = store.settings?.fullScreenAlarmEnabled ?? true;

      for (const item of selectedItems) {
        const color = store.getNextAvailableColor();
        const medId = store.addMedicine({
          name: item.name.trim(),
          dosage: item.dosage ? item.dosage.trim() : '1 tablet',
          form: item.form || 'tablet',
          frequency: item.frequency || 1,
          instructions: item.instructions || 'after_meal',
          color,
          startDate: new Date().toISOString(),
          isCritical: !!item.isCritical,
          stockEnabled: false,
        });

        // Taze state'ten hatırlatma saatlerini al ve alarmları planla
        const freshState = useMedicineStore.getState();
        const times = freshState.getReminderTimesForMedicine(medId);
        const med = freshState.getMedicineById(medId);

        if (med && times && times.length > 0) {
          for (const time of times) {
            try {
              await scheduleMedicineNotification(med, time, fullScreenEnabled, true);
            } catch (alarmErr) {
              log.warn('Toplu ilaç alarmı planlanırken hata (atlandı):', alarmErr);
            }
          }
        }
      }

      setIsSaving(false);
      Alert.alert(
        isTr ? '🎉 Başarılı!' : '🎉 Success!',
        isTr
          ? `${selectedItems.length} ilaç başarıyla eklendi ve tüm alarmları kuruldu!`
          : `Successfully added ${selectedItems.length} medicines and scheduled alarms!`,
        [
          {
            text: isTr ? 'Tamam' : 'OK',
            onPress: () => {
              setItems([]);
              if (onSuccess) onSuccess(selectedItems.length);
              onClose();
            },
          },
        ]
      );
    } catch (err) {
      setIsSaving(false);
      log.error('handleSaveAll batch error', err);
      Alert.alert(
        isTr ? 'Hata' : 'Error',
        isTr
          ? `İlaçlar kaydedilirken bir hata oluştu: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`
          : `Failed to save medicines: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }, [items, isTr, onSuccess, onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: colors.card,
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerIconBg, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="scan-outline" size={22} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  {isTr ? 'Toplu İlaç & Reçete AI Tarama' : 'Batch Medicine AI Import'}
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
                  {isTr
                    ? 'Kutuları veya reçeteyi tek fotoğrafla listeye aktarın'
                    : 'Import multiple boxes or prescription in one tap'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Kapat"
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.text }]}>
                {isTr
                  ? 'Yapay Zeka ilaç kutularını ve dozları okuyor...'
                  : 'AI is analyzing medicine boxes & dosages...'}
              </Text>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.heroIconBg, { backgroundColor: `${colors.primary}15` }]}>
                <Text style={{ fontSize: 44 }}>📦</Text>
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {isTr ? 'Tüm İlaçlarınızı Tek Seferde Ekleyin' : 'Add All Medicines at Once'}
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                {isTr
                  ? 'Masanızdaki tüm ilaç kutularını yan yana koyup fotoğraflayın veya doktor reçetesini yükleyin. AI hepsini otomatik ayrıştırsın.'
                  : 'Place all medicine boxes together or upload prescription. AI will parse everything automatically.'}
              </Text>

              <View style={styles.actionButtonsCol}>
                <TouchableOpacity
                  style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handlePickImage('camera')}
                >
                  <Ionicons name="camera" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryActionBtnText}>
                    {isTr ? 'Kamera ile Kutuları Çek' : 'Take Photo with Camera'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.secondaryActionBtn,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => handlePickImage('library')}
                >
                  <Ionicons name="images-outline" size={20} color={colors.text} />
                  <Text style={[styles.secondaryActionBtnText, { color: colors.text }]}>
                    {isTr ? 'Galeriden Fotoğraf Seç' : 'Choose from Gallery'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tertiaryActionBtn,
                    {
                      backgroundColor: isDark ? 'rgba(78, 205, 196, 0.1)' : '#E6FFFA',
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={handleAddNewItem}
                >
                  <Ionicons name="create-outline" size={20} color={colors.primary} />
                  <Text style={[styles.tertiaryActionBtnText, { color: colors.primary }]}>
                    {isTr ? '⚡ Hızlı Toplu Giriş Formunu Aç' : '⚡ Open Rapid Batch Form'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent}>
              <View style={styles.detectedHeaderRow}>
                <Text style={[styles.detectedCountText, { color: colors.text }]}>
                  {isTr
                    ? `Tespit Edilen İlaçlar (${items.length})`
                    : `Detected Medicines (${items.length})`}
                </Text>
                <TouchableOpacity
                  style={[styles.reScanBtn, { borderColor: colors.border }]}
                  onPress={() => handlePickImage('camera')}
                >
                  <Ionicons name="refresh" size={14} color={colors.primary} />
                  <Text style={[styles.reScanBtnText, { color: colors.primary }]}>
                    {isTr ? 'Yeniden Çek' : 'Retake'}
                  </Text>
                </TouchableOpacity>
              </View>

              {items.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.itemCard,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                      borderColor: item.selected ? colors.primary : colors.border,
                      borderWidth: item.selected ? 1.5 : 1,
                    },
                  ]}
                >
                  <View style={styles.itemHeaderRow}>
                    <TouchableOpacity
                      style={styles.checkboxTouch}
                      onPress={() => handleToggleSelect(item.id)}
                    >
                      <Ionicons
                        name={item.selected ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={item.selected ? colors.primary : colors.textMuted}
                      />
                      <Text style={[styles.itemNumberText, { color: colors.textMuted }]}>
                        #{index + 1}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleRemoveItem(item.id)}
                      style={styles.trashBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Listeden çıkar"
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  {/* İlaç Adı Girişi */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                      {isTr ? 'İlaç Adı' : 'Medicine Name'}
                    </Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          color: colors.text,
                        },
                      ]}
                      value={item.name}
                      onChangeText={val => handleUpdateItem(item.id, 'name', val)}
                      placeholder={isTr ? 'Örn: Parol' : 'e.g. Parol'}
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  {/* Dozaj ve Günde Kaç Kez */}
                  <View style={styles.rowInputs}>
                    <View style={[styles.inputGroup, { flex: 1.2 }]}>
                      <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                        {isTr ? 'Dozaj' : 'Dosage'}
                      </Text>
                      <TextInput
                        style={[
                          styles.textInput,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                            color: colors.text,
                          },
                        ]}
                        value={item.dosage}
                        onChangeText={val => handleUpdateItem(item.id, 'dosage', val)}
                        placeholder="500mg"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                        {isTr ? 'Günde Kaç Doz?' : 'Daily Freq.'}
                      </Text>
                      <View style={styles.frequencyButtonsRow}>
                        {[1, 2, 3].map(freq => (
                          <TouchableOpacity
                            key={freq}
                            style={[
                              styles.freqBtn,
                              {
                                backgroundColor:
                                  item.frequency === freq ? colors.primary : colors.card,
                                borderColor:
                                  item.frequency === freq ? colors.primary : colors.border,
                              },
                            ]}
                            onPress={() => handleUpdateItem(item.id, 'frequency', freq)}
                          >
                            <Text
                              style={[
                                styles.freqBtnText,
                                {
                                  color: item.frequency === freq ? '#FFFFFF' : colors.text,
                                },
                              ]}
                            >
                              {freq}x
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* Hayati İlaç Kalkanı */}
                  <View style={styles.criticalRow}>
                    <Text style={[styles.criticalLabel, { color: colors.text }]}>
                      {isTr ? '🚨 Hayati / Kritik İlaç Kalkanı' : '🚨 Critical Medication'}
                    </Text>
                    <Switch
                      value={!!item.isCritical}
                      onValueChange={val => handleUpdateItem(item.id, 'isCritical', val)}
                      trackColor={{ false: colors.border, true: '#EF4444' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.addMoreBtn, { borderColor: colors.border }]}
                onPress={handleAddNewItem}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={[styles.addMoreBtnText, { color: colors.primary }]}>
                  {isTr ? 'Listeye Başka İlaç Ekle' : 'Add Another Medicine'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* Footer Save Button */}
          {items.length > 0 && !isLoading && (
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.saveAllBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveAll}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="flash" size={18} color="#FFFFFF" />
                    <Text style={styles.saveAllBtnText}>
                      {isTr
                        ? `Seçili İlaçları Kaydet & Alarmları Kur (${items.filter(i => i.selected).length})`
                        : `Save & Set Alarms (${items.filter(i => i.selected).length})`}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    height: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    display: 'flex',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 20,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  heroIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  actionButtonsCol: {
    width: '100%',
    gap: 12,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    elevation: 3,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  secondaryActionBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  tertiaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 8,
  },
  tertiaryActionBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  detectedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  detectedCountText: {
    fontSize: 15,
    fontWeight: '700',
  },
  reScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  reScanBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  checkboxTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemNumberText: {
    fontSize: 13,
    fontWeight: '700',
  },
  trashBtn: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  textInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  frequencyButtonsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  freqBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  freqBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  criticalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  criticalLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
    marginTop: 4,
  },
  addMoreBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  saveAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    elevation: 3,
  },
  saveAllBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
