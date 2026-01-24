import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMedicineStore, MEDICINE_COLORS } from '../stores/medicineStore';
import { RootStackParamList, MedicineInstruction, MedicineAutocompleteResult } from '../types';
import { getInstructionText, calculateMedicineTimes, formatTimeDisplay } from '../utils/timeCalculator';
import { scheduleMedicineNotification } from '../utils/notifications';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { autocomplete } from '../services/globalMedicineService';
import { format } from 'date-fns';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'AddMedicine'>;

const FREQUENCY_OPTIONS = [1, 2, 3, 4, 5, 6];

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function AddMedicineScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { 
    medicineId, 
    scannedName, 
    scannedDosage,
    barcode,
    prefillName,
    prefillDosage,
    prefillManufacturer,
    prefillGenericName,
  } = route.params || {};
  const insets = useSafeAreaInsets();
  
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();

  const INSTRUCTION_OPTIONS: { value: MedicineInstruction; label: string }[] = [
    { value: 'any_time', label: t('instruction_any_time') },
    { value: 'before_meal', label: t('instruction_before_meal') },
    { value: 'after_meal', label: t('instruction_after_meal') },
    { value: 'with_meal', label: t('instruction_with_meal') },
    { value: 'empty_stomach', label: t('instruction_empty_stomach') },
    { value: 'before_sleep', label: t('instruction_before_sleep') },
  ];

  const { 
    addMedicine, 
    updateMedicine, 
    getMedicineById, 
    settings,
    getReminderTimesForMedicine,
    medicines,
  } = useMedicineStore();
  
  const { canAddMedicine: checkCanAddMedicine, canUseBarcodeScanner, remainingBarcodeScans, isPremium } = useSubscription();

  const existingMedicine = medicineId ? getMedicineById(medicineId) : undefined;
  const isEditing = !!existingMedicine;

  // Form state
  const [name, setName] = useState(
    existingMedicine?.name || prefillName || scannedName || ''
  );
  const [dosage, setDosage] = useState(
    existingMedicine?.dosage || prefillDosage || scannedDosage || ''
  );
  const [frequency, setFrequency] = useState(existingMedicine?.frequency || 3);
  const [instruction, setInstruction] = useState<MedicineInstruction>(
    existingMedicine?.instructions || 'any_time'
  );
  const [selectedColor, setSelectedColor] = useState(
    existingMedicine?.color || MEDICINE_COLORS[0]
  );

  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<MedicineAutocompleteResult[]>([]);
  const [isLoadingAutocomplete, setIsLoadingAutocomplete] = useState(false);
  const [nameInputFocused, setNameInputFocused] = useState(false);

  // Manuel saat ekleme state'leri
  const [customTimes, setCustomTimes] = useState<string[]>([]);
  const [useCustomTimes, setUseCustomTimes] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingTimeIndex, setEditingTimeIndex] = useState<number | null>(null);
  const [tempTime, setTempTime] = useState(new Date());

  // Debounced name for autocomplete
  const debouncedName = useDebounce(name, 300);

  // Barkoddan veya prefill'den gelen verileri uygula
  useEffect(() => {
    if (prefillName) setName(prefillName);
    if (prefillDosage) setDosage(prefillDosage);
    if (scannedName) setName(scannedName);
    if (scannedDosage) setDosage(scannedDosage);
  }, [prefillName, prefillDosage, scannedName, scannedDosage]);

  // Autocomplete search
  useEffect(() => {
    const searchAutocomplete = async () => {
      // Prefill veya scan'den geldiyse autocomplete yapma
      if (prefillName || scannedName) {
        setShowAutocomplete(false);
        return;
      }

      if (debouncedName.length < 2 || !nameInputFocused) {
        setShowAutocomplete(false);
        setAutocompleteResults([]);
        return;
      }

      setIsLoadingAutocomplete(true);
      try {
        const results = await autocomplete(debouncedName, 'TR', 5);
        setAutocompleteResults(results);
        setShowAutocomplete(results.length > 0);
      } catch (error) {
        console.error('Autocomplete hatası:', error);
        setAutocompleteResults([]);
        setShowAutocomplete(false);
      } finally {
        setIsLoadingAutocomplete(false);
      }
    };

    searchAutocomplete();
  }, [debouncedName, nameInputFocused, prefillName, scannedName]);

  // Hesaplanan zamanları önizle
  const previewTimes = calculateMedicineTimes('preview', {
    wakeUpTime: settings.wakeUpTime,
    sleepTime: settings.sleepTime,
    frequency,
    instruction,
  });

  const handleScanBarcode = () => {
    const { allowed, reason, remaining } = canUseBarcodeScanner();
    
    if (!allowed) {
      Alert.alert(
        language === 'tr' ? 'Barkod Tarama Hakkı Doldu' : 'Barcode Scan Limit Reached',
        reason,
        [
          { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
          { 
            text: language === 'tr' ? 'Premium\'a Geç' : 'Go Premium',
            onPress: () => navigation.navigate('Premium'),
          },
        ]
      );
      return;
    }
    
    // Kalan hakkı göster (Premium değilse)
    if (remaining !== undefined && remaining !== -1 && remaining > 0) {
      Alert.alert(
        language === 'tr' ? 'Barkod Tarama' : 'Barcode Scan',
        language === 'tr' 
          ? `Kalan tarama hakkınız: ${remaining}\n\nDevam etmek istiyor musunuz?`
          : `Remaining scans: ${remaining}\n\nDo you want to continue?`,
        [
          { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
          { 
            text: language === 'tr' ? 'Tara' : 'Scan',
            onPress: () => navigation.navigate('BarcodeScanner'),
          },
        ]
      );
      return;
    }
    
    navigation.navigate('BarcodeScanner');
  };

  const handleSelectAutocomplete = (item: MedicineAutocompleteResult) => {
    setName(item.name);
    setDosage(item.dosage);
    setShowAutocomplete(false);
    setNameInputFocused(false);
  };

  // Saat ekleme/düzenleme fonksiyonları
  const handleAddTime = () => {
    setEditingTimeIndex(null);
    setTempTime(new Date());
    setShowTimePicker(true);
  };

  const handleEditTime = (index: number, time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    setTempTime(date);
    setEditingTimeIndex(index);
    setShowTimePicker(true);
  };

  const handleDeleteTime = (index: number) => {
    const newTimes = customTimes.filter((_, i) => i !== index);
    setCustomTimes(newTimes);
    if (newTimes.length === 0) {
      setUseCustomTimes(false);
    }
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (selectedDate) {
      setTempTime(selectedDate);
      
      if (Platform.OS === 'android') {
        // Android'de seçim yapıldığında direkt kaydet
        saveTimeSelection(selectedDate);
      }
    }
  };

  const saveTimeSelection = (date: Date) => {
    const timeStr = format(date, 'HH:mm');
    
    if (editingTimeIndex !== null) {
      // Mevcut saati düzenle
      const newTimes = [...customTimes];
      newTimes[editingTimeIndex] = timeStr;
      setCustomTimes(newTimes.sort());
    } else {
      // Yeni saat ekle
      if (!customTimes.includes(timeStr)) {
        setCustomTimes([...customTimes, timeStr].sort());
      }
    }
    setUseCustomTimes(true);
    setShowTimePicker(false);
  };

  const handleConfirmTime = () => {
    saveTimeSelection(tempTime);
  };

  // Otomatik saatleri manuel moda geçir
  const switchToManualTimes = () => {
    if (!useCustomTimes && previewTimes.length > 0) {
      setCustomTimes(previewTimes.map(t => t.time));
      setUseCustomTimes(true);
    }
  };

  const handleSave = async () => {
    // Validasyon
    if (!name.trim()) {
      Alert.alert(t('error'), t('error_required_field'));
      return;
    }
    if (!dosage.trim()) {
      Alert.alert(t('error'), t('error_required_field'));
      return;
    }

    // Yeni ilaç eklerken limit kontrolü
    if (!isEditing) {
      const activeMedicines = medicines.filter(m => m.isActive);
      const limitCheck = checkCanAddMedicine(activeMedicines.length);
      if (!limitCheck.allowed) {
        Alert.alert(
          language === 'tr' ? 'İlaç Limiti' : 'Medicine Limit',
          limitCheck.reason || (language === 'tr' 
            ? 'Ücretsiz planda en fazla 3 ilaç ekleyebilirsiniz.'
            : 'You can add up to 3 medicines in the free plan.'),
          [
            { text: t('cancel'), style: 'cancel' },
            { 
              text: language === 'tr' ? 'Premium\'a Geç' : 'Go Premium',
              onPress: () => navigation.navigate('Premium'),
            },
          ]
        );
        return;
      }
    }

    try {
      if (isEditing && medicineId) {
        updateMedicine(medicineId, {
          name: name.trim(),
          dosage: dosage.trim(),
          frequency: useCustomTimes ? customTimes.length : frequency,
          instructions: instruction,
          color: selectedColor,
          customTimes: useCustomTimes ? customTimes : undefined,
        });

        // Bildirimleri güncelle
        const times = getReminderTimesForMedicine(medicineId);
        const medicine = getMedicineById(medicineId);
        if (medicine) {
          for (const time of times) {
            await scheduleMedicineNotification(medicine, time, settings.fullScreenAlarmEnabled);
          }
        }
      } else {
        const newMedicineId = addMedicine({
          name: name.trim(),
          dosage: dosage.trim(),
          frequency: useCustomTimes ? customTimes.length : frequency,
          instructions: instruction,
          color: selectedColor,
          startDate: new Date().toISOString(),
          customTimes: useCustomTimes ? customTimes : undefined,
        });

        // Yeni ilaç için bildirimleri planla
        const times = getReminderTimesForMedicine(newMedicineId);
        const medicine = getMedicineById(newMedicineId);
        if (medicine) {
          for (const time of times) {
            await scheduleMedicineNotification(medicine, time, settings.fullScreenAlarmEnabled);
          }
        }
      }

      navigation.goBack();
    } catch (error) {
      Alert.alert(t('error'), t('error_unknown'));
    }
  };

  const renderAutocompleteItem = ({ item }: { item: MedicineAutocompleteResult }) => (
    <TouchableOpacity
      style={[styles.autocompleteItem, { backgroundColor: colors.card, borderBottomColor: colors.divider }]}
      onPress={() => handleSelectAutocomplete(item)}
    >
      <View style={styles.autocompleteItemContent}>
        <Text style={[styles.autocompleteItemName, { color: colors.text }]}>
          {item.name}
        </Text>
        <Text style={[styles.autocompleteItemDosage, { color: colors.textSecondary }]}>
          {item.dosage} • {item.manufacturer}
        </Text>
      </View>
      <View style={[styles.matchBadge, { backgroundColor: colors.primary + '20' }]}>
        <Text style={[styles.matchBadgeText, { color: colors.primary }]}>
          {item.matchScore}%
        </Text>
      </View>
    </TouchableOpacity>
  );

  const styles = createStyles(colors, isDark);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Barkod Tarama Butonu */}
          {!isEditing && (
            <TouchableOpacity style={styles.barcodeButton} onPress={handleScanBarcode}>
              <Text style={styles.barcodeIcon}>📷</Text>
              <Text style={styles.barcodeText}>{t('medicine_scan_barcode')}</Text>
            </TouchableOpacity>
          )}

          {/* Barkod bilgisi (varsa) */}
          {barcode && (
            <View style={[styles.barcodeInfo, { backgroundColor: colors.card }]}>
              <Text style={[styles.barcodeInfoLabel, { color: colors.textSecondary }]}>
                Barkod:
              </Text>
              <Text style={[styles.barcodeInfoValue, { color: colors.text }]}>
                {barcode}
              </Text>
            </View>
          )}

          {/* İlaç Adı */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('medicine_name')} *</Text>
            <View style={styles.autocompleteContainer}>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (text.length >= 2) {
                    setNameInputFocused(true);
                  }
                }}
                onFocus={() => setNameInputFocused(true)}
                onBlur={() => {
                  // Delay to allow item selection
                  setTimeout(() => setNameInputFocused(false), 200);
                }}
                placeholder={t('medicine_name_placeholder')}
                placeholderTextColor={colors.placeholder}
              />
              
              {/* Loading indicator */}
              {isLoadingAutocomplete && (
                <View style={styles.autocompleteLoading}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              )}

              {/* Autocomplete dropdown */}
              {showAutocomplete && autocompleteResults.length > 0 && (
                <View style={[styles.autocompleteDropdown, { backgroundColor: colors.card, borderColor: colors.inputBorder }]}>
                  <FlatList
                    data={autocompleteResults}
                    renderItem={renderAutocompleteItem}
                    keyExtractor={(item) => item.id}
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled
                    style={styles.autocompleteList}
                  />
                </View>
              )}
            </View>
          </View>

          {/* Dozaj */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('medicine_dosage')} *</Text>
            <TextInput
              style={styles.input}
              value={dosage}
              onChangeText={setDosage}
              placeholder={t('medicine_dosage_placeholder')}
              placeholderTextColor={colors.placeholder}
            />
          </View>

          {/* Günlük Kullanım */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('medicine_frequency')}</Text>
            <View style={styles.frequencyContainer}>
              {FREQUENCY_OPTIONS.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.frequencyButton,
                    frequency === f && styles.frequencyButtonActive,
                  ]}
                  onPress={() => setFrequency(f)}
                >
                  <Text
                    style={[
                      styles.frequencyText,
                      frequency === f && styles.frequencyTextActive,
                    ]}
                  >
                    {f}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Kullanım Talimatı */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('medicine_instruction')}</Text>
            <View style={styles.instructionsContainer}>
              {INSTRUCTION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.instructionButton,
                    instruction === opt.value && styles.instructionButtonActive,
                  ]}
                  onPress={() => setInstruction(opt.value)}
                >
                  <Text
                    style={[
                      styles.instructionText,
                      instruction === opt.value && styles.instructionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Renk Seçimi */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('medicine_color')}</Text>
            <View style={styles.colorContainer}>
              {MEDICINE_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorButton,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorButtonActive,
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <Text style={styles.colorCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Saat Önizleme / Manuel Saat Ekleme */}
          <View style={styles.inputGroup}>
            <View style={styles.timesHeader}>
              <Text style={styles.label}>{t('medicine_reminder_times')}</Text>
              {!useCustomTimes && (
                <TouchableOpacity onPress={switchToManualTimes}>
                  <Text style={[styles.editTimesButton, { color: colors.primary }]}>
                    {language === 'tr' ? 'Düzenle' : 'Edit'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.previewContainer}>
              {!useCustomTimes && (
                <Text style={styles.previewInfo}>
                  {t('settings_wake_time')}: {settings.wakeUpTime} | {t('settings_sleep_time')}: {settings.sleepTime}
                </Text>
              )}
              <View style={styles.timesPreview}>
                {(useCustomTimes ? customTimes : previewTimes.map(t => t.time)).map((time, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={[styles.timeChip, { backgroundColor: selectedColor }]}
                    onPress={() => useCustomTimes && handleEditTime(index, time)}
                    onLongPress={() => useCustomTimes && handleDeleteTime(index)}
                  >
                    <Text style={styles.timeChipText}>
                      {formatTimeDisplay(time)}
                    </Text>
                    {useCustomTimes && (
                      <TouchableOpacity 
                        style={styles.timeChipDelete}
                        onPress={() => handleDeleteTime(index)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text style={styles.timeChipDeleteText}>×</Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                ))}
                {/* Saat Ekle Butonu */}
                {useCustomTimes && (
                  <TouchableOpacity 
                    style={[styles.addTimeChip, { borderColor: colors.primary }]}
                    onPress={handleAddTime}
                  >
                    <Text style={[styles.addTimeChipText, { color: colors.primary }]}>+ Ekle</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.previewNote}>
                {useCustomTimes 
                  ? (language === 'tr' ? '* Saate dokun: düzenle | Uzun bas: sil' : '* Tap time: edit | Long press: delete')
                  : (language === 'tr' ? '* Saatleri düzenlemek için "Düzenle" butonuna basın' : '* Press "Edit" to customize times')
                }
              </Text>
            </View>
          </View>

          {/* TimePicker Modal (iOS) / Dialog (Android) */}
          {showTimePicker && (
            Platform.OS === 'ios' ? (
              <View style={[styles.timePickerContainer, { backgroundColor: colors.card }]}>
                <View style={styles.timePickerHeader}>
                  <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                    <Text style={[styles.timePickerCancel, { color: colors.error }]}>
                      {language === 'tr' ? 'İptal' : 'Cancel'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.timePickerTitle, { color: colors.text }]}>
                    {editingTimeIndex !== null 
                      ? (language === 'tr' ? 'Saati Düzenle' : 'Edit Time')
                      : (language === 'tr' ? 'Saat Ekle' : 'Add Time')
                    }
                  </Text>
                  <TouchableOpacity onPress={handleConfirmTime}>
                    <Text style={[styles.timePickerConfirm, { color: colors.primary }]}>
                      {language === 'tr' ? 'Tamam' : 'Done'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempTime}
                  mode="time"
                  is24Hour={true}
                  display="spinner"
                  onChange={handleTimeChange}
                  locale="tr-TR"
                />
              </View>
            ) : (
              <DateTimePicker
                value={tempTime}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={handleTimeChange}
              />
            )
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Kaydet Butonu - Safe area aware */}
        <View style={[
          styles.footer, 
          { 
            paddingBottom: Platform.OS === 'ios' 
              ? Math.max(insets.bottom, 12) + 8 
              : Math.max(insets.bottom, 8) + 12 // Daha yukarı
          }
        ]}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>
              {isEditing ? (language === 'tr' ? 'Güncelle' : 'Update') : t('save')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  barcodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  barcodeIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  barcodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  barcodeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  barcodeInfoLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  barcodeInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  inputGroup: {
    marginTop: 20,
    zIndex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  // Autocomplete styles
  autocompleteContainer: {
    position: 'relative',
    zIndex: 10,
  },
  autocompleteLoading: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  autocompleteDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    maxHeight: 200,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  autocompleteList: {
    maxHeight: 200,
  },
  autocompleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  autocompleteItemContent: {
    flex: 1,
  },
  autocompleteItemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  autocompleteItemDosage: {
    fontSize: 13,
    marginTop: 2,
  },
  matchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  frequencyContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  frequencyButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  frequencyButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  frequencyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  frequencyTextActive: {
    color: '#FFFFFF',
  },
  instructionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  instructionButton: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  instructionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  instructionText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  instructionTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  colorContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorButtonActive: {
    borderWidth: 3,
    borderColor: colors.text,
  },
  colorCheck: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  timesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editTimesButton: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  previewInfo: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
  },
  timesPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timeChipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  timeChipDelete: {
    marginLeft: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeChipDeleteText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  addTimeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  addTimeChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewNote: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 12,
    fontStyle: 'italic',
  },
  // TimePicker styles (iOS)
  timePickerContainer: {
    borderRadius: 12,
    marginTop: 12,
    overflow: 'hidden',
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  timePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  timePickerCancel: {
    fontSize: 16,
  },
  timePickerConfirm: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveButton: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
