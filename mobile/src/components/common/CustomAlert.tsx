import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

export type AlertType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertItem {
  icon?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
}

export interface CustomAlertProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message?: string;
  items?: AlertItem[];
  buttons?: AlertButton[];
  onClose: () => void;
}

const alertConfig: Record<AlertType, { icon: string; color: string }> = {
  info: { icon: 'information-circle', color: '#3B82F6' },
  success: { icon: 'checkmark-circle', color: '#10B981' },
  warning: { icon: 'warning', color: '#F59E0B' },
  error: { icon: 'alert-circle', color: '#EF4444' },
  confirm: { icon: 'help-circle', color: '#8B5CF6' },
};

export function CustomAlert({
  visible,
  type = 'info',
  title,
  message,
  items,
  buttons,
  onClose,
}: CustomAlertProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const config = alertConfig[type];

  const defaultButtons: AlertButton[] = buttons || [{ text: t('ok') || 'Tamam', onPress: onClose }];

  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    if (button.style !== 'cancel' || !button.onPress) {
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: config.color + '20' }]}>
              <Ionicons name={config.icon} size={28} color={config.color} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          </View>

          {/* Message */}
          {message && (
            <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
          )}

          {/* Items List */}
          {items && items.length > 0 && (
            <ScrollView style={styles.itemsContainer} showsVerticalScrollIndicator={false}>
              {items.map((item, index) => (
                <View key={index} style={styles.item}>
                  <View
                    style={[
                      styles.itemIcon,
                      { backgroundColor: (item.iconColor || colors.primary) + '20' },
                    ]}
                  >
                    <Ionicons
                      name={item.icon || 'medical'}
                      size={16}
                      color={item.iconColor || colors.primary}
                    />
                  </View>
                  <View style={styles.itemContent}>
                    <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.subtitle && (
                      <Text style={[styles.itemSubtitle, { color: config.color }]}>
                        {item.subtitle}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            {defaultButtons.map((button, index) => {
              const isDestructive = button.style === 'destructive';
              const isCancel = button.style === 'cancel';
              const isPrimary = !isCancel && index === defaultButtons.length - 1;
              const isNormal = !isDestructive && !isCancel && !isPrimary;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    isPrimary && !isDestructive && { backgroundColor: colors.primary },
                    isDestructive && { backgroundColor: colors.error },
                    isCancel && {
                      backgroundColor: 'transparent',
                      borderWidth: 1,
                      borderColor: colors.border,
                    },
                    isNormal && {
                      backgroundColor: colors.surface,
                      borderWidth: 1.5,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => handleButtonPress(button)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      { color: colors.text },
                      (isPrimary || isDestructive) && { color: '#FFFFFF' },
                      isCancel && { color: colors.textSecondary },
                      isNormal && { color: colors.primary },
                    ]}
                  >
                    {button.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  itemsContainer: {
    maxHeight: 200,
    marginBottom: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  buttonsContainer: {
    gap: 10,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CustomAlert;
