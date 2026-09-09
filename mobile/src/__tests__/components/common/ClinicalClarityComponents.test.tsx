import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  __esModule: true,
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  TextInput: 'TextInput',
  ActivityIndicator: 'ActivityIndicator',
  StyleSheet: {
    create: <T,>(s: T): T => s,
    flatten: <T,>(s: T): T => s,
    hairlineWidth: 1,
  },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#0D9488',
      card: '#FFFFFF',
      border: '#E2E8F0',
      text: '#0F172A',
      textSecondary: '#64748B',
      placeholder: '#94A3B8',
      surfaceContainer: '#F1F5F9',
      accent: '#F43F5E',
    },
    isDark: false,
  }),
}));

import { ClinicalCard } from '../../../components/common/ClinicalCard';
import { ClinicalButton } from '../../../components/common/ClinicalButton';
import { ClinicalBadge } from '../../../components/common/ClinicalBadge';
import { ClinicalSearchBar } from '../../../components/common/ClinicalSearchBar';
import { ScreenHeader } from '../../../components/common/ScreenHeader';

describe('Clinical Clarity Components', () => {
  describe('ClinicalCard', () => {
    it('renders correctly', () => {
      const { toJSON } = render(
        <ClinicalCard>
          <></>
        </ClinicalCard>
      );
      expect(toJSON()).toBeTruthy();
    });

    it('handles onPress when provided', () => {
      const onPressMock = jest.fn();
      const { getByTestId } = render(
        <ClinicalCard onPress={onPressMock} testID="test-card">
          <></>
        </ClinicalCard>
      );
      fireEvent.press(getByTestId('test-card'));
      expect(onPressMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('ClinicalButton', () => {
    it('renders title and triggers onPress', () => {
      const onPressMock = jest.fn();
      const { getByTestId } = render(
        <ClinicalButton title="Kaydet" onPress={onPressMock} testID="btn-kaydet" />
      );
      fireEvent.press(getByTestId('btn-kaydet'));
      expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    it('renders different variants without throwing', () => {
      const { toJSON } = render(
        <>
          <ClinicalButton title="Primary" variant="primary" onPress={() => {}} />
          <ClinicalButton title="Secondary" variant="secondary" onPress={() => {}} />
          <ClinicalButton title="Inverted" variant="inverted" onPress={() => {}} />
          <ClinicalButton title="Outlined" variant="outlined" onPress={() => {}} />
          <ClinicalButton title="Danger" variant="danger" onPress={() => {}} />
        </>
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('ClinicalBadge', () => {
    it('renders label with status variants', () => {
      const { toJSON } = render(
        <>
          <ClinicalBadge label="Alındı" variant="taken" />
          <ClinicalBadge label="Atlandı" variant="skipped" />
          <ClinicalBadge label="Kaçırıldı" variant="missed" />
          <ClinicalBadge label="Bekliyor" variant="pending" />
        </>
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('ClinicalSearchBar', () => {
    it('handles typing text', () => {
      const onChangeTextMock = jest.fn();
      const { getByPlaceholderText } = render(
        <ClinicalSearchBar value="" onChangeText={onChangeTextMock} placeholder="İlaç ara..." />
      );

      const input = getByPlaceholderText('İlaç ara...');
      fireEvent.changeText(input, 'Aspirin');
      expect(onChangeTextMock).toHaveBeenCalledWith('Aspirin');
    });
  });

  describe('ScreenHeader', () => {
    it('renders header with back button', () => {
      const onBackMock = jest.fn();
      const { toJSON } = render(
        <ScreenHeader
          title="Ana Başlık"
          subtitle="Açıklama alt başlığı"
          showBack
          onBack={onBackMock}
        />
      );
      expect(toJSON()).toBeTruthy();
    });
  });
});
