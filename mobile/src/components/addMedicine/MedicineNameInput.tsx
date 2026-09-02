import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MedicineAutocompleteResult } from '../../types';
import { AutocompleteState } from '../../types/addMedicine.types';
import { ThemeColors } from '../../contexts/ThemeContext';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  autocompleteState: AutocompleteState;
  onSelectAutocomplete: (item: MedicineAutocompleteResult) => void;
  label: string;
  placeholder: string;
  colors: ThemeColors;
  /** Barkod ikonu input sağında gösterilsin mi (sadece Ekle modunda) */
  showBarcodeIcon?: boolean;
  /** Barkod ikonu tıklanınca çağrılır */
  onScanPress?: () => void;
  /** Barkod zaten tarandı mı (ikon yeşile döner) */
  barcodeScanned?: boolean;
  /** Kutu fotoğrafı / AI tarama ikonu gösterilsin mi */
  showPhotoIcon?: boolean;
  /** Kutu fotoğrafı AI tarama tıklanınca çağrılır */
  onPhotoScanPress?: () => void;
  /** Fotoğraf AI analizi devam ediyor mu */
  isAnalyzingPhoto?: boolean;
  /** Sesli asistan ikonu gösterilsin mi */
  showVoiceIcon?: boolean;
  /** Sesli asistan tıklanınca çağrılır */
  onVoicePress?: () => void;
}

export function MedicineNameInput({
  value,
  onChangeText,
  onFocus,
  onBlur,
  autocompleteState,
  onSelectAutocomplete,
  label,
  placeholder,
  colors,
  showBarcodeIcon,
  onScanPress,
  barcodeScanned,
  showPhotoIcon,
  onPhotoScanPress,
  isAnalyzingPhoto,
  showVoiceIcon = true,
  onVoicePress,
}: Props) {
  const styles = createStyles(colors);
  // Autocomplete kapanmasini 200ms geciktiriyoruz ki kullanici bir secenegi tiklayabilsin.
  // Unmount sonrasi tiklama olursa setState-on-unmount uyarisi vermesin diye ref ile takip.
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
    };
  }, []);

  const handleChangeText = (text: string) => {
    onChangeText(text);
    if (text.length >= 2) {
      onFocus();
    }
  };

  const handleBlur = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    blurTimeoutRef.current = setTimeout(() => {
      blurTimeoutRef.current = null;
      onBlur();
    }, 200);
  };

  const renderAutocompleteItem = ({ item }: { item: MedicineAutocompleteResult }) => {
    const subtitle = [item.dosage, item.manufacturer].filter(Boolean).join(' • ');
    return (
      <TouchableOpacity
        style={styles.autocompleteItem}
        onPress={() => onSelectAutocomplete(item)}
        activeOpacity={0.7}
      >
        <View style={styles.autocompleteItemContent}>
          <Text style={styles.autocompleteItemName} numberOfLines={1}>
            {item.name}
          </Text>
          {subtitle ? (
            <Text style={styles.autocompleteItemDosage} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={[styles.matchBadge, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.matchBadgeText, { color: colors.primary }]}>{item.matchScore}%</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label} *</Text>
      <View style={styles.autocompleteContainer}>
        <View style={styles.inputRow}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.input,
                (showBarcodeIcon || showPhotoIcon || (showVoiceIcon && onVoicePress)) &&
                  styles.inputWithIcon,
                value.length > 0 && styles.inputWithClear,
              ]}
              value={value}
              onChangeText={handleChangeText}
              onFocus={onFocus}
              onBlur={handleBlur}
              placeholder={placeholder}
              placeholderTextColor={colors.placeholder}
            />
            {value.length > 0 && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => {
                  onChangeText('');
                  onBlur();
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Yazıyı temizle"
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          {showVoiceIcon && onVoicePress && (
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.primary + '15' }]}
              onPress={onVoicePress}
              activeOpacity={0.7}
            >
              {/* v1.7.4: mikrofon ikonu → kalem. Konuşma tanıma yok; bu buton
                  "cümleyle yazarak ekle" modalını açıyor. */}
              <Ionicons name="create-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          )}
          {showPhotoIcon && onPhotoScanPress && (
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.primary + '15' }]}
              onPress={onPhotoScanPress}
              disabled={isAnalyzingPhoto}
              activeOpacity={0.7}
            >
              {isAnalyzingPhoto ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="camera-outline" size={22} color={colors.primary} />
              )}
            </TouchableOpacity>
          )}
          {showBarcodeIcon && onScanPress && (
            <TouchableOpacity
              style={[
                styles.iconBtn,
                { backgroundColor: barcodeScanned ? '#10B981' + '20' : colors.primary + '15' },
              ]}
              onPress={onScanPress}
              activeOpacity={0.7}
            >
              <Ionicons
                name={barcodeScanned ? 'checkmark-circle' : 'barcode-outline'}
                size={22}
                color={barcodeScanned ? '#10B981' : colors.primary}
              />
            </TouchableOpacity>
          )}
        </View>

        {autocompleteState.isLoading && (
          <View style={styles.autocompleteLoading}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}

        {autocompleteState.showAutocomplete && autocompleteState.results.length > 0 && (
          <View style={styles.autocompleteDropdown}>
            <View style={styles.autocompleteHeader}>
              <Ionicons name="sparkles" size={14} color={colors.primary} />
              <Text style={[styles.autocompleteHeaderText, { color: colors.textSecondary }]}>
                TİTCK İlaç Önerileri
              </Text>
            </View>
            <FlatList
              data={autocompleteState.results}
              renderItem={renderAutocompleteItem}
              keyExtractor={item => item.id}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              style={styles.autocompleteList}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    inputGroup: {
      marginTop: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    inputWrapper: {
      flex: 1,
      position: 'relative',
      justifyContent: 'center',
    },
    input: {
      width: '100%',
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputWithClear: {
      paddingRight: 38,
    },
    clearBtn: {
      position: 'absolute',
      right: 10,
      height: 40,
      width: 28,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    inputWithIcon: {
      // extra right padding when icon present — handled via Row gap
    },
    iconBtn: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    autocompleteContainer: {
      position: 'relative',
    },
    autocompleteLoading: {
      position: 'absolute',
      right: 16,
      top: 14,
    },
    autocompleteDropdown: {
      backgroundColor: colors.background,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 8,
      maxHeight: 230,
      overflow: 'hidden',
    },
    autocompleteHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.primary + '08',
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    autocompleteHeaderText: {
      fontSize: 12,
      fontWeight: '600',
    },
    autocompleteList: {
      maxHeight: 180,
    },
    autocompleteItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    autocompleteItemContent: {
      flex: 1,
    },
    autocompleteItemName: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
    },
    autocompleteItemDosage: {
      fontSize: 13,
      marginTop: 2,
      color: colors.textSecondary,
    },
    matchBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginLeft: 8,
      backgroundColor: colors.primary + '20',
    },
    matchBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primary,
    },
  });
