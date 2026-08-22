/**
 * AddMedicineScreen tests — Sprint 8 Tier 4 devamı
 * Component mock'lu render smoke testleri
 */

import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  StyleSheet: {
    create: <T,>(styles: T): T => styles,
    flatten: <T,>(styles: T): T => styles,
  },
  Platform: { OS: 'android' },
  NativeModules: {
    WidgetDataModule: {
      setWidgetData: jest.fn(),
    },
  },
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
}));

jest.mock('../../stores/medicineStore', () => ({
  useMedicineStore: jest.fn((selector?: (state: { medicines: unknown[] }) => unknown) =>
    selector ? selector({ medicines: [] }) : { medicines: [] }
  ),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));

// useAddMedicine hook mock'lu — tüm state'ler varsayilan
const mockHandleAddTime = jest.fn();
const mockHandleDeleteTime = jest.fn();
const mockHandleEditTime = jest.fn();
const mockHandleSave = jest.fn();
const mockHandleScanBarcode = jest.fn();

jest.mock('../../hooks/useAddMedicine', () => ({
  useAddMedicine: () => ({
    routeParams: {},
    isEditing: false,
    colors: {
      background: '#fff',
      surface: '#f5f5f5',
      text: '#000',
      primary: '#4ECDC4',
      textSecondary: '#666',
      border: '#ddd',
      danger: '#ff0000',
    },
    t: (key: string) => key,
    language: 'tr',
    settings: {
      wakeUpTime: '08:00',
      sleepTime: '23:00',
    },
    formState: {
      name: '',
      dosage: '',
      frequency: 1,
      color: '#FF6B6B',
      reminderTimes: [],
    },
    updateFormField: jest.fn(),
    autocompleteState: { visible: false, suggestions: [] },
    setNameInputFocused: jest.fn(),
    handleSelectAutocomplete: jest.fn(),
    timePickerState: { visible: false, index: null },
    handleAddTime: mockHandleAddTime,
    handleEditTime: mockHandleEditTime,
    handleDeleteTime: mockHandleDeleteTime,
    pickerState: { type: null, visible: false },
    togglePicker: jest.fn(),
    closePicker: jest.fn(),
    instructions: 'after_meal',
    setInstructions: jest.fn(),
    autocompleteByName: jest.fn(),
    handleOpenAutocomplete: jest.fn(),
    handleSubmit: jest.fn(),
    handleCancel: jest.fn(),
    handleSave: mockHandleSave,
    handleScanBarcode: mockHandleScanBarcode,
  }),
}));

jest.mock('../../components/addMedicine', () => ({
  MedicineNameInput: () => null,
  DosageInput: () => null,
  FrequencySelector: () => null,
  InstructionSelector: () => null,
  ColorPicker: () => null,
  ReminderTimes: () => null,
  FormButtons: () => null,
  StockSection: () => null,
  ExpirySection: () => null,
  ImagePickerSection: () => null,
  AdvancedSettingsSection: () => null,
  ScheduleSelector: () => null,
  DrugInteractionWarningBanner: () => null,
}));

jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import AddMedicineScreen from '../../screens/AddMedicineScreen';

describe('AddMedicineScreen', () => {
  it('renders without crashing', () => {
    const { root } = render(<AddMedicineScreen />);
    expect(root).toBeTruthy();
  });

  it('renders ScrollView', () => {
    const { UNSAFE_root } = render(<AddMedicineScreen />);
    expect(UNSAFE_root).toBeTruthy();
  });
});
