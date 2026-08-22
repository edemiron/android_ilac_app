/**
 * PinManagementCard — PIN Ayarla / Değiştir kartı
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface PinManagementCardProps {
  hasPin: boolean;
  onPressPinAction: () => void;
  colors: ThemeColors;
  language: string;
}

export function PinManagementCard({
  hasPin,
  onPressPinAction,
  colors,
  language,
}: PinManagementCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, marginTop: 12 }]}>
      <View style={[styles.cardHeader, { borderColor: colors.border }]}>
        <Ionicons name="keypad" size={20} color="#F59E0B" />
        <Text style={[styles.cardTitle, { color: colors.text, marginLeft: 8 }]}>
          {language === 'tr' ? 'PIN Yönetimi' : 'PIN Management'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.pinActionButton, { backgroundColor: colors.inputBackground }]}
        onPress={onPressPinAction}
      >
        <Ionicons name="keypad" size={18} color="#4ECDC4" />
        <Text style={[styles.pinActionText, { color: colors.primary, marginLeft: 8 }]}>
          {hasPin
            ? language === 'tr'
              ? 'PIN Değiştir'
              : 'Change PIN'
            : language === 'tr'
              ? 'PIN Ayarla'
              : 'Set PIN'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  pinActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  pinActionText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
