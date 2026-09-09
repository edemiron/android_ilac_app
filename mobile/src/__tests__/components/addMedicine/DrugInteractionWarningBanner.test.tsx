import React from 'react';
import { render } from '@testing-library/react-native';
import { DrugInteractionWarningBanner } from '../../../components/addMedicine/DrugInteractionWarningBanner';
import { Medicine } from '../../../types';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: { create: <T,>(s: T): T => s, flatten: <T,>(s: T): T => s },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    colors: {
      primary: '#0D9488',
      text: '#0F172A',
      background: '#F8FAFC',
    },
  }),
}));

jest.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'tr',
    t: (key: string) => key,
  }),
}));

describe('DrugInteractionWarningBanner', () => {
  const mockExistingMedicines: Medicine[] = [
    {
      id: 'med-1',
      name: 'Aspirin',
      dosage: '100mg',
      frequency: 1,
      color: '#FF6B6B',
      startDate: '2026-08-01T00:00:00.000Z',
      isActive: true,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
  ];

  it('renders null when no name or short name is provided', () => {
    const { toJSON } = render(
      <DrugInteractionWarningBanner currentName="As" existingMedicines={mockExistingMedicines} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders warning banner when an interacting drug (Warfarin) is typed', () => {
    const { getByText } = render(
      <DrugInteractionWarningBanner
        currentName="Warfarin"
        existingMedicines={mockExistingMedicines}
      />
    );

    expect(getByText('YÜKSEK RİSKLİ İLAÇ ETKİLEŞİMİ')).toBeTruthy();
    expect(getByText('Bu ilaç, listenizdeki "Aspirin" ile etkileşime girebilir.')).toBeTruthy();
  });

  it('renders null when a non-interacting drug (Parol) is typed', () => {
    const { toJSON } = render(
      <DrugInteractionWarningBanner currentName="Parol" existingMedicines={mockExistingMedicines} />
    );
    expect(toJSON()).toBeNull();
  });
});
