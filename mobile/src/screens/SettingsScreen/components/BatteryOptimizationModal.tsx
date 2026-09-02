/**
 * BatteryOptimizationModal — Cihaza Özel Pil & Güç Yönetimi Rehberi
 *
 * Xiaomi (HyperOS / MIUI), Samsung (OneUI), Huawei, Oppo, Vivo, OnePlus
 * agresif arka plan pil kısıtlamalarını devre dışı bırakmak ve alarmların
 * 0 gecikme ve %100 güvenilirlikle çalmasını sağlamak için Evrensel OEM Kalkanı Motorunu kullanır.
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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  detectOEMShieldStatus,
  getOEMGuide,
  openOEMShieldSetting,
  OEMShieldStatus,
  OEMShieldGuide,
} from '../../../utils/oemShieldEngine';
import { runLockScreenAlarmTest } from '../../../utils/notifications/testAlarm';

interface BatteryOptimizationModalProps {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
  language: string;
}

export const BatteryOptimizationModal: React.FC<BatteryOptimizationModalProps> = ({
  visible,
  onClose,
  isDark,
  language,
}) => {
  const isTr = language === 'tr';
  const [oemStatus, setOemStatus] = useState<OEMShieldStatus | null>(null);
  const [oemGuide, setOemGuide] = useState<OEMShieldGuide | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testScheduled, setTestScheduled] = useState(false);

  useEffect(() => {
    if (visible) {
      detectOEMShieldStatus().then(status => {
        setOemStatus(status);
        setOemGuide(getOEMGuide(status.oem, language));
      });
    }
  }, [visible, language]);

  const handleAction = async (actionType: any) => {
    await openOEMShieldSetting(actionType);
  };

  const handleStartTest = async () => {
    try {
      setIsTesting(true);
      // Tek kaynak: ayarlar motor tarafından store'dan okunur.
      await runLockScreenAlarmTest({ seconds: 10, language: isTr ? 'tr' : 'en' });
      setTestScheduled(true);
      setTimeout(() => {
        setIsTesting(false);
      }, 12000);
    } catch (_e) {
      setIsTesting(false);
    }
  };

  const colors = {
    bg: isDark ? '#0F172A' : '#FFFFFF',
    cardBg: isDark ? '#1E293B' : '#F8FAFC',
    border: isDark ? '#334155' : '#E2E8F0',
    text: isDark ? '#F8FAFC' : '#0F172A',
    textMuted: isDark ? '#94A3B8' : '#64748B',
    primary: '#10B981',
    primaryBg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
    accent: '#0284C7',
    warning: '#F59E0B',
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.bg }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.iconBadge, { backgroundColor: colors.primaryBg }]}>
                <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  {isTr ? 'Alarm Güvenlik Kalkanı' : 'Alarm Security Shield'}
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
                  {oemGuide ? `${oemGuide.oemName} (${oemGuide.osName})` : 'Android'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.cardBg }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {/* Info Banner */}
            <View
              style={[
                styles.infoCard,
                { backgroundColor: colors.primaryBg, borderColor: colors.primary },
              ]}
            >
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={[styles.infoCardText, { color: colors.text }]}>
                {oemGuide?.summary ||
                  (isTr
                    ? 'İlaç alarmlarının ekran kapalıyken gecikmeden çalması için lütfen aşağıdaki ayarları kontrol edin.'
                    : 'To ensure medication alarms ring on time, please check the settings below.')}
              </Text>
            </View>

            {/* Instruction Steps */}
            {oemGuide && (
              <View style={styles.stepsContainer}>
                {oemGuide.steps.map(step => (
                  <View
                    key={step.id}
                    style={[
                      styles.stepCard,
                      { backgroundColor: colors.cardBg, borderColor: colors.border },
                    ]}
                  >
                    <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                      <Text style={styles.stepNumberText}>{step.stepNumber}</Text>
                    </View>
                    <View style={styles.stepTextContainer}>
                      <Text style={[styles.stepTitle, { color: colors.text }]}>{step.title}</Text>
                      <Text style={[styles.stepDesc, { color: colors.textMuted }]}>
                        {step.description}
                      </Text>
                      <TouchableOpacity
                        style={[styles.stepActionBtn, { backgroundColor: colors.primary }]}
                        onPress={() => handleAction(step.actionType)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="settings-outline"
                          size={14}
                          color="#FFFFFF"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.stepActionText}>{step.actionText}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Live Hardware Alarm Test Panel */}
            <View
              style={[
                styles.testPanel,
                {
                  backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.06)',
                  borderColor: '#3B82F6',
                },
              ]}
            >
              <View style={styles.testHeaderRow}>
                <Ionicons name="volume-high" size={20} color="#3B82F6" />
                <Text style={[styles.testTitle, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}>
                  {isTr ? '10 Saniyelik Canlı Donanım Alarm Testi' : '10s Live Hardware Alarm Test'}
                </Text>
              </View>

              <Text style={[styles.testDesc, { color: isDark ? '#CBD5E1' : '#475569' }]}>
                {testScheduled
                  ? isTr
                    ? '✅ Test alarmı kuruldu! Şimdi telefonunuzun ekranını kilitleyin. 10 saniye sonra alarm kilit ekranını uyandırıp çalacaktır.'
                    : '✅ Test alarm scheduled! Lock your phone screen now. In 10s it will ring.'
                  : isTr
                    ? 'Tüm ayarlarınızı doğruladıktan sonra 10 saniyelik bir canlı test başlatıp ekranı kilitleyin.'
                    : 'After checking your settings, start a 10s test alarm to verify.'}
              </Text>

              <TouchableOpacity
                style={[
                  styles.testButton,
                  { backgroundColor: testScheduled ? '#10B981' : '#3B82F6' },
                ]}
                onPress={handleStartTest}
                disabled={isTesting}
                activeOpacity={0.85}
              >
                {isTesting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name={testScheduled ? 'checkmark-circle' : 'play-circle'}
                      size={18}
                      color="#FFFFFF"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.testButtonText}>
                      {testScheduled
                        ? isTr
                          ? 'Yeniden Test Et'
                          : 'Test Again'
                        : isTr
                          ? '10 Saniyelik Test Alarmı Başlat'
                          : 'Start 10s Test Alarm'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.closeFooterBtn, { backgroundColor: colors.cardBg }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.closeFooterText, { color: colors.text }]}>
                {isTr ? 'Anladım & Kapat' : 'Got it & Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
  },
  bodyContent: {
    paddingVertical: 16,
    gap: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  infoCardText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '500',
  },
  stepsContainer: {
    gap: 12,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 12.5,
    lineHeight: 17,
    marginBottom: 8,
  },
  stepActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stepActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  testPanel: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  testHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  testTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  testDesc: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  closeFooterBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeFooterText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
