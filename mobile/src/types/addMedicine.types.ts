import { MedicineInstruction, MedicineAutocompleteResult } from './index';

/**
 * AddMedicine form state tipi
 */
export interface AddMedicineFormState {
  name: string;
  dosage: string; // Birleştirilmiş doz (geriye dönüşlü): "2 tablet"
  dosageAmount: string; // Sadece miktar: "2"
  medicineForm: import('./index').MedicineForm; // İlacın formu
  frequency: number;
  instruction: MedicineInstruction;
  selectedColor: string;
  category?: import('./index').MedicineCategory;
  imageUri?: string;
  customTimes: string[];
  useCustomTimes: boolean;

  // Stok takibi
  stockEnabled: boolean;
  stockCount: number;
  stockThreshold: number;
  stockUnit: string;

  // Son kullanma tarihi
  expiryDate: string | null; // ISO date string veya null (opsiyonel)
  expiryReminderDays: number; // Varsayılan: 30
  // Gelişmiş Alarmlar (Faz 2)
  requireBarcodeOnTake: boolean;
  barcode?: string;
  vibrationPattern: 'default' | 'heartbeat' | 'urgent' | 'soft';
}

/**
 * Autocomplete state tipi
 */
export interface AutocompleteState {
  showAutocomplete: boolean;
  results: MedicineAutocompleteResult[];
  isLoading: boolean;
  inputFocused: boolean;
}

/**
 * TimePicker state tipi
 */
export interface TimePickerState {
  showTimePicker: boolean;
  editingTimeIndex: number | null;
  tempTime: Date;
}

/**
 * Route parametreleri
 */
export interface AddMedicineRouteParams {
  medicineId?: string;
  scannedName?: string;
  scannedDosage?: string;
  barcode?: string;
  prefillName?: string;
  prefillDosage?: string;
  prefillManufacturer?: string;
  prefillGenericName?: string;
}

/**
 * Form validasyon sonucu
 */
export interface FormValidationResult {
  isValid: boolean;
  errors: {
    name?: string;
    dosage?: string;
  };
}

/**
 * Frequency seçenekleri
 */
export const FREQUENCY_OPTIONS = [1, 2, 3, 4, 5, 6] as const;
export type FrequencyOption = (typeof FREQUENCY_OPTIONS)[number];

/**
 * Maksimum frequency (günde max 24 kez - saatlik)
 */
export const MAX_FREQUENCY = 24;
export const MIN_FREQUENCY = 1;
