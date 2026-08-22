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

  const renderAutocompleteItem = ({ item }: { item: MedicineAutocompleteResult }) => (
    <TouchableOpacity style={styles.autocompleteItem} onPress={() => onSelectAutocomplete(item)}>
      <View style={styles.autocompleteItemContent}>
        <Text style={styles.autocompleteItemName}>{item.name}</Text>
        <Text style={styles.autocompleteItemDosage}>
          {item.dosage} - {item.manufacturer}
        </Text>
      </View>
      <View style={styles.matchBadge}>
        <Text style={styles.matchBadgeText}>{item.matchScore}%</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label} *</Text>
      <View style={styles.autocompleteContainer}>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, (showBarcodeIcon || showPhotoIcon) && styles.inputWithIcon]}
            value={value}
            onChangeText={handleChangeText}
            onFocus={onFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            placeholderTextColor={colors.placeholder}
          />
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
      zIndex: 10,
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
    input: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
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
      zIndex: 10,
    },
    autocompleteLoading: {
      position: 'absolute',
      right: 16,
      top: 14,
    },
    autocompleteDropdown: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      marginTop: 4,
      maxHeight: 200,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      zIndex: 1000,
    },
    autocompleteList: {
      maxHeight: 200,
    },
    autocompleteItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
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
