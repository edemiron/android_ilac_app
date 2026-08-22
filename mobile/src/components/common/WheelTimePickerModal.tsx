import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { WheelTimePicker } from './WheelTimePicker';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

export interface WheelTimePickerModalProps {
  visible: boolean;
  initialTime?: string | Date; // 'HH:mm' veya Date
  title?: string;
  onConfirm: (timeString: string, hours: number, minutes: number) => void;
  onCancel: () => void;
}

export const WheelTimePickerModal: React.FC<WheelTimePickerModalProps> = ({
  visible,
  initialTime = '08:00',
  title,
  onConfirm,
  onCancel,
}) => {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const isTr = language === 'tr';

  const defaultTimeString =
    initialTime instanceof Date
      ? `${initialTime.getHours().toString().padStart(2, '0')}:${initialTime.getMinutes().toString().padStart(2, '0')}`
      : typeof initialTime === 'string'
        ? initialTime
        : '08:00';

  const [selectedTime, setSelectedTime] = useState<string>(defaultTimeString);
  const [selectedHours, setSelectedHours] = useState<number>(8);
  const [selectedMinutes, setSelectedMinutes] = useState<number>(0);

  useEffect(() => {
    if (visible) {
      const timeStr =
        initialTime instanceof Date
          ? `${initialTime.getHours().toString().padStart(2, '0')}:${initialTime.getMinutes().toString().padStart(2, '0')}`
          : typeof initialTime === 'string'
            ? initialTime
            : '08:00';

      setSelectedTime(timeStr);
      const [h, m] = timeStr.split(':').map(n => parseInt(n, 10));
      setSelectedHours(isNaN(h) ? 8 : h);
      setSelectedMinutes(isNaN(m) ? 0 : m);
    }
  }, [visible, initialTime]);

  const handleTimeChange = (timeStr: string, h: number, m: number) => {
    setSelectedTime(timeStr);
    setSelectedHours(h);
    setSelectedMinutes(m);
  };

  const handleDone = () => {
    onConfirm(selectedTime, selectedHours, selectedMinutes);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              {/* Modal Header */}
              <View style={styles.header}>
                <TouchableOpacity
                  onPress={onCancel}
                  style={styles.headerButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={[styles.cancelText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    {isTr ? 'İptal' : 'Cancel'}
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.titleText, { color: colors.text }]}>
                  {title || (isTr ? 'Saat Seçin' : 'Select Time')}
                </Text>

                <TouchableOpacity
                  onPress={handleDone}
                  style={styles.headerButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={[styles.confirmText, { color: colors.primary }]}>
                    {isTr ? 'Tamam' : 'Done'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Wheel Picker */}
              <WheelTimePicker value={selectedTime} onChange={handleTimeChange} />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingTop: 16,
    paddingBottom: 36,
    paddingHorizontal: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  headerButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
