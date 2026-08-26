import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useMedicineStore } from '../stores/medicineStore';
import { RootStackParamList } from '../types';
import {
  scheduleMedicineNotification,
  scheduleExpiryReminder,
  cancelExpiryReminder,
} from '../utils/notifications';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAlert } from '../contexts/AlertContext';
import { AddMedicineFormState } from '../types/addMedicine.types';
import { TranslationKey } from '../contexts/LanguageContext';
import { createScopedLogger } from '../utils/logger';
import { calculateMedicineTimes } from '../utils/timeCalculator';

// Sprint 6.3 + 7.4 + 8.4 + 11.3: pure helper'lar ./useMedicineHelpers.ts'te.
// Sprint 11.3: calculateMedicineTimes ciktilarini isValidClockTime ile filtrele.
import {
  adjustTimesForConflicts,
  sanitizeMedicineName,
  sanitizeDosage,
  isValidClockTime,
} from './useMedicineHelpers';

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
  const { showAlert, showError } = useAlert();
  const {
    addMedicine,
    updateMedicine,
    // eslint-disable-next-line unused-imports/no-unused-vars
    getMedicineById,
    settings,
    getReminderTimesForMedicine,
    medicines,
  } = useMedicineStore();
  const { canAddMedicine: checkCanAddMedicine, canUseBarcodeScanner } = useSubscription();

  // Saat cakisma kontrolu — pure helper'a delege.
  const adjustTimesForConflictsFn = useCallback(
    (originalTimes: string[], conflictingTimes: Set<string>, intervalMinutes: number): string[] =>
      adjustTimesForConflicts(originalTimes, conflictingTimes, intervalMinutes),
    []
  );

  // Saat çakışma kontrolü
  // Döndürülen değer: { proceed: boolean, adjustedTimes?: string[] }
  // proceed: true ise devam et, false ise iptal
  // adjustedTimes: Otomatik düzenleme seçildiyse yeni saatler
  const checkTimeConflict = useCallback(
    async (
      formState: AddMedicineFormState
    ): Promise<{ proceed: boolean; adjustedTimes?: string[] }> => {
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
        // Sprint 11.3: invalid time degerlerini filtrele (calculateMedicineTimes
        // edge case'lerinde bosluk/timezone bozuklugu olabilir)
        newMedicineTimes = calculatedTimes.map(rt => rt.time).filter(t => isValidClockTime(t));
      }

      // Mevcut aktif ilaçların tüm saatlerini topla
      const existingOccupiedTimes = new Set<string>();
      const existingConflicts: { medicineName: string; time: string }[] = [];

      for (const medicine of medicines) {
        if (!medicine.isActive) continue;
        if (isEditing && medicine.id === medicineId) continue;

        const medicineReminderTimes = getReminderTimesForMedicine(medicine.id);

        for (const rt of medicineReminderTimes) {
          existingOccupiedTimes.add(rt.time);
          if (newMedicineTimes.includes(rt.time)) {
            existingConflicts.push({
              medicineName: medicine.name,
              time: rt.time,
            });
          }
        }
      }

      if (existingConflicts.length === 0) {
        return { proceed: true };
      }

      // Çakışan saatleri grupla
      const conflictMessages = existingConflicts
        .map(c => `⏰ ${c.time} - ${c.medicineName}`)
        .join('\n');

      // Otomatik düzenleme için yeni saatleri hesapla
      const intervalMinutes = settings.conflictIntervalMinutes || 10;
      const adjustedTimes = adjustTimesForConflictsFn(
        newMedicineTimes,
        existingOccupiedTimes,
        intervalMinutes
      );

      // Düzenlenen saatleri göster
      const adjustedTimesPreview = adjustedTimes.join(', ');

      return new Promise<{ proceed: boolean; adjustedTimes?: string[] }>(resolve => {
        showAlert({
          type: 'warning',
          title:
            language === 'tr' ? '⏰ Saat Çakışması Tespit Edildi' : '⏰ Time Conflict Detected',
          message: `${language === 'tr' ? 'Bu ilaç aşağıdaki ilaçlarla aynı saate denk geliyor:' : 'This medicine conflicts with the following medicines:'}\n\n${conflictMessages}\n\n${language === 'tr' ? `Otomatik düzenleme: ${adjustedTimesPreview}` : `Auto-adjusted times: ${adjustedTimesPreview}`}`,
          buttons: [
            {
              text: t('cancel'),
              style: 'cancel',
              onPress: () => resolve({ proceed: false }),
            },
            {
              text: language === 'tr' ? 'Otomatik Düzenle' : 'Auto Adjust',
              style: 'default',
              onPress: () => {
                // Ayarlanan saatlerle devam et
                resolve({ proceed: true, adjustedTimes });
              },
            },
            {
              text: language === 'tr' ? 'Yine de Ekle' : 'Add Anyway',
              style: 'destructive',
              onPress: () => resolve({ proceed: true }),
            },
          ],
        });
      });
    },
    [
      medicines,
      settings,
      isEditing,
      medicineId,
      language,
      t,
      getReminderTimesForMedicine,
      adjustTimesForConflictsFn,
      showAlert,
    ]
  );

  const handleScanBarcode = useCallback(() => {
    const { allowed, reason, remaining } = canUseBarcodeScanner();

    if (!allowed) {
      showAlert({
        type: 'warning',
        title: language === 'tr' ? 'Barkod Tarama Hakkı Doldu' : 'Barcode Scan Limit Reached',
        message: reason,
        buttons: [
          { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
          {
            text: language === 'tr' ? "Premium'a Geç" : 'Go Premium',
            style: 'default',
            onPress: () => navigation.navigate('Premium'),
          },
        ],
      });
      return;
    }

    if (remaining !== undefined && remaining !== -1 && remaining > 0) {
      showAlert({
        type: 'info',
        title: language === 'tr' ? 'Barkod Tarama' : 'Barcode Scan',
        message:
          language === 'tr'
            ? `Kalan tarama hakkınız: ${remaining}\n\nDevam etmek istiyor musunuz?`
            : `Remaining scans: ${remaining}\n\nDo you want to continue?`,
        buttons: [
          { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
          {
            text: language === 'tr' ? 'Tara' : 'Scan',
            style: 'default',
            onPress: () => navigation.navigate('BarcodeScanner'),
          },
        ],
      });
      return;
    }

    navigation.navigate('BarcodeScanner');
  }, [canUseBarcodeScanner, language, navigation, showAlert]);

  const saveMedicine = useCallback(
    async (formState: AddMedicineFormState): Promise<boolean> => {
      try {
        // Sprint 8.4: inline trim -> sanitizeMedicineName/sanitizeDosage helper'lara delege.
        const sanitizedName = sanitizeMedicineName(formState.name);
        const sanitizedDosage = sanitizeDosage(formState.dosage);
        if (!sanitizedName) {
          log.error('Medicine name bos/dolu olamaz');
          return false;
        }
        const medicineData = {
          name: sanitizedName,
          dosage: sanitizedDosage || formState.dosage,
          dosageAmount: formState.dosageAmount,
          form: formState.medicineForm,
          frequency: formState.useCustomTimes ? formState.customTimes.length : formState.frequency,
          instructions: formState.instruction,
          color: formState.selectedColor,
          category: formState.category,
          imageUri: formState.imageUri,
          customTimes: formState.useCustomTimes ? formState.customTimes : undefined,
          // Stok takibi
          stockEnabled: formState.stockEnabled,
          stockCount: formState.stockEnabled ? formState.stockCount : undefined,
          stockThreshold: formState.stockEnabled ? formState.stockThreshold : undefined,
          stockUnit: formState.stockEnabled ? formState.stockUnit : undefined,
          // Son kullanma tarihi
          expiryDate: formState.expiryDate || undefined,
          expiryReminderDays: formState.expiryDate ? formState.expiryReminderDays : undefined,
          // Gelişmiş Alarmlar (Faz 2)
          requireBarcodeOnTake: formState.requireBarcodeOnTake,
          barcode: formState.barcode,
          vibrationPattern: formState.vibrationPattern,
          // Gelişmiş Zamanlama
          scheduleType: formState.scheduleType,
          specificDays:
            formState.scheduleType === 'specific_days' ? formState.specificDays : undefined,
          intervalDays:
            formState.scheduleType === 'interval_days' ? formState.intervalDays : undefined,
          cycleDaysOn: formState.scheduleType === 'cycle' ? formState.cycleDaysOn : undefined,
          cycleDaysOff: formState.scheduleType === 'cycle' ? formState.cycleDaysOff : undefined,
          endDate: formState.endDate || undefined,
        };

        // Önce navigation'ı yap - async işlemler uzun sürerse kullanıcı beklemez
        navigation.goBack();

        if (isEditing && medicineId) {
          log.debug('Düzenleme modu - medicineData', {
            medicineId,
            customTimes: medicineData.customTimes,
            useCustomTimes: formState.useCustomTimes,
            frequency: medicineData.frequency,
          });

          updateMedicine(medicineId, medicineData);

          // State güncellenmesini bekle
          await new Promise(resolve => setTimeout(resolve, 50));

          const freshState = useMedicineStore.getState();
          const times = freshState.getReminderTimesForMedicine(medicineId);
          const medicine = freshState.getMedicineById(medicineId);

          log.debug('Düzenleme sonrası state', {
            timesCount: times.length,
            times: times.map(t => t.time),
            medicineCustomTimes: medicine?.customTimes,
          });

          if (medicine) {
            for (const time of times) {
              log.debug('Bildirim planlanıyor', { time: time.time });
              // Düzenleme modunda bypassBuffer=true - kullanıcı saati bilinçli değiştirdi
              await scheduleMedicineNotification(
                medicine,
                time,
                settings.fullScreenAlarmEnabled,
                true
              );
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

          log.debug('Yeni ilaç eklendi', {
            medicineId: newMedicineId,
            medicineName: medicine?.name,
            reminderTimesCount: times.length,
          });

          if (medicine && times.length > 0) {
            const now = new Date();
            log.debug('ALARM PLANLAMA BASLIYOR', {
              currentTime: now.toISOString(),
              currentHours: now.getHours(),
              currentMinutes: now.getMinutes(),
              timesToSchedule: times.map(t => t.time),
            });

            for (const time of times) {
              log.debug('Tekli alarm planlaniyor', { time: time.time });

              const result = await scheduleMedicineNotification(
                medicine,
                time,
                settings.fullScreenAlarmEnabled,
                true // bypassBuffer=true - kullanıcı bilinçli ekledi
              );

              log.debug('Alarm planlama sonucu', {
                time: time.time,
                result: result ? 'basarili' : 'basarisiz/null',
                resultId: result,
              });
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
            log.warn('İlaç veya hatırlatma saatleri bulunamadı', {
              hasMedicine: !!medicine,
              timesCount: times.length,
            });
          }
        }

        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.error('Medicine save error', error);
        showError(t('error'), `${t('error_unknown')}\n\n${errorMessage}`);
        return false;
      }
    },
    [
      isEditing,
      medicineId,
      language,
      t,
      navigation,
      updateMedicine,
      addMedicine,
      settings.fullScreenAlarmEnabled,
      showError,
    ]
  );

  const handleSave = useCallback(
    async (formState: AddMedicineFormState) => {
      // Sprint 8.4: inline trim -> sanitizeMedicineName helper'a delege.
      if (!sanitizeMedicineName(formState.name)) {
        showError(t('error'), t('error_required_field'));
        return false;
      }
      // Dosage empty check removed as it's built dynamically and often has a safe fallback
      if (!isEditing) {
        const activeMedicines = medicines.filter(m => m.isActive);
        const limitCheck = checkCanAddMedicine(activeMedicines.length);
        if (!limitCheck.allowed) {
          showAlert({
            type: 'warning',
            title: language === 'tr' ? 'İlaç Limiti' : 'Medicine Limit',
            message:
              limitCheck.reason ||
              (language === 'tr'
                ? 'Ücretsiz planda en fazla 3 ilaç ekleyebilirsiniz.'
                : 'You can add up to 3 medicines in the free plan.'),
            buttons: [
              { text: t('cancel'), style: 'cancel' },
              {
                text: language === 'tr' ? "Premium'a Geç" : 'Go Premium',
                style: 'default',
                onPress: () => navigation.navigate('Premium'),
              },
            ],
          });
          return false;
        }
      }

      // Saat çakışma kontrolü
      const timeConflictResult = await checkTimeConflict(formState);
      if (!timeConflictResult.proceed) {
        return false;
      }

      // Otomatik düzenleme yapıldıysa güncellenmiş formState ile kaydet
      const finalFormState = timeConflictResult.adjustedTimes
        ? {
            ...formState,
            customTimes: timeConflictResult.adjustedTimes,
            useCustomTimes: true,
          }
        : formState;

      return saveMedicine(finalFormState);
    },
    [
      isEditing,
      medicines,
      checkCanAddMedicine,
      language,
      t,
      navigation,
      checkTimeConflict,
      saveMedicine,
      showAlert,
      showError,
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
