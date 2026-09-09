/**
 * NotificationFeedList
 *
 * Kronolojik bildirim ve ilaç kullanım etkinlik akışı.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { type FeedItem } from '../hooks/useNotificationCenterController';

interface NotificationFeedListProps {
  items: FeedItem[];
}

export function NotificationFeedList({ items }: NotificationFeedListProps) {
  const { isDark } = useTheme();

  if (items.length === 0) {
    return (
      <View
        style={[
          styles.emptyContainer,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderColor: isDark ? '#334155' : '#E2E8F0',
          },
        ]}
      >
        <Ionicons
          name="notifications-off-outline"
          size={42}
          color={isDark ? '#64748B' : '#94A3B8'}
        />
        <Text style={[styles.emptyTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
          Henüz Bildirim Kaydı Yok
        </Text>
        <Text style={[styles.emptySubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
          İlaç alarmlarınız çaldıkça ve doz aldıkça tüm hatırlatma geçmişi burada listelenecektir.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      {items.map(item => (
        <View
          key={item.id}
          style={[
            styles.feedCard,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          <View style={[styles.iconBadge, { backgroundColor: `${item.badgeColor}20` }]}>
            <Ionicons name={item.iconName as any} size={20} color={item.badgeColor} />
          </View>

          <View style={styles.cardContent}>
            <View style={styles.cardHeaderRow}>
              <Text
                style={[styles.itemTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <View style={[styles.badge, { backgroundColor: `${item.badgeColor}20` }]}>
                <Text style={[styles.badgeText, { color: item.badgeColor }]}>
                  {item.badgeLabel}
                </Text>
              </View>
            </View>

            <Text style={[styles.itemSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {item.subtitle}
            </Text>

            <Text style={[styles.itemTime, { color: isDark ? '#64748B' : '#94A3B8' }]}>
              {item.timeFormatted}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 24,
  },
  feedCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 3,
  },
  itemTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemSubtitle: {
    fontSize: 12.5,
    lineHeight: 17,
    marginBottom: 4,
  },
  itemTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyContainer: {
    marginHorizontal: 16,
    padding: 32,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
