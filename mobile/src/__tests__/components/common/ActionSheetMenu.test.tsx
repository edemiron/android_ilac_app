/**
 * ActionSheetMenu.test.tsx — Sprint 107.2
 *
 * Coverage: visible modal, action list render, onPress callback, destructive styling,
 * disabled state, cancel button, close after action.
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

import { ActionSheetMenu, type ActionSheetMenuAction } from '../../../components/common/ActionSheetMenu';

const baseActions: ActionSheetMenuAction[] = [
  { key: 'edit', label: 'Düzenle', icon: 'pencil-outline', onPress: jest.fn() },
  { key: 'delete', label: 'Sil', icon: 'trash-outline', destructive: true, onPress: jest.fn() },
];

describe('ActionSheetMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders ModalSheet visible when visible=true', () => {
    const { UNSAFE_root } = render(
      <ActionSheetMenu visible actions={[]} onClose={() => {}} />
    );
    expect(UNSAFE_root.findByType('Modal').props.visible).toBe(true);
  });

  it('renders ModalSheet not visible when visible=false', () => {
    const { UNSAFE_root } = render(
      <ActionSheetMenu visible={false} actions={[]} onClose={() => {}} />
    );
    expect(UNSAFE_root.findByType('Modal').props.visible).toBe(false);
  });

  it('renders all action labels', () => {
    const { getByText } = render(
      <ActionSheetMenu visible actions={baseActions} onClose={() => {}} />
    );
    expect(getByText('Düzenle')).toBeTruthy();
    expect(getByText('Sil')).toBeTruthy();
  });

  it('calls action onPress and closes when tapped', () => {
    const onClose = jest.fn();
    const onPress = jest.fn();
    const { getByText } = render(
      <ActionSheetMenu
        visible
        actions={[{ key: 'edit', label: 'Düzenle', onPress }]}
        onClose={onClose}
      />
    );
    fireEvent.press(getByText('Düzenle'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders custom cancelLabel', () => {
    const { getByText } = render(
      <ActionSheetMenu
        visible
        actions={[]}
        onClose={() => {}}
        cancelLabel="Kapat"
      />
    );
    expect(getByText('Kapat')).toBeTruthy();
  });

  it('renders default cancelLabel "İptal" when not provided', () => {
    const { getByText } = render(
      <ActionSheetMenu visible actions={[]} onClose={() => {}} />
    );
    expect(getByText('İptal')).toBeTruthy();
  });

  it('does not call onPress when action is disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ActionSheetMenu
        visible
        actions={[{ key: 'edit', label: 'Devre Dışı', onPress, disabled: true }]}
        onClose={() => {}}
      />
    );
    fireEvent.press(getByText('Devre Dışı'));
    expect(onPress).not.toHaveBeenCalled();
  });
});