import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ThemeColors } from '../../contexts/ThemeContext';
import { AddMedicineFormState } from '../../types/addMedicine.types';

interface AdvancedSettingsSectionProps {
  formState: AddMedicineFormState;
  onVibrationPatternChange: (pattern: 'default' | 'heartbeat' | 'urgent' | 'soft') => void;
  label: string;
  colors: ThemeColors;
  language: 'tr' | 'en';
}

export const AdvancedSettingsSection: React.FC<AdvancedSettingsSectionProps> = ({
  formState,
  onVibrationPatternChange,
  label,
  colors,
  language,
}) => {
  const isTr = language === 'tr';

  const vibrationOptions = [
    { id: 'default', label: isTr ? 'Varsayılan' : 'Default' },
    { id: 'soft', label: isTr ? 'Yumuşak' : 'Soft' },
    { id: 'heartbeat', label: isTr ? 'Kalp Atışı' : 'Heartbeat' },
    { id: 'urgent', label: isTr ? 'Acil' : 'Urgent' },
  ] as const;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>{label}</Text>

      {/* Titreşim Deseni */}
      <View
        style={[styles.settingColumn, { backgroundColor: colors.background, borderRadius: 12 }]}
      >
        <View style={styles.settingInfo}>
          <View style={styles.iconContainer}>
            <Ionicons name="radio-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>
              {isTr ? 'Özel Titreşim Deseni' : 'Custom Vibration Pattern'}
            </Text>
            <Text style={[styles.settingDescription, { color: colors.textMuted }]}>
              {isTr
                ? 'Bu ilacın alarmı çaldığında telefonu nasıl titretsin?'
                : 'How should the phone vibrate on alarm?'}
            </Text>
          </View>
        </View>

        <View style={styles.chipContainer}>
          {vibrationOptions.map(opt => {
            const isSelected = formState.vibrationPattern === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.chip,
                  { backgroundColor: isSelected ? colors.primary : colors.background },
                  !isSelected && { borderColor: colors.border, borderWidth: 1 },
                ]}
                onPress={() => onVibrationPatternChange(opt.id)}
              >
                <Text style={[styles.chipText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 1,
  },
  settingColumn: {
    padding: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  barcodeInputContainer: {
    flex: 1,
    paddingTop: 8,
  },
});
