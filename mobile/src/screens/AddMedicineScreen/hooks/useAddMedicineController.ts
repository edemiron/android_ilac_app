/**
 * useAddMedicineController — AddMedicineScreen Presenter Hook (Sprint 104)
 *
 * Design Pattern: Presenter / Controller
 * Form hook'u (useAddMedicine), klinik güvenlik motoru (Gıda etkileşimleri,
 * mükerrer tedavi kalkanı, E-Reçete sihirbazı) ve global ilaç deposunu koordine eder.
 */

import { useState, useMemo, useCallback } from 'react';
import { useAddMedicine } from '../../../hooks/useAddMedicine';
import { useMedicineStore } from '../../../stores/medicineStore';
import type { MedicineInstruction, EReceteItem } from '../../../types';
import {
  detectFoodInteractions,
  checkDuplicateTherapy,
  getTitckKubKtUrl,
} from '../../../utils/clinicalSafetyEngine';

export function useAddMedicineController() {
  const addMedicineData = useAddMedicine();
  const medicines = useMedicineStore(s => s.medicines);

  // E-Reçete İçe Aktarma Modalı State'i
  const [showEReceteModal, setShowEReceteModal] = useState(false);

  const instructionOptions = useMemo(
    (): { value: MedicineInstruction; label: string }[] => [
      { value: 'any_time', label: addMedicineData.t('instruction_any_time') },
      { value: 'before_meal', label: addMedicineData.t('instruction_before_meal') },
      { value: 'after_meal', label: addMedicineData.t('instruction_after_meal') },
      { value: 'with_meal', label: addMedicineData.t('instruction_with_meal') },
      { value: 'empty_stomach', label: addMedicineData.t('instruction_empty_stomach') },
      { value: 'before_sleep', label: addMedicineData.t('instruction_before_sleep') },
    ],
    [addMedicineData]
  );

  // Otomatik Gıda-İlaç Etkileşim Rozetleri
  const foodInteractions = useMemo(() => {
    return detectFoodInteractions(
      addMedicineData.formState.name,
      undefined,
      addMedicineData.formState.category
    );
  }, [addMedicineData.formState.name, addMedicineData.formState.category]);

  // Mükerrer Tedavi (Çift Doz) Uyarısı
  const duplicateWarning = useMemo(() => {
    if (addMedicineData.isEditing) return null;
    return checkDuplicateTherapy(medicines, addMedicineData.formState.name);
  }, [medicines, addMedicineData.formState.name, addMedicineData.isEditing]);

  // TİTCK Resmi Kullanma Talimatı URL'si
  const titckKubKtUrl = useMemo(() => {
    return getTitckKubKtUrl(addMedicineData.formState.name, addMedicineData.formState.barcode);
  }, [addMedicineData.formState.name, addMedicineData.formState.barcode]);

  // E-Reçeteden seçilen ilacı forma otomatik yerleştir
  const handleSelectEReceteMedicine = useCallback(
    (item: EReceteItem, recipeNo: string) => {
      addMedicineData.updateFormField('name', item.name);
      addMedicineData.updateFormField('frequency', item.frequency);
      if (item.instructions) {
        addMedicineData.updateFormField('instruction', item.instructions as any);
      }
      if (item.barcode) {
        addMedicineData.updateFormField('barcode', item.barcode);
      }
    },
    [addMedicineData]
  );

  return {
    ...addMedicineData,
    medicines,
    instructionOptions,
    foodInteractions,
    duplicateWarning,
    titckKubKtUrl,
    showEReceteModal,
    setShowEReceteModal,
    handleSelectEReceteMedicine,
  };
}
