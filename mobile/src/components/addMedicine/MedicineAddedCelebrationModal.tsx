/**
 * MedicineAddedCelebrationModal — İlaç Başarıyla Kaydedildi Kutlama Modalı
 *
 * Kullanıcı yeni ilaç eklediğinde veya güncellediğinde;
 * animasyonlu yeşil onay rozeti, ilk doz hatırlatma saati ve
 * tatmin edici haptik titreşim eşliğinde görsel bir onay deneyimi sunar.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Linking,
  Share,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import type { ThemeColors } from '../../contexts/ThemeContext';

export interface CelebrationData {
  visible: boolean;
  medicineName: string;
  dosageAmount?: string;
  medicineForm?: string;
  frequency?: number;
  firstReminderTime?: string;
  isTomorrow?: boolean;
  isEditing?: boolean;
}

interface Props {
  data: CelebrationData;
  onDismiss: () => void;
  colors: ThemeColors;
  language: 'tr' | 'en';
}

export function MedicineAddedCelebrationModal({ data, onDismiss, colors, language }: Props) {
  const isTr = language === 'tr';
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (data.visible) {
      // Haptik titreşim ver
      ReactNativeHapticFeedback.trigger('notificationSuccess');

      // Giriş animasyonu
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();

      // Nabız (pulse) animasyonu
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(0.3);
      opacityAnim.setValue(0);
    }
  }, [data.visible, scaleAnim, opacityAnim, pulseAnim]);

  const handleShareWithFamily = async () => {
    try {
      ReactNativeHapticFeedback.trigger('impactMedium');
      const medInfo = `${data.medicineName}${data.dosageAmount ? ` (${data.dosageAmount})` : ''}`;
      const label = data.isEditing
        ? isTr
          ? 'Sonraki doz'
          : 'Next dose'
        : isTr
          ? 'İlk doz'
          : 'First dose';
      const dayLabel = data.isTomorrow ? (isTr ? 'yarın' : 'tomorrow') : isTr ? 'bugün' : 'today';
      const timeInfo = data.firstReminderTime
        ? isTr
          ? ` ${label} saati: ${dayLabel} ${data.firstReminderTime}.`
          : ` ${label} time: ${dayLabel} ${data.firstReminderTime}.`
        : '';

      const actionText = data.isEditing
        ? isTr
          ? 'ilacımın kullanım saatlerini güncelledim'
          : 'updated my medicine schedule'
        : isTr
          ? 'ilacımı takvime ekledim'
          : 'added to my Medicine Reminder app';

      const message = isTr
        ? `🔔 Merhaba! İlaç Hatırlatıcı uygulamasında "${medInfo}" ${actionText}.${timeInfo}\n\nDozlarımı ve tedavi durumumu canlı takip edebilmek için uygulamayı indirip refakatçi olarak bağlanabilirsin: https://ilachatirlatici.app`
        : `🔔 Hello! I just ${actionText} for "${medInfo}".${timeInfo}\n\nYou can track my doses and health status by downloading the app: https://ilachatirlatici.app`;

      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Share.share({
          message,
          title: isTr ? 'İlaç Takibi Paylaşımı' : 'Medicine Tracking Share',
        });
      }
    } catch {
      // sessizce devam et
    } finally {
      onDismiss();
    }
  };

  if (!data.visible) return null;

  return (
    <Modal visible={data.visible} transparent animationType="none" onRequestClose={onDismiss}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onDismiss}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={e => e.stopPropagation?.()}
          style={styles.cardContainer}
        >
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: opacityAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Işıltılı Yeşil Rozet */}
            <View style={styles.badgeContainer}>
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    backgroundColor: '#10B98125',
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />
              <View style={styles.iconCircle}>
                <Ionicons name="checkmark-circle" size={56} color="#10B981" />
              </View>
            </View>

            {/* Başlık */}
            <Text style={[styles.title, { color: colors.text }]}>
              {data.isEditing
                ? isTr
                  ? 'İlaç Güncellendi!'
                  : 'Medicine Updated!'
                : isTr
                  ? 'İlaç Başarıyla Eklendi!'
                  : 'Medicine Added!'}
            </Text>

            {/* İlaç Özeti */}
            <View style={[styles.summaryBadge, { backgroundColor: colors.background }]}>
              <Ionicons name="medkit" size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.summaryText, { color: colors.text }]} numberOfLines={1}>
                {data.medicineName}
                {data.dosageAmount ? ` (${data.dosageAmount})` : ''}
              </Text>
            </View>

            {/* Hatırlatma Saati Çipi */}
            {data.firstReminderTime ? (
              <View style={[styles.reminderChip, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons
                  name="alarm-outline"
                  size={18}
                  color={colors.primary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.reminderText, { color: colors.primary }]}>
                  {data.isEditing
                    ? isTr
                      ? `Sonraki doz ${data.isTomorrow ? 'yarın' : 'bugün'} saat ${data.firstReminderTime}'de ⏰`
                      : `Next dose ${data.isTomorrow ? 'tomorrow' : 'today'} at ${data.firstReminderTime} ⏰`
                    : isTr
                      ? `İlk doz ${data.isTomorrow ? 'yarın' : 'bugün'} saat ${data.firstReminderTime}'de ⏰`
                      : `First dose ${data.isTomorrow ? 'tomorrow' : 'today'} at ${data.firstReminderTime} ⏰`}
                </Text>
              </View>
            ) : null}

            {/* 👨‍👩‍👧‍👦 Viral Refakatçi & Aile Paylaşım Butonu */}
            <TouchableOpacity
              style={[styles.shareBtn, { borderColor: '#10B981', backgroundColor: '#10B98115' }]}
              onPress={handleShareWithFamily}
              activeOpacity={0.8}
              accessibilityLabel="share-with-family-btn"
            >
              <Ionicons name="logo-whatsapp" size={18} color="#10B981" style={{ marginRight: 8 }} />
              <Text style={[styles.shareBtnText, { color: '#10B981' }]}>
                {isTr ? 'Aileye / Bakıcıya Bildir' : 'Share with Family / Caregiver'}
              </Text>
            </TouchableOpacity>

            {/* Kapat / Harika Butonu */}
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
              onPress={onDismiss}
              activeOpacity={0.8}
              accessibilityLabel="confirm-celebration-btn"
            >
              <Text style={styles.confirmBtnText}>{isTr ? 'Harika!' : 'Great!'}</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  badgeContainer: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  pulseRing: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#10B98115',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  reminderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 20,
    width: '100%',
    justifyContent: 'center',
  },
  reminderText: {
    fontSize: 13,
    fontWeight: '600',
  },
  shareBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  confirmBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
