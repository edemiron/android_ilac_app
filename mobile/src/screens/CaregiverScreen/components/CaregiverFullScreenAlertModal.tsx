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
  Linking,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  subscribeToLiveCaregiverAlerts,
  clearCurrentActiveAlert,
  getCurrentActiveAlert,
  markAlertDismissed,
  type LiveCaregiverAlertData,
} from '../../../services/caregiverLiveAlertService';
import { getPatientPhoneNumber } from '../../../services/caregiverService';
import { getTelUri } from '../../../utils/phoneHelpers';
import { useHaptics } from '../../../hooks/useHaptics';

export function CaregiverFullScreenAlertModal() {
  const [alertData, setAlertData] = useState<LiveCaregiverAlertData | null>(
    getCurrentActiveAlert()
  );
  const [isCalling, setIsCalling] = useState(false);
  const haptics = useHaptics();

  useEffect(() => {
    const current = getCurrentActiveAlert();
    if (current) {
      setAlertData(current);
    }

    const unsub = subscribeToLiveCaregiverAlerts(data => {
      console.warn(
        '🚨 [CaregiverFullScreenAlertModal] Live alert data received:',
        data ? JSON.stringify(data) : 'null'
      );
      setAlertData(data);
      if (data) {
        if (data.status === 'sos') {
          haptics.trigger('heavy');
        } else {
          haptics.trigger('success');
        }
      }
    });

    return () => unsub();
  }, []);

  const isTaken = alertData?.status === 'taken';
  const isSos = alertData?.status === 'sos';

  const handleDismiss = () => {
    haptics.trigger('selection');
    if (alertData) {
      if (alertData.alertId) {
        markAlertDismissed(alertData.alertId);
      }
      if (alertData.patientId) {
        if (alertData.alertId) {
          markAlertDismissed(`${alertData.patientId}_${alertData.alertId}`);
        }
        if (alertData.scheduledTime) {
          markAlertDismissed(`${alertData.patientId}_${alertData.scheduledTime}`);
        }
        if (alertData.takenAt) {
          markAlertDismissed(`${alertData.patientId}_${alertData.takenAt}`);
        }
      }
    }
    setAlertData(null);
    clearCurrentActiveAlert();
  };

  const handleCallPatient = async () => {
    if (!alertData || !alertData.patientId) return;
    try {
      if (alertData.alertId) {
        markAlertDismissed(alertData.alertId);
      }
      if (alertData.patientId) {
        if (alertData.alertId) {
          markAlertDismissed(`${alertData.patientId}_${alertData.alertId}`);
        }
        if (alertData.scheduledTime) {
          markAlertDismissed(`${alertData.patientId}_${alertData.scheduledTime}`);
        }
        if (alertData.takenAt) {
          markAlertDismissed(`${alertData.patientId}_${alertData.takenAt}`);
        }
      }
      setIsCalling(true);
      haptics.trigger('medium');
      clearCurrentActiveAlert(); // Siren sesini arama başladığında durdur
      const phone = await getPatientPhoneNumber(alertData.patientId);
      if (phone) {
        const telUrl = getTelUri(phone);
        await Linking.openURL(telUrl);
      } else {
        const patientName = alertData.patientName || 'Hastanız';
        Alert.alert(
          'Telefon Numarası Yok',
          `${patientName} henüz profiline bir telefon numarası eklememiş. Acil durumlarda hastanıza doğrudan ulaşabilmek için hastanızın Ayarlar > Hesap Bilgileri ekranından numara eklemesini isteyebilirsiniz.`
        );
      }
    } catch {
      // ignore
    } finally {
      setIsCalling(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'H';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const timeFormatted = (() => {
    const rawTime =
      alertData?.scheduledTime ||
      (alertData?.timestamp ? new Date(alertData.timestamp).toISOString() : null);
    if (!rawTime) {
      const now = new Date();
      return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }
    const trimmed = rawTime.trim();
    if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(trimmed)) {
      return trimmed.slice(0, 5);
    }
    const parsedDate = new Date(trimmed);
    if (!isNaN(parsedDate.getTime())) {
      return `${String(parsedDate.getHours()).padStart(2, '0')}:${String(parsedDate.getMinutes()).padStart(2, '0')}`;
    }
    return trimmed;
  })();

  const screenWidth = (() => {
    try {
      return Dimensions?.get('window')?.width || 380;
    } catch {
      return 380;
    }
  })();

  if (!alertData) {
    return (
      <Modal visible={false} transparent>
        <View />
      </Modal>
    );
  }

  return (
    <Modal
      visible={true}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={isSos ? 'rgba(153, 27, 27, 0.95)' : 'rgba(0,0,0,0.85)'}
      />
      <View style={[styles.overlay, isSos && { backgroundColor: 'rgba(69, 10, 10, 0.92)' }]}>
        <View
          style={[
            styles.cardContainer,
            { width: Math.min(screenWidth - 36, 420) },
            isSos && { borderColor: 'rgba(239, 68, 68, 0.6)', backgroundColor: '#2A0E0E' },
          ]}
        >
          {/* Üst İkon Rozeti */}
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isSos
                  ? 'rgba(239, 68, 68, 0.35)'
                  : isTaken
                    ? 'rgba(16, 185, 129, 0.2)'
                    : 'rgba(239, 68, 68, 0.2)',
              },
            ]}
          >
            <Text style={styles.emojiText}>{isSos ? '🚨' : isTaken ? '🎉' : '⚠️'}</Text>
          </View>

          {/* Başlık ve Açıklama */}
          <Text
            style={[
              styles.titleText,
              isSos ? { color: '#FCA5A5', fontSize: 24 } : !isTaken && { color: '#F87171' },
            ]}
          >
            {isSos ? '🚨 ACİL DURUM ÇAĞRISI!' : isTaken ? 'Harika Haber!' : '⚠️ İlaç Atlandı'}
          </Text>
          <Text style={[styles.subtitleText, isSos && { color: '#FECACA' }]}>
            {isSos
              ? `${alertData.patientName} acil durum butonuna basarak yardım talep etti. Lütfen hemen iletişime geçin!`
              : isTaken
                ? 'Takip ettiğiniz yakınınız ilacını zamanında aldı.'
                : 'Takip ettiğiniz yakınınız planlanan ilaç dozunu atladı.'}
          </Text>

          {/* Hasta Bilgi Kartı */}
          <View
            style={[styles.patientBadge, isSos && { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}
          >
            <View
              style={[styles.patientAvatar, isSos && { backgroundColor: 'rgba(239, 68, 68, 0.4)' }]}
            >
              <Text style={[styles.patientAvatarText, isSos && { color: '#FFFFFF' }]}>
                {getInitials(alertData.patientName)}
              </Text>
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{alertData.patientName}</Text>
              <Text
                style={[
                  styles.liveTrackText,
                  isSos ? { color: '#EF4444' } : !isTaken && { color: '#EF4444' },
                ]}
              >
                {isSos ? '• ACİL PANİK ALARMI' : '• CANLI SAĞLIK BİLDİRİMİ'}
              </Text>
            </View>
          </View>

          {/* İlaç ve Doz / Acil Çağrı Detayı */}
          <View
            style={[
              styles.medicineCard,
              isSos
                ? {
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    borderColor: 'rgba(239, 68, 68, 0.5)',
                  }
                : !isTaken && {
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                  },
            ]}
          >
            <View
              style={[
                styles.medIconBox,
                isSos
                  ? { backgroundColor: 'rgba(239, 68, 68, 0.4)' }
                  : !isTaken && { backgroundColor: 'rgba(239, 68, 68, 0.25)' },
              ]}
            >
              <Ionicons
                name={isSos ? 'warning' : 'medical'}
                size={24}
                color={isSos ? '#FCA5A5' : isTaken ? '#0D9488' : '#EF4444'}
              />
            </View>
            <View style={styles.medDetails}>
              <Text style={styles.medName}>
                {isSos ? 'Acil Yardım İstendi' : alertData.medicineName}
              </Text>
              <View style={styles.timeRow}>
                <Ionicons
                  name={isSos ? 'time' : isTaken ? 'checkmark-circle' : 'close-circle'}
                  size={15}
                  color={isSos ? '#FCA5A5' : isTaken ? '#10B981' : '#EF4444'}
                />
                <Text
                  style={[
                    styles.timeText,
                    { color: isSos ? '#FCA5A5' : isTaken ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {timeFormatted}{' '}
                  {isSos ? 'Acil Çağrı Zamanı' : isTaken ? 'Dozu Alındı' : 'Dozu Atlandı'}
                </Text>
              </View>
            </View>
          </View>

          {/* Güvence / Yönlendirme Metni */}
          <Text style={[styles.footerNote, isSos && { color: '#FCA5A5' }]}>
            {isSos
              ? '🚨 Acil durumlarda hastayı hemen arayabilir veya 112 Acil Servis ile iletişime geçebilirsiniz.'
              : isTaken
                ? '✅ Tedavi süreci eksiksiz ve planlandığı şekilde devam ediyor.'
                : 'ℹ️ Hastanız ilacını atladı. Gerekirse hastanızla iletişime geçebilirsiniz.'}
          </Text>

          {/* Butonlar */}
          {isSos && (
            <TouchableOpacity
              style={[styles.callButton, { backgroundColor: '#16A34A', marginBottom: 10 }]}
              onPress={handleCallPatient}
              activeOpacity={0.85}
            >
              <Ionicons name="call" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>
                {isCalling ? 'Aranıyor...' : 'Hastayı Hemen Ara'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: isSos
                  ? 'rgba(255, 255, 255, 0.15)'
                  : isTaken
                    ? '#0D9488'
                    : '#DC2626',
              },
            ]}
            onPress={handleDismiss}
            activeOpacity={0.85}
          >
            <Ionicons name={isSos ? 'close' : 'checkmark-sharp'} size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>
              {isSos ? 'Bildirimi Kapat' : isTaken ? 'Harika, Teşekkürler!' : 'Anladım'}
            </Text>
          </TouchableOpacity>
        </View>
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
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
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
