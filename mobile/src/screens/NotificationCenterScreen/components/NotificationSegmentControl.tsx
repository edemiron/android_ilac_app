/**
 * NotificationSegmentControl
 *
 * "Bildirim Akışı (Geçmiş)" ve "Sıradaki Alarmlar" arasında akıcı geçiş sağlayan kontrol çubuğu.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { type NotificationCenterTab } from '../hooks/useNotificationCenterController';
import { useHaptics } from '../../../hooks/useHaptics';

interface NotificationSegmentControlProps {
  activeTab: NotificationCenterTab;
  feedCount: number;
  upcomingCount: number;
  onTabChange: (tab: NotificationCenterTab) => void;
}

export function NotificationSegmentControl({
  activeTab,
  feedCount,
  upcomingCount,
  onTabChange,
}: NotificationSegmentControlProps) {
  const { isDark } = useTheme();
  const haptics = useHaptics();

  const handlePress = (tab: NotificationCenterTab) => {
    if (tab !== activeTab) {
      haptics.trigger('selection');
      onTabChange(tab);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
        },
      ]}
    >
      {/* 1. Bildirim Akışı Tab */}
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'feed' && [
            styles.activeTab,
            { backgroundColor: isDark ? '#334155' : '#FFFFFF' },
          ],
        ]}
        onPress={() => handlePress('feed')}
        activeOpacity={0.7}
      >
        <Ionicons
          name="newspaper-outline"
          size={16}
          color={activeTab === 'feed' ? '#0D9488' : isDark ? '#94A3B8' : '#64748B'}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === 'feed'
              ? [styles.activeTabText, { color: activeTab === 'feed' ? '#0D9488' : '#0F172A' }]
              : { color: isDark ? '#94A3B8' : '#64748B' },
          ]}
        >
          Bildirim Akışı ({feedCount})
        </Text>
      </TouchableOpacity>

      {/* 2. Sıradaki Alarmlar Tab */}
      <TouchableOpacity
        style={[
          styles.tab,
          activeTab === 'upcoming' && [
            styles.activeTab,
            { backgroundColor: isDark ? '#334155' : '#FFFFFF' },
          ],
        ]}
        onPress={() => handlePress('upcoming')}
        activeOpacity={0.7}
      >
        <Ionicons
          name="alarm-outline"
          size={16}
          color={activeTab === 'upcoming' ? '#0D9488' : isDark ? '#94A3B8' : '#64748B'}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === 'upcoming'
              ? [styles.activeTabText, { color: activeTab === 'upcoming' ? '#0D9488' : '#0F172A' }]
              : { color: isDark ? '#94A3B8' : '#64748B' },
          ]}
        >
          Sıradaki Alarmlar ({upcomingCount})
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    fontWeight: '700',
  },
});
