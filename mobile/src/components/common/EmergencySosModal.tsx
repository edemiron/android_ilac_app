/**
 * EmergencySosModal.tsx — Acil Durum & SOS Yardım Merkezi Modalı (Sprint 104)
 *
 * Hayat kurtarıcı tek dokunuşla 112 Acil Çağrı, bağlı tüm bakıcılara anında
 * yüksek öncelikli canlı alarm ve konum gönderme, acil arama ve panik sireni.
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Alert,
  Vibration,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { sendEmergencySosToCaregivers } from '../../services/caregiverService';
import { playAlarmSound, stopAlarmSound } from '../../utils/alarmSoundManager';
import { getTelUri } from '../../utils/phoneHelpers';
import type { ThemeColors } from '../../contexts/ThemeContext';

interface EmergencySosModalProps {
  visible: boolean;
  onClose: () => void;
  userId?: string;
  userName?: string;
  caregiverPhone?: string;
  onNavigateToPharmacy?: () => void;
  colors: ThemeColors;
  language: 'tr' | 'en';
}

export function EmergencySosModal({
  visible,
  onClose,
  userId,
  userName,
  caregiverPhone,
  onNavigateToPharmacy,
  colors,
  language,
}: EmergencySosModalProps) {
  const [sendingSos, setSendingSos] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  const [sirenActive, setSirenActive] = useState(false);

  const isTr = language === 'tr';

  const handleCall112 = async () => {
    try {
      const telUrl = 'tel:112';
      const supported = await Linking.canOpenURL(telUrl);
      if (supported) {
        await Linking.openURL(telUrl);
      } else {
        Alert.alert(
          isTr ? 'Arama Başlatılamadı' : 'Cannot Dial',
          isTr
            ? 'Lütfen doğrudan 112 numarasını arayınız.'
            : 'Please dial emergency services directly.'
        );
      }
    } catch {
      Linking.openURL('tel:112').catch(() => {});
    }
  };

  const handleCallCaregiver = async () => {
    if (!caregiverPhone) {
      Alert.alert(
        isTr ? 'Kayıtlı Numara Yok' : 'No Phone Number',
        isTr
          ? 'Henüz bir bakıcı telefon numarası kaydedilmemiş. Ayarlar ekranından numara ekleyebilirsiniz.'
          : 'No caregiver phone number registered yet.'
      );
      return;
    }
    try {
      const telUrl = getTelUri(caregiverPhone);
      await Linking.openURL(telUrl);
    } catch {
      Alert.alert(isTr ? 'Hata' : 'Error', isTr ? 'Arama başlatılamadı.' : 'Could not start call.');
    }
  };

  const handleSendSosToCaregivers = async () => {
    if (!userId) {
      Alert.alert(
        isTr ? 'Giriş Gerekli' : 'Login Required',
        isTr ? 'Bakıcılara SOS göndermek için oturum açmalısınız.' : 'Please log in to send SOS.'
      );
      return;
    }

    try {
      setSendingSos(true);
      const res = await sendEmergencySosToCaregivers(
        userId,
        userName || 'Hasta',
        isTr
          ? 'Acil Durum: Hasta SOS butonuna basarak yardım talep etti!'
          : 'Emergency SOS: Patient triggered the emergency alert!'
      );

      if (res.success) {
        setSosSent(true);
        Vibration.vibrate([0, 500, 200, 500]);
        Alert.alert(
          isTr ? '🚨 SOS Bildirimi İletildi' : '🚨 SOS Alert Dispatched',
          isTr
            ? `${res.sentCount} bağlı bakıcınıza yüksek öncelikli acil durum alarmı ve bildirimi gönderildi.`
            : `Emergency SOS dispatched to ${res.sentCount} caregiver(s).`
        );
      } else {
        Alert.alert(
          isTr ? 'Uyarı' : 'Notice',
          res.error || (isTr ? 'Çağrı gönderilemedi.' : 'Could not dispatch SOS.')
        );
      }
    } catch (err: any) {
      Alert.alert(
        isTr ? 'Hata' : 'Error',
        err?.message || (isTr ? 'İletim başarısız.' : 'Failed to deliver.')
      );
    } finally {
      setSendingSos(false);
    }
  };

  // Modal kapandığında veya unmount olduğunda çalan sireni ve titreşimi temizle
  useEffect(() => {
    if (!visible && sirenActive) {
      stopAlarmSound().catch(() => {});
      Vibration.cancel();
      setSirenActive(false);
    }
  }, [visible, sirenActive]);

  useEffect(() => {
    return () => {
      stopAlarmSound().catch(() => {});
      Vibration.cancel();
    };
  }, []);

  const handleToggleSiren = () => {
    if (sirenActive) {
      stopAlarmSound().catch(() => {});
      Vibration.cancel();
      setSirenActive(false);
    } else {
      setSirenActive(true);
      // 1. Yüksek sesli acil siren sesini loop olarak çal (%100 ses seviyesi)
      playAlarmSound(100, 'urgent_alert', true).catch(err => {
        console.error('[EmergencySosModal] Siren sesi çalma hatası:', err);
      });
      // 2. Agresif acil durum titreşim paterni: [bekle, titre, bekle, titre...]
      Vibration.vibrate([0, 800, 300, 800, 300, 800, 300, 1000], true);
      Alert.alert(
        isTr ? '🔊 Panik Sireni Aktif' : '🔊 Panic Siren Active',
        isTr
          ? 'Cihaz çevredeki insanların dikkatini çekmek için yüksek sesli siren ve acil durum sinyali veriyor.'
          : 'Device is emitting a loud emergency siren and vibration alert.',
        [
          {
            text: isTr ? 'Sireni Sustur' : 'Stop Siren',
            onPress: () => {
              stopAlarmSound().catch(() => {});
              Vibration.cancel();
              setSirenActive(false);
            },
          },
        ]
      );
    }
  };

  const handleClose = () => {
    if (sirenActive) {
      stopAlarmSound().catch(() => {});
      Vibration.cancel();
      setSirenActive(false);
    }
    setSosSent(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: '#EF4444' }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badge}>
              <Ionicons name="warning" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>
                {isTr ? 'Acil Durum & SOS Merkezi' : 'Emergency SOS Center'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {isTr
                  ? 'Gerektiğinde hemen yardım çağırın veya yakınlarınıza haber verin.'
                  : 'Quickly call for emergency assistance or alert caregivers.'}
              </Text>
            </View>
          </View>

          {/* 1. 112 Acil Yardım Çağır (Büyük Kırmızı Buton) */}
          <TouchableOpacity style={styles.btn112} onPress={handleCall112} activeOpacity={0.85}>
            <View style={styles.btn112IconWrapper}>
              <Ionicons name="call" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.btn112Content}>
              <Text style={styles.btn112Title}>
                {isTr ? '112 Acil Çağrı Merkezi' : 'Call Emergency (112 / 911)'}
              </Text>
              <Text style={styles.btn112Subtitle}>
                {isTr
                  ? 'Ambulans, İtfaiye, Polis (Ücretsiz & Anında)'
                  : 'Direct emergency dispatch call'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* 2. Bakıcılara Canlı SOS Bildirimi Gönder */}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: sosSent ? '#059669' : colors.background,
                borderColor: sosSent ? '#10B981' : '#F87171',
              },
            ]}
            onPress={handleSendSosToCaregivers}
            disabled={sendingSos}
            activeOpacity={0.8}
          >
            <View
              style={[styles.actionIconBadge, { backgroundColor: sosSent ? '#10B981' : '#FEE2E2' }]}
            >
              {sendingSos ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <Ionicons
                  name={sosSent ? 'checkmark-circle' : 'radio-outline'}
                  size={24}
                  color={sosSent ? '#FFFFFF' : '#DC2626'}
                />
              )}
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: colors.text }]}>
                {sosSent
                  ? isTr
                    ? '✅ Bakıcılara SOS İletildi'
                    : '✅ SOS Sent to Caregivers'
                  : isTr
                    ? 'Bakıcılara Acil Alarm Gönder'
                    : 'Broadcast SOS to Caregivers'}
              </Text>
              <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                {isTr
                  ? 'Tüm bağlı yakınlarınızın telefonuna sesli acil uyarı gider'
                  : 'Sends high-priority alarm notification to all active caregivers'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* 3. Kayıtlı Yakını / Bakıcıyı Ara */}
          {caregiverPhone && (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
              onPress={handleCallCaregiver}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIconBadge, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="person" size={22} color="#0284C7" />
              </View>
              <View style={styles.actionContent}>
                <Text style={[styles.actionTitle, { color: colors.text }]}>
                  {isTr ? 'Kayıtlı Yakınını / Bakıcıyı Ara' : 'Call Caregiver Directly'}
                </Text>
                <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                  {caregiverPhone}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* 4. Alt Hızlı Butonlar: Nöbetçi Eczane & Panik Sireni */}
          <View style={styles.quickActionsRow}>
            {onNavigateToPharmacy && (
              <TouchableOpacity
                style={[
                  styles.quickBtn,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
                onPress={() => {
                  handleClose();
                  onNavigateToPharmacy();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="medical" size={20} color="#10B981" style={{ marginRight: 6 }} />
                <Text style={[styles.quickBtnText, { color: colors.text }]}>
                  {isTr ? 'Nöbetçi Eczane' : 'Pharmacy'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.quickBtn,
                {
                  backgroundColor: sirenActive ? '#FEF2F2' : colors.background,
                  borderColor: sirenActive ? '#EF4444' : colors.border,
                },
              ]}
              onPress={handleToggleSiren}
              activeOpacity={0.8}
            >
              <Ionicons
                name={sirenActive ? 'volume-high' : 'volume-mute-outline'}
                size={20}
                color="#DC2626"
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.quickBtnText, { color: sirenActive ? '#DC2626' : colors.text }]}>
                {sirenActive
                  ? isTr
                    ? 'Sireni Durdur'
                    : 'Stop Siren'
                  : isTr
                    ? 'Sesli Siren Çal'
                    : 'Audible Siren'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Kapat / İptal Butonu */}
          <TouchableOpacity
            style={[styles.closeBtn, { borderColor: colors.border }]}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.closeBtnText, { color: colors.textSecondary }]}>
              {isTr ? 'Kapat / Yanlışlıkla Bastım' : 'Close / False Alarm'}
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 2,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#EF4444',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  btn112: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  btn112IconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  btn112Content: {
    flex: 1,
  },
  btn112Title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  btn112Subtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '500',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 10,
  },
  actionIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 11,
    lineHeight: 14,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 14,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
