import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { isoToParts } from '../../../domain/dateParts';
import { ageFromParts, type WheelColumnId } from '../../../domain/wheelDateModel';
import { WHEEL_CONTAINER_HEIGHT } from './constants';
import { WheelDatePicker } from './WheelDatePicker';

export interface WheelDatePickerModalProps {
  readonly visible: boolean;
  readonly value: string; // 'yyyy-MM-dd'
  readonly range?: { readonly min: string; readonly max: string };
  readonly title?: string;
  readonly onConfirm: (iso: string) => void;
  readonly onCancel: () => void;
  readonly columnOrder?: readonly WheelColumnId[];
  readonly soundEnabled?: boolean;
}

export const WheelDatePickerModal = React.memo(function WheelDatePickerModal({
  visible,
  value,
  range,
  title,
  onConfirm,
  onCancel,
  columnOrder,
  soundEnabled = true,
}: WheelDatePickerModalProps) {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const isTr = language === 'tr';

  const [draftIso, setDraftIso] = useState<string>(value);

  useEffect(() => {
    if (visible) {
      setDraftIso(value || '');
    }
  }, [visible, value]);

  const handlePickerChange = useCallback((iso: string) => {
    setDraftIso(iso);
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(draftIso);
  }, [onConfirm, draftIso]);

  const modalTitle = title ?? (isTr ? 'Doğum Tarihi Seçin' : 'Select Birth Date');

  // Taslak tarihe göre anlık yaş
  const currentAge = draftIso
    ? ageFromParts(isoToParts(draftIso) ?? { year: 2000, month: 1, day: 1 }, {
        year: 2026,
        month: 9,
        day: 6,
      })
    : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onCancel} />

        <View
          style={[
            styles.dialogContainer,
            {
              backgroundColor: isDark ? '#262626' : '#FFFFFF',
              borderColor: isDark ? '#383838' : '#E2E8F0',
            },
          ]}
        >
          {/* Başlık ve Yaş Rozeti */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: isDark ? '#F3F4F6' : colors.text }]}>
              {modalTitle}
            </Text>
            {currentAge !== null && (
              <View
                style={[
                  styles.ageBadge,
                  {
                    backgroundColor: isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(2, 132, 199, 0.15)',
                  },
                ]}
              >
                <Text style={[styles.ageBadgeText, { color: isDark ? '#38BDF8' : '#0284C7' }]}>
                  {currentAge} {isTr ? 'Yaşında' : 'years'}
                </Text>
              </View>
            )}
          </View>

          {/* 3 Sütunlu Çark Gövdesi */}
          <View style={styles.pickerWrapper}>
            <WheelDatePicker
              value={draftIso}
              range={range}
              onChange={handlePickerChange}
              colors={colors}
              isDark={isDark}
              isTr={isTr}
              columnOrder={columnOrder}
              soundEnabled={soundEnabled}
            />
          </View>

          {/* Alt Butonlar: İptal / Tamam (Referans görseliyle birebir) */}
          <View style={[styles.footer, { borderTopColor: isDark ? '#383838' : '#E2E8F0' }]}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onCancel}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={isTr ? 'İptal' : 'Cancel'}
            >
              <Text
                style={[styles.actionText, { color: isDark ? '#9CA3AF' : colors.textSecondary }]}
              >
                {isTr ? 'İptal' : 'Cancel'}
              </Text>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: isDark ? '#383838' : '#E2E8F0' }]} />

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleConfirm}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={isTr ? 'Tamam' : 'OK'}
            >
              <Text
                style={[
                  styles.actionText,
                  {
                    color: isDark ? '#38BDF8' : '#0284C7',
                    fontWeight: '700',
                  },
                ]}
              >
                {isTr ? 'Tamam' : 'OK'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  ageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  ageBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pickerWrapper: {
    height: WHEEL_CONTAINER_HEIGHT,
    marginVertical: 4,
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    height: 52,
  },
  actionButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: '100%',
  },
});
