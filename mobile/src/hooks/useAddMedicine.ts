import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { format } from 'date-fns';
import { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { useMedicineStore } from '../stores/medicineStore';
import { RootStackParamList, MedicineAutocompleteResult } from '../types';
import { calculateMedicineTimes } from '../utils/timeCalculator';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { autocomplete } from '../services/globalMedicineService';
import { useDebounce } from './useDebounce';
import { useMedicinePersistence } from './useMedicinePersistence';
import { useAlert } from '../contexts/AlertContext';
import { checkInteractions } from '../services/drugInteractionService';
import {
  AddMedicineFormState,
  AutocompleteState,
  TimePickerState,
  AddMedicineRouteParams,
  FREQUENCY_OPTIONS,
} from '../types/addMedicine.types';
import { createScopedLogger } from '../utils/logger';
import {
  parseDosageAmount,
  parseMedicineForm,
  getInitialAutoTimes,
  buildDosageString,
} from './useAddMedicineHelpers';

const log = createScopedLogger('AddMedicine');

type RouteProps = RouteProp<RootStackParamList, 'AddMedicine'>;

export function useAddMedicine() {
  const route = useRoute<RouteProps>();
  const routeParams: AddMedicineRouteParams = route.params || {};

  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const { showAlert } = useAlert();
  const { getMedicineById, settings, getNextAvailableColor, medicines } = useMedicineStore();

  const existingMedicine = routeParams.medicineId
    ? getMedicineById(routeParams.medicineId)
    : undefined;
  const isEditing = !!existingMedicine;

  // Persistence hook
  const {
    handleScanBarcode,
    handleSave: persistSave,
    handleCancel,
    // eslint-disable-next-line unused-imports/no-unused-vars
    settings: persistSettings,
  } = useMedicinePersistence({
    isEditing,
    medicineId: routeParams.medicineId,
    t,
    language,
  });

  // Yeni ilaç için otomatik renk belirle
  const initialColor = existingMedicine?.color || getNextAvailableColor();

  // Yeni ilaç için başlangıç saatlerini oluştur (08:00-21:00 arası eşit dağılım)
  // Sprint 19.3: getInitialAutoTimes helpers.ts'e taşındı

  // Başlangıç frekansı
  const initialFrequency = existingMedicine?.frequency || 3;
  // Form state
  const [formState, setFormState] = useState<AddMedicineFormState>({
    name: existingMedicine?.name || routeParams.prefillName || routeParams.scannedName || '',
    dosage:
      existingMedicine?.dosage || routeParams.prefillDosage || routeParams.scannedDosage || '',
    dosageAmount:
      existingMedicine?.dosageAmount ||
      parseDosageAmount(
        existingMedicine?.dosage || routeParams.prefillDosage || routeParams.scannedDosage || '1'
      ),
    medicineForm:
      existingMedicine?.form ||
      parseMedicineForm(
        existingMedicine?.dosage || routeParams.prefillDosage || routeParams.scannedDosage || ''
      ),
    frequency: existingMedicine?.frequency || 3,
    instruction: existingMedicine?.instructions || 'any_time',
    selectedColor: initialColor,
    category: existingMedicine?.category,
    imageUri: existingMedicine?.imageUri,
    customTimes:
      existingMedicine?.customTimes && existingMedicine.customTimes.length > 0
        ? existingMedicine.customTimes
        : getInitialAutoTimes(initialFrequency),
    useCustomTimes: true, // Her zaman chip modunda başlar
    // Stok takibi
    stockEnabled: existingMedicine?.stockEnabled ?? false,
    stockCount: existingMedicine?.stockCount ?? 30,
    stockThreshold: existingMedicine?.stockThreshold ?? 5,
    stockUnit: existingMedicine?.stockUnit ?? 'tablet',
    // Son kullanma tarihi
    expiryDate: existingMedicine?.expiryDate ?? null,
    expiryReminderDays: existingMedicine?.expiryReminderDays ?? 30,
    // Gelişmiş Alarmlar (Faz 2)
    requireBarcodeOnTake: existingMedicine?.requireBarcodeOnTake ?? false,
    barcode: existingMedicine?.barcode,
    vibrationPattern: existingMedicine?.vibrationPattern ?? 'default',
  });

  // Autocomplete state
  const [autocompleteState, setAutocompleteState] = useState<AutocompleteState>({
    showAutocomplete: false,
    results: [],
    isLoading: false,
    inputFocused: false,
  });

  // TimePicker state
  const [timePickerState, setTimePickerState] = useState<TimePickerState>({
    showTimePicker: false,
    editingTimeIndex: null,
    tempTime: new Date(),
  });

  const debouncedName = useDebounce(formState.name, 300);

  // Prefill effect
  useEffect(() => {
    // Sadece routeParams üzerinden yeni veri gelmişse mevcut state'i ezmeden güncelle
    setFormState(prev => {
      const updates: Partial<AddMedicineFormState> = {};

      if (routeParams.prefillName && prev.name !== routeParams.prefillName)
        updates.name = routeParams.prefillName;
      if (routeParams.prefillDosage && prev.dosage !== routeParams.prefillDosage)
        updates.dosage = routeParams.prefillDosage;
      if (routeParams.scannedName && prev.name !== routeParams.scannedName)
        updates.name = routeParams.scannedName;
      if (routeParams.scannedDosage && prev.dosage !== routeParams.scannedDosage)
        updates.dosage = routeParams.scannedDosage;

      // routeParams'tan gelen barcode değeri varsa, ve prev.barcode null/boş ise ya da gerçekten değer değişmişse ez
      if (routeParams.barcode && prev.barcode !== routeParams.barcode) {
        updates.barcode = routeParams.barcode;
      }

      if (Object.keys(updates).length > 0) {
        return { ...prev, ...updates };
      }
      return prev;
    });
  }, [
    routeParams.prefillName,
    routeParams.prefillDosage,
    routeParams.scannedName,
    routeParams.scannedDosage,
    routeParams.barcode,
  ]);

  // Autocomplete effect - race condition korumalı
  useEffect(() => {
    let cancelled = false;

    const searchAutocomplete = async () => {
      if (routeParams.prefillName || routeParams.scannedName) {
        setAutocompleteState(prev => ({ ...prev, showAutocomplete: false }));
        return;
      }

      if (debouncedName.length < 2 || !autocompleteState.inputFocused) {
        setAutocompleteState(prev => ({ ...prev, showAutocomplete: false, results: [] }));
        return;
      }

      setAutocompleteState(prev => ({ ...prev, isLoading: true }));
      try {
        const results = await autocomplete(debouncedName, 'TR', 5);

        // Eğer bu effect temizlenmişse (cancelled), state güncelleme
        if (cancelled) return;

        setAutocompleteState(prev => ({
          ...prev,
          results,
          showAutocomplete: results.length > 0,
          isLoading: false,
        }));
      } catch (error) {
        // Eğer cancelled ise log bile atma
        if (cancelled) return;

        log.error('Autocomplete hatasi', error);
        setAutocompleteState(prev => ({
          ...prev,
          results: [],
          showAutocomplete: false,
          isLoading: false,
        }));
      }
    };

    searchAutocomplete();

    // Cleanup: Yeni bir arama başladığında eskisini iptal et
    return () => {
      cancelled = true;
    };
  }, [
    debouncedName,
    autocompleteState.inputFocused,
    routeParams.prefillName,
    routeParams.scannedName,
  ]);

  // Preview times
  const previewTimes = calculateMedicineTimes('preview', {
    wakeUpTime: settings.wakeUpTime,
    sleepTime: settings.sleepTime,
    frequency: formState.frequency,
    instruction: formState.instruction,
  });

  // Form field updaters
  const updateFormField = useCallback(
    <K extends keyof AddMedicineFormState>(field: K, value: AddMedicineFormState[K]) => {
      setFormState(prev => ({ ...prev, [field]: value }));
    },
    []
  );

  // Miktar veya form değişince dosage string'ini de güncelle
  const handleDosageAmountChange = useCallback((amount: string) => {
    setFormState(prev => ({
      ...prev,
      dosageAmount: amount,
      dosage: buildDosageString(amount, prev.medicineForm),
    }));
  }, []);

  const handleMedicineFormChange = useCallback((form: import('../types').MedicineForm) => {
    setFormState(prev => ({
      ...prev,
      medicineForm: form,
      dosage: buildDosageString(prev.dosageAmount || '1', form),
    }));
  }, []);

  // Frekans seçilince otomatik saatleri uygula
  const handleAutoTimes = useCallback((times: string[]) => {
    if (times.length > 0) {
      setFormState(prev => ({ ...prev, customTimes: times, useCustomTimes: true }));
    }
  }, []);

  const setNameInputFocused = useCallback((focused: boolean) => {
    setAutocompleteState(prev => ({ ...prev, inputFocused: focused }));
  }, []);

  const handleSelectAutocomplete = useCallback((item: MedicineAutocompleteResult) => {
    setFormState(prev => ({ ...prev, name: item.name, dosage: item.dosage }));
    setAutocompleteState(prev => ({ ...prev, showAutocomplete: false, inputFocused: false }));
  }, []);

  // Time management callbacks
  const handleAddTime = useCallback(() => {
    setTimePickerState({ showTimePicker: true, editingTimeIndex: null, tempTime: new Date() });
  }, []);

  const handleEditTime = useCallback((index: number, time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    setTimePickerState({ showTimePicker: true, editingTimeIndex: index, tempTime: date });
  }, []);

  const handleDeleteTime = useCallback((index: number) => {
    setFormState(prev => {
      const newTimes = prev.customTimes.filter((_, i) => i !== index);
      return { ...prev, customTimes: newTimes, useCustomTimes: newTimes.length > 0 };
    });
  }, []);

  const saveTimeSelection = useCallback(
    (date: Date) => {
      const timeStr = format(date, 'HH:mm');

      setFormState(prev => {
        let newTimes: string[];
        if (timePickerState.editingTimeIndex !== null) {
          newTimes = [...prev.customTimes];
          newTimes[timePickerState.editingTimeIndex] = timeStr;
        } else {
          if (prev.customTimes.includes(timeStr)) {
            return prev;
          }
          newTimes = [...prev.customTimes, timeStr];
        }
        return { ...prev, customTimes: newTimes.sort(), useCustomTimes: true };
      });
      setTimePickerState(prev => ({ ...prev, showTimePicker: false }));
    },
    [timePickerState.editingTimeIndex]
  );

  const handleTimeChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setTimePickerState(prev => ({ ...prev, showTimePicker: false }));
      }

      if (selectedDate) {
        setTimePickerState(prev => ({ ...prev, tempTime: selectedDate }));

        if (Platform.OS === 'android') {
          saveTimeSelection(selectedDate);
        }
      }
    },
    [saveTimeSelection]
  );

  const handleConfirmTime = useCallback(() => {
    saveTimeSelection(timePickerState.tempTime);
  }, [saveTimeSelection, timePickerState.tempTime]);

  const switchToManualTimes = useCallback(() => {
    if (!formState.useCustomTimes && previewTimes.length > 0) {
      setFormState(prev => ({
        ...prev,
        customTimes: previewTimes.map(t => t.time),
        useCustomTimes: true,
      }));
    }
  }, [formState.useCustomTimes, previewTimes]);

  const closeTimePicker = useCallback(() => {
    setTimePickerState(prev => ({ ...prev, showTimePicker: false }));
  }, []);

  // Save wrapper - error handling ve etkileşim kontrolü ile
  const handleSave = useCallback(async () => {
    try {
      if (!isEditing && formState.name) {
        const interactions = checkInteractions(formState.name, medicines);
        if (interactions.length > 0) {
          // İlk etkileşimi uyarı olarak gösteriyoruz
          const interaction = interactions[0];

          return new Promise<void>((resolve, reject) => {
            showAlert({
              type: 'warning',
              title: language === 'tr' ? 'İlaç Etkileşim Uyarısı' : 'Drug Interaction Warning',
              message: `${formState.name} ile ${interaction.targetMedicineName} arasında olası bir etkileşim tespit edildi.\n\n${interaction.description}\n\n${interaction.action}\n\nYine de eklemek istiyor musunuz?`,
              buttons: [
                {
                  text: language === 'tr' ? 'İptal' : 'Cancel',
                  style: 'cancel',
                  onPress: () =>
                    reject(new Error('Kullanıcı etkileşim uyarısı nedeniyle kaydı iptal etti')),
                },
                {
                  text: language === 'tr' ? 'Yine de Kaydet' : 'Save Anyway',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await persistSave(formState);
                      resolve();
                    } catch (e) {
                      reject(e);
                    }
                  },
                },
              ],
            });
          });
        }
      }

      await persistSave(formState);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Kullanıcı etkileşim uyarısı nedeniyle kaydı iptal etti'
      ) {
        return; // Sessizce iptal et
      }
      log.error('Ilac kaydedilirken hata', error);
      // Hata fırlat ki caller (screen) handle edebilsin
      throw error;
    }
  }, [persistSave, formState, isEditing, medicines, language, showAlert]);

  return {
    routeParams,
    isEditing,
    colors,
    isDark,
    t,
    language,
    formState,
    updateFormField,
    autocompleteState,
    setNameInputFocused,
    handleSelectAutocomplete,
    timePickerState,
    handleAddTime,
    handleEditTime,
    handleDeleteTime,
    handleTimeChange,
    handleConfirmTime,
    switchToManualTimes,
    closeTimePicker,
    previewTimes,
    settings,
    handleScanBarcode,
    handleSave,
    handleCancel,
    FREQUENCY_OPTIONS,
    handleDosageAmountChange,
    handleMedicineFormChange,
    handleAutoTimes,
  };
}
