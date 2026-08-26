/**
 * ConfirmDialog — Sprint 107.2 (Radikal UI Mimarisi).
 *
 * ModalSheet (Sprint 106.4) onay varyantı. Title + message + cancel/confirm
 * butonları. destructive=true → confirm button error rengi.
 *
 * Migration targets (Sprint 107.2):
 *   - MedicinesScreen singleDeleteVisible
 *   - HomeScreen expiryModal (expiry warning confirm)
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { withAlpha, ALPHA } from '../../utils/colors';
import { spacing, radius } from '../../theme/tokens';
import { ModalSheet } from './ModalSheet';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  /** Body slot — message altında ek içerik (örn. silinecek öğe listesi). */
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Cancel butonunu gizle (tek butonlu info dialog için). */
  hideCancel?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  children,
  confirmLabel = 'Onayla',
  cancelLabel = 'İptal',
  destructive = false,
  hideCancel = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { colors } = useTheme();

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <ModalSheet
      visible={visible}
      title={title}
      onClose={onClose}
      actions={
        <View style={styles.actions}>
          {!hideCancel && (
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              style={[
                styles.button,
                styles.cancelButton,
                { borderColor: colors.border },
              ]}
            >
              <Text style={[styles.buttonLabel, { color: colors.text }]}>{cancelLabel}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleConfirm}
            accessibilityRole="button"
            accessibilityLabel={confirmLabel}
            style={[
              styles.button,
              styles.confirmButton,
              hideCancel && styles.buttonFull,
              {
                backgroundColor: destructive
                  ? withAlpha(colors.error, ALPHA.over)
                  : colors.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.buttonLabel,
                { color: destructive ? colors.error : colors.textOnPrimary, fontWeight: '700' },
              ]}
            >
              {confirmLabel}
            </Text>
          </TouchableOpacity>
        </View>
      }
    >
      {message ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      ) : null}
      {children}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  confirmButton: {},
  buttonFull: {
    flex: 1,
  },
  buttonLabel: {
    fontSize: 15,
  },
});