/**
 * PatientFullScreenReminderModal — Hastanın Ekranında Açılan Tam Ekran Canlı İlaç Hatırlatması
 *
 * Bakıcı bir doz için "Hatırlat" dediğinde hastanın telefonunda aniden açılır:
 * - Bakıcının adı ve avatarı
 * - İlaç adı ve doz saati
 * - Bakıcının özel/hazır mesajı
 * - "✓ Şimdi Aldım" tek dokunuşla dozu alma ve bakıcıya bildirme butonu
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { MotiView } from 'moti';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  subscribeToActivePatientReminder,
  clearCurrentActivePatientReminder,
} from '../services/patientRemoteReminderService';
import { updateRemoteReminderStatus, type RemoteReminderData } from '../services/caregiverService';
import { useMedicineStore } from '../stores/medicineStore';
import { useHaptics } from '../hooks/useHaptics';

export function PatientFullScreenReminderModal() {
  const [reminderData, setReminderData] = useState<RemoteReminderData | null>(null);
  const haptics = useHaptics();

  useEffect(() => {
    const unsub = subscribeToActivePatientReminder(data => {
      setReminderData(data);
    });
    return () => unsub();
  }, []);

  if (!reminderData) return null;

  const handleDismiss = async () => {
    haptics.trigger('selection');
    if (reminderData.patientId && reminderData.id) {
      await updateRemoteReminderStatus(reminderData.patientId, reminderData.id, 'dismissed');
    }
    setReminderData(null);
    clearCurrentActivePatientReminder();
  };

  const handleSnooze = async () => {
    haptics.trigger('selection');
    if (reminderData.patientId && reminderData.id) {
      await updateRemoteReminderStatus(reminderData.patientId, reminderData.id, 'seen');
    }
    setReminderData(null);
    clearCurrentActivePatientReminder();
  };

  const handleTakeNow = async () => {
    haptics.trigger('success');
    try {
      const store = useMedicineStore.getState();
      const reminderTimes = store.reminderTimes;
      const matchingRt = reminderTimes.find(
        rt => rt.medicineId === reminderData.medicineId || rt.time === reminderData.scheduledTime
      );

      const reminderTimeId = matchingRt?.id || `manual_${Date.now()}`;
      store.logMedicineTaken(
        reminderTimeId,
        reminderData.scheduledTime || new Date().toISOString(),
        reminderData.medicineId
      );

      if (reminderData.patientId && reminderData.id) {
        await updateRemoteReminderStatus(reminderData.patientId, reminderData.id, 'action_taken');
      }
    } catch (err) {
      console.warn('Take from remote reminder error', err);
    }

    setReminderData(null);
    clearCurrentActivePatientReminder();
  };

  const getInitials = (name: string) => {
    if (!name) return 'B';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const timeFormatted = reminderData.scheduledTime
    ? reminderData.scheduledTime.includes('T')
      ? reminderData.scheduledTime.split('T')[1].slice(0, 5)
      : reminderData.scheduledTime
    : '';

  const screenWidth = (() => {
    try {
      return Dimensions?.get('window')?.width || 380;
    } catch {
      return 380;
    }
  })();

  const isSkippedDose = reminderData.doseStatus === 'skipped';

  return (
    <Modal
      visible={!!reminderData}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.85)" />
      <View style={styles.overlay}>
        <MotiView
          from={{ opacity: 0, scale: 0.85, translateY: 30 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 18 }}
          style={[styles.cardContainer, { width: Math.min(screenWidth - 36, 390) }]}
        >
          {/* Üst Zil İkonu */}
          <View style={styles.iconCircle}>
            <Text style={styles.emojiText}>🔔</Text>
          </View>

          {/* Başlık */}
          <Text style={styles.titleText}>Bakıcınızdan İlaç Hatırlatması</Text>
          <Text style={styles.subtitleText}>
            Sağlığınızı takip eden yakınınız size bir hatırlatma gönderdi.
          </Text>

          {/* Bakıcı Bilgi Rozeti */}
          <View style={styles.caregiverBadge}>
            <View style={styles.caregiverAvatar}>
              <Text style={styles.caregiverAvatarText}>
                {getInitials(reminderData.caregiverName)}
              </Text>
            </View>
            <View style={styles.caregiverInfo}>
              <Text style={styles.caregiverName}>{reminderData.caregiverName}</Text>
              <Text style={styles.caregiverRoleText}>• BAKICINIZ SİZİ DÜŞÜNÜYOR</Text>
            </View>
          </View>

          {/* İlaç Kartı */}
          <View style={styles.medicineCard}>
            <View style={styles.medIconBox}>
              <Ionicons name="medical" size={24} color="#0D9488" />
            </View>
            <View style={styles.medDetails}>
              <Text style={styles.medName} numberOfLines={1}>
                {reminderData.medicineName}
              </Text>
              <View style={styles.timeRow}>
                <Ionicons
                  name={isSkippedDose ? 'warning' : 'time'}
                  size={14}
                  color={isSkippedDose ? '#EF4444' : '#F59E0B'}
                />
                <Text style={[styles.timeText, { color: isSkippedDose ? '#EF4444' : '#F59E0B' }]}>
                  {timeFormatted} {isSkippedDose ? 'Dozu Atlandı' : 'Dozu Bekliyor'}
                </Text>
              </View>
            </View>
          </View>

          {/* Mesaj Balonu */}
          {reminderData.customMessage ? (
            <View style={styles.messageBubble}>
              <Ionicons
                name="chatbubble-ellipses"
                size={17}
                color="#0D9488"
                style={{ marginTop: 2 }}
              />
              <Text style={styles.messageText}>"{reminderData.customMessage}"</Text>
            </View>
          ) : null}

          {/* Butonlar */}
          <View style={styles.actionButtonsCol}>
            {/* Şimdi Aldım */}
            <TouchableOpacity
              style={styles.takeNowButton}
              onPress={handleTakeNow}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.takeNowButtonText}>✓ Şimdi Aldım</Text>
            </TouchableOpacity>

            {/* 10 Dk Sonra Alacağım */}
            <TouchableOpacity
              style={styles.snoozeButton}
              onPress={handleSnooze}
              activeOpacity={0.75}
            >
              <Ionicons name="timer-outline" size={17} color="#94A3B8" />
              <Text style={styles.snoozeButtonText}>10 Dk Sonra Alacağım</Text>
            </TouchableOpacity>

            {/* Kapat */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleDismiss}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </MotiView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 20, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  cardContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 28,
    borderWidth: 1.2,
    borderColor: '#334155',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 24,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(13, 148, 136, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(13, 148, 136, 0.35)',
  },
  emojiText: {
    fontSize: 32,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
  },
  caregiverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    width: '100%',
    marginBottom: 12,
  },
  caregiverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(13, 148, 136, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.4)',
  },
  caregiverAvatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#14B8A6',
  },
  caregiverInfo: {
    flex: 1,
  },
  caregiverName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  caregiverRoleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#14B8A6',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  medicineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(13, 148, 136, 0.3)',
    padding: 14,
    width: '100%',
    marginBottom: 12,
  },
  medIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(13, 148, 136, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  medDetails: {
    flex: 1,
  },
  medName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  messageBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#475569',
    padding: 12,
    width: '100%',
    marginBottom: 18,
    gap: 8,
  },
  messageText: {
    flex: 1,
    fontSize: 13.5,
    fontStyle: 'italic',
    color: '#E2E8F0',
    lineHeight: 19,
  },
  actionButtonsCol: {
    width: '100%',
    gap: 8,
  },
  takeNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  takeNowButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  snoozeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingVertical: 11,
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  snoozeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  closeButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
});
