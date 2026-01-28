import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useMedicineStore } from '../stores/medicineStore';
import { RootStackParamList, Medicine } from '../types';
import {
  scheduleMedicineNotification,
  scheduleExpiryReminder,
  cancelExpiryReminder,
} from '../utils/notifications';
import { useSubscription } from '../contexts/SubscriptionContext';
import { AddMedicineFormState } from '../types/addMedicine.types';
import { TranslationKey } from '../contexts/LanguageContext';
import { createScopedLogger } from '../utils/logger';
import { checkMultipleInteractions, getSeverityIcon } from '../services/drugInteraction';
import { calculateMedicineTimes } from '../utils/timeCalculator';

const log = createScopedLogger('MedicinePersistence');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface UseMedicinePersistenceProps {
  isEditing: boolean;
  medicineId?: string;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  language: 'tr' | 'en';
}

export function useMedicinePersistence({
  isEditing,
  medicineId,
  t,
  language,
}: UseMedicinePersistenceProps) {
  const navigation = useNavigation<NavigationProp>();
  const {
    addMedicine,
    updateMedicine,
    getMedicineById,
    settings,
    getReminderTimesForMedicine,
    medicines,
  } = useMedicineStore();
  const { canAddMedicine: checkCanAddMedicine, canUseBarcodeScanner } = useSubscription();

  // Saat çakışma kontrolü
  const checkTimeConflict = useCallback(
    async (formState: AddMedicineFormState): Promise<boolean> => {
      // Yeni ilacın saatlerini belirle
      let newMedicineTimes: string[];

      if (formState.useCustomTimes && formState.customTimes.length > 0) {
        newMedicineTimes = formState.customTimes;
      } else {
        // Saatleri hesapla
        const calculatedTimes = calculateMedicineTimes('temp', {
          wakeUpTime: settings.wakeUpTime,
          sleepTime: settings.sleepTime,
          frequency: formState.frequency,
          instruction: formState.instruction,
        });
        newMedicineTimes = calculatedTimes.map(rt => rt.time);
      }

      // Mevcut aktif ilaçların saatlerini al (düzenleme modunda kendi saatlerini hariç tut)
      const existingConflicts: { medicineName: string; time: string }[] = [];

      for (const medicine of medicines) {
        if (!medicine.isActive) continue;
        if (isEditing && medicine.id === medicineId) continue;

        const medicineReminderTimes = getReminderTimesForMedicine(medicine.id);

        for (const rt of medicineReminderTimes) {
          if (newMedicineTimes.includes(rt.time)) {
            existingConflicts.push({
              medicineName: medicine.name,
              time: rt.time,
            });
          }
        }
      }

      if (existingConflicts.length === 0) {
        return true;
      }

      // Çakışan saatleri grupla
      const conflictMessages = existingConflicts
        .map(c => `⏰ ${c.time} - ${c.medicineName}`)
        .join('\n');

      return new Promise<boolean>(resolve => {
        Alert.alert(
          language === 'tr' ? '⏰ Saat Çakışması Tespit Edildi' : '⏰ Time Conflict Detected',
          `${language === 'tr' ? 'Bu ilaç aşağıdaki ilaçlarla aynı saate denk geliyor:' : 'This medicine conflicts with the following medicines:'}\n\n${conflictMessages}\n\n${language === 'tr' ? 'Yine de eklemek istiyor musunuz?' : 'Do you still want to add this medicine?'}`,
          [
            {
              text: t('cancel'),
              style: 'cancel',
              onPress: () => resolve(false),
            },
            {
              text: language === 'tr' ? 'Yine de Ekle' : 'Add Anyway',
              style: 'destructive',
              onPress: () => resolve(true),
            },
          ]
        );
      });
    },
    [medicines, settings, isEditing, medicineId, language, t, getReminderTimesForMedicine]
  );

  const handleScanBarcode = useCallback(() => {
    const { allowed, reason, remaining } = canUseBarcodeScanner();

    if (!allowed) {
      Alert.alert(
        language === 'tr' ? 'Barkod Tarama Hakki Doldu' : 'Barcode Scan Limit Reached',
        reason,
        [
          { text: language === 'tr' ? 'Iptal' : 'Cancel', style: 'cancel' },
          {
            text: language === 'tr' ? "Premium'a Gec" : 'Go Premium',
            onPress: () => navigation.navigate('Premium'),
          },
        ]
      );
      return;
    }

    if (remaining !== undefined && remaining !== -1 && remaining > 0) {
      Alert.alert(
        language === 'tr' ? 'Barkod Tarama' : 'Barcode Scan',
        language === 'tr'
          ? `Kalan tarama hakkiniz: ${remaining}\n\nDevam etmek istiyor musunuz?`
          : `Remaining scans: ${remaining}\n\nDo you want to continue?`,
        [
          { text: language === 'tr' ? 'Iptal' : 'Cancel', style: 'cancel' },
          {
            text: language === 'tr' ? 'Tara' : 'Scan',
            onPress: () => navigation.navigate('BarcodeScanner'),
          },
        ]
      );
      return;
    }

    navigation.navigate('BarcodeScanner');
  }, [canUseBarcodeScanner, language, navigation]);

  const handleSave = useCallback(
    async (formState: AddMedicineFormState) => {
      if (!formState.name.trim()) {
        Alert.alert(t('error'), t('error_required_field'));
        return false;
      }
      if (!formState.dosage.trim()) {
        Alert.alert(t('error'), t('error_required_field'));
        return false;
      }

      if (!isEditing) {
        const activeMedicines = medicines.filter(m => m.isActive);
        const limitCheck = checkCanAddMedicine(activeMedicines.length);
        if (!limitCheck.allowed) {
          Alert.alert(
            language === 'tr' ? 'Ilac Limiti' : 'Medicine Limit',
            limitCheck.reason ||
              (language === 'tr'
                ? 'Ucretsiz planda en fazla 3 ilac ekleyebilirsiniz.'
                : 'You can add up to 3 medicines in the free plan.'),
            [
              { text: t('cancel'), style: 'cancel' },
              {
                text: language === 'tr' ? "Premium'a Gec" : 'Go Premium',
                onPress: () => navigation.navigate('Premium'),
              },
            ]
          );
          return false;
        }
      }

      // İlaç etkileşim kontrolü
      const activeMedicineNames = medicines
        .filter(m => m.isActive && (!isEditing || m.id !== medicineId))
        .map(m => m.name);
      const allDrugNames = [...activeMedicineNames, formState.name.trim()];

      const interactionResult = checkMultipleInteractions(allDrugNames);

      if (interactionResult.hasInteractions) {
        const interactionMessages = interactionResult.interactions
          .map(i => `${getSeverityIcon(i.severity)} ${i.drug1} + ${i.drug2}\n${i.description}`)
          .join('\n\n');

        return new Promise<boolean>(resolve => {
          Alert.alert(
            language === 'tr' ? '⚠️ İlaç Etkileşimi Tespit Edildi' : '⚠️ Drug Interaction Detected',
            `${interactionMessages}\n\n${language === 'tr' ? 'Yine de eklemek istiyor musunuz?' : 'Do you still want to add this medicine?'}`,
            [
              {
                text: t('cancel'),
                style: 'cancel',
                onPress: () => resolve(false),
              },
              {
                text: language === 'tr' ? 'Yine de Ekle' : 'Add Anyway',
                style: 'destructive',
                onPress: async () => {
                  // İlaç etkileşimi kabul edildi, şimdi saat çakışmasını kontrol et
                  const timeConflictResult = await checkTimeConflict(formState);
                  if (timeConflictResult === false) {
                    resolve(false);
                    return;
                  }
                  const result = await saveMedicine(formState);
                  resolve(result);
                },
              },
            ]
          );
        });
      }

      // Saat çakışma kontrolü
      const timeConflictResult = await checkTimeConflict(formState);
      if (timeConflictResult === false) {
        return false;
      }

      return saveMedicine(formState);
    },
    [isEditing, medicineId, medicines, checkCanAddMedicine, language, t, navigation]
  );

  const saveMedicine = useCallback(
    async (formState: AddMedicineFormState): Promise<boolean> => {
      try {
        const medicineData = {
          name: formState.name.trim(),
          dosage: formState.dosage.trim(),
          frequency: formState.useCustomTimes ? formState.customTimes.length : formState.frequency,
          instructions: formState.instruction,
          color: formState.selectedColor,
          customTimes: formState.useCustomTimes ? formState.customTimes : undefined,
          // Stok takibi
          stockEnabled: formState.stockEnabled,
          stockCount: formState.stockEnabled ? formState.stockCount : undefined,
          stockThreshold: formState.stockEnabled ? formState.stockThreshold : undefined,
          stockUnit: formState.stockEnabled ? formState.stockUnit : undefined,
          // Son kullanma tarihi
          expiryDate: formState.expiryDate || undefined,
          expiryReminderDays: formState.expiryDate ? formState.expiryReminderDays : undefined,
        };

        if (isEditing && medicineId) {
          updateMedicine(medicineId, medicineData);
          const freshState = useMedicineStore.getState();
          const times = freshState.getReminderTimesForMedicine(medicineId);
          const medicine = freshState.getMedicineById(medicineId);
          if (medicine) {
            for (const time of times) {
              await scheduleMedicineNotification(medicine, time, settings.fullScreenAlarmEnabled);
            }
            // Son kullanma tarihi bildirimi planla/iptal et
            if (formState.expiryDate && formState.expiryReminderDays) {
              await scheduleExpiryReminder(
                medicine,
                formState.expiryDate,
                formState.expiryReminderDays,
                language
              );
            } else {
              await cancelExpiryReminder(medicineId);
            }
          }
        } else {
          const newMedicineId = addMedicine({
            ...medicineData,
            startDate: new Date().toISOString(),
          });
          // CRITICAL: useMedicineStore.getState() kullan - hook closure'u eski state'e bakar
          // addMedicine senkron olsa da, hook'taki fonksiyonlar eski closure'da kalır
          const freshState = useMedicineStore.getState();
          const times = freshState.getReminderTimesForMedicine(newMedicineId);
          const medicine = freshState.getMedicineById(newMedicineId);

          log.debug('Yeni ilac eklendi', {
            medicineId: newMedicineId,
            medicineName: medicine?.name,
            reminderTimesCount: times.length,
          });

          if (medicine && times.length > 0) {
            for (const time of times) {
              await scheduleMedicineNotification(medicine, time, settings.fullScreenAlarmEnabled);
              log.debug('Bildirim planlandi', { time: time.time });
            }
            // Son kullanma tarihi bildirimi planla
            if (formState.expiryDate && formState.expiryReminderDays) {
              await scheduleExpiryReminder(
                medicine,
                formState.expiryDate,
                formState.expiryReminderDays,
                language
              );
            }
          } else {
            log.warn('Ilac veya reminder times bulunamadi', {
              hasMedicine: !!medicine,
              timesCount: times.length,
            });
          }
        }

        navigation.goBack();
        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Medicine save error:', error);
        Alert.alert(t('error'), `${t('error_unknown')}\n\n${errorMessage}`);
        return false;
      }
    },
    [
      isEditing,
      medicineId,
      medicines,
      checkCanAddMedicine,
      language,
      t,
      navigation,
      updateMedicine,
      addMedicine,
      getReminderTimesForMedicine,
      getMedicineById,
      settings.fullScreenAlarmEnabled,
    ]
  );

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return {
    handleScanBarcode,
    handleSave,
    handleCancel,
    settings,
  };
}
