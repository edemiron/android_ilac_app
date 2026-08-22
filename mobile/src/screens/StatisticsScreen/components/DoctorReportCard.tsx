/**
 * DoctorReportCard — Doktora/Eczacıya PDF raporu gönderme kartı
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { ThemeColors } from '../../../contexts/ThemeContext';

interface DoctorReportCardProps {
  onShowPDFOptions: () => void;
  isGeneratingPDF: boolean;
  colors: ThemeColors;
  language: string;
}

export function DoctorReportCard({
  onShowPDFOptions,
  isGeneratingPDF,
  colors,
  language,
}: DoctorReportCardProps) {
  return (
    <View style={styles.pdfCardContainer}>
      <Text style={[styles.pdfCardDescription, { color: colors.textSecondary }]}>
        {language === 'tr'
          ? 'Tüm ilaç uyum geçmişinizi, atlanan dozları ve saatleri içeren resmi klinik PDF raporunu tek tuşla doktorunuza WhatsApp veya E-posta ile gönderin.'
          : 'Export and share a clinical PDF adherence report with your doctor or pharmacist via WhatsApp or Email.'}
      </Text>

      <TouchableOpacity
        style={[styles.pdfExportButton, { backgroundColor: colors.primary }]}
        onPress={onShowPDFOptions}
        disabled={isGeneratingPDF}
        activeOpacity={0.8}
      >
        {isGeneratingPDF ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Ionicons name="document-text" size={20} color="#FFFFFF" />
            <Text style={styles.pdfExportButtonText}>
              {language === 'tr' ? 'Doktora PDF Raporu Gönder' : 'Share Report with Doctor'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  pdfCardContainer: {
    padding: 16,
  },
  pdfCardDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  pdfExportButton: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pdfExportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
