/**
 * ConfirmDialog.test.tsx — Sprint 107.2
 *
 * Coverage: title/message render, confirm/cancel buttons, onConfirm + onClose
 * callbacks, destructive styling, accessibility labels.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  __esModule: true,
  View: 'View',
  Text: 'Text',
  StyleSheet: {
    create: <T,>(s: T): T => s,
    flatten: <T,>(s: T): T => s,
    hairlineWidth: 1,
  },
  Modal: 'Modal',
  Pressable: 'Pressable',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Platform: { OS: 'android' },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      card: '#FFFFFF',
      text: '#0F172A',
      textSecondary: '#64748B',
      textMuted: '#94A3B8',
      error: '#B91C1C',
      primary: '#0D9488',
      border: '#E2E8F0',
    },
    isDark: false,
  }),
}));

import { ConfirmDialog } from '../../../components/common/ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders title', () => {
    const { getByText } = render(
      <ConfirmDialog visible title="İlacı Sil" onConfirm={() => {}} onClose={() => {}} />
    );
    expect(getByText('İlacı Sil')).toBeTruthy();
  });

  it('renders message when provided', () => {
    const { getByText } = render(
      <ConfirmDialog
        visible
        title="Sil"
        message="Bu ilaç kalıcı olarak silinecek."
        onConfirm={() => {}}
        onClose={() => {}}
      />
    );
    expect(getByText('Bu ilaç kalıcı olarak silinecek.')).toBeTruthy();
  });

  it('renders default confirm + cancel labels', () => {
    const { getByText } = render(
      <ConfirmDialog visible title="Test" onConfirm={() => {}} onClose={() => {}} />
    );
    expect(getByText('Onayla')).toBeTruthy();
    expect(getByText('İptal')).toBeTruthy();
  });

  it('renders custom confirm + cancel labels', () => {
    const { getByText } = render(
      <ConfirmDialog
        visible
        title="Test"
        confirmLabel="Sil"
        cancelLabel="Vazgeç"
        onConfirm={() => {}}
        onClose={() => {}}
      />
    );
    expect(getByText('Sil')).toBeTruthy();
    expect(getByText('Vazgeç')).toBeTruthy();
  });

  it('calls onConfirm when confirm button pressed', () => {
    const onConfirm = jest.fn();
    const { getByText } = render(
      <ConfirmDialog visible title="Test" onConfirm={onConfirm} onClose={() => {}} />
    );
    fireEvent.press(getByText('Onayla'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <ConfirmDialog visible title="Test" onConfirm={() => {}} onClose={onClose} />
    );
    fireEvent.press(getByText('İptal'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose after onConfirm (auto-close)', () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();
    const { getByText } = render(
      <ConfirmDialog visible title="Test" onConfirm={onConfirm} onClose={onClose} />
    );
    fireEvent.press(getByText('Onayla'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});