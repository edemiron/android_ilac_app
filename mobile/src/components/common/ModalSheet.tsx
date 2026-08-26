/**
 * ModalSheet — Sprint 106.4 (Life360 arayüz kalıbı).
 *
 * Bottom-anchored slide-up modal — iOS grouped list action sheet pattern.
 * Replaces 3 centered dialog modals (BulkDelete, SingleDelete, Snooze) with
 * a single shared component instance.
 *
 * Differences vs CustomAlert:
 * - Bottom-anchored (Life360 action sheet) vs centered dialog
 * - Slide-up animation (sheet entry) vs fade
 * - radius.xl top corners, no bottom radius
 * - Optional drag handle for visual cue
 * - Children slot for arbitrary content (grid options, body text, etc.)
 *
 * Migration targets:
 * - CurrentDoseCard.tsx snoozeModal (Sprint 106.4)
 * - MedicinesScreen.tsx bulkDeleteModal (Sprint 107)
 * - MedicinesScreen.tsx singleDeleteModal (Sprint 107)
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  ScrollView,
  type StyleProp,
  type ViewStyle,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { radius } from '../../theme/tokens';

export interface ModalSheetProps {
  visible: boolean;
  title?: string;
  showHandle?: boolean;
  showCloseButton?: boolean;
  scrollable?: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function ModalSheet({
  visible,
  title,
  showHandle = true,
  showCloseButton = true,
  scrollable = false,
  onClose,
  children,
  actions,
  style,
}: ModalSheetProps) {
  const { colors, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
          onPress={onClose}
          accessibilityLabel="Modal arka plan — kapatmak için dokun"
        >
          {/*
           * Pressable inside Pressable: stops event propagation so taps on sheet
           * don't dismiss it. activityKey-only Pressable means the inner Pressable
           * still works for content; outer triggers onClose on backdrop tap.
           */}
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
              style,
            ]}
            onPress={() => {
              /* no-op — prevents dismiss */
            }}
          >
            {showHandle && (
              <View
                style={[
                  styles.handle,
                  { backgroundColor: isDark ? colors.textMuted : '#D1D5DB' },
                ]}
              />
            )}

            {title && (
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                  {title}
                </Text>
                {showCloseButton && (
                  <TouchableOpacity
                    onPress={onClose}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityLabel="Kapat"
                    accessibilityRole="button"
                  >
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Body slot */}
            {scrollable ? (
              <ScrollView
                style={styles.body}
                contentContainerStyle={styles.bodyContent}
                showsVerticalScrollIndicator={false}
              >
                {children}
              </ScrollView>
            ) : (
              <View style={styles.body}>{children}</View>
            )}

            {/* Actions slot — sticky footer */}
            {actions && <View style={styles.actions}>{actions}</View>}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  body: {
    flexShrink: 1,
  },
  bodyContent: {
    flexGrow: 1,
  },
  actions: {
    marginTop: 16,
    gap: 8,
  },
});
