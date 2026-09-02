/**
 * AlarmDiagnosticCard.tsx — Canlı Sistem, Zamanlama & Alarm Teşhis Paneli
 *
 * Kullanıcının alarmların ve bildirimlerin arka planda tam zamanında çalışıp çalışmayacağını
 * tek ekranda görmesini, 14 günlük projeksiyonu incelemesini ve 5 saniyelik test alarmı kurmasını sağlar.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  NativeModules,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { lightColors, darkColors, type ThemeColors } from '../../../contexts/ThemeContext';
import { useMedicineStore } from '../../../stores/medicineStore';
import { getRollingHorizonSummary } from '../../../utils/notifications/rollingHorizonScheduler';
import { TEST_ALARM_DURATIONS, type TestAlarmStep } from '../../../utils/notifications/testAlarm';
import { useOemShieldStatus } from '../../../hooks/useOemShieldStatus';
import { useLockScreenAlarmTest } from '../../../hooks/useLockScreenAlarmTest';
import { useAlert } from '../../../contexts/AlertContext';
import { formatTimeDisplay } from '../../../utils/timeCalculator';
import type { Medicine, ReminderTime } from '../../../types';

interface AlarmDiagnosticCardProps {
  language: string;
  isDark: boolean;
  colors?: ThemeColors;
  medicines?: Medicine[];
  reminderTimes?: ReminderTime[];
  onBatteryPress?: () => void;
}

/**
 * Store'dan anlik goruntu okur. HOOK DEGIL — `getState()` bir abonelik
 * kurmaz, bu yuzden kosullu cagrilabilir. Testlerde store mock'lari farkli
 * sekillerde geldigi icin savunmaci.
 */
function readMedicineStoreSnapshot(): {
  medicines: Medicine[];
  reminderTimes: ReminderTime[];
} {
  try {
    const getState = (useMedicineStore as { getState?: () => unknown } | undefined)?.getState;
    if (typeof getState !== 'function') {
      return { medicines: [], reminderTimes: [] };
    }
    const state = getState() as
      | { medicines?: Medicine[]; reminderTimes?: ReminderTime[] }
      | undefined;
    return {
      medicines: state?.medicines ?? [],
      reminderTimes: state?.reminderTimes ?? [],
    };
  } catch {
    return { medicines: [], reminderTimes: [] };
  }
}

