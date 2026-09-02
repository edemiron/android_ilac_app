import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  __esModule: true,
  View: 'View',
  Text: 'Text',
  StyleSheet: {
    create: <T,>(s: T): T => s,
    flatten: <T,>(s: T): T => s,
    hairlineWidth: 1,
    absoluteFillObject: {},
  },
  Modal: 'Modal',
  Pressable: 'Pressable',
  TouchableOpacity: 'TouchableOpacity',
  TextInput: 'TextInput',
  ScrollView: 'ScrollView',
  Keyboard: {
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    dismiss: jest.fn(),
  },
  Platform: { OS: 'android' },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('expo-clipboard', () => ({
  getStringAsync: jest.fn(() =>
    Promise.resolve(
      'NUMARANIZ: 20W0T04 - ILACLARINIZ: 2 ADET BETMIGA 50 MG UZATILMIS SALIMLI 30 FILM TABLET (Gunde 1x1.0) - ACIL SIFALAR DILERIZ B002'
    )
  ),
}));

import { EReceteImportModal } from '../../../components/addMedicine/EReceteImportModal';
import * as Clipboard from 'expo-clipboard';

describe('EReceteImportModal', () => {
  const mockColors = {
    primary: '#10B981',
    background: '#0F172A',
    card: '#1E293B',
    text: '#FFFFFF',
    textSecondary: '#94A3B8',
    border: '#334155',
    placeholder: '#64748B',
  } as any;

  const mockOnClose = jest.fn();
  const mockOnSelectMedicine = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal when visible is true', () => {
    const { getByText, getByPlaceholderText } = render(
      <EReceteImportModal
        visible={true}
        onClose={mockOnClose}
        onSelectMedicine={mockOnSelectMedicine}
        colors={mockColors}
        language="tr"
      />
    );

    expect(getByText('E-Reçete Hızlı İçe Aktarma')).toBeTruthy();
    expect(getByPlaceholderText(/Sn. Hasta, 9AB87C/i)).toBeTruthy();
  });

  it('parses input text and displays parsed medicine and recipe number', async () => {
    const { getByPlaceholderText, getByText } = render(
      <EReceteImportModal
        visible={true}
        onClose={mockOnClose}
        onSelectMedicine={mockOnSelectMedicine}
        colors={mockColors}
        language="tr"
      />
    );

    const input = getByPlaceholderText(/Sn. Hasta, 9AB87C/i);
    fireEvent.changeText(
      input,
      'NUMARANIZ: 20W0T04 - ILACLARINIZ: 2 ADET BETMIGA 50 MG UZATILMIS SALIMLI 30 FILM TABLET (Gunde 1x1.0) - ACIL SIFALAR DILERIZ B002'
    );

    const parseBtn = getByText('Reçeteyi Çözümle');
    fireEvent.press(parseBtn);

    await waitFor(() => {
      expect(getByText(/20W0T04/)).toBeTruthy();
      expect(getByText(/BETMIGA 50 MG/)).toBeTruthy();
    });

    const addBtn = getByText('Forma Ekle');
    fireEvent.press(addBtn);

    expect(mockOnSelectMedicine).toHaveBeenCalledWith(
      expect.objectContaining({
        name: expect.stringContaining('BETMIGA 50 MG'),
        frequency: 1,
      }),
      '20W0T04'
    );
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('supports 1-tap paste from clipboard', async () => {
    const { getByText } = render(
      <EReceteImportModal
        visible={true}
        onClose={mockOnClose}
        onSelectMedicine={mockOnSelectMedicine}
        colors={mockColors}
        language="tr"
      />
    );

    const pasteBtn = getByText('Panodan Yapıştır');
    fireEvent.press(pasteBtn);

    await waitFor(() => {
      expect(Clipboard.getStringAsync).toHaveBeenCalled();
      expect(getByText(/20W0T04/)).toBeTruthy();
      expect(getByText(/BETMIGA 50 MG/)).toBeTruthy();
    });
  });
});
