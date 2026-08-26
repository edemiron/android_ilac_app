/**
 * CaregiverPatientDetailModal — Hasta Detay & Canlı İlaç Takip Paneli
 *
 * Bakıcı takip ettiği hastanın üzerine tıkladığında açılır:
 * - Günlük ilaç programı ve saatleri (Sabah, Öğle, Akşam, Gece)
 * - Canlı alınma / atlanma / bekleme durumu
 * - Uyum ilerleme çubuğu
 * - İlaç geçmişi ve tüm reçeteli ilaçlar listesi
 * - Hastaya canlı "📢 Hatırlat" (Remote Nudge) tam ekran mesaj gönderme
 * - Hastayı doğrudan arama köprüsü
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Dimensions,
  TextInput,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { PatientInfo } from '../../../types';
import type { ThemeColors } from '../../../contexts/ThemeContext';
import {
  getPatientFullSchedule,
  getPatientPhoneNumber,
  subscribeToPatientLiveLogs,
  logMedicineTakenByCaregiver,
  sendRemoteReminderToPatient,
} from '../../../services/caregiverService';
import { useAuth } from '../../../contexts/AuthContext';
import { useHaptics } from '../../../hooks/useHaptics';

interface CaregiverPatientDetailModalProps {
  visible: boolean;
  patient: PatientInfo | null;
  onClose: () => void;
  colors: ThemeColors;
  isDark?: boolean;
  language: string;
}

export function CaregiverPatientDetailModal({
  visible,
  patient,
  onClose,
  colors,
  isDark = false,
  language,
}: CaregiverPatientDetailModalProps) {
  const isTr = language === 'tr';
  const haptics = useHaptics();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'today' | 'history' | 'medicines'>('today');
  const [isLoading, setIsLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [scheduleData, setScheduleData] = useState<{
    medicines: any[];
    reminderTimes: any[];
    logs: any[];
    todayCompletedCount: number;
    todayTotalCount: number;
    todayPercent: number;
  }>({
    medicines: [],
    reminderTimes: [],
    logs: [],
    todayCompletedCount: 0,
    todayTotalCount: 0,
    todayPercent: 0,
  });

  // Hatırlatma (Nudge) Gönderme Modalı State'leri
  const [nudgeModalVisible, setNudgeModalVisible] = useState(false);
  const [selectedDoseForNudge, setSelectedDoseForNudge] = useState<any | null>(null);
  const [customNudgeMessage, setCustomNudgeMessage] = useState('');
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [isSendingNudge, setIsSendingNudge] = useState(false);

  // Veri yükleme & Canlı Firestore dinleyicisi
  useEffect(() => {
    if (!visible || !patient) return;

    setIsLoading(true);

    // Telefon ve programı getir
    Promise.all([getPatientFullSchedule(patient.id), getPatientPhoneNumber(patient.id)]).then(
      ([sched, phone]) => {
        setScheduleData(sched);
        setPhoneNumber(phone);
        setIsLoading(false);
      }
    );

    // Canlı log dinleyicisi
    const unsub = subscribeToPatientLiveLogs(patient.id, () => {
      getPatientFullSchedule(patient.id).then(sched => {
        setScheduleData(sched);
      });
    });

    return () => unsub();
  }, [visible, patient]);

  if (!patient) return null;

  const patientName = patient.name || (isTr ? 'Kayıtlı Hasta' : 'Patient');
  const caregiverName =
    user?.displayName || user?.email?.split('@')[0] || (isTr ? 'Bakıcınız' : 'Caregiver');

  const getInitials = (name: string) => {
    if (!name) return 'H';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleCallPatient = () => {
    haptics.trigger('selection');
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    } else {
      Linking.openURL(`tel:`);
    }
  };

  const handleMarkAsTaken = async (medicineName: string, time: string) => {
    haptics.trigger('medium');
    await logMedicineTakenByCaregiver(patient.id, medicineName, time);
    const updated = await getPatientFullSchedule(patient.id);
    setScheduleData(updated);
  };

  // Hatırlatma Modalını Aç
  const handleOpenNudgeModal = (dose: any) => {
    haptics.trigger('selection');
    setSelectedDoseForNudge(dose);
    setCustomNudgeMessage('');
    setSelectedPresetIndex(0);
    setNudgeModalVisible(true);
  };

  // Hatırlatma Gönder
  const handleSendNudge = async () => {
    if (!selectedDoseForNudge || !user?.uid) return;

    haptics.trigger('medium');
    setIsSendingNudge(true);

    const presetMessages = [
      isTr
        ? `Lütfen ${selectedDoseForNudge.medicineName} (${selectedDoseForNudge.time}) ilacınızı almayı unutmayın!`
        : `Please remember to take your ${selectedDoseForNudge.medicineName} (${selectedDoseForNudge.time}) dose!`,
      isTr
        ? `İlacınızı aldınız mı? Lütfen uygulamanızdan işaretleyin.`
        : `Have you taken your medication? Please mark it in your app.`,
      isTr
        ? `Sağlığınız bizim için çok önemli, lütfen ilacınızı ihmal etmeyin.`
        : `Your health is very important, please do not skip your medicine.`,
    ];

    const finalMessage =
      customNudgeMessage.trim() || presetMessages[selectedPresetIndex] || presetMessages[0];

    const result = await sendRemoteReminderToPatient({
      patientId: patient.id,
      caregiverId: user.uid,
      caregiverName,
      medicineId: selectedDoseForNudge.medicineId,
      medicineName: selectedDoseForNudge.medicineName,
      scheduledTime: selectedDoseForNudge.time,
      doseStatus: selectedDoseForNudge.status,
      customMessage: finalMessage,
    });

    setIsSendingNudge(false);
    setNudgeModalVisible(false);

    if (result.success) {
      haptics.trigger('success');
      Alert.alert(
        isTr ? '📢 Hatırlatma İletildi!' : '📢 Reminder Sent!',
        isTr
          ? `${patientName} kullanıcısının telefonuna tam ekran canlı hatırlatma mesajı gönderildi.`
          : `A live full-screen reminder has been sent to ${patientName}'s phone.`
      );
    } else {
      haptics.trigger('error');
      Alert.alert(isTr ? 'Hata' : 'Error', result.error || 'Hatırlatma iletilemedi.');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const todayDoses = scheduleData.reminderTimes
    .map(rt => {
      const med = scheduleData.medicines.find(m => m.id === rt.medicineId) || {
        name: (rt as any).medicineName || 'İlaç',
        color: '#0D9488',
        dosage: '',
      };

      const matchingLog = scheduleData.logs.find(
        l =>
          l.medicineId === rt.medicineId &&
          ((l.scheduledTime && l.scheduledTime.includes(rt.time)) ||
            (l.takenAt && l.takenAt.startsWith(todayStr)))
      );

      return {
        reminderTimeId: rt.id,
        medicineId: rt.medicineId,
        medicineName: med.name,
        dosage: med.dosage,
        instructions: med.instructions,
        color: med.color || '#0D9488',
        time: rt.time,
        status: matchingLog ? matchingLog.status : 'pending',
        takenAt: matchingLog ? matchingLog.takenAt : null,
      };
    })
    .sort((a, b) => a.time.localeCompare(b.time));

  const screenHeight = (() => {
    try {
      return Dimensions?.get('window')?.height || 800;
    } catch {
      return 800;
    }
  })();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              borderColor: isDark ? '#334155' : '#E2E8F0',
              maxHeight: screenHeight * 0.88,
              minHeight: screenHeight * 0.65,
            },
          ]}
        >
          {/* Sürükleme / Çizgi Göstergesi */}
          <View style={styles.dragHandleContainer}>
            <View
              style={[styles.dragHandle, { backgroundColor: isDark ? '#334155' : '#CBD5E1' }]}
            />
          </View>

          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={[styles.avatar, { backgroundColor: `${colors.primary}20` }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {getInitials(patientName)}
                </Text>
              </View>
              <View style={styles.headerInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.patientName, { color: colors.text }]} numberOfLines={1}>
                    {patientName}
                  </Text>
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveBadgeText}>CANLI</Text>
                  </View>
                </View>
                <Text style={[styles.patientEmail, { color: colors.textSecondary }]}>
                  {patient.email || (isTr ? 'Takipte' : 'Monitoring')}
                </Text>
              </View>
            </View>

            <View style={styles.headerRightActions}>
              {/* Ara Butonu */}
              <TouchableOpacity
                style={[
                  styles.phoneBtn,
                  { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7' },
                ]}
                onPress={handleCallPatient}
                activeOpacity={0.7}
              >
                <Ionicons name="call" size={17} color="#16A34A" />
              </TouchableOpacity>

              {/* Kapat Butonu */}
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sekmeler (Tabs) */}
          <View
            style={[
              styles.tabRow,
              {
                backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                borderColor: isDark ? '#334155' : '#E2E8F0',
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'today' && {
                  backgroundColor: colors.primary,
                },
              ]}
              onPress={() => {
                haptics.trigger('selection');
                setActiveTab('today');
              }}
            >
              <Ionicons
                name="calendar"
                size={14}
                color={activeTab === 'today' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'today' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {isTr ? 'Bugünkü Dozlar' : "Today's Doses"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'history' && {
                  backgroundColor: colors.primary,
                },
              ]}
              onPress={() => {
                haptics.trigger('selection');
                setActiveTab('history');
              }}
            >
              <Ionicons
                name="time"
                size={14}
                color={activeTab === 'history' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'history' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {isTr ? 'İlaç Geçmişi' : 'History'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'medicines' && {
                  backgroundColor: colors.primary,
                },
              ]}
              onPress={() => {
                haptics.trigger('selection');
                setActiveTab('medicines');
              }}
            >
              <Ionicons
                name="medkit"
                size={14}
                color={activeTab === 'medicines' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'medicines' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {isTr ? 'Tüm İlaçları' : 'Medicines'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* İçerik Alanı */}
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                {isTr ? 'Hasta ilaç programı getiriliyor...' : 'Loading patient schedule...'}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollBody}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              {/* TAB 1: BUGÜNKÜ DOZLAR */}
              {activeTab === 'today' && (
                <View>
                  {/* Uyum İlerleme Kartı */}
                  <View
                    style={[
                      styles.adherenceCard,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        borderColor: isDark ? '#334155' : '#E2E8F0',
                      },
                    ]}
                  >
                    <View style={styles.adherenceHeader}>
                      <Text style={[styles.adherenceTitle, { color: colors.text }]}>
                        {isTr ? 'Bugünkü İlaç Uyumu' : "Today's Adherence"}
                      </Text>
                      <Text style={[styles.adherencePercent, { color: colors.primary }]}>
                        %{scheduleData.todayPercent}
                      </Text>
                    </View>

                    {/* İlerleme Çubuğu */}
                    <View
                      style={[
                        styles.progressBarTrack,
                        { backgroundColor: isDark ? '#334155' : '#E2E8F0' },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${scheduleData.todayPercent}%`,
                            backgroundColor: colors.primary,
                          },
                        ]}
                      />
                    </View>

                    <Text style={[styles.adherenceSubtitle, { color: colors.textSecondary }]}>
                      {scheduleData.todayCompletedCount} / {scheduleData.todayTotalCount}{' '}
                      {isTr ? 'doz tamamlandı.' : 'doses completed.'}
                    </Text>
                  </View>

                  {/* Doz Listesi */}
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>
                    {isTr ? 'Günün İlaç Saatleri' : 'Scheduled Doses Today'}
                  </Text>

                  {todayDoses.length === 0 ? (
                    <View style={styles.emptyDoseBox}>
                      <Ionicons name="checkmark-done-circle" size={48} color="#10B981" />
                      <Text style={[styles.emptyDoseTitle, { color: colors.text }]}>
                        {isTr ? 'Bugün için planlanmış ilaç yok' : 'No scheduled doses today'}
                      </Text>
                    </View>
                  ) : (
                    todayDoses.map((dose, idx) => {
                      const isTaken = dose.status === 'taken';
                      const isSkipped = dose.status === 'skipped';

                      return (
                        <View
                          key={`${dose.reminderTimeId}-${idx}`}
                          style={[
                            styles.doseCard,
                            {
                              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                              borderColor: isTaken
                                ? '#10B981'
                                : isSkipped
                                  ? '#EF4444'
                                  : isDark
                                    ? '#334155'
                                    : '#E2E8F0',
                            },
                          ]}
                        >
                          <View style={[styles.medAvatar, { backgroundColor: `${dose.color}20` }]}>
                            <Ionicons name="medical" size={20} color={dose.color} />
                          </View>

                          <View style={styles.doseInfo}>
                            <View style={styles.doseNameRow}>
                              <Text
                                style={[styles.doseMedName, { color: colors.text }]}
                                numberOfLines={1}
                              >
                                {dose.medicineName}
                              </Text>
                              <Text style={[styles.doseTimeText, { color: colors.primary }]}>
                                ⏰ {dose.time}
                              </Text>
                            </View>

                            {dose.dosage ? (
                              <Text
                                style={[styles.doseDosageText, { color: colors.textSecondary }]}
                              >
                                {dose.dosage} {dose.instructions ? `• ${dose.instructions}` : ''}
                              </Text>
                            ) : null}

                            {/* Durum Rozeti ve Aksiyon Butonları */}
                            <View style={styles.statusRow}>
                              <View
                                style={[
                                  styles.doseStatusBadge,
                                  {
                                    backgroundColor: isTaken
                                      ? 'rgba(16, 185, 129, 0.15)'
                                      : isSkipped
                                        ? 'rgba(239, 68, 68, 0.15)'
                                        : 'rgba(245, 158, 11, 0.15)',
                                  },
                                ]}
                              >
                                <Ionicons
                                  name={
                                    isTaken
                                      ? 'checkmark-circle'
                                      : isSkipped
                                        ? 'close-circle'
                                        : 'time-outline'
                                  }
                                  size={13}
                                  color={isTaken ? '#10B981' : isSkipped ? '#EF4444' : '#F59E0B'}
                                />
                                <Text
                                  style={[
                                    styles.doseStatusText,
                                    {
                                      color: isTaken
                                        ? '#10B981'
                                        : isSkipped
                                          ? '#EF4444'
                                          : '#F59E0B',
                                    },
                                  ]}
                                >
                                  {isTaken
                                    ? isTr
                                      ? 'Alındı'
                                      : 'Taken'
                                    : isSkipped
                                      ? isTr
                                        ? 'Atlandı'
                                        : 'Skipped'
                                      : isTr
                                        ? 'Bekliyor'
                                        : 'Pending'}
                                </Text>
                              </View>

                              {/* Alınmadıysa (Bekliyor / Atlandı) Bakıcı Aksiyonları */}
                              {!isTaken && (
                                <View style={styles.actionsRightRow}>
                                  {/* 📢 Hatırlat Butonu */}
                                  <TouchableOpacity
                                    style={[
                                      styles.nudgeBtn,
                                      {
                                        backgroundColor: isSkipped
                                          ? 'rgba(239, 68, 68, 0.15)'
                                          : 'rgba(13, 148, 136, 0.15)',
                                      },
                                    ]}
                                    onPress={() => handleOpenNudgeModal(dose)}
                                    activeOpacity={0.7}
                                  >
                                    <Ionicons
                                      name="notifications"
                                      size={12}
                                      color={isSkipped ? '#EF4444' : colors.primary}
                                    />
                                    <Text
                                      style={[
                                        styles.nudgeBtnText,
                                        { color: isSkipped ? '#EF4444' : colors.primary },
                                      ]}
                                    >
                                      {isTr ? 'Hatırlat' : 'Remind'}
                                    </Text>
                                  </TouchableOpacity>

                                  {/* Aldı Olarak İşaretle */}
                                  <TouchableOpacity
                                    style={[
                                      styles.markTakenBtn,
                                      { backgroundColor: `${colors.primary}18` },
                                    ]}
                                    onPress={() => handleMarkAsTaken(dose.medicineName, dose.time)}
                                    activeOpacity={0.7}
                                  >
                                    <Ionicons name="checkmark" size={13} color={colors.primary} />
                                    <Text style={[styles.markTakenText, { color: colors.primary }]}>
                                      {isTr ? 'Aldı' : 'Taken'}
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              )}

              {/* TAB 2: İLAÇ GEÇMİŞİ */}
              {activeTab === 'history' && (
                <View>
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>
                    {isTr ? 'Son İlaç Hareketleri' : 'Recent Medicine Logs'}
                  </Text>

                  {scheduleData.logs.length === 0 ? (
                    <View style={styles.emptyDoseBox}>
                      <Ionicons
                        name="document-text-outline"
                        size={40}
                        color={colors.textSecondary}
                      />
                      <Text style={[styles.emptyDoseTitle, { color: colors.textSecondary }]}>
                        {isTr ? 'Henüz ilaç kaydı bulunmuyor' : 'No logs recorded yet'}
                      </Text>
                    </View>
                  ) : (
                    scheduleData.logs.map((logItem, idx) => {
                      const isTaken = logItem.status === 'taken';
                      const dateDisplay = logItem.takenAt || logItem.scheduledTime || '';
                      const dateObj = dateDisplay ? new Date(dateDisplay) : new Date();
                      const timeStr = dateObj.toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const dateStr = dateObj.toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                      });

                      return (
                        <View
                          key={logItem.id || idx}
                          style={[
                            styles.historyRow,
                            {
                              backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                              borderColor: isDark ? '#334155' : '#E2E8F0',
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.historyIconBox,
                              {
                                backgroundColor: isTaken
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : 'rgba(239, 68, 68, 0.15)',
                              },
                            ]}
                          >
                            <Ionicons
                              name={isTaken ? 'checkmark-sharp' : 'close-sharp'}
                              size={18}
                              color={isTaken ? '#10B981' : '#EF4444'}
                            />
                          </View>

                          <View style={styles.historyInfo}>
                            <Text style={[styles.historyMedName, { color: colors.text }]}>
                              {logItem.medicineName || 'İlaç'}
                            </Text>
                            <Text style={[styles.historySubText, { color: colors.textSecondary }]}>
                              {dateStr} • Saat {timeStr}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.historyBadge,
                              {
                                backgroundColor: isTaken
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : 'rgba(239, 68, 68, 0.15)',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.historyBadgeText,
                                { color: isTaken ? '#10B981' : '#EF4444' },
                              ]}
                            >
                              {isTaken ? (isTr ? 'ALINDI' : 'TAKEN') : isTr ? 'ATLANDI' : 'SKIPPED'}
                            </Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              )}

              {/* TAB 3: TÜM REÇETELİ İLAÇLAR */}
              {activeTab === 'medicines' && (
                <View>
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>
                    {isTr ? 'Kayıtlı İlaç Listesi' : 'Active Prescriptions'}
                  </Text>

                  {scheduleData.medicines.length === 0 ? (
                    <View style={styles.emptyDoseBox}>
                      <Ionicons name="medkit-outline" size={40} color={colors.textSecondary} />
                      <Text style={[styles.emptyDoseTitle, { color: colors.textSecondary }]}>
                        {isTr ? 'Kayıtlı ilaç bulunamadı' : 'No medicines found'}
                      </Text>
                    </View>
                  ) : (
                    scheduleData.medicines.map((med, idx) => (
                      <View
                        key={med.id || idx}
                        style={[
                          styles.medListCard,
                          {
                            backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                            borderColor: isDark ? '#334155' : '#E2E8F0',
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.medAvatar,
                            { backgroundColor: `${med.color || '#0D9488'}20` },
                          ]}
                        >
                          <Ionicons name="medical" size={20} color={med.color || '#0D9488'} />
                        </View>

                        <View style={styles.doseInfo}>
                          <Text style={[styles.doseMedName, { color: colors.text }]}>
                            {med.name}
                          </Text>
                          <Text style={[styles.doseDosageText, { color: colors.textSecondary }]}>
                            {med.dosage || ''} {med.instructions ? `• ${med.instructions}` : ''}
                          </Text>
                          {med.stock !== undefined && (
                            <Text style={[styles.stockText, { color: colors.primary }]}>
                              📦 {isTr ? `Kalan Stok: ${med.stock} adet` : `Stock: ${med.stock}`}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>

      {/* ========================================================================= */}
      {/* 📢 CANLI HATIRLATMA (NUDGE) GÖNDERME PENCERESİ                            */}
      {/* ========================================================================= */}
      {selectedDoseForNudge && (
        <Modal
          visible={nudgeModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setNudgeModalVisible(false)}
        >
          <View style={styles.nudgeBackdrop}>
            <View
              style={[
                styles.nudgeModalContent,
                {
                  backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              {/* Başlık */}
              <View style={styles.nudgeHeader}>
                <View style={styles.nudgeIconBox}>
                  <Ionicons name="notifications-outline" size={22} color="#0D9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.nudgeTitle, { color: colors.text }]}>
                    {isTr ? 'Canlı Hatırlatma Gönder' : 'Send Live Reminder'}
                  </Text>
                  <Text style={[styles.nudgeSubTitle, { color: colors.textSecondary }]}>
                    {patientName} ({selectedDoseForNudge.medicineName} • {selectedDoseForNudge.time}
                    )
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setNudgeModalVisible(false)}
                  style={styles.nudgeCloseBtn}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Hazır Mesaj Şablonları */}
              <Text style={[styles.nudgeSectionLabel, { color: colors.text }]}>
                {isTr ? 'Mesaj Şablonu Seçin:' : 'Choose Message Template:'}
              </Text>

              {[
                isTr
                  ? `Lütfen ${selectedDoseForNudge.medicineName} (${selectedDoseForNudge.time}) ilacınızı almayı unutmayın!`
                  : `Please remember to take your ${selectedDoseForNudge.medicineName} (${selectedDoseForNudge.time}) dose!`,
                isTr
                  ? `İlacınızı aldınız mı? Lütfen uygulamanızdan işaretleyin.`
                  : `Have you taken your medication? Please mark it in your app.`,
                isTr
                  ? `Sağlığınız bizim için çok önemli, lütfen ilacınızı ihmal etmeyin.`
                  : `Your health is very important, please do not skip your medicine.`,
              ].map((msg, pIdx) => {
                const isSelected = selectedPresetIndex === pIdx && !customNudgeMessage;
                return (
                  <TouchableOpacity
                    key={pIdx}
                    style={[
                      styles.presetItem,
                      {
                        backgroundColor: isSelected
                          ? 'rgba(13, 148, 136, 0.15)'
                          : isDark
                            ? '#1E293B'
                            : '#F8FAFC',
                        borderColor: isSelected ? '#0D9488' : isDark ? '#334155' : '#E2E8F0',
                      },
                    ]}
                    onPress={() => {
                      haptics.trigger('selection');
                      setSelectedPresetIndex(pIdx);
                      setCustomNudgeMessage('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={17}
                      color={isSelected ? '#0D9488' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.presetText,
                        { color: isSelected ? colors.text : colors.textSecondary },
                      ]}
                    >
                      {msg}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Özel Mesaj Girişi */}
              <Text style={[styles.nudgeSectionLabel, { color: colors.text, marginTop: 12 }]}>
                {isTr ? 'Veya Özel Mesaj Yazın:' : 'Or Write Custom Message:'}
              </Text>
              <TextInput
                style={[
                  styles.customInput,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                    borderColor: isDark ? '#334155' : '#CBD5E1',
                    color: colors.text,
                  },
                ]}
                placeholder={
                  isTr ? 'Örn: Canım ilacını içtin mi?' : 'e.g. Did you take your pills?'
                }
                placeholderTextColor={colors.textSecondary}
                value={customNudgeMessage}
                onChangeText={setCustomNudgeMessage}
                maxLength={120}
              />

              {/* Gönder Butonu */}
              <TouchableOpacity
                style={[styles.sendNudgeBtn, { backgroundColor: '#0D9488' }]}
                onPress={handleSendNudge}
                disabled={isSendingNudge}
                activeOpacity={0.85}
              >
                {isSendingNudge ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={17} color="#FFFFFF" />
                    <Text style={styles.sendNudgeBtnText}>
                      {isTr ? 'Hastanın Ekranına Gönder' : 'Send to Patient'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  dragHandle: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  patientEmail: {
    fontSize: 12.5,
    marginTop: 2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phoneBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  loadingBox: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  scrollBody: {
    flex: 1,
  },
  adherenceCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  adherenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  adherenceTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  adherencePercent: {
    fontSize: 18,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  adherenceSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyDoseBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyDoseTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  doseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  medAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  doseInfo: {
    flex: 1,
  },
  doseNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  doseMedName: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  doseTimeText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  doseDosageText: {
    fontSize: 12,
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  actionsRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  doseStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  doseStatusText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  nudgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  nudgeBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  markTakenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  markTakenText: {
    fontSize: 11,
    fontWeight: '700',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  historyIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  historyInfo: {
    flex: 1,
  },
  historyMedName: {
    fontSize: 14,
    fontWeight: '700',
  },
  historySubText: {
    fontSize: 11.5,
    marginTop: 2,
  },
  historyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  historyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  medListCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  stockText: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 3,
  },

  // Nudge Modal Styles
  nudgeBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  nudgeModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1.2,
    padding: 20,
  },
  nudgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  nudgeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(13, 148, 136, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  nudgeSubTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  nudgeCloseBtn: {
    padding: 4,
  },
  nudgeSectionLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 8,
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  presetText: {
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
    lineHeight: 17,
  },
  customInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 16,
  },
  sendNudgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  sendNudgeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
