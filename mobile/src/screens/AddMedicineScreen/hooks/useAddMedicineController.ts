/**
 * useAddMedicineController — AddMedicineScreen Presenter Hook
 *
 * Design Pattern: Presenter / Controller
 * Form hook'u (useAddMedicine), global ilaç deposu ve talimat seçeneklerini
 * koordine ederek AddMedicineScreen ekranını yalınlaştırır.
 */

import { useMemo } from 'react';
import { useAddMedicine } from '../../../hooks/useAddMedicine';
import { useMedicineStore } from '../../../stores/medicineStore';
import type { MedicineInstruction } from '../../../types';

export function useAddMedicineController() {
  const addMedicineData = useAddMedicine();
  const medicines = useMedicineStore(s => s.medicines);

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

  return {
    ...addMedicineData,
    medicines,
    instructionOptions,
  };
}
