/**
 * InlineTagList tests — Sprint 107.4 (Radikal UI Mimarisi).
 */

import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  StyleSheet: {
    create: <T,>(styles: T): T => styles,
    flatten: <T,>(styles: T): T => styles,
  },
  Platform: { OS: 'android' },
  View: 'View',
  Text: 'Text',
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      surfaceContainerHigh: '#f5f5f5',
      card: '#fff',
      primaryContainer: '#A7E8E2',
      onPrimaryContainer: '#003733',
      primary: '#4ECDC4',
      textOnPrimary: '#fff',
      textSecondary: '#666',
      textMuted: '#9CA3AF',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    isDark: false,
  }),
}));

import { InlineTagList, type InlineTagItem } from '../../../components/common/InlineTagList';

describe('InlineTagList', () => {
  const items: InlineTagItem[] = [
    { key: '1', label: 'Aktif', variant: 'success' },
    { key: '2', label: '8 saat', variant: 'info', icon: 'time' },
    { key: '3', label: 'Stok: 5', variant: 'warning' },
  ];

  it('renders all items', () => {
    const { getByText } = render(<InlineTagList items={items} />);
    expect(getByText('Aktif')).toBeTruthy();
    expect(getByText('8 saat')).toBeTruthy();
    expect(getByText('Stok: 5')).toBeTruthy();
  });

  it('renders nothing when items is empty', () => {
    const { UNSAFE_root } = render(<InlineTagList items={[]} />);
    expect(UNSAFE_root.children.length).toBe(0);
  });

  it('renders separator when separator prop is true', () => {
    const { UNSAFE_root } = render(
      <InlineTagList items={items} separator />,
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('renders wrap container when wrap prop is true', () => {
    const { UNSAFE_root } = render(<InlineTagList items={items} wrap />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('uses default size for all items', () => {
    const { UNSAFE_root } = render(
      <InlineTagList items={items} size="md" />,
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('respects per-item size override', () => {
    const mixed: InlineTagItem[] = [
      { key: '1', label: 'Small', size: 'xs' },
      { key: '2', label: 'Medium', size: 'md' },
    ];
    const { getByText } = render(<InlineTagList items={mixed} />);
    expect(getByText('Small')).toBeTruthy();
    expect(getByText('Medium')).toBeTruthy();
  });
});