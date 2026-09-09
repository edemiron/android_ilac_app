/**
 * symptomStore.ts — Semptom, Vital Bulgu & Yan Etki Günlüğü Store (Sprint 104)
 *
 * MyTherapy ve klinik DTx standartlarında tansiyon, kan şekeri, nabız ve
 * ilaç yan etkilerini (baş dönmesi, mide bulantısı vb.) kaydeder.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '../utils/idGenerator';

export type SymptomType =
  | 'blood_pressure' // Tansiyon (Systolic / Diastolic)
  | 'blood_sugar' // Kan Şekeri (mg/dL)
  | 'heart_rate' // Nabız (bpm)
  | 'dizziness' // Baş Dönmesi
  | 'nausea' // Mide Bulantısı
  | 'headache' // Baş Ağrısı
  | 'fatigue' // Halsizlik/Yorgunluk
  | 'rash' // Cilt Döküntüsü/Kaşıntı
  | 'stomach_pain' // Mide/Karın Ağrısı
  | 'other';

export interface SymptomLog {
  id: string;
  type: SymptomType;
  timestamp: string; // ISO string
  medicineId?: string;
  medicineName?: string;
  // Vital sayısal değerleri (varsa)
  systolic?: number; // Örn: 120
  diastolic?: number; // Örn: 80
  glucose?: number; // Örn: 95
  pulse?: number; // Örn: 72
  severity?: 'mild' | 'moderate' | 'severe';
  notes?: string;
}

interface SymptomState {
  logs: SymptomLog[];
  addSymptomLog: (entry: Omit<SymptomLog, 'id' | 'timestamp'>) => SymptomLog;
  deleteSymptomLog: (id: string) => void;
  getLogsByMedicineId: (medicineId: string) => SymptomLog[];
  getRecentLogs: (limit?: number) => SymptomLog[];
  clearAllLogs: () => void;
}

export const useSymptomStore = create<SymptomState>()(
  persist(
    (set, get) => ({
      logs: [],

      addSymptomLog: entry => {
        const newLog: SymptomLog = {
          ...entry,
          id: generateId(),
          timestamp: new Date().toISOString(),
        };

        set(state => ({
          logs: [newLog, ...state.logs],
        }));

        return newLog;
      },

      deleteSymptomLog: id => {
        set(state => ({
          logs: state.logs.filter(l => l.id !== id),
        }));
      },

      getLogsByMedicineId: medicineId => {
        return get().logs.filter(l => l.medicineId === medicineId);
      },

      getRecentLogs: (limit = 30) => {
        return get().logs.slice(0, limit);
      },

      clearAllLogs: () => {
        set({ logs: [] });
      },
    }),
    {
      name: 'ilac_symptom_logs_v1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
