import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useHaptics } from '../../../hooks/useHaptics';
import { ThemeColors } from '../../../contexts/ThemeContext';
import { TodayReminder } from '../types';

export interface TimeSlotGroupData {
  key: 'morning' | 'noon' | 'evening' | 'night';
  label: string;
  emoji: string;
  items: TodayReminder[];
}

interface TimeSlotGridProps {
  slots: TimeSlotGroupData[];
  activeSlotKey: string;
  onSelectSlot: (slotKey: 'morning' | 'noon' | 'evening' | 'night') => void;
  colors: ThemeColors;
  isDark: boolean;
  language: string;
}

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
  slots,
  activeSlotKey,
  onSelectSlot,
  colors,
  isDark,
  language,
}) => {
  const haptics = useHaptics();

  const handlePress = (slotKey: 'morning' | 'noon' | 'evening' | 'night') => {
    haptics.trigger('selection');
    onSelectSlot(slotKey);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
          {language === 'tr' ? 'Zaman Dilimleri' : 'Time Slots'}
        </Text>
        <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
          {language === 'tr' ? 'Detay için dokun' : 'Tap for details'}
        </Text>
      </View>

      <View style={styles.grid}>
        {slots.map(slot => {
          const total = slot.items.length;
          const taken = slot.items.filter(r => r.log?.status === 'taken').length;
          const isComplete = total > 0 && taken === total;
          const isActive = slot.key === activeSlotKey;
          const isEmpty = total === 0;

          return (
            <TouchableOpacity
              key={slot.key}
              style={[
                styles.slotCard,
                {
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: isComplete
                    ? '#10B981'
                    : isActive
                      ? colors.primary
                      : isDark
                        ? '#334155'
                        : '#E2E8F0',
                  borderWidth: isActive || isComplete ? 1.5 : 1,
                },
              ]}
              onPress={() => handlePress(slot.key)}
              activeOpacity={0.7}
            >
              {/* Top Row: Emoji + Title + Active/Done Pill */}
              <View style={styles.cardTopRow}>
                <View style={styles.slotTitleGroup}>
                  <Text style={styles.slotEmoji}>{slot.emoji}</Text>
                  <Text style={[styles.slotLabel, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                    {slot.label}
                  </Text>
                </View>

                {isActive && !isComplete && (
                  <View
                    style={[
                      styles.activeBadge,
                      { backgroundColor: isDark ? 'rgba(13, 148, 136, 0.2)' : '#CCFBF1' },
                    ]}
                  >
                    <Text
                      style={[styles.activeBadgeText, { color: isDark ? '#2DD4BF' : '#0F766E' }]}
                    >
                      {language === 'tr' ? 'Aktif' : 'Active'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Bottom Row: Count + Status + Chevron */}
              <View style={styles.cardBottomRow}>
                <View>
                  <Text style={[styles.slotCount, { color: colors.textSecondary }]}>
                    {isEmpty
                      ? language === 'tr'
                        ? 'İlaç yok'
                        : 'No meds'
                      : `${total} ${language === 'tr' ? 'İlaç' : 'Meds'}`}
                  </Text>
                  {!isEmpty && (
                    <Text
                      style={[
                        styles.progressText,
                        {
                          color: isComplete ? '#10B981' : isDark ? '#94A3B8' : '#64748B',
                        },
                      ]}
                    >
                      {isComplete
                        ? language === 'tr'
                          ? '✓ Tamamlandı'
                          : '✓ Complete'
                        : `${taken}/${total} ${language === 'tr' ? 'Alındı' : 'Taken'}`}
                    </Text>
                  )}
                </View>

                <View
                  style={[
                    styles.chevronBox,
                    {
                      backgroundColor: isDark ? '#334155' : '#F1F5F9',
                    },
                  ]}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={isDark ? '#94A3B8' : '#64748B'}
                  />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionHint: {
    fontSize: 12,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotCard: {
    width: '48.4%',
    borderRadius: 16,
    padding: 12,
    minHeight: 88,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slotEmoji: {
    fontSize: 16,
  },
  slotLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  slotCount: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  chevronBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
