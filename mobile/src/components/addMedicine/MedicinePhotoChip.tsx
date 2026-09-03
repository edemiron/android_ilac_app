/**
 * MedicinePhotoChip — Eklenen İlaç Kutusu Fotoğrafı Önizleme ve Yönetim Çipi
 *
 * Kullanıcı kamera veya galeriden ilaç kutusu fotoğrafı eklediğinde
 * form içinde kompakt, şık bir görsel kart ve silme butonu sunar.
 */

import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import type { ThemeColors } from '../../contexts/ThemeContext';

interface Props {
  imageUri?: string;
  onRemovePhoto: () => void;
  colors: ThemeColors;
  language: 'tr' | 'en';
}

export function MedicinePhotoChip({ imageUri, onRemovePhoto, colors, language }: Props) {
  const isTr = language === 'tr';
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  if (!imageUri) return null;

  const handleConfirmRemove = () => {
    ReactNativeHapticFeedback.trigger('impactLight');
    Alert.alert(
      isTr ? 'Fotoğrafı Kaldır' : 'Remove Photo',
      isTr
        ? 'Eklenen ilaç kutusu fotoğrafını kaldırmak istiyor musunuz?'
        : 'Do you want to remove the attached photo?',
      [
        { text: isTr ? 'Vazgeç' : 'Cancel', style: 'cancel' },
        {
          text: isTr ? 'Kaldır' : 'Remove',
          style: 'destructive',
          onPress: () => {
            ReactNativeHapticFeedback.trigger('notificationWarning');
            onRemovePhoto();
          },
        },
      ]
    );
  };

  return (
    <>
      <View
        style={[
          styles.chipContainer,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={styles.thumbnailButton}
          onPress={() => setIsPreviewOpen(true)}
          activeOpacity={0.8}
        >
          <Image source={{ uri: imageUri }} style={styles.thumbnail} />
          <View style={styles.infoWrapper}>
            <View style={styles.labelRow}>
              <Ionicons
                name="image-outline"
                size={15}
                color={colors.primary}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.photoLabel, { color: colors.text }]}>
                {isTr ? 'Kutu Fotoğrafı Eklendi' : 'Photo Attached'}
              </Text>
            </View>
            <Text style={[styles.tapHint, { color: colors.textSecondary }]}>
              {isTr ? 'Büyütmek için dokunun' : 'Tap to enlarge'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.removeBtn, { backgroundColor: colors.card }]}
          onPress={handleConfirmRemove}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Fotoğrafı sil"
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Tam Ekran Önizleme Modalı */}
      <Modal
        visible={isPreviewOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPreviewOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setIsPreviewOpen(false)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Önizlemeyi kapat"
          >
            <Ionicons name="close-circle" size={36} color="#FFFFFF" />
          </TouchableOpacity>
          <Image source={{ uri: imageUri }} style={styles.fullImage} resizeMode="contain" />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 4,
  },
  thumbnailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },
  infoWrapper: {
    marginLeft: 10,
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  tapHint: {
    fontSize: 11,
    marginTop: 2,
  },
  removeBtn: {
    padding: 8,
    borderRadius: 10,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
});
