/**
 * DoctorReportCard — Doktora/Eczacıya Klinik PDF Raporu Paylaşım Kartı
 *
 * 2026 Modern Clinical Sharing Station:
 * - Güven veren steteskop & klinik dosya tasarımı
 * - WhatsApp ve E-posta ile hekime tek tıkla resmi PDF paylaşımı
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface DoctorReportCardProps {
  onShowPDFOptions: () => void;
  isGeneratingPDF: boolean;
  colors: ThemeColors;
  isDark?: boolean;
  language: string;
}

export function DoctorReportCard({
  onShowPDFOptions,
  isGeneratingPDF,
  colors,
  isDark,
  language,
}: DoctorReportCardProps) {
  const isTr = language === 'tr';

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={[styles.iconBg, { backgroundColor: `${colors.primary}18` }]}>
            <Ionicons name="fitness-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.headerTextCol}>
            <Text style={[styles.title, { color: colors.text }]}>
              {isTr ? 'HEKİM & ECZACI KLİNİK RAPORU' : 'CLINICAL ADHERENCE REPORT'}
            </Text>
            <Text style={[styles.subtitle, { color: isDark ? '#94A3B8' : colors.textSecondary }]}>
              {isTr ? 'Resmi PDF Dökümü' : 'Official PDF Export'}
            </Text>
          </View>
        </View>

        <Text style={[styles.description, { color: isDark ? '#CBD5E1' : colors.textSecondary }]}>
          {isTr
            ? 'Tedavi uyum geçmişinizi, atlanan dozları ve saatleri içeren detaylı klinik PDF raporunu tek tıkla doktorunuzla WhatsApp veya E-posta üzerinden paylaşın.'
            : 'Export and share a clinical PDF adherence report with your doctor or pharmacist via WhatsApp or Email.'}
        </Text>

        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: colors.primary }]}
          onPress={onShowPDFOptions}
          disabled={isGeneratingPDF}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={isTr ? 'Doktora Rapor Gönder' : 'Share Report'}
        >
          {isGeneratingPDF ? (
            <ActivityIndicator color={colors.textOnPrimary || '#FFFFFF'} size="small" />
          ) : (
            <>
              <Ionicons
                name="document-text-outline"
                size={18}
                color={colors.textOnPrimary || '#FFFFFF'}
              />
              <Text style={[styles.exportBtnText, { color: colors.textOnPrimary || '#FFFFFF' }]}>
                {isTr ? 'Doktora PDF Raporu Gönder' : 'Generate & Share PDF'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  iconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 11.5,
    marginTop: 1,
  },
  description: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 14,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  exportBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
