/**
 * medicalIdStore.ts — Acil Durum Tıbbi Kimlik Kartı (ICE - In Case of Emergency) Store
 *
 * 112 Acil servis, paramedikler ve hekimler için hastanın kan grubu, alerjileri,
 * kronik rahatsızlıkları ve acil irtibat kişilerini güvenle saklar (v2.0.0).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '../utils/idGenerator';

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | '0+' | '0-' | 'unknown';

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}

export interface MedicalIdData {
  fullName: string;
  birthDate: string; // YYYY-MM-DD
  bloodType: BloodType;
  allergies: string[];
  chronicConditions: string[];
  emergencyContacts: EmergencyContact[];
  organDonor: boolean;
  notes: string;
  showOnLockScreen: boolean; // KVKK Açık Rıza
}

interface MedicalIdState {
  data: MedicalIdData;
  updateMedicalId: (partial: Partial<MedicalIdData>) => void;
  addEmergencyContact: (contact: Omit<EmergencyContact, 'id'>) => EmergencyContact;
  removeEmergencyContact: (id: string) => void;
  clearMedicalId: () => void;
}

const DEFAULT_MEDICAL_ID: MedicalIdData = {
  fullName: '',
  birthDate: '',
  bloodType: 'unknown',
  allergies: [],
  chronicConditions: [],
  emergencyContacts: [],
  organDonor: false,
  notes: '',
  showOnLockScreen: false,
};

export const useMedicalIdStore = create<MedicalIdState>()(
  persist(
    (set, get) => ({
      data: DEFAULT_MEDICAL_ID,

      updateMedicalId: partial => {
        set(state => ({
          data: {
            ...state.data,
            ...partial,
          },
        }));
      },

      addEmergencyContact: contact => {
        const newContact: EmergencyContact = {
          ...contact,
          id: generateId(),
        };

        set(state => ({
          data: {
            ...state.data,
            emergencyContacts: [...state.data.emergencyContacts, newContact],
          },
        }));

        return newContact;
      },

      removeEmergencyContact: id => {
        set(state => ({
          data: {
            ...state.data,
            emergencyContacts: state.data.emergencyContacts.filter(c => c.id !== id),
          },
        }));
      },

      clearMedicalId: () => {
        set({ data: DEFAULT_MEDICAL_ID });
      },
    }),
    {
      name: 'ilac_medical_id_v1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
