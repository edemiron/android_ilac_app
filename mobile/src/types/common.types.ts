/**
 * Ortak tip tanimalari
 * Bu dosya projede tekrar eden tipleri merkezi olarak tanimlar
 */

import { ThemeColors } from '../contexts/ThemeContext';
import { TranslationKey } from '../contexts/LanguageContext';
import { Medicine } from './index';

// DateTimePicker event tipi
// @react-native-community/datetimepicker'dan gelen event tipi
export interface DateTimePickerEvent {
  type: 'set' | 'dismissed' | 'neutralButtonPressed';
  nativeEvent: {
    timestamp?: number;
    utcOffset?: number;
  };
}

// Ceviri fonksiyonu tipi
export type TranslationFunction = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string;

// Theme colors re-export for convenience
export type { ThemeColors };
export type { TranslationKey };

// Mevcut ilac kontrol sonucu
export interface ExistingMedicineCheck {
  exists: boolean;
  existingMedicine?: Medicine;
}
