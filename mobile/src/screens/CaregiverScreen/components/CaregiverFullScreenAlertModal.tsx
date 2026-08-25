/**
 * CaregiverFullScreenAlertModal — Tam Ekran Canlı Doz Bildirimi Modalı
 *
 * Takip edilen hasta ilacını aldığında veya atladığında ekranda tam ekran
 * canlı kutlama/bilgilendirme modalı olarak belirir.
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
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MotiView } from 'moti';
import {
  subscribeToLiveCaregiverAlerts,
  clearCurrentActiveAlert,
  type LiveCaregiverAlertData,
} from '../../../services/caregiverLiveAlertService';
import { useHaptics } from '../../../hooks/useHaptics';

export function CaregiverFullScreenAlertModal() {
  const [alertData, setAlertData] = useState<LiveCaregiverAlertData | null>(null);
  const haptics = useHaptics();

  useEffect(() => {
    const unsub = subscribeToLiveCaregiverAlerts(data => {
      setAlertData(data);
      haptics.trigger('success');
    });

    return () => unsub();
  }, [haptics]);

  if (!alertData) return null;

  const isTaken = alertData.status === 'taken';

  const handleDismiss = () => {
    haptics.trigger('selection');
    setAlertData(null);
    clearCurrentActiveAlert();
  };

  const getInitials = (name: string) => {
    if (!name) return 'H';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const timeFormatted = alertData.scheduledTime
    ? alertData.scheduledTime.includes('T')
      ? alertData.scheduledTime.split('T')[1].slice(0, 5)
      : alertData.scheduledTime
    : new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  const screenWidth = (() => {
    try {
      return Dimensions?.get('window')?.width || 380;
    } catch {
      return 380;
    }
  })();

  return (
    <Modal
      visible={!!alertData}
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
          style={[styles.cardContainer, { width: Math.min(screenWidth - 36, 380) }]}
        >
          {/* Üst İkon Rozeti */}
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: isTaken ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' },
            ]}
          >
            <Text style={styles.emojiText}>{isTaken ? '🎉' : '⚠️'}</Text>
          </View>

          {/* Başlık ve Açıklama */}
          <Text style={styles.titleText}>{isTaken ? 'Harika Haber!' : 'Doz Bildirimi'}</Text>
          <Text style={styles.subtitleText}>
            {isTaken
              ? 'Takip ettiğiniz yakınınız ilacını zamanında aldı.'
              : 'Takip ettiğiniz yakınınız ilacını atladı.'}
          </Text>

          {/* Hasta Bilgi Kartı */}
          <View style={styles.patientBadge}>
            <View style={styles.patientAvatar}>
              <Text style={styles.patientAvatarText}>{getInitials(alertData.patientName)}</Text>
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{alertData.patientName}</Text>
              <Text style={styles.liveTrackText}>• CANLI SAĞLIK BİLDİRİMİ</Text>
            </View>
          </View>

          {/* İlaç ve Doz Detayı */}
          <View style={styles.medicineCard}>
            <View style={styles.medIconBox}>
              <Ionicons name="medical" size={24} color="#0D9488" />
            </View>
            <View style={styles.medDetails}>
              <Text style={styles.medName}>{alertData.medicineName}</Text>
              <View style={styles.timeRow}>
                <Ionicons
                  name={isTaken ? 'checkmark-circle' : 'close-circle'}
                  size={15}
                  color={isTaken ? '#10B981' : '#EF4444'}
                />
                <Text style={[styles.timeText, { color: isTaken ? '#10B981' : '#EF4444' }]}>
                  {timeFormatted} {isTaken ? 'Dozu Alındı' : 'Dozu Atlandı'}
                </Text>
              </View>
            </View>
          </View>

          {/* Güvence Metni */}
          <Text style={styles.footerNote}>
            {isTaken
              ? '✅ Tedavi süreci eksiksiz ve planlandığı şekilde devam ediyor.'
              : 'ℹ️ Gerekiyorsa hastanızla iletişime geçebilirsiniz.'}
          </Text>

          {/* Kapat Butonu */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: isTaken ? '#0D9488' : '#334155' }]}
            onPress={handleDismiss}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-sharp" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>
              {isTaken ? 'Harika, Teşekkürler!' : 'Anladım'}
            </Text>
          </TouchableOpacity>
        </MotiView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cardContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emojiText: {
    fontSize: 34,
  },
  titleText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 13.5,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 18,
  },
  patientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    width: '100%',
    marginBottom: 12,
  },
  patientAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(13, 148, 136, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  patientAvatarText: {
    color: '#2DD4BF',
    fontWeight: '700',
    fontSize: 14,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  liveTrackText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 1,
  },
  medicineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
    borderColor: 'rgba(13, 148, 136, 0.3)',
    borderWidth: 1,
    padding: 14,
    borderRadius: 16,
    width: '100%',
    marginBottom: 16,
  },
  medIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(13, 148, 136, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  medDetails: {
    flex: 1,
  },
  medName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 3,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timeText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  footerNote: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 17,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
