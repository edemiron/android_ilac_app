import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  __esModule: true,
  View: 'View',
  Text: 'Text',
  StyleSheet: {
    create: <T,>(s: T): T => s,
    flatten: <T,>(s: T): T => s,
  },
  TouchableOpacity: 'TouchableOpacity',
  Platform: {
    OS: 'android',
    select: (objs: any) => objs.android || objs.default,
  },
}));

import { PricingOptionCard } from '../../../screens/PremiumScreen/components/PricingOptionCard';
import { createThemeMock } from '../../helpers/themeMock';

describe('PricingOptionCard Component', () => {
  const colors = createThemeMock();

  it('renders Lifetime (Ömür Boyu) option with special best-value badge', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <PricingOptionCard
        period="lifetime"
        isSelected={true}
        onSelect={onSelect}
        price="₺499,99"
        colors={colors}
        language="tr"
      />
    );

    expect(getByText('Ömür Boyu (Lifetime)')).toBeTruthy();
    expect(getByText('₺499,99')).toBeTruthy();
    expect(getByText('⭐ EN POPÜLER — TEK SEFERLİK')).toBeTruthy();
    expect(getByText('Abonelik yok, sonsuza dek kullanım')).toBeTruthy();
  });

  it('renders Yearly option with savings badge and triggers selection', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <PricingOptionCard
        period="yearly"
        isSelected={false}
        onSelect={onSelect}
        price="₺349,99"
        savingsPercentage={42}
        pricePerMonth="≈ ₺29,17 / ay"
        colors={colors}
        language="tr"
      />
    );

    expect(getByText('Yıllık')).toBeTruthy();
    expect(getByText('%42 TASARRUF')).toBeTruthy();

    fireEvent.press(getByText('Yıllık'));
    expect(onSelect).toHaveBeenCalled();
  });
});
