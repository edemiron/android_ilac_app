import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useOemShieldStatus } from '../../../hooks/useOemShieldStatus';
import { openOEMShieldSetting } from '../../../utils/oemShieldEngine';

interface AlarmHealthBannerProps {
  language?: 'tr' | 'en';
  isDark?: boolean;
}

export function AlarmHealthBanner({ language = 'tr', isDark = false }: AlarmHealthBannerProps) {
  const { isResolved, status, notifySettingsOpened } = useOemShieldStatus();
  const [dismissed, setDismissed] = useState(false);

  // Veri henüz çözümlenmediyse veya kullanıcı bu oturumda kapattıysa render etme
  if (!isResolved || !status || dismissed) {
    return null;
  }

  // Kritik izin eksikliklerini öncelik sırasına göre kontrol et
  let missingKey: 'notification' | 'exact_alarm' | 'fullscreen' | 'battery' | null = null;

  if (!status.notifications) {
    missingKey = 'notification';
  } else if (!status.exactAlarm) {
    missingKey = 'exact_alarm';
  } else if (!status.fullScreenIntent) {
    missingKey = 'fullscreen';
  } else if (!status.batteryOptimizationIgnored) {
    missingKey = 'battery';
  }

  // Tüm kritik izinler tamsa banner gösterme
  if (!missingKey) {
    return null;
  }

  const isTr = language === 'tr';

  const getContent = () => {
    switch (missingKey) {
      case 'notification':
        return {
          title: isTr ? 'Bildirim İzni Eksik' : 'Notification Permission Missing',
          desc: isTr
            ? 'İlaç vakti geldiğinde uyarı alabilmeniz için bildirimlere izin vermelisiniz.'
            : 'Allow notifications to receive medicine reminders on time.',
          actionText: isTr ? 'Bildirimleri Aç' : 'Enable',
          actionType: 'notification' as const,
        };
      case 'exact_alarm':
        return {
          title: isTr ? 'Kesin Alarm İzni Gerekli' : 'Exact Alarm Permission Required',
          desc: isTr
            ? 'Android, ilaç alarmlarının tam dakikasında çalabilmesi için kesin alarm izni istiyor.'
            : 'Android requires exact alarm permission to ring precisely on time.',
          actionText: isTr ? 'İzni Ver' : 'Grant Permission',
          actionType: 'exact_alarm' as const,
        };
      case 'fullscreen':
        return {
          title: isTr ? 'Kilit Ekranı İzni Kapalı' : 'Lock Screen Alarm Permission Off',
          desc: isTr
            ? 'Ekran kapalıyken alarmın tam ekran açılması için tam ekran bildirim izni gereklidir.'
            : 'Allow full screen notifications to show alarm when locked.',
          actionText: isTr ? 'İzni Aç' : 'Enable',
          actionType: 'fullscreen' as const,
        };
      case 'battery':
      default:
        return {
          title: isTr ? 'Pil Tasarrufu Kısıtlaması' : 'Battery Optimization Active',
          desc: isTr
            ? 'Telefon uyku modundayken alarmların gecikmemesi için pil kısıtlamasını kaldırın.'
            : 'Disable battery optimization so alarms are never delayed while sleeping.',
          actionText: isTr ? 'Optimize Etme' : 'Unrestrict',
          actionType: 'battery' as const,
        };
    }
  };

  const content = getContent();

  const handlePress = async () => {
    notifySettingsOpened();
    await openOEMShieldSetting(content.actionType);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#FFFBEB',
          borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : '#FDE68A',
        },
      ]}
      testID="alarm-health-banner"
      accessibilityRole="alert"
    >
      <View style={styles.iconContainer}>
        <Ionicons name="warning-outline" size={20} color="#D97706" />
      </View>

      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: isDark ? '#FDE68A' : '#92400E' }]}>
          {content.title}
        </Text>
        <Text style={[styles.description, { color: isDark ? '#FCD34D' : '#B45309' }]}>
          {content.desc}
        </Text>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handlePress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={content.actionText}
        >
          <Text style={styles.actionButtonText}>{content.actionText}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dismissButton}
          onPress={() => setDismissed(true)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={isTr ? 'Kapat' : 'Dismiss'}
        >
          <Ionicons name="close" size={18} color={isDark ? '#FCD34D' : '#92400E'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconContainer: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 19,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  dismissButton: {
    padding: 6,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
