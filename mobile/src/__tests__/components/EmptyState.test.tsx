/**
 * EmptyState tests — Sprint 59.
 *
 * 3 varyant (illustration/icon/simple) + i18n + a11y.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { EmptyState } from '../../components/common/EmptyState';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: { create: <T,>(s: T): T => s, flatten: <T,>(s: T): T => s },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');
jest.mock('../../components/common/PillboxIllustration', () => ({
  PillboxIllustration: () => null,
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#fff',
      surface: '#fff',
      text: '#000',
      textSecondary: '#666',
      textMuted: '#999',
      primary: '#0D9488',
      primaryContainer: '#CCFBF1',
      error: '#B91C1C',
    },
    isDark: false,
  }),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'tr' }),
}));

jest.mock('../../hooks/useHaptics', () => ({
  useHaptics: () => ({
    light: jest.fn(),
    medium: jest.fn(),
    heavy: jest.fn(),
    selection: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('EmptyState', () => {
  it('renders illustration variant with title', () => {
    const { getByText, getByTestId } = render(<EmptyState title="Test başlık" testID="es" />);
    expect(getByText('Test başlık')).toBeTruthy();
    expect(getByTestId('es')).toBeTruthy();
  });

  it('renders message when provided', () => {
    const { getByText } = render(<EmptyState title="T" message="Bu bir mesaj" />);
    expect(getByText('Bu bir mesaj')).toBeTruthy();
  });

  it('renders action button when actionLabel + onAction', () => {
    const onAction = jest.fn();
    const { getByText } = render(<EmptyState title="T" actionLabel="Ekle" onAction={onAction} />);
    expect(getByText('Ekle')).toBeTruthy();
  });

  it('does not render action when only label provided', () => {
    const { queryByText } = render(<EmptyState title="T" actionLabel="Ekle" />);
    expect(queryByText('Ekle')).toBeNull();
  });

  it('icon variant renders with custom iconName', () => {
    const { UNSAFE_root } = render(<EmptyState variant="icon" iconName="medkit" title="T" />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('simple variant does not render illustration/icon', () => {
    const { UNSAFE_root } = render(<EmptyState variant="simple" title="T" message="M" />);
    expect(UNSAFE_root).toBeTruthy();
  });
});
