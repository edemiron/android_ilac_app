/**
 * ActionSheetMenu — Sprint 107.2 (Radikal UI Mimarisi).
 *
 * ModalSheet (Sprint 106.4) single-row varyantı. Action list (key, label,
 * icon, destructive, disabled) + cancel button + optional title/message.
 * iOS grouped list action sheet pattern.
 *
 * Migration targets (Sprint 107.2):
 *   - MedicinesScreen actionMenu (single pause/delete — Sprint 107.2)
 *   - MedicinesScreen snooze (CurrentDoseCard'dan Sprint 106.4 zaten ModalSheet — action sheet değil)
 *   - CaregiverScreen inline action menu
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { withAlpha, ALPHA } from '../../utils/colors';
import { spacing, radius } from '../../theme/tokens';
import { ModalSheet } from './ModalSheet';

export interface ActionSheetMenuAction {
  key: string;
  label: string;
  icon?: string;
  destructive?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

export interface ActionSheetMenuProps {
  visible: boolean;
  title?: string;
  message?: string;
  actions: ActionSheetMenuAction[];
  onClose: () => void;
  cancelLabel?: string;
}

export function ActionSheetMenu({
  visible,
  title,
  message,
  actions,
  onClose,
  cancelLabel = 'İptal',
}: ActionSheetMenuProps) {
  const { colors } = useTheme();

  const handleActionPress = (action: ActionSheetMenuAction) => {
    if (action.disabled) return;
    action.onPress();
    onClose();
  };

  return (
    <ModalSheet
      visible={visible}
      title={title}
      onClose={onClose}
      actions={
        <View>
          {actions.map(action => (
            <TouchableOpacity
              key={action.key}
              onPress={() => handleActionPress(action)}
              disabled={action.disabled}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              style={[
                styles.action,
                action.destructive && {
                  backgroundColor: withAlpha(colors.error, ALPHA.veil),
                },
              ]}
            >
              {action.icon ? (
                <Ionicons
                  name={action.icon as never}
                  size={20}
                  color={action.destructive ? colors.error : colors.text}
                />
              ) : null}
              <Text
                style={[
                  styles.actionLabel,
                  { color: action.destructive ? colors.error : colors.text },
                  action.disabled && { color: colors.textMuted },
                ]}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
            style={[styles.action, styles.cancel]}
          >
            <Text style={[styles.actionLabel, { color: colors.textMuted, fontWeight: '700' }]}>
              {cancelLabel}
            </Text>
          </TouchableOpacity>
        </View>
      }
    >
      {message ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      ) : null}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  cancel: {
    marginTop: spacing.sm,
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
});