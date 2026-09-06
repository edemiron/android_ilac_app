import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: {
    create: (s: any) => s,
    hairlineWidth: 1,
    flatten: (s: any) => s,
  },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

import { VitalCorrelationCard } from '../../screens/StatisticsScreen/components/VitalCorrelationCard';
import { useSymptomStore } from '../../stores/symptomStore';
import type { Medicine } from '../../types';

const mockColors: any = {
  card: '#1E293B',
  border: '#334155',
  text: '#FFFFFF',
  textMuted: '#94A3B8',
  primary: '#0D9488',
};

const mockMedicines: Medicine[] = [
  {
    id: 'med-1',
    name: 'Amlodipin 5mg',
    dosage: '1 tablet',
    frequency: 1,
    category: 'heart',
    color: '#3B82F6',
    startDate: '2026-01-01',
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

describe('VitalCorrelationCard', () => {
  beforeEach(() => {
    useSymptomStore.getState().clearAllLogs();
  });

  it('renders default empty metrics when no logs exist', () => {
    const onOpen = jest.fn();
    const { getByText, getAllByText } = render(
      <VitalCorrelationCard
        medicines={mockMedicines}
        overallAdherenceRate={85}
        onOpenRecordVital={onOpen}
        colors={mockColors}
        isDark={true}
        language="tr"
      />
    );

    expect(getByText('Vital Bulgular & Korelasyon')).toBeTruthy();
    expect(getByText('Ölçüm Ekle')).toBeTruthy();
    expect(getAllByText('Ölçüm Yok').length).toBeGreaterThan(0);
  });

  it('calculates averages and renders status badges when logs are present', () => {
    useSymptomStore.getState().addSymptomLog({
      type: 'blood_pressure',
      systolic: 120,
      diastolic: 80,
      pulse: 72,
    });
    useSymptomStore.getState().addSymptomLog({
      type: 'blood_pressure',
      systolic: 128,
      diastolic: 80,
      pulse: 76,
    });
    useSymptomStore.getState().addSymptomLog({
      type: 'blood_sugar',
      glucose: 96,
    });

    const { getByText } = render(
      <VitalCorrelationCard
        medicines={mockMedicines}
        overallAdherenceRate={90}
        onOpenRecordVital={jest.fn()}
        colors={mockColors}
        isDark={true}
        language="tr"
      />
    );

    // Ortalama tansiyon: 124/80 ve şeker: 96
    expect(getByText(/124\/80/)).toBeTruthy();
    expect(getByText(/96/)).toBeTruthy();
    expect(getByText('Normal')).toBeTruthy();
  });

  it('calls onOpenRecordVital on button press', () => {
    const onOpen = jest.fn();
    const { getByLabelText } = render(
      <VitalCorrelationCard
        medicines={mockMedicines}
        overallAdherenceRate={85}
        onOpenRecordVital={onOpen}
        colors={mockColors}
        isDark={true}
        language="tr"
      />
    );

    const btn = getByLabelText('Yeni Ölçüm Ekle');
    fireEvent.press(btn);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
