/**
 * BulkActions tests — Sprint 104.2 (Karol-style HomeScreen modernization).
 *
 * Davranislar:
 * - pendingCount === 0 ise iki buton da disabled
 * - "Tumunu Al" press → Alert.alert confirm tetiklenir
 * - "Tumunu Atla" press → Alert.alert confirm tetiklenir
 * - Confirm sonrasi onTakeAll/onSkipAll cagirilir
 * - isSubmitting guard (multi-tap) — pendingCount 0 olmasa bile 2. tap korumali
 * - 2 buton render (PrimaryButton + TonalButton cancel)
 * - tr dil: 'Tumunu Al' / 'Tumunu Atla'
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Alert.alert'i spy'la — inline factory guvenli.
jest.mock('react-native', () => {
  const mockAlert = jest.fn();
  return {
    __esModule: true,
    View: 'View',
    Text: 'Text',
    StyleSheet: {
      create: <T,>(s: T): T => s,
      flatten: <T,>(s: T): T => s,
    },
    Alert: { alert: mockAlert },
  };
});

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'tr', setLanguage: jest.fn() }),
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#14B8A6',
      primaryContainer: '#CCFBF1',
      onPrimaryContainer: '#0F766E',
      warningContainer: '#FEF3C7',
      onWarningContainer: '#78350F',
      errorContainer: '#FFDAD6',
      onErrorContainer: '#410002',
    },
    isDark: false,
  }),
}));

// MotiPressable'i host element gibi davranan noop mock olarak yaz.
jest.mock('../../../components/common/MotiPressable', () => {
  const ReactLocal = require('react');
  return {
    MotiPressable: (props: { children?: React.ReactNode; [k: string]: unknown }) =>
      ReactLocal.createElement('MotiPressable', props, props.children),
  };
});

import { BulkActions } from '../../../screens/HomeScreen/components/BulkActions';

const RNMock = jest.requireMock('react-native');
const alertSpy = RNMock.Alert.alert as jest.Mock;

describe('BulkActions', () => {
  beforeEach(() => {
    alertSpy.mockClear();
  });

  it('renders without crashing', () => {
    const { UNSAFE_root } = render(
      <BulkActions pendingCount={3} onTakeAll={() => {}} onSkipAll={() => {}} />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('renders both buttons in Turkish', () => {
    const { getByText } = render(
      <BulkActions pendingCount={3} onTakeAll={() => {}} onSkipAll={() => {}} />
    );
    expect(getByText('Tümünü Al')).toBeTruthy();
    expect(getByText('Tümünü Atla')).toBeTruthy();
  });

  it('disabled durumda iki buton da disabled', () => {
    const { UNSAFE_root } = render(
      <BulkActions pendingCount={0} onTakeAll={() => {}} onSkipAll={() => {}} />
    );
    // PrimaryButton + TonalButton MotiPressable sarali; onlarin disabled prop'u true olmali.
    const pressables = UNSAFE_root.findAllByType('MotiPressable');
    expect(pressables.length).toBeGreaterThanOrEqual(2);
    pressables.forEach((p: { props: { disabled?: boolean } }) => {
      expect(p.props.disabled).toBe(true);
    });
  });

  it('"Tumunu Al" press → Alert.alert confirm tetiklenir (TR)', () => {
    const onTakeAll = jest.fn();
    const { UNSAFE_root } = render(
      <BulkActions pendingCount={3} onTakeAll={onTakeAll} onSkipAll={() => {}} />
    );
    // İlk MotiPressable = PrimaryButton (Take All)
    const pressable = UNSAFE_root.findAllByType('MotiPressable')[0];
    fireEvent(pressable, 'press');
    expect(alertSpy).toHaveBeenCalledTimes(1);
    const [title, body] = alertSpy.mock.calls[0];
    expect(title).toBe('Tümünü Onayla');
    expect(body).toContain('3');
    expect(body).toContain('aldım');
  });

  it('Confirm sonrasi onTakeAll callback cagirilir', () => {
    const onTakeAll = jest.fn();
    const { UNSAFE_root } = render(
      <BulkActions pendingCount={3} onTakeAll={onTakeAll} onSkipAll={() => {}} />
    );
    const pressable = UNSAFE_root.findAllByType('MotiPressable')[0];
    fireEvent(pressable, 'press');

    // Alert.alert'in 3. parametresi (buttons array) icindeki Onayla button'u bul
    const buttons = alertSpy.mock.calls[0][2];
    const confirmBtn = buttons.find((b: { text: string }) => b.text === 'Onayla');
    expect(confirmBtn).toBeDefined();
    confirmBtn.onPress();
    expect(onTakeAll).toHaveBeenCalledTimes(1);
  });

  it('"Tumunu Atla" press → Alert.alert confirm (TR)', () => {
    const onSkipAll = jest.fn();
    const { UNSAFE_root } = render(
      <BulkActions pendingCount={2} onTakeAll={() => {}} onSkipAll={onSkipAll} />
    );
    // İkinci MotiPressable = TonalButton (Skip All)
    const pressable = UNSAFE_root.findAllByType('MotiPressable')[1];
    fireEvent(pressable, 'press');
    expect(alertSpy).toHaveBeenCalledTimes(1);
    const [title, body] = alertSpy.mock.calls[0];
    expect(title).toBe('Tümünü Atla');
    expect(body).toContain('2');
  });

  it('pendingCount 0 iken press Alert tetiklemez', () => {
    const onTakeAll = jest.fn();
    const { UNSAFE_root } = render(
      <BulkActions pendingCount={0} onTakeAll={onTakeAll} onSkipAll={() => {}} />
    );
    const pressable = UNSAFE_root.findAllByType('MotiPressable')[0];
    fireEvent(pressable, 'press');
    // disabled oldugu icin Alert.alert cagirilmamali
    expect(alertSpy).not.toHaveBeenCalled();
    expect(onTakeAll).not.toHaveBeenCalled();
  });
});
