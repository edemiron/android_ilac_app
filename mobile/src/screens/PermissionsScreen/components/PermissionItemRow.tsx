/**
 * PermissionItemRow — Tekil İzin Satırı (İkon, Başlık, Açıklama, İzin Butonu veya Onay İkonu)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { withAlpha, ALPHA } from '../../../utils/colors';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface PermissionItemRowProps {
  iconName: string;
  iconColor: string;
  title: string;
  description: string;
  isGranted: boolean;
  actionText?: string;
  onPressAction?: () => void;
  isOptional?: boolean;
  disabled?: boolean;
  colors: ThemeColors;
}

export function PermissionItemRow({
  iconName,
  iconColor,
  title,
  description,
  isGranted,
  actionText = 'Ayarla',
  onPressAction,
  isOptional = false,
  disabled = false,
  colors,
}: PermissionItemRowProps) {
  return (
    <View style={[styles.permissionItem, { borderBottomColor: colors.divider }]}>
      <View style={styles.permissionInfo}>
        <View
          style={[styles.permissionIcon, { backgroundColor: withAlpha(iconColor, ALPHA.fill) }]}
        >
          <Ionicons name={isGranted ? 'checkmark-circle' : iconName} size={24} color={iconColor} />
        </View>
        <View style={styles.permissionText}>
          <Text style={[styles.permissionTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.permissionDescription, { color: colors.textMuted }]}>
            {description}
          </Text>
        </View>
      </View>

      {!isGranted && onPressAction && (
        <TouchableOpacity
          style={[
            styles.permissionButton,
            isOptional
              ? { backgroundColor: withAlpha(colors.primary, ALPHA.fill) }
              : { backgroundColor: colors.primary },
          ]}
          onPress={onPressAction}
          disabled={disabled}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.permissionButtonText,
              { color: isOptional ? colors.primary : '#FFFFFF' },
            ]}
          >
            {actionText}
          </Text>
        </TouchableOpacity>
      )}

      {isGranted && <Ionicons name="checkmark-circle" size={24} color="#10B981" />}
    </View>
  );
}

const styles = StyleSheet.create({
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  permissionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  permissionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  permissionText: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  permissionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  permissionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
