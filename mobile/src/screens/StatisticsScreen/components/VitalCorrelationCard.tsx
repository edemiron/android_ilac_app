/**
 * VitalCorrelationCard.tsx — Vital Sağlık Bulguları & İlaç Korelasyon Kartı
 *
 * Tansiyon (sistolik/diyastolik), kan şekeri ve nabız ölçümlerini ilaç kullanım
 * disipliniyle ilişkilendirerek hekime ve hastaya kanıta dayalı klinik içgörü sunar (v2.0.0).
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSymptomStore } from '../../../stores/symptomStore';
import type { ThemeColors } from '../../../contexts/ThemeContext';
import type { Medicine } from '../../../types';

interface VitalCorrelationCardProps {
  medicines: Medicine[];
  overallAdherenceRate: number;
  onOpenRecordVital: () => void;
  colors: ThemeColors;
  isDark: boolean;
  language: 'tr' | 'en';
}

export function VitalCorrelationCard({
  medicines,
  overallAdherenceRate,
  onOpenRecordVital,
  colors,
  isDark,
  language,
}: VitalCorrelationCardProps) {
  const isTr = language === 'tr';
  const logs = useSymptomStore(s => s.logs);

  // Vital hesaplamaları
  const bpLogs = logs.filter(l => l.type === 'blood_pressure' && l.systolic && l.diastolic);
  const glucoseLogs = logs.filter(l => l.type === 'blood_sugar' && l.glucose);
  const pulseLogs = logs.filter(
    l => (l.type === 'blood_pressure' || l.type === 'heart_rate') && l.pulse
  );

  const avgSystolic = bpLogs.length
    ? Math.round(bpLogs.reduce((acc, curr) => acc + (curr.systolic || 0), 0) / bpLogs.length)
    : null;
  const avgDiastolic = bpLogs.length
    ? Math.round(bpLogs.reduce((acc, curr) => acc + (curr.diastolic || 0), 0) / bpLogs.length)
    : null;
  const avgGlucose = glucoseLogs.length
    ? Math.round(
        glucoseLogs.reduce((acc, curr) => acc + (curr.glucose || 0), 0) / glucoseLogs.length
      )
    : null;
  const avgPulse = pulseLogs.length
    ? Math.round(pulseLogs.reduce((acc, curr) => acc + (curr.pulse || 0), 0) / pulseLogs.length)
    : null;

  // Klinik tansiyon değerlendirmesi
  let bpStatusTr = 'Ölçüm Yok';
  let bpStatusEn = 'No Data';
  let bpColor = colors.textMuted;
  if (avgSystolic && avgDiastolic) {
    if (avgSystolic < 120 && avgDiastolic < 80) {
      bpStatusTr = 'Optimal';
      bpStatusEn = 'Optimal';
      bpColor = '#10B981';
    } else if (avgSystolic <= 129 && avgDiastolic < 80) {
      bpStatusTr = 'Normal';
      bpStatusEn = 'Normal';
      bpColor = '#3B82F6';
    } else if (avgSystolic <= 139 || avgDiastolic <= 89) {
      bpStatusTr = 'Evre 1 Yüksek';
      bpStatusEn = 'Stage 1 High';
      bpColor = '#F59E0B';
    } else {
      bpStatusTr = 'Evre 2 Yüksek';
      bpStatusEn = 'Stage 2 High';
      bpColor = '#EF4444';
    }
  }

  // Klinik korelasyon içgörü metni
  let insightTr =
    'Tansiyon veya şeker ölçümlerinizi kaydederek ilaç alımınızla etkilerini izleyin.';
  let insightEn =
    'Log blood pressure or glucose to monitor correlation with your medication intake.';

  const hasHeartOrBpMed = medicines.some(m => m.isActive && m.category === 'heart');

  if (bpLogs.length > 0) {
    if (overallAdherenceRate >= 80) {
      insightTr = hasHeartOrBpMed
        ? `%${overallAdherenceRate} ilaç uyumunuz tansiyon değerlerinizi dengede tutmaya yardımcı oluyor.`
        : `Düzenli ilaç kullanımıyla son ölçüm ortalamanız: ${avgSystolic}/${avgDiastolic} mmHg.`;
      insightEn = `Your ${overallAdherenceRate}% adherence is helping maintain stable vital signs.`;
    } else {
      insightTr =
        'İlaç uyumunuz %80 altında. İlaçların aksatılması tansiyon dalgalanmalarına yol açabilir.';
      insightEn = 'Adherence is below 80%. Skipping doses can cause blood pressure instability.';
    }
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
        },
      ]}
    >
      {/* Kart Başlığı */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Ionicons name="pulse" size={20} color="#10B981" />
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={[styles.title, { color: colors.text }]}>
              {isTr ? 'Vital Bulgular & Korelasyon' : 'Vitals & Medication Trend'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {isTr ? 'Tansiyon, Şeker ve İlaç Etkisi' : 'BP, Glucose & Medicine Impact'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={onOpenRecordVital}
          accessibilityLabel={isTr ? 'Yeni Ölçüm Ekle' : 'Add Measurement'}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>{isTr ? 'Ölçüm Ekle' : 'Log Vital'}</Text>
        </TouchableOpacity>
      </View>

      {/* Ölçüm İstatistik Izgarası */}
      <View style={styles.metricsGrid}>
        {/* 1. Tansiyon */}
        <View
          style={[
            styles.metricBox,
            { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#F8FAFC' },
          ]}
        >
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
            {isTr ? 'Tansiyon (Ort.)' : 'Blood Pressure'}
          </Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {avgSystolic && avgDiastolic ? `${avgSystolic}/${avgDiastolic}` : '—'}
            <Text style={styles.unitText}> mmHg</Text>
          </Text>
          <View style={[styles.badge, { backgroundColor: `${bpColor}20` }]}>
            <Text style={[styles.badgeText, { color: bpColor }]}>
              {isTr ? bpStatusTr : bpStatusEn}
            </Text>
          </View>
        </View>

        {/* 2. Kan Şekeri */}
        <View
          style={[
            styles.metricBox,
            { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#F8FAFC' },
          ]}
        >
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
            {isTr ? 'Açlık Şekeri' : 'Blood Sugar'}
          </Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {avgGlucose ? avgGlucose : '—'}
            <Text style={styles.unitText}> mg/dL</Text>
          </Text>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: avgGlucose
                  ? avgGlucose <= 100
                    ? '#10B98120'
                    : '#F59E0B20'
                  : 'rgba(150, 150, 150, 0.1)',
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                {
                  color: avgGlucose
                    ? avgGlucose <= 100
                      ? '#10B981'
                      : '#F59E0B'
                    : colors.textMuted,
                },
              ]}
            >
              {avgGlucose
                ? avgGlucose <= 100
                  ? isTr
                    ? 'Normal'
                    : 'Normal'
                  : isTr
                    ? 'Takip Önerilir'
                    : 'Follow up'
                : isTr
                  ? 'Ölçüm Yok'
                  : 'No Data'}
            </Text>
          </View>
        </View>

        {/* 3. Nabız */}
        <View
          style={[
            styles.metricBox,
            { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#F8FAFC' },
          ]}
        >
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
            {isTr ? 'Kalp Hızı' : 'Heart Rate'}
          </Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {avgPulse ? avgPulse : '—'}
            <Text style={styles.unitText}> bpm</Text>
          </Text>
          <View style={[styles.badge, { backgroundColor: '#3B82F620' }]}>
            <Text style={[styles.badgeText, { color: '#3B82F6' }]}>
              {avgPulse ? (isTr ? 'Düzenli' : 'Regular') : isTr ? 'Ölçüm Yok' : 'No Data'}
            </Text>
          </View>
        </View>
      </View>

      {/* Klinik Korelasyon İçgörü Şeridi */}
      <View
        style={[
          styles.insightBanner,
          { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5' },
        ]}
      >
        <Ionicons name="sparkles" size={16} color="#10B981" style={{ marginTop: 2 }} />
        <Text style={[styles.insightText, { color: isDark ? '#A7F3D0' : '#065F46' }]}>
          {isTr ? insightTr : insightEn}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  metricBox: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  unitText: {
    fontSize: 10,
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  insightBanner: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 10,
    gap: 8,
    alignItems: 'flex-start',
  },
  insightText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
});
