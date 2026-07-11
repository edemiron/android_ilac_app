/**
 * ErrorState tests — Sprint 59.
 *
 * Title/message + errorCode + retry callback.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ErrorState, ErrorStateDefaults } from '../../components/common/ErrorState';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: { create: <T,>(s: T): T => s, flatten: <T,>(s: T): T => s },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#fff',
      text: '#000',
      textSecondary: '#666',
      textMuted: '#999',
      primary: '#0D9488',
      error: '#B91C1C',
    },
    isDark: false,
  }),
}));

describe('ErrorState', () => {
  it('renders with title', () => {
    const { getByText, getByTestId } = render(<ErrorState title="Sunucu hatası" testID="err" />);
    expect(getByText('Sunucu hatası')).toBeTruthy();
    expect(getByTestId('err')).toBeTruthy();
  });

  it('renders message when provided', () => {
    const { getByText } = render(<ErrorState title="Hata" message="Lütfen tekrar deneyin" />);
    expect(getByText('Lütfen tekrar deneyin')).toBeTruthy();
  });

  it('renders errorCode in monospace', () => {
    const { getByTestId } = render(<ErrorState title="Hata" errorCode="E_NET_500" />);
    const codeNode = getByTestId('error-code');
    expect(codeNode).toBeTruthy();
    expect(codeNode.props.children).toBe('E_NET_500');
  });

  it('renders retry button when onRetry provided', () => {
    const onRetry = jest.fn();
    const { getByText } = render(
      <ErrorState title="Hata" retryLabel="Tekrar Dene" onRetry={onRetry} />
    );
    expect(getByText('Tekrar Dene')).toBeTruthy();
  });

  it('does not render retry without onRetry', () => {
    const { queryByText } = render(<ErrorState title="Hata" retryLabel="Tekrar Dene" />);
    expect(queryByText('Tekrar Dene')).toBeNull();
  });

  it('exposes default label constants', () => {
    expect(ErrorStateDefaults.DEFAULT_RETRY_LABEL).toBe('Tekrar Dene');
    expect(ErrorStateDefaults.DEFAULT_RETRY_LABEL_EN).toBe('Try Again');
    expect(ErrorStateDefaults.DEFAULT_TITLE).toBe('Bir şeyler ters gitti');
    expect(ErrorStateDefaults.DEFAULT_TITLE_EN).toBe('Something went wrong');
  });
});
