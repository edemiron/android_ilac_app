/**
 * MedicineNameInput Unit Tests
 */

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { MedicineNameInput } from '../../../components/addMedicine/MedicineNameInput';

// Mock React Native
jest.mock('react-native', () => ({
  StyleSheet: {
    create: (styles: any) => styles,
    hairlineWidth: 1,
  },
  Platform: {
    OS: 'android',
  },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  TextInput: 'TextInput',
  ActivityIndicator: 'ActivityIndicator',
  FlatList: 'FlatList',
}));

// Mock Ionicons
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

const mockColors: any = {
  text: '#FFFFFF',
  textSecondary: '#94A3B8',
  card: '#1E293B',
  background: '#0F172A',
  border: '#334155',
  placeholder: '#64748B',
  primary: '#0D9488',
  divider: '#334155',
};

const mockAutocompleteState: any = {
  results: [],
  showAutocomplete: false,
  isLoading: false,
};

describe('MedicineNameInput', () => {
  it('renders input with placeholder and value', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <MedicineNameInput
          value="NOVAQUA"
          onChangeText={jest.fn()}
          onFocus={jest.fn()}
          onBlur={jest.fn()}
          autocompleteState={mockAutocompleteState}
          onSelectAutocomplete={jest.fn()}
          label="İlaç Adı"
          placeholder="İlaç adını yazın"
          colors={mockColors}
        />
      );
    });

    const root = tree.root;
    const textInput = root.findByProps({ placeholder: 'İlaç adını yazın' });
    expect(textInput.props.value).toBe('NOVAQUA');
  });

  it('renders clear button when value is not empty and triggers onChangeText with empty string', () => {
    const mockOnChangeText = jest.fn();
    const mockOnBlur = jest.fn();
    let tree: any;

    act(() => {
      tree = renderer.create(
        <MedicineNameInput
          value="NOVAQUA TEK DOZLUK GÖZ DAMLASI"
          onChangeText={mockOnChangeText}
          onFocus={jest.fn()}
          onBlur={mockOnBlur}
          autocompleteState={mockAutocompleteState}
          onSelectAutocomplete={jest.fn()}
          label="İlaç Adı"
          placeholder="İlaç adını yazın"
          colors={mockColors}
        />
      );
    });

    const root = tree.root;
    const clearButton = root.findByProps({ accessibilityLabel: 'Yazıyı temizle' });
    expect(clearButton).toBeTruthy();

    act(() => {
      clearButton.props.onPress();
    });

    expect(mockOnChangeText).toHaveBeenCalledWith('');
    expect(mockOnBlur).toHaveBeenCalled();
  });

  it('does not render clear button when value is empty', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <MedicineNameInput
          value=""
          onChangeText={jest.fn()}
          onFocus={jest.fn()}
          onBlur={jest.fn()}
          autocompleteState={mockAutocompleteState}
          onSelectAutocomplete={jest.fn()}
          label="İlaç Adı"
          placeholder="İlaç adını yazın"
          colors={mockColors}
        />
      );
    });

    const root = tree.root;
    const clearButtons = root.findAllByProps({ accessibilityLabel: 'Yazıyı temizle' });
    expect(clearButtons.length).toBe(0);
  });
});
