import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { format } from 'date-fns';
import { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { useMedicineStore, MEDICINE_COLORS } from '../stores/medicineStore';
import { RootStackParamList, MedicineAutocompleteResult } from '../types';
import { calculateMedicineTimes } from '../utils/timeCalculator';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { autocomplete } from '../services/globalMedicineService';
import { useDebounce } from './useDebounce';
import { useMedicinePersistence } from './useMedicinePersistence';
import {
  AddMedicineFormState,
  AutocompleteState,
  TimePickerState,
  AddMedicineRouteParams,
  FREQUENCY_OPTIONS,
} from '../types/addMedicine.types';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('AddMedicine');

type RouteProps = RouteProp<RootStackParamList, 'AddMedicine'>;

export function useAddMedicine() {
  const route = useRoute<RouteProps>();
  const routeParams: AddMedicineRouteParams = route.params || {};

  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const { getMedicineById, settings } = useMedicineStore();

  const existingMedicine = routeParams.medicineId
    ? getMedicineById(routeParams.medicineId)
    : undefined;
  const isEditing = !!existingMedicine;

  // Persistence hook
  const {
    handleScanBarcode,
    handleSave: persistSave,
    handleCancel,
    settings: persistSettings,
  } = useMedicinePersistence({
    isEditing,
    medicineId: routeParams.medicineId,
    t,
    language,
  });

  // Form state
  const [formState, setFormState] = useState<AddMedicineFormState>({
    name: existingMedicine?.name || routeParams.prefillName || routeParams.scannedName || '',
    dosage:
      existingMedicine?.dosage || routeParams.prefillDosage || routeParams.scannedDosage || '',
    frequency: existingMedicine?.frequency || 3,
    instruction: existingMedicine?.instructions || 'any_time',
    selectedColor: existingMedicine?.color || MEDICINE_COLORS[0],
    customTimes: [],
    useCustomTimes: false,
    // Stok takibi
    stockEnabled: existingMedicine?.stockEnabled ?? false,
    stockCount: existingMedicine?.stockCount ?? 30,
    stockThreshold: existingMedicine?.stockThreshold ?? 5,
    stockUnit: existingMedicine?.stockUnit ?? 'tablet',
    // Son kullanma tarihi
    expiryDate: existingMedicine?.expiryDate ?? null,
    expiryReminderDays: existingMedicine?.expiryReminderDays ?? 30,
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
    const updates: Partial<AddMedicineFormState> = {};
    if (routeParams.prefillName) updates.name = routeParams.prefillName;
    if (routeParams.prefillDosage) updates.dosage = routeParams.prefillDosage;
    if (routeParams.scannedName) updates.name = routeParams.scannedName;
    if (routeParams.scannedDosage) updates.dosage = routeParams.scannedDosage;

    if (Object.keys(updates).length > 0) {
      setFormState(prev => ({ ...prev, ...updates }));
    }
  }, [
    routeParams.prefillName,
    routeParams.prefillDosage,
    routeParams.scannedName,
    routeParams.scannedDosage,
  ]);

  // Autocomplete effect
  useEffect(() => {
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
        setAutocompleteState(prev => ({
          ...prev,
          results,
          showAutocomplete: results.length > 0,
          isLoading: false,
        }));
      } catch (error) {
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

  // Save wrapper
  const handleSave = useCallback(async () => {
    await persistSave(formState);
  }, [persistSave, formState]);

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
  };
}