export function AlarmDiagnosticCard({
  language,
  isDark,
  colors: propColors,
  medicines: propMedicines,
  reminderTimes: propReminderTimes,
  onBatteryPress,
}: AlarmDiagnosticCardProps) {
  const isTr = language === 'tr';
  const fallbackColors = (isDark ? darkColors : lightColors) || {
    card: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#64748B',
    primary: '#0D9488',
    border: '#E2E8F0',
  };
  const colors = propColors || fallbackColors;
  const alertContext = useAlert();
  const showInfo = alertContext?.showInfo ?? (() => {});
  const showError = alertContext?.showError ?? (() => {});

  // v1.7.1: burada eskiden kosullu olarak `useMedicineStore()` cagriliyordu
  // (try/if icinde) — bu bir HOOK cagrisi oldugu icin React'in hook sirasi
  // kuralini ihlal ediyordu (`react-hooks/rules-of-hooks`). Store'dan yalnizca
  // anlik goruntu okumak istiyoruz; `getState()` hook DEGIL, bu yuzden
  // modul seviyesindeki saf yardimciya tasindi.
  const { medicines: storeMeds, reminderTimes: storeTimes } = readMedicineStoreSnapshot();

  const medicines = propMedicines ?? storeMeds;
  const reminderTimes = propReminderTimes ?? storeTimes;
  // Test "armed" durumu ve zamanlayıcı artık testAlarm motorunda (tek kaynak);
  // burada yalnızca kullanıcının seçtiği süre tutulur.
  const alarmTest = useLockScreenAlarmTest(isTr ? 'tr' : 'en');
  const [selectedSeconds, setSelectedSeconds] = useState<number>(TEST_ALARM_DURATIONS[0]);

  // İzin/kalkan durumu TEK paylaşımlı kaynaktan okunur (bkz. useOemShieldStatus).
  // Lokal state tutulmuyordu: kullanıcı izni sistem ayarlarından verip geri
  // döndüğünde eski değer ekranda kalıyordu.
  const {
    status: shieldStatus,
    isResolved: isShieldResolved,
    isRefreshing,
    refresh: refreshShieldStatus,
    notifySettingsOpened: notifyShieldSettingsOpened,
  } = useOemShieldStatus();

  // Veri hazır olmadan önce hiçbir rozet "izin yok" demez; nötr kalır.
  const exactAlarmGranted = isShieldResolved ? (shieldStatus?.exactAlarm ?? null) : null;
  const batteryIgnored = isShieldResolved
    ? (shieldStatus?.batteryOptimizationIgnored ?? null)
    : null;
  const fullScreenIntentGranted = isShieldResolved
    ? (shieldStatus?.fullScreenIntent ?? null)
    : null;
  const isXiaomi = isShieldResolved && shieldStatus?.oem === 'xiaomi';
  const showLockScreenPermissionRow =
    isShieldResolved && (isXiaomi || fullScreenIntentGranted === false);

  const badgeTone = (granted: boolean | null) => {
    if (granted === null) {
      return {
        bg: isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(100, 116, 139, 0.08)',
        fg: isDark ? '#94A3B8' : '#64748B',
      };
    }
    if (granted) {
      return {
        bg: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)',
        fg: isDark ? '#34D399' : '#059669',
      };
    }
    return {
      bg: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
      fg: '#D97706',
    };
  };

  const exactAlarmToneColors = badgeTone(exactAlarmGranted);
  const batteryToneColors = badgeTone(batteryIgnored);

  // 14 günlük kayar ufuk özeti
  const summary = getRollingHorizonSummary(medicines, reminderTimes);

  const handleOpenLockScreenPermission = async () => {
    try {
      // Dönüşteki ilk 'active' olayında zorunlu yenileme yapılsın.
      notifyShieldSettingsOpened();
      if (NativeModules.AlarmModule?.openOEMPopupSettings) {
        await NativeModules.AlarmModule.openOEMPopupSettings();
      }
    } catch (_e) {
      showError(
        isTr ? 'Ayar Açılamadı' : 'Could Not Open Settings',
        isTr
          ? 'Lütfen Ayarlar > Uygulamalar > İlaç Hatırlatıcı > Diğer İzinler menüsünden Kilit Ekranında Göster iznini açın.'
          : 'Please open Show on Lock Screen permission from App Info.'
      );
    }
  };

  const handleTestAlarm = async () => {
    if (alarmTest.isBusy) return;

    // Ayarlar motorda store'dan okunur; buradan partial ayar GEÇİLMEZ.
    const result = await alarmTest.run(selectedSeconds);

    if (result.ok) {
      showInfo(
        isTr ? '⏰ Test Alarmı Kuruldu' : '⏰ Test Alarm Armed',
        isTr
          ? `${selectedSeconds} saniye sonra çalacak. Şimdi güç tuşuyla ekranı kilitleyin.`
          : `Fires in ${selectedSeconds} seconds. Lock your screen with the power button now.`
      );
      return;
    }

    const reasonText = (() => {
      switch (result.reason) {
        case 'notifications-denied':
          return isTr
            ? 'Bildirim izni kapalı. Ayarlar > Bildirimler bölümünden izin verin.'
            : 'Notification permission is off. Grant it in Settings > Notifications.';
        case 'exact-alarm-denied':
          return isTr
            ? 'Kesin alarm izni kapalı. Alarm tam zamanında çalamaz.'
            : 'Exact alarm permission is off. The alarm cannot fire on time.';
        default:
          return isTr ? 'Test alarmı kurulamadı.' : 'Could not arm the test alarm.';
      }
    })();

    showError(isTr ? 'Test Başlatılamadı' : 'Test Could Not Start', reasonText);
  };

  const stepTone = (status: TestAlarmStep['status']) => {
    if (status === 'ok') return { icon: 'checkmark-circle', color: '#10B981' };
    if (status === 'warn') return { icon: 'alert-circle', color: '#F59E0B' };
    return { icon: 'close-circle', color: '#EF4444' };
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.75)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(45, 212, 191, 0.25)' : 'rgba(13, 148, 136, 0.2)',
        },
      ]}
    >
      {/* Kart Başlığı */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: isDark ? 'rgba(45, 212, 191, 0.15)' : 'rgba(13, 148, 136, 0.1)' },
            ]}
          >
            <Ionicons name="shield-checkmark" size={18} color={isDark ? '#2DD4BF' : '#0D9488'} />
          </View>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>
              {isTr ? 'Canlı Alarm & Sistem Teşhisi' : 'Live Alarm & System Diagnostics'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {isTr ? 'Zamanlama motoru ve Doze koruma kalkanı' : 'Timing engine & Doze mode guard'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            void refreshShieldStatus();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel={isTr ? 'Yenile' : 'Refresh'}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="sync" size={16} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Durum Rozetleri Grid */}
      <View style={styles.badgeGrid}>
        {/* Tam Zamanlı (Kesin) Alarm İzni — gerçek cihaz durumundan okunur */}
        <View style={[styles.badge, { backgroundColor: exactAlarmToneColors.bg }]}>
          <Ionicons
            name={exactAlarmGranted === false ? 'warning' : 'alarm'}
            size={14}
            color={exactAlarmToneColors.fg}
          />
          <Text style={[styles.badgeText, { color: exactAlarmToneColors.fg }]}>
            {exactAlarmGranted === null
              ? isTr
                ? 'Kesin Alarm: Kontrol ediliyor…'
                : 'Exact Alarm: Checking…'
              : exactAlarmGranted
                ? isTr
                  ? 'USE_EXACT_ALARM: Aktif'
                  : 'USE_EXACT_ALARM: Active'
                : isTr
                  ? 'Kesin Alarm İzni: Kapalı'
                  : 'Exact Alarm: Disabled'}
          </Text>
        </View>

        {/* Pil Koruma Durumu */}
        <TouchableOpacity
          style={[styles.badge, { backgroundColor: batteryToneColors.bg }]}
          onPress={onBatteryPress}
          activeOpacity={0.7}
        >
          <Ionicons
            name={
              batteryIgnored === null
                ? 'battery-half'
                : batteryIgnored
                  ? 'battery-charging'
                  : 'warning'
            }
            size={14}
            color={batteryToneColors.fg}
          />
          <Text style={[styles.badgeText, { color: batteryToneColors.fg }]}>
            {batteryIgnored === null
              ? isTr
                ? 'Pil Muafiyeti: Kontrol ediliyor…'
                : 'Battery: Checking…'
              : batteryIgnored
                ? isTr
                  ? 'Pil Muafiyeti: Verildi'
                  : 'Battery: Whitelisted'
                : isTr
                  ? 'Pil Koruması: Kontrol Et'
                  : 'Battery: Needs Check'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Xiaomi / Android 14 Kilit Ekranı & Tam Ekran İzni Rozeti */}
      {showLockScreenPermissionRow && (
        <TouchableOpacity
          style={[
            styles.lockscreenBadgeRow,
            {
              backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(37, 99, 235, 0.08)',
              borderColor: isDark ? 'rgba(96, 165, 250, 0.3)' : 'rgba(37, 99, 235, 0.2)',
            },
          ]}
          onPress={handleOpenLockScreenPermission}
          activeOpacity={0.7}
        >
          <Ionicons name="lock-open" size={15} color={isDark ? '#60A5FA' : '#2563EB'} />
          <Text style={[styles.lockscreenBadgeText, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}>
            {isTr
              ? '🔒 Kilit Ekranında Gösterme İznini Aç (Dokunun)'
              : '🔒 Enable Show on Lock Screen Permission (Tap)'}
          </Text>
        </TouchableOpacity>
      )}

      {/* 14 Günlük Projeksiyon & Sonraki Doz Detayı */}
      <View
        style={[
          styles.summaryBox,
          {
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(241, 245, 249, 0.8)',
            borderColor: isDark ? 'rgba(51, 65, 85, 0.8)' : 'rgba(226, 232, 240, 0.8)',
          },
        ]}
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryStat}>
            <Text style={[styles.statNumber, { color: isDark ? '#2DD4BF' : '#0D9488' }]}>
              {summary.totalPlannedDoses}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {isTr ? '14 Günlük Planlanan Doz' : '14-Day Projected Doses'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryStat}>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {summary.activeMedicinesCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {isTr ? 'Aktif İlaç' : 'Active Meds'}
            </Text>
          </View>
        </View>

        {summary.nextDose ? (
          <View style={styles.nextDoseRow}>
            <Ionicons name="time" size={13} color={colors.primary} />
            <Text style={[styles.nextDoseText, { color: colors.text }]}>
              {isTr ? 'Sonraki Alarm:' : 'Next Alarm:'}{' '}
              <Text style={{ fontWeight: '700' }}>
                {formatTimeDisplay(summary.nextDose.time)} — {summary.nextDose.medicineName}
              </Text>
            </Text>
          </View>
        ) : (
          <View style={styles.nextDoseRow}>
            <Ionicons name="checkmark-circle" size={13} color="#10B981" />
            <Text style={[styles.nextDoseText, { color: colors.textSecondary }]}>
              {isTr ? 'Bugün için bekleyen başka doz yok' : 'No more pending doses today'}
            </Text>
          </View>
        )}
      </View>

      {/* Kilit Ekranı Alarm Testi — süre seçimi + tek buton + adım adım sonuç */}
      <View style={styles.durationRow}>
        <Text style={[styles.durationLabel, { color: colors.textSecondary }]}>
          {isTr ? 'Süre' : 'Delay'}
        </Text>
        {TEST_ALARM_DURATIONS.map(sec => {
          const isSelected = selectedSeconds === sec;
          return (
            <TouchableOpacity
              key={sec}
              style={[
                styles.durationChip,
                {
                  backgroundColor: isSelected
                    ? isDark
                      ? 'rgba(45, 212, 191, 0.22)'
                      : 'rgba(13, 148, 136, 0.14)'
                    : isDark
                      ? 'rgba(148, 163, 184, 0.10)'
                      : 'rgba(100, 116, 139, 0.07)',
                  borderColor: isSelected ? (isDark ? '#2DD4BF' : '#0D9488') : 'transparent',
                },
              ]}
              onPress={() => setSelectedSeconds(sec)}
              disabled={alarmTest.isBusy}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.durationChipText,
                  {
                    color: isSelected ? (isDark ? '#2DD4BF' : '#0F766E') : colors.textSecondary,
                  },
                ]}
              >
                {sec} sn
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[
          styles.testButton,
          {
            backgroundColor: alarmTest.isArmed ? '#10B981' : isDark ? '#0F766E' : '#0D9488',
            opacity: alarmTest.isRunning ? 0.7 : 1,
          },
        ]}
        onPress={handleTestAlarm}
        disabled={alarmTest.isBusy}
        activeOpacity={0.8}
      >
        <Ionicons
          name={alarmTest.isArmed ? 'checkmark-circle' : 'flash'}
          size={15}
          color="#FFFFFF"
        />
        <Text style={styles.testButtonText}>
          {alarmTest.isRunning
            ? isTr
              ? 'İzinler kontrol ediliyor…'
              : 'Checking permissions…'
            : alarmTest.isArmed
              ? isTr
                ? `Kuruldu — ${alarmTest.seconds ?? selectedSeconds} sn içinde çalacak, ekranı kilitleyin`
                : `Armed — fires in ${alarmTest.seconds ?? selectedSeconds}s, lock your screen`
              : isTr
                ? `🧪 ${selectedSeconds} Saniye Sonra Test Alarmı Çal`
                : `🧪 Fire Test Alarm in ${selectedSeconds}s`}
        </Text>
      </TouchableOpacity>

      {/* Adım adım sonuç çıktısı */}
      {alarmTest.lastResult && (
        <View
          style={[
            styles.stepsBox,
            {
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(241, 245, 249, 0.8)',
              borderColor: isDark ? 'rgba(51, 65, 85, 0.8)' : 'rgba(226, 232, 240, 0.9)',
            },
          ]}
        >
          {alarmTest.lastResult.steps.map(step => {
            const tone = stepTone(step.status);
            return (
              <View key={step.id} style={styles.stepRow}>
                <Ionicons name={tone.icon} size={14} color={tone.color} />
                <View style={styles.stepTextCol}>
                  <Text style={[styles.stepTitle, { color: colors.text }]}>{step.title}</Text>
                  {step.detail ? (
                    <Text style={[styles.stepDetail, { color: colors.textSecondary }]}>
                      {step.detail}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 20,
    borderWidth: 1.2,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 8,
  },
  durationLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginRight: 2,
  },
  durationChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.2,
  },
  durationChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepsBox: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  stepTextCol: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepDetail: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  badgeGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  lockscreenBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  lockscreenBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  summaryBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  summaryStat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10.5,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
  },
  nextDoseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  nextDoseText: {
    fontSize: 11.5,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
