/**
 * BulkActions — Sprint 104.2 (Karol-style HomeScreen modernization).
 *
 * Karol hedef: "BUGUNUN DOZLARI" section basliginin altinda 2 yatay buton:
 * - "Tumunu Al"  → PrimaryButton (gradient, mint→teal)
 * - "Tumunu Atla" → TonalButton (cancel variant = warningContainer amber)
 *
 * Davranis:
 * - pendingCount === 0 ise iki buton da disabled
 * - Her iki buton da Alert.alert onay ister (yanlislikla toplu islem riski)
 * - internal isSubmitting guard: multi-tap korumasi
 *
 * Not: onTakeAll/onSkipAll callback'leri BulkAction component DISINDA tanimlanir (HomeScreen.tsx);
 * component sadece confirmation sonrasi prop-forwarding yapar.
 */

import React, { useCallback, useState } from 'react';
import { View, Alert, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useLanguage } from '../../../contexts/LanguageContext';
import { PrimaryButton } from '../../../components/common/PrimaryButton';
import { TonalButton } from '../../../components/common/TonalButton';

export interface BulkActionItem {
  reminderTimeId: string;
  scheduledTime: string;
  medicineId: string;
}

interface BulkActionsProps {
  /** Bekleyen (pending) reminder sayisi. 0 ise iki buton da disabled. */
  pendingCount: number;
  /** Onay callback'i — BulkAction confirmation sonrasi cagrilir. */
  onTakeAll: () => void;
  /** Onay callback'i — skip confirmation sonrasi cagrilir. */
  onSkipAll: () => void;
  /** Container stili override. */
  style?: StyleProp<ViewStyle>;
}

export function BulkActions({
  pendingCount,
  onTakeAll,
  onSkipAll,
  style,
}: BulkActionsProps) {
  const { language } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tr = language === 'tr';

  const handleTakeAll = useCallback(() => {
    if (isSubmitting || pendingCount === 0) return;
    Alert.alert(
      tr ? 'Tümünü Onayla' : 'Confirm All',
      tr
        ? `${pendingCount} ilacı şimdi aldım olarak işaretle?`
        : `Mark ${pendingCount} medicines as taken now?`,
      [
        { text: tr ? 'İptal' : 'Cancel', style: 'cancel' },
        {
          text: tr ? 'Onayla' : 'Confirm',
          onPress: () => {
            setIsSubmitting(true);
            try {
              onTakeAll();
            } finally {
              // Toast/snackbar kapandiktan sonra reset (BulkActions unmount olabilir)
              setTimeout(() => setIsSubmitting(false), 800);
            }
          },
        },
      ]
    );
  }, [isSubmitting, pendingCount, onTakeAll, tr]);

  const handleSkipAll = useCallback(() => {
    if (isSubmitting || pendingCount === 0) return;
    Alert.alert(
      tr ? 'Tümünü Atla' : 'Skip All',
      tr
        ? `${pendingCount} ilacı atlandı olarak işaretle?`
        : `Mark ${pendingCount} medicines as skipped?`,
      [
        { text: tr ? 'İptal' : 'Cancel', style: 'cancel' },
        {
          text: tr ? 'Onayla' : 'Confirm',
          onPress: () => {
            setIsSubmitting(true);
            try {
              onSkipAll();
            } finally {
              setTimeout(() => setIsSubmitting(false), 800);
            }
          },
        },
      ]
    );
  }, [isSubmitting, pendingCount, onSkipAll, tr]);

  const disabled = pendingCount === 0 || isSubmitting;

  return (
    <View style={[styles.row, style]}>
      <PrimaryButton
        label={tr ? 'Tümünü Al' : 'Take All'}
        onPress={handleTakeAll}
        disabled={disabled}
        variant="gradient"
        size="md"
        icon={<Ionicons name="checkmark-done" size={18} color="#FFFFFF" />}
        style={styles.flex1}
      />
      <TonalButton
        label={tr ? 'Tümünü Atla' : 'Skip All'}
        onPress={handleSkipAll}
        variant="cancel"
        disabled={disabled}
        icon={<Ionicons name="close-circle-outline" size={18} color="#78350F" />}
        style={styles.flex1}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  flex1: {
    flex: 1,
  },
});
