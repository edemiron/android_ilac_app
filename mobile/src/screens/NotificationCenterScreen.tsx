/**
 * NotificationCenterScreen
 *
 * Bildirim & Hatırlatma Merkezi (Notification & Reminder Hub)
 * Seçenek 1 (Canlı Teşhis, Test Bildirimi, Yaklaşan Alarmlar) ile
 * Seçenek 2 (Kronolojik Bildirim & İlaç Etkinlik Akışı) modellerinin hibrit birleşimi.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useNotificationCenterController } from './NotificationCenterScreen/hooks/useNotificationCenterController';
import { NotificationShieldCard } from './NotificationCenterScreen/components/NotificationShieldCard';
import { NotificationSegmentControl } from './NotificationCenterScreen/components/NotificationSegmentControl';
import { NotificationFeedList } from './NotificationCenterScreen/components/NotificationFeedList';
import { UpcomingAlarmsList } from './NotificationCenterScreen/components/UpcomingAlarmsList';
import { NotificationQuickSettings } from './NotificationCenterScreen/components/NotificationQuickSettings';

export function NotificationCenterScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();

  const {
    activeTab,
    setActiveTab,
    permissions,
    isShieldHealthy,
    isSendingTest,
    testSentMessage,
    feedItems,
    upcomingAlarms,
    refreshing,
    onRefresh,
    handleSendTestNotification,
  } = useNotificationCenterController();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {/* 1. Header Bar */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#334155' : '#E2E8F0' }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityLabel="Geri Dön"
        >
          <Ionicons name="chevron-back" size={22} color={isDark ? '#F8FAFC' : '#0F172A'} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
            Bildirim & Hatırlatma Merkezi
          </Text>
          <Text style={[styles.headerSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            Canlı alarm kalkanı ve bildirim geçmişi
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Canlı Bildirim & Koruma Kalkanı */}
        <NotificationShieldCard
          permissions={permissions}
          isShieldHealthy={isShieldHealthy}
          isSendingTest={isSendingTest}
          testSentMessage={testSentMessage}
          onSendTest={handleSendTestNotification}
          onOpenPermissions={() => navigation.navigate('Settings' as never)}
        />

        {/* 3. Hızlı Ayarlar Kısayolları */}
        <NotificationQuickSettings
          onNavigateTts={() => navigation.navigate('TtsSettings' as never)}
          onNavigateSettings={() => navigation.navigate('Settings' as never)}
          onNavigatePermissions={() => navigation.navigate('Settings' as never)}
        />

        {/* 4. Segment Geçiş Çubuğu: "Bildirim Akışı" vs "Sıradaki Alarmlar" */}
        <NotificationSegmentControl
          activeTab={activeTab}
          feedCount={feedItems.length}
          upcomingCount={upcomingAlarms.length}
          onTabChange={setActiveTab}
        />

        {/* 5. Aktif Tab İçeriği */}
        {activeTab === 'feed' ? (
          <NotificationFeedList items={feedItems} />
        ) : (
          <UpcomingAlarmsList items={upcomingAlarms} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
});
