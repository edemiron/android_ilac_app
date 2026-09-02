/**
 * OEMShieldCard — Evrensel Android Cihaz Koruma Kalkanı & Canlı Alarm Testi Bileşeni
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { OEMShieldGuide, OEMShieldStatus } from '../../../utils/oemShieldEngine';

interface OEMShieldCardProps {
  oemShieldStatus: OEMShieldStatus | null;
  oemGuide: OEMShieldGuide | null;
  colors: any;
  isDark: boolean;
  language: string;
  isTestingAlarm: boolean;
  testAlarmScheduled: boolean;
  onPressStepAction: (actionType: any) => void;
  onStartAlarmTest: () => void;
}

export const OEMShieldCard: React.FC<OEMShieldCardProps> = ({
  oemShieldStatus,
  oemGuide,
  colors,
  isDark,
  language,
  isTestingAlarm,
  testAlarmScheduled,
  onPressStepAction,
  onStartAlarmTest,
}) => {
  const isTr = language === 'tr';

  if (!oemGuide) return null;

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
          borderColor: isDark ? '#334155' : '#E2E8F0',
        },
      ]}
    >
      {/* 1. Header: Shield Icon & Brand Badge */}
      <View style={styles.headerRow}>
        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
          <Ionicons name="shield-checkmark" size={24} color="#10B981" />
        </View>
        <View style={styles.headerTextCol}>
          <View style={styles.titleBadgeRow}>
            <Text style={[styles.title, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              {oemGuide.oemName}
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{oemGuide.osName}</Text>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            {isTr ? 'Arka Plan & Kilit Ekranı Koruma Kalkanı' : 'Background & Lockscreen Shield'}
          </Text>
        </View>
      </View>

      {/* 2. Summary Box */}
      <Text style={[styles.summaryText, { color: isDark ? '#CBD5E1' : '#334155' }]}>
        {oemGuide.summary}
      </Text>

      {/* 3. Steps List */}
      <View style={styles.stepsList}>
        {oemGuide.steps.map(step => (
          <View
            key={step.id}
            style={[
              styles.stepItem,
              {
                backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                borderColor: isDark ? '#334155' : '#E2E8F0',
              },
            ]}
          >
            <View style={styles.stepHeader}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>{step.stepNumber}</Text>
              </View>
              <Text style={[styles.stepTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
                {step.title}
              </Text>
            </View>

            <Text style={[styles.stepDesc, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {step.description}
            </Text>

            <TouchableOpacity
              style={[styles.stepButton, { backgroundColor: colors.primary }]}
              onPress={() => onPressStepAction(step.actionType)}
              activeOpacity={0.8}
            >
              <Ionicons
                name="settings-outline"
                size={16}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.stepButtonText}>{step.actionText}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* 4. Live Hardware Alarm Test Panel */}
      <View
        style={[
          styles.testPanel,
          {
            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
            borderColor: '#3B82F6',
          },
        ]}
      >
        <View style={styles.testHeaderRow}>
          <Ionicons name="volume-high" size={22} color="#3B82F6" />
          <Text style={[styles.testTitle, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}>
            {isTr ? '10 Saniyelik Canlı Alarm Testi' : '10s Live Alarm Test'}
          </Text>
        </View>

        <Text style={[styles.testDesc, { color: isDark ? '#CBD5E1' : '#475569' }]}>
          {testAlarmScheduled
            ? isTr
              ? '✅ Test alarmı kuruldu! Şimdi cihazınızın ekranını kilitleyin. 10 saniye sonra alarm kilit ekranını uyandıracaktır.'
              : '✅ Test alarm scheduled! Lock your phone screen now. In 10s it will wake the lock screen.'
            : isTr
              ? 'Ayarlarınızın çalıştığından emin olmak için test başlatın, ekranı kilitleyin ve alarmı canlı deneyimleyin.'
              : 'Start a 10s test, lock your screen and experience the alarm live to verify settings.'}
        </Text>

        <TouchableOpacity
          style={[
            styles.testButton,
            { backgroundColor: testAlarmScheduled ? '#10B981' : '#3B82F6' },
          ]}
          onPress={onStartAlarmTest}
          disabled={isTestingAlarm}
          activeOpacity={0.8}
        >
          {isTestingAlarm ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name={testAlarmScheduled ? 'checkmark-circle' : 'play-circle'}
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.testButtonText}>
                {testAlarmScheduled
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
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextCol: {
    flex: 1,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginRight: 8,
  },
  badge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  stepsList: {
    gap: 12,
    marginBottom: 16,
  },
  stepItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  stepDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
    marginLeft: 30,
  },
  stepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginLeft: 30,
  },
  stepButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  testPanel: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  testHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  testTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  testDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
