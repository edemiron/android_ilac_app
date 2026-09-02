import React from 'react';
import { render } from '@testing-library/react-native';

const mockAlert = jest.fn();

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  TouchableOpacity: 'TouchableOpacity',
  Modal: ({ children, visible }: any) => (visible ? children : null),
  Alert: { alert: (...args: any[]) => mockAlert(...args) },
  StyleSheet: { create: <T,>(s: T): T => s, flatten: <T,>(s: T): T => s, hairlineWidth: 1 },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

import { MedicinePhotoChip } from '../../../components/addMedicine/MedicinePhotoChip';
import type { ThemeColors } from '../../../contexts/ThemeContext';

const mockColors = {
  background: '#ffffff',
  surface: '#f8f9fa',
  text: '#1a1a1a',
  textSecondary: '#6c757d',
  primary: '#10b981',
  border: '#e9ecef',
  card: '#ffffff',
} as unknown as ThemeColors;

describe('MedicinePhotoChip', () => {
  beforeEach(() => {
    mockAlert.mockClear();
  });

  it('renders correctly when imageUri is provided', () => {
    const onRemove = jest.fn();
    const { getByText } = render(
      <MedicinePhotoChip
        imageUri="file:///path/to/box.jpg"
        onRemovePhoto={onRemove}
        colors={mockColors}
        language="tr"
      />
    );

    expect(getByText('Kutu Fotoğrafı Eklendi')).toBeTruthy();
    expect(getByText('Büyütmek için dokunun')).toBeTruthy();
  });

  it('returns null when imageUri is not provided', () => {
    const onRemove = jest.fn();
    const { queryByText } = render(
      <MedicinePhotoChip
        imageUri={undefined}
        onRemovePhoto={onRemove}
        colors={mockColors}
        language="tr"
      />
    );

    expect(queryByText('Kutu Fotoğrafı Eklendi')).toBeNull();
  });
});
