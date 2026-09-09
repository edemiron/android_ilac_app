import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: {
    create: <T,>(s: T): T => s,
    flatten: <T,>(s: T): T => s,
  },
  Alert: { alert: jest.fn() },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

import { AlarmHealthBanner } from '../../../screens/HomeScreen/components/AlarmHealthBanner';
import * as oemStatusHook from '../../../hooks/useOemShieldStatus';
import * as oemShieldEngine from '../../../utils/oemShieldEngine';

jest.mock('../../../hooks/useOemShieldStatus');
jest.mock('../../../utils/oemShieldEngine', () => ({
  openOEMShieldSetting: jest.fn(),
}));

describe('AlarmHealthBanner', () => {
  const mockNotifySettingsOpened = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders null when status is not resolved', () => {
    jest.spyOn(oemStatusHook, 'useOemShieldStatus').mockReturnValue({
      phase: 'loading',
      status: null,
      isRefreshing: false,
      lastCheckedAt: null,
      hasError: false,
      isResolved: false,
      refresh: jest.fn(),
      notifySettingsOpened: mockNotifySettingsOpened,
    });

    const { queryByTestId } = render(<AlarmHealthBanner language="tr" isDark={false} />);
    expect(queryByTestId('alarm-health-banner')).toBeNull();
  });

  it('renders null when all permissions are granted', () => {
    jest.spyOn(oemStatusHook, 'useOemShieldStatus').mockReturnValue({
      phase: 'resolved',
      status: {
        oem: 'samsung',
        manufacturer: 'samsung',
        brand: 'samsung',
        model: 'SM-X700',
        sdkVersion: 34,
        notifications: true,
        exactAlarm: true,
        batteryOptimizationIgnored: true,
        fullScreenIntent: true,
        hasCustomOEMShield: true,
      },
      isRefreshing: false,
      lastCheckedAt: 1000,
      hasError: false,
      isResolved: true,
      refresh: jest.fn(),
      notifySettingsOpened: mockNotifySettingsOpened,
    });

    const { queryByTestId } = render(<AlarmHealthBanner language="tr" isDark={false} />);
    expect(queryByTestId('alarm-health-banner')).toBeNull();
  });

  it('warns about missing notification permission', () => {
    jest.spyOn(oemStatusHook, 'useOemShieldStatus').mockReturnValue({
      phase: 'resolved',
      status: {
        oem: 'samsung',
        manufacturer: 'samsung',
        brand: 'samsung',
        model: 'SM-X700',
        sdkVersion: 34,
        notifications: false,
        exactAlarm: true,
        batteryOptimizationIgnored: true,
        fullScreenIntent: true,
        hasCustomOEMShield: true,
      },
      isRefreshing: false,
      lastCheckedAt: 1000,
      hasError: false,
      isResolved: true,
      refresh: jest.fn(),
      notifySettingsOpened: mockNotifySettingsOpened,
    });

    const { getByText } = render(<AlarmHealthBanner language="tr" isDark={false} />);
    expect(getByText('Bildirim İzni Eksik')).toBeTruthy();
  });

  it('warns about missing exact alarm permission and opens settings on button click', () => {
    jest.spyOn(oemStatusHook, 'useOemShieldStatus').mockReturnValue({
      phase: 'resolved',
      status: {
        oem: 'samsung',
        manufacturer: 'samsung',
        brand: 'samsung',
        model: 'SM-X700',
        sdkVersion: 34,
        notifications: true,
        exactAlarm: false,
        batteryOptimizationIgnored: true,
        fullScreenIntent: true,
        hasCustomOEMShield: true,
      },
      isRefreshing: false,
      lastCheckedAt: 1000,
      hasError: false,
      isResolved: true,
      refresh: jest.fn(),
      notifySettingsOpened: mockNotifySettingsOpened,
    });

    const { getByText } = render(<AlarmHealthBanner language="tr" isDark={false} />);
    expect(getByText('Kesin Alarm İzni Gerekli')).toBeTruthy();

    const actionBtn = getByText('İzni Ver');
    fireEvent.press(actionBtn);

    expect(mockNotifySettingsOpened).toHaveBeenCalledTimes(1);
    expect(oemShieldEngine.openOEMShieldSetting).toHaveBeenCalledWith('exact_alarm');
  });

  it('warns about missing full screen intent permission', () => {
    jest.spyOn(oemStatusHook, 'useOemShieldStatus').mockReturnValue({
      phase: 'resolved',
      status: {
        oem: 'samsung',
        manufacturer: 'samsung',
        brand: 'samsung',
        model: 'SM-X700',
        sdkVersion: 34,
        notifications: true,
        exactAlarm: true,
        batteryOptimizationIgnored: true,
        fullScreenIntent: false,
        hasCustomOEMShield: true,
      },
      isRefreshing: false,
      lastCheckedAt: 1000,
      hasError: false,
      isResolved: true,
      refresh: jest.fn(),
      notifySettingsOpened: mockNotifySettingsOpened,
    });

    const { getByText } = render(<AlarmHealthBanner language="tr" isDark={false} />);
    expect(getByText('Kilit Ekranı İzni Kapalı')).toBeTruthy();
  });

  it('dismisses when close button is pressed', () => {
    jest.spyOn(oemStatusHook, 'useOemShieldStatus').mockReturnValue({
      phase: 'resolved',
      status: {
        oem: 'samsung',
        manufacturer: 'samsung',
        brand: 'samsung',
        model: 'SM-X700',
        sdkVersion: 34,
        notifications: true,
        exactAlarm: true,
        batteryOptimizationIgnored: false,
        fullScreenIntent: true,
        hasCustomOEMShield: true,
      },
      isRefreshing: false,
      lastCheckedAt: 1000,
      hasError: false,
      isResolved: true,
      refresh: jest.fn(),
      notifySettingsOpened: mockNotifySettingsOpened,
    });

    const { getByLabelText, queryByTestId } = render(
      <AlarmHealthBanner language="tr" isDark={false} />
    );
    expect(queryByTestId('alarm-health-banner')).toBeTruthy();

    const dismissBtn = getByLabelText('Kapat');
    fireEvent.press(dismissBtn);

    expect(queryByTestId('alarm-health-banner')).toBeNull();
  });
});
