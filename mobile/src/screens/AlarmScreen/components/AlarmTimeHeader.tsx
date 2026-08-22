/**
 * AlarmTimeHeader — Alarm ekranı büyük saat ve tarih başlığı
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface AlarmTimeHeaderProps {
  currentTime: string;
  currentDate: string;
}

export function AlarmTimeHeader({ currentTime, currentDate }: AlarmTimeHeaderProps) {
  return (
    <View style={styles.timeSection}>
      <Text style={styles.currentTime}>{currentTime}</Text>
      <Text style={styles.currentDate}>{currentDate}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  timeSection: {
    alignItems: 'center',
    paddingTop: 20,
  },
  currentTime: {
    fontSize: 64,
    fontWeight: '200',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  currentDate: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
});
