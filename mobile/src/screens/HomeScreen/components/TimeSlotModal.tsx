import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { format } from 'date-fns';
import { ThemeColors } from '../../../contexts/ThemeContext';
import { TimeSlotGroupData } from './TimeSlotGrid';
import { TimelineItem } from './TimelineItem';
import { withAlpha, ALPHA } from '../../../utils/colors';

interface TimeSlotModalProps {
  visible: boolean;
  slot: TimeSlotGroupData | null;
  onClose: () => void;
  colors: ThemeColors;
  isDark: boolean;
  language: string;
  onTakeNow: (reminderTimeId: string) => void;
  snoozes: any[];
}

export const TimeSlotModal: React.FC<TimeSlotModalProps> = ({
  visible,
  slot,
  onClose,
  colors,
  isDark,
  language,
  onTakeNow,
  snoozes,
}) => {
  if (!slot) return null;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const total = slot.items.length;
  const taken = slot.items.filter(r => r.log?.status === 'taken').length;
  const isComplete = total > 0 && taken === total;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              {/* Drag Handle */}
              <View style={styles.handleContainer}>
                <View
                  style={[styles.handle, { backgroundColor: isDark ? '#475569' : '#CBD5E1' }]}
                />
              </View>

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleGroup}>
                  <Text style={styles.headerEmoji}>{slot.emoji}</Text>
                  <View>
                    <Text style={[styles.headerTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                      {slot.label} {language === 'tr' ? 'İlaçları' : 'Medicines'}
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                      {total} {language === 'tr' ? 'İlaç' : 'Meds'} ·{' '}
                      {isComplete
                        ? language === 'tr'
                          ? 'Tümü Alındı ✓'
                          : 'All Taken ✓'
                        : `${taken}/${total} ${language === 'tr' ? 'Alındı' : 'Taken'}`}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={20} color={isDark ? '#F8FAFC' : '#0F172A'} />
                </TouchableOpacity>
              </View>

              {/* Medicine List */}
              <ScrollView
                style={styles.listContainer}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              >
                {slot.items.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                      {language === 'tr'
                        ? 'Bu zaman diliminde planlanmış ilaç bulunmuyor.'
                        : 'No medicines scheduled for this time slot.'}
                    </Text>
                  </View>
                ) : (
                  slot.items.map((reminder, index) => {
                    const activeSnooze = snoozes.find(
                      s =>
                        s.medicineId === reminder.medicine.id &&
                        s.reminderTimeId === reminder.reminderTime.id &&
                        s.isActive &&
                        s.originalScheduledTime.startsWith(todayStr)
                    );

                    return (
                      <TimelineItem
                        key={reminder.reminderTime.id}
                        reminder={reminder}
                        colors={colors}
                        language={language}
                        onTakeNow={() => onTakeNow(reminder.reminderTime.id)}
                        isFirst={index === 0}
                        hasActiveSnooze={!!activeSnooze}
                        snoozeTriggerTime={activeSnooze?.triggerTime ?? null}
                      />
                    );
                  })
                )}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: withAlpha('#000000', ALPHA.scrim),
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingTop: 12,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerEmoji: {
    fontSize: 26,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    marginTop: 12,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
