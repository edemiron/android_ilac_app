/**
 * SegmentTabs tests — Sprint 107.3 (Radikal UI Mimarisi).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  StyleSheet: {
    create: <T,>(styles: T): T => styles,
    flatten: <T,>(styles: T): T => styles,
  },
  Platform: { OS: 'android' },
  View: 'View',
  Text: 'Text',
  ScrollView: ({ children }: { children: React.ReactNode }) => children,
  TouchableOpacity: 'TouchableOpacity',
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      surfaceContainerHigh: '#f5f5f5',
      card: '#fff',
      primary: '#4ECDC4',
      textOnPrimary: '#fff',
      textSecondary: '#666',
      textMuted: '#9CA3AF',
    },
    isDark: false,
  }),
}));

import { SegmentTabs } from '../../../components/common/SegmentTabs';

describe('SegmentTabs', () => {
  const items = [
    { key: 'all', label: 'Tümü' },
    { key: 'pending', label: 'Bekleyen' },
    { key: 'done', label: 'Tamamlanan' },
  ];

  it('renders all items', () => {
    const { getByText } = render(
      <SegmentTabs items={items} value="all" onChange={jest.fn()} />,
    );
    expect(getByText('Tümü')).toBeTruthy();
    expect(getByText('Bekleyen')).toBeTruthy();
    expect(getByText('Tamamlanan')).toBeTruthy();
  });

  it('calls onChange with correct key on press', () => {
    const onChange = jest.fn();
    const { UNSAFE_root } = render(
      <SegmentTabs items={items} value="all" onChange={onChange} />,
    );
    const tab = UNSAFE_root.findByProps({ accessibilityLabel: 'Bekleyen' });
    fireEvent.press(tab);
    expect(onChange).toHaveBeenCalledWith('pending');
  });

  it('shows count when item has count prop', () => {
    const itemsWithCount = [
      { key: 'all', label: 'Tümü', count: 12 },
      { key: 'pending', label: 'Bekleyen', count: 3 },
    ];
    const { getByText } = render(
      <SegmentTabs items={itemsWithCount} value="all" onChange={jest.fn()} />,
    );
    expect(getByText(/12/)).toBeTruthy();
    expect(getByText(/3/)).toBeTruthy();
  });

  it('marks active tab with selected state', () => {
    const { UNSAFE_root } = render(
      <SegmentTabs items={items} value="pending" onChange={jest.fn()} />,
    );
    const activeTab = UNSAFE_root.findByProps({ accessibilityLabel: 'Bekleyen' });
    expect(activeTab.props.accessibilityState.selected).toBe(true);
  });

  it('marks inactive tab with selected=false', () => {
    const { UNSAFE_root } = render(
      <SegmentTabs items={items} value="all" onChange={jest.fn()} />,
    );
    const inactiveTab = UNSAFE_root.findByProps({ accessibilityLabel: 'Bekleyen' });
    expect(inactiveTab.props.accessibilityState.selected).toBe(false);
  });

  it('renders underline variant', () => {
    const { UNSAFE_root } = render(
      <SegmentTabs items={items} value="all" onChange={jest.fn()} variant="underline" />,
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('renders icons when item has icon prop', () => {
    const itemsWithIcons = [
      { key: 'list', label: 'Liste', icon: 'list' },
      { key: 'grid', label: 'Izgara', icon: 'grid' },
    ];
    const { UNSAFE_root } = render(
      <SegmentTabs items={itemsWithIcons} value="list" onChange={jest.fn()} />,
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('scrollable variant uses ScrollView wrapper', () => {
    const { UNSAFE_root } = render(
      <SegmentTabs
        items={items}
        value="all"
        onChange={jest.fn()}
        scrollable
      />,
    );
    expect(UNSAFE_root).toBeTruthy();
  });
});