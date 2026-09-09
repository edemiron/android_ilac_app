/**
 * UpcomingAlarmsList
 *
 * Sıradaki yaklaşan alarmlar ve canlı geri sayım listesi.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../contexts/ThemeContext';
import { type UpcomingAlarmItem } from '../hooks/useNotificationCenterController';

interface UpcomingAlarmsListProps {
  items: UpcomingAlarmItem[];
}

export function UpcomingAlarmsList({ items }: UpcomingAlarmsListProps) {
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
        <Ionicons name="alarm-outline" size={42} color={isDark ? '#64748B' : '#94A3B8'} />
        <Text style={[styles.emptyTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
          Kayıtlı Aktif Hatırlatıcı Yok
        </Text>
        <Text style={[styles.emptySubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
          İlaç ekleyip saat kurduğunuzda yaklaşan bildirimleriniz burada geri sayımla
          listelenecektir.
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
            styles.alarmCard,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
            },
          ]}
        >
          <View
            style={[
              styles.timeBadge,
              { backgroundColor: item.color ? `${item.color}20` : 'rgba(13, 148, 136, 0.15)' },
            ]}
          >
            <Ionicons name="time" size={18} color={item.color || '#0D9488'} />
            <Text
              style={[styles.timeText, { color: item.color || (isDark ? '#2DD4BF' : '#0F766E') }]}
            >
              {item.timeString}
            </Text>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.headerRow}>
              <Text
                style={[styles.medicineName, { color: isDark ? '#F8FAFC' : '#0F172A' }]}
                numberOfLines={1}
              >
                {item.medicineName}
              </Text>
              <View
                style={[
                  styles.countdownBadge,
                  {
                    backgroundColor:
                      item.countdownText.includes('sa') || item.countdownText.includes('dk')
                        ? 'rgba(20, 184, 166, 0.15)'
                        : isDark
                          ? '#334155'
                          : '#F1F5F9',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.countdownText,
                    {
                      color:
                        item.countdownText.includes('sa') || item.countdownText.includes('dk')
                          ? '#0D9488'
                          : isDark
                            ? '#94A3B8'
                            : '#64748B',
                    },
                  ]}
                >
                  {item.countdownText}
                </Text>
              </View>
            </View>

            <Text style={[styles.dosageText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {item.dosage} {item.instructions ? `• ${item.instructions}` : ''}
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
  alarmCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  timeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: 64,
  },
  timeText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  cardContent: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 3,
  },
  medicineName: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  countdownBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countdownText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  dosageText: {
    fontSize: 12.5,
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
