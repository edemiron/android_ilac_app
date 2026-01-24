import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMedicineStore } from '../stores/medicineStore';
import { RootStackParamList, Medicine } from '../types';
import { formatTimeDisplay, getInstructionText } from '../utils/timeCalculator';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSubscription } from '../contexts/SubscriptionContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MedicineCardProps {
  medicine: Medicine;
  times: string[];
  onPress: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  colors: any;
  t: any;
  language: string;
}

const MedicineCard: React.FC<MedicineCardProps> = ({
  medicine,
  times,
  onPress,
  onToggleActive,
  onDelete,
  colors,
  t,
  language,
}) => {
  const handleLongPress = () => {
    Alert.alert(
      medicine.name,
      language === 'tr' ? 'Ne yapmak istiyorsunuz?' : 'What would you like to do?',
      [
        {
          text: medicine.isActive 
            ? (language === 'tr' ? 'Duraklat' : 'Pause') 
            : (language === 'tr' ? 'Aktifleştir' : 'Activate'),
          onPress: onToggleActive,
        },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              language === 'tr' ? 'İlacı Sil' : 'Delete Medicine',
              t('confirm_delete_medicine'),
              [
                { text: t('cancel'), style: 'cancel' },
                { text: t('delete'), style: 'destructive', onPress: onDelete },
              ]
            );
          },
        },
        { text: t('cancel'), style: 'cancel' },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.medicineCard,
        { 
          backgroundColor: colors.card,
          borderLeftColor: medicine.color,
        },
        !medicine.isActive && { opacity: 0.7, backgroundColor: colors.surface },
      ]}
      onPress={onPress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.colorDot, { backgroundColor: medicine.color }]} />
        <View style={styles.medicineInfo}>
          <Text style={[
            styles.medicineName, 
            { color: colors.text },
            !medicine.isActive && { color: colors.textMuted }
          ]}>
            {medicine.name}
          </Text>
          <Text style={[
            styles.dosageText, 
            { color: colors.textSecondary },
            !medicine.isActive && { color: colors.textMuted }
          ]}>
            {medicine.dosage}
          </Text>
        </View>
        {!medicine.isActive && (
          <View style={[styles.pausedBadge, { backgroundColor: colors.warning + '20' }]}>
            <Text style={[styles.pausedText, { color: colors.warning }]}>
              {language === 'tr' ? 'Duraklatıldı' : 'Paused'}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.cardDetails, { borderTopColor: colors.divider }]}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
            {t('medicines_times_per_day', { count: medicine.frequency })}
          </Text>
          {medicine.instructions && (
            <Text style={[styles.instructionText, { color: colors.textMuted }]}>
              • {getInstructionText(medicine.instructions, language)}
            </Text>
          )}
        </View>

        <View style={styles.timesContainer}>
          {times.map((time, index) => (
            <View
              key={index}
              style={[
                styles.timeChip,
                { backgroundColor: medicine.isActive ? medicine.color + '20' : colors.inputBackground },
              ]}
            >
              <Text
                style={[
                  styles.timeChipText,
                  { color: medicine.isActive ? medicine.color : colors.textMuted },
                ]}
              >
                {formatTimeDisplay(time)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.cardFooter, { borderTopColor: colors.divider }]}>
        <Text style={[styles.editHint, { color: colors.textMuted }]}>
          {language === 'tr' 
            ? 'Düzenlemek için dokun • Silmek için basılı tut'
            : 'Tap to edit • Long press to delete'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default function MedicinesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const { canAddMedicine } = useSubscription();
  
  const { 
    medicines, 
    getReminderTimesForMedicine, 
    toggleMedicineActive, 
    deleteMedicine 
  } = useMedicineStore();

  const activeMedicines = medicines.filter((m) => m.isActive);
  const inactiveMedicines = medicines.filter((m) => !m.isActive);

  // İlaç ekleme kontrolü
  const handleAddMedicine = () => {
    const { allowed, reason } = canAddMedicine(medicines.length);
    
    if (!allowed) {
      Alert.alert(
        language === 'tr' ? 'İlaç Limiti' : 'Medicine Limit',
        reason,
        [
          { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
          { 
            text: language === 'tr' ? 'Premium\'a Geç' : 'Go Premium',
            onPress: () => navigation.navigate('Premium'),
          },
        ]
      );
      return;
    }
    
    navigation.navigate('AddMedicine', {});
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {medicines.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💊</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t('medicines_empty')}
            </Text>
            <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
              {t('medicines_add_first')}
            </Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={handleAddMedicine}
            >
              <Text style={styles.addButtonText}>+ {t('home_add_medicine')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Aktif İlaçlar */}
            {activeMedicines.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                  {t('medicines_active')} ({activeMedicines.length})
                </Text>
                {activeMedicines.map((medicine) => {
                  const times = getReminderTimesForMedicine(medicine.id)
                    .map((rt) => rt.time);
                  return (
                    <MedicineCard
                      key={medicine.id}
                      medicine={medicine}
                      times={times}
                      onPress={() => navigation.navigate('AddMedicine', { medicineId: medicine.id })}
                      onToggleActive={() => toggleMedicineActive(medicine.id)}
                      onDelete={() => deleteMedicine(medicine.id)}
                      colors={colors}
                      t={t}
                      language={language}
                    />
                  );
                })}
              </View>
            )}

            {/* Duraklatılmış İlaçlar */}
            {inactiveMedicines.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                  {t('medicines_inactive')} ({inactiveMedicines.length})
                </Text>
                {inactiveMedicines.map((medicine) => {
                  const times = getReminderTimesForMedicine(medicine.id)
                    .map((rt) => rt.time);
                  return (
                    <MedicineCard
                      key={medicine.id}
                      medicine={medicine}
                      times={times}
                      onPress={() => navigation.navigate('AddMedicine', { medicineId: medicine.id })}
                      onToggleActive={() => toggleMedicineActive(medicine.id)}
                      onDelete={() => deleteMedicine(medicine.id)}
                      colors={colors}
                      t={t}
                      language={language}
                    />
                  );
                })}
              </View>
            )}
          </>
        )}
        
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      {medicines.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={handleAddMedicine}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  medicineCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: '600',
  },
  dosageText: {
    fontSize: 14,
    marginTop: 2,
  },
  pausedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pausedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 13,
  },
  instructionText: {
    fontSize: 13,
    marginLeft: 8,
  },
  timesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  editHint: {
    fontSize: 11,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
  },
});
