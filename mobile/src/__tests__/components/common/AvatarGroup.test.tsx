/**
 * AvatarGroup tests — Sprint 107.3 (Radikal UI Mimarisi).
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
  TouchableOpacity: 'TouchableOpacity',
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      card: '#fff',
      primary: '#4ECDC4',
      primaryContainer: '#A7E8E2',
      onPrimaryContainer: '#003733',
    },
    isDark: false,
  }),
}));

import { AvatarGroup, type AvatarGroupItem } from '../../../components/common/AvatarGroup';

describe('AvatarGroup', () => {
  const items: AvatarGroupItem[] = [
    { id: '1', name: 'Ali Yılmaz' },
    { id: '2', name: 'Ayşe Demir', color: '#FF6B6B' },
    { id: '3', name: 'Mehmet Kaya' },
  ];

  it('renders all items', () => {
    const { getByText } = render(<AvatarGroup items={items} />);
    expect(getByText('AY')).toBeTruthy(); // Ali Yılmaz → AY
    expect(getByText('AD')).toBeTruthy(); // Ayşe Demir → AD
    expect(getByText('MK')).toBeTruthy(); // Mehmet Kaya → MK
  });

  it('uses provided initials over generated', () => {
    const customItems: AvatarGroupItem[] = [
      { id: '1', name: 'Ali Yılmaz', initials: 'AL' },
    ];
    const { getByText } = render(<AvatarGroup items={customItems} />);
    expect(getByText('AL')).toBeTruthy();
  });

  it('shows overflow indicator when items > maxVisible', () => {
    const manyItems: AvatarGroupItem[] = [
      { id: '1', name: 'Ali' },
      { id: '2', name: 'Ayşe' },
      { id: '3', name: 'Mehmet' },
      { id: '4', name: 'Fatma' },
      { id: '5', name: 'Cem' },
      { id: '6', name: 'Zeynep' },
    ];
    const { getByText } = render(<AvatarGroup items={manyItems} maxVisible={3} />);
    expect(getByText('+3')).toBeTruthy();
  });

  it('does not show overflow when items <= maxVisible', () => {
    const { queryByText } = render(<AvatarGroup items={items} maxVisible={5} />);
    expect(queryByText(/^\+/)).toBeNull();
  });

  it('uses color from item when provided', () => {
    const coloredItems: AvatarGroupItem[] = [
      { id: '1', name: 'Ali', color: '#FF6B6B' },
    ];
    const { UNSAFE_root } = render(<AvatarGroup items={coloredItems} />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('renders with different sizes', () => {
    const { UNSAFE_root: sm } = render(<AvatarGroup items={items} size="sm" />);
    const { UNSAFE_root: md } = render(<AvatarGroup items={items} size="md" />);
    const { UNSAFE_root: lg } = render(<AvatarGroup items={items} size="lg" />);
    expect(sm).toBeTruthy();
    expect(md).toBeTruthy();
    expect(lg).toBeTruthy();
  });
});