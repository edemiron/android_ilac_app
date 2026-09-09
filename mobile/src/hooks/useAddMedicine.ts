import { useState, useEffect, useCallback, useRef } from 'react';
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
import { checkInteractions } from '../services/drugInteraction';
import { recognizeMedicineBoxPhotoAI } from '../services/aiMedicineService';
import { captureImageForAI, captureFailureMessage } from '../utils/imageCapture';
import {
  AddMedicineFormState,
  AutocompleteState,
  TimePickerState,
  AddMedicineRouteParams,
  FREQUENCY_OPTIONS,
} from '../types/addMedicine.types';
import { CelebrationData } from '../components/addMedicine/MedicineAddedCelebrationModal';
import { ParsedVoiceMedicine } from '../utils/voiceMedicineParser';
import { createScopedLogger } from '../utils/logger';
import { getLocalDateKey } from '../domain/doseLog';
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

  // Kutlama & Başarı Modalı State'i
  const [celebrationState, setCelebrationState] = useState<CelebrationData>({
    visible: false,
    medicineName: '',
  });

  const handleSaveSuccess = useCallback(
    (data: {
      medicineName: string;
      dosageAmount?: string;
      medicineForm?: string;
      frequency?: number;
      firstReminderTime?: string;
      isTomorrow?: boolean;
      isEditing?: boolean;
    }) => {
      setCelebrationState({
        visible: true,
        ...data,
      });
    },
    []
  );

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
    onSaveSuccess: handleSaveSuccess,
  });

  const handleDismissCelebration = useCallback(() => {
    setCelebrationState(prev => ({ ...prev, visible: false }));
    handleCancel();
  }, [handleCancel]);

  // Sesli Asistan Modalı State'i
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);

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
    isCritical: existingMedicine?.isCritical ?? false,
    // Gelişmiş Zamanlama
    scheduleType: existingMedicine?.scheduleType ?? 'daily',
    specificDays: existingMedicine?.specificDays ?? [1, 2, 3, 4, 5],
    intervalDays: existingMedicine?.intervalDays ?? 2,
    cycleDaysOn: existingMedicine?.cycleDaysOn ?? 21,
    cycleDaysOff: existingMedicine?.cycleDaysOff ?? 7,
    endDate: existingMedicine?.endDate ?? null,
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

  // Seçilen ilacı takip etmek için ref (seçimden sonra tekrar otomatik tamamlama açılmasın)
  const lastSelectedNameRef = useRef<string | null>(null);

  // Autocomplete effect - race condition korumalı
  useEffect(() => {
    let cancelled = false;

    const searchAutocomplete = async () => {
      if (
        (lastSelectedNameRef.current && debouncedName === lastSelectedNameRef.current) ||
        (routeParams.prefillName && debouncedName === routeParams.prefillName) ||
        (routeParams.scannedName && debouncedName === routeParams.scannedName)
      ) {
        setAutocompleteState(prev => ({ ...prev, showAutocomplete: false }));
        return;
      }

      if (debouncedName.length < 2) {
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
      if (field === 'name') {
        lastSelectedNameRef.current = null;
      }
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
    lastSelectedNameRef.current = item.name;
    setFormState(prev => {
      const validForm = item.form || prev.medicineForm;
      const amountMatch = (item.dosage || '').match(/^(\d+[.,]?\d*)/);
      const dosageAmount = amountMatch ? amountMatch[1] : prev.dosageAmount || '1';
      const dosage = item.dosage || buildDosageString(dosageAmount, validForm);

      return {
        ...prev,
        name: item.name,
        dosage,
        dosageAmount,
        medicineForm: validForm,
        barcode: item.barcode || prev.barcode,
      };
    });
    setAutocompleteState(prev => ({
      ...prev,
      showAutocomplete: false,
      inputFocused: false,
      results: [],
    }));
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

  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);

  const handleScanPhotoBox = useCallback(async () => {
    // v1.9.1: fotograf yakalama artik `utils/imageCapture` yardimcisinda.
    // Picker'a `base64: true` GECILMEZ (bellek zirvesi kamera donusunde olusuyordu)
    // ve gonderim oncesi boyut denetleniyor. Gerekce: utils/imageCapture.ts basligi.
    const capture = await captureImageForAI('camera');

    if (!capture.ok) {
      const message = captureFailureMessage(capture.reason, language === 'tr' ? 'tr' : 'en');
      // `cancelled` icin mesaj yok -> kullanici vazgectiyse sessizce cik.
      if (message) {
        showAlert({
          type: capture.reason === 'permission-denied' ? 'warning' : 'error',
          title:
            capture.reason === 'permission-denied'
              ? language === 'tr'
                ? 'Kamera İzni Gerekli'
                : 'Camera Permission Required'
              : language === 'tr'
                ? 'Fotoğraf İşlenemedi'
                : 'Photo Could Not Be Processed',
          message,
        });
      }
      return;
    }

    setIsAnalyzingPhoto(true);
    try {
      const ocrResult = await recognizeMedicineBoxPhotoAI(capture.base64);
      setIsAnalyzingPhoto(false);

      if (ocrResult.success && ocrResult.name) {
        setFormState(prev => ({
          ...prev,
          name: ocrResult.name || prev.name,
          dosage: ocrResult.dosage || prev.dosage,
          dosageAmount: ocrResult.dosage ? parseDosageAmount(ocrResult.dosage) : prev.dosageAmount,
          medicineForm: ocrResult.form ? (ocrResult.form as any) : prev.medicineForm,
          instruction: ocrResult.instructions ? (ocrResult.instructions as any) : prev.instruction,
          imageUri: capture.uri || prev.imageUri,
        }));

        showAlert({
          type: 'info',
          title: language === 'tr' ? 'İlaç Kutusu Tanındı' : 'Medicine Identified',
          message: `${ocrResult.name} (${ocrResult.dosage || ''}) başarıyla okundu ve forma aktarıldı.`,
        });
      } else {
        showAlert({
          type: 'warning',
          title: language === 'tr' ? 'Bilgi Çıkarılamadı' : 'Recognition Incomplete',
          message:
            ocrResult.error ||
            (language === 'tr'
              ? 'Kutudan ilaç adı okunamadı. Lütfen elle giriniz veya barkod ile deneyiniz.'
              : 'Could not detect medicine details. Please enter manually or scan barcode.'),
        });
      }
    } catch (error) {
      setIsAnalyzingPhoto(false);
      log.error('Photo scan error', error);
    }
  }, [language, showAlert]);

  const handleRemovePhoto = useCallback(() => {
    setFormState(prev => ({ ...prev, imageUri: undefined }));
  }, []);

  const handleApplyVoiceMedicine = useCallback((parsed: ParsedVoiceMedicine) => {
    setFormState(prev => {
      const updated = { ...prev };
      if (parsed.name) updated.name = parsed.name;
      if (parsed.dosageAmount) {
        updated.dosageAmount = parsed.dosageAmount;
        updated.dosage = parsed.dosage || `${parsed.dosageAmount} MG`;
      }
      if (parsed.medicineForm) updated.medicineForm = parsed.medicineForm;
      if (parsed.frequency) {
        updated.frequency = parsed.frequency;
        updated.customTimes = getInitialAutoTimes(parsed.frequency);
        updated.useCustomTimes = true;
      }
      if (parsed.instruction) updated.instruction = parsed.instruction;
      if (parsed.durationDays) {
        const now = new Date();
        const end = new Date(now.getTime() + parsed.durationDays * 24 * 60 * 60 * 1000);
        // ⚠️ v1.7.10 — YEREL gun. `toISOString()` UTC gununu verir ve TR
        // (UTC+3) icin gece yarisina yakin saatlerde tarihi BIR GUN GERI
        // kaydirir. v1.7.7'den beri `endDate` alarmin kurulup kurulmayacagini
        // BELIRLIYOR (bkz. notifications/diagnostics.ts), yani bir gun kayma
        // tedavinin alarmini bir gun ERKEN susturur.
        updated.endDate = getLocalDateKey(end);
        updated.scheduleType = 'cycle';
      }
      return updated;
    });
  }, []);

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
    handleScanPhotoBox,
    handleRemovePhoto,
    isAnalyzingPhoto,
    handleSave,
    handleCancel,
    FREQUENCY_OPTIONS,
    handleDosageAmountChange,
    handleMedicineFormChange,
    handleAutoTimes,
    // Yeni İnce Dokunuşlar & Mikro-Deneyimler
    celebrationState,
    handleDismissCelebration,
    voiceModalVisible,
    setVoiceModalVisible,
    handleApplyVoiceMedicine,
  };
}
