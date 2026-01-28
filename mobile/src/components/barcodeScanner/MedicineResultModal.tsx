import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getSourceInfo } from '../../services/medicineSearchOrchestrator';
import { modalStyles } from './modalStyles';
import { MedicineResultModalProps } from './types';

function SourceBadge({
  source,
  confidence,
}: {
  source: MedicineResultModalProps['searchSource'];
  confidence: number;
}) {
  const info = getSourceInfo(source);

  return (
    <View style={[modalStyles.sourceBadge, { backgroundColor: info.color }]}>
      <Text style={modalStyles.sourceBadgeText}>{info.name}</Text>
      <Text style={modalStyles.confidenceText}>{confidence}% güven</Text>
    </View>
  );
}

function LowConfidenceWarning() {
  return (
    <View style={modalStyles.warningBanner}>
      <Text style={modalStyles.warningIcon}>!</Text>
      <Text style={modalStyles.warningBannerText}>
        Güven skoru düşük. Bilgileri kontrol etmenizi öneririz.
      </Text>
    </View>
  );
}

interface InfoRowProps {
  label: string;
  value: string | undefined;
  textColor: string;
  secondaryColor: string;
}

function InfoRow({ label, value, textColor, secondaryColor }: InfoRowProps) {
  return (
    <View style={modalStyles.infoRow}>
      <Text style={[modalStyles.infoLabel, { color: secondaryColor }]}>{label}</Text>
      <Text style={[modalStyles.infoValue, { color: textColor }]}>{value || '-'}</Text>
    </View>
  );
}

export function MedicineResultModal({
  visible,
  foundMedicine,
  scannedBarcode,
  searchSource,
  confidence,
  onConfirm,
  onEdit,
  onRescan,
  onClose,
}: MedicineResultModalProps) {
  const { colors } = useTheme();
  const sourceInfo = getSourceInfo(searchSource);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, { backgroundColor: colors.card }]}>
          <Text style={[modalStyles.title, { color: colors.text }]}>İlaç Bulundu!</Text>

          <SourceBadge source={searchSource} confidence={confidence} />

          {confidence < 70 && <LowConfidenceWarning />}

          <ScrollView style={modalStyles.medicineInfo}>
            <InfoRow
              label="İlaç Adı:"
              value={foundMedicine?.name}
              textColor={colors.text}
              secondaryColor={colors.textSecondary}
            />

            {foundMedicine?.genericName && (
              <InfoRow
                label="Etken Madde:"
                value={foundMedicine.genericName}
                textColor={colors.text}
                secondaryColor={colors.textSecondary}
              />
            )}

            <InfoRow
              label="Doz:"
              value={foundMedicine?.dosage}
              textColor={colors.text}
              secondaryColor={colors.textSecondary}
            />

            <InfoRow
              label="Form:"
              value={foundMedicine?.form}
              textColor={colors.text}
              secondaryColor={colors.textSecondary}
            />

            <InfoRow
              label="Üretici:"
              value={foundMedicine?.manufacturer}
              textColor={colors.text}
              secondaryColor={colors.textSecondary}
            />

            <InfoRow
              label="Barkod:"
              value={scannedBarcode}
              textColor={colors.text}
              secondaryColor={colors.textSecondary}
            />
          </ScrollView>

          <View style={[modalStyles.sourceInfoBox, { backgroundColor: colors.background }]}>
            <Text style={[modalStyles.sourceInfoText, { color: colors.textSecondary }]}>
              {sourceInfo.description}
            </Text>
          </View>

          <View style={modalStyles.buttons}>
            <TouchableOpacity
              style={[modalStyles.button, modalStyles.editButton, { borderColor: colors.primary }]}
              onPress={onEdit}
            >
              <Text style={[modalStyles.editButtonText, { color: colors.primary }]}>Düzenle</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[modalStyles.button, { backgroundColor: colors.primary }]}
              onPress={onConfirm}
            >
              <Text style={modalStyles.confirmButtonText}>Onayla</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={modalStyles.cancelLink} onPress={onRescan}>
            <Text style={[modalStyles.cancelLinkText, { color: colors.textSecondary }]}>
              Tekrar Tara
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
