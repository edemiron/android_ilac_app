import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { GlobalMedicine, MedicineAutocompleteResult } from '../types';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('GlobalMedicineService');

// Collection referansı
const GLOBAL_MEDICINES_COLLECTION = 'globalMedicines';
const getGlobalMedicinesRef = () => collection(db, GLOBAL_MEDICINES_COLLECTION);

// ============ BARKOD İLE ARAMA ============

/**
 * Barkod ile ilaç ara
 */
export async function searchByBarcode(barcode: string): Promise<GlobalMedicine | null> {
  try {
    const medicinesRef = getGlobalMedicinesRef();
    const q = query(medicinesRef, where('barcode', '==', barcode), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const medicine = { ...doc.data(), id: doc.id } as GlobalMedicine;

    // Arama sayısını artır (popülerlik için)
    await incrementSearchCount(medicine.id);

    return medicine;
  } catch (error) {
    log.error('Barkod aramasi hatasi', error);
    return null;
  }
}

/**
 * Barkod ile ilaç ara (alias - hybrid service için)
 */
export async function getMedicineByBarcode(barcode: string): Promise<GlobalMedicine | null> {
  return searchByBarcode(barcode);
}

// ============ İSİM İLE ARAMA (OTOMATİK TAMAMLAMA) ============

/**
 * İlaç adına göre otomatik tamamlama önerileri
 */
export async function autocomplete(
  searchQuery: string,
  country: string = 'TR',
  maxResults: number = 10
): Promise<MedicineAutocompleteResult[]> {
  try {
    if (!searchQuery || searchQuery.length < 2) {
      return [];
    }

    const searchLower = searchQuery.toLowerCase();
    const medicinesRef = getGlobalMedicinesRef();
    
    // Firebase'de prefix araması için
    // Not: Gerçek uygulamada Algolia veya ElasticSearch kullanılmalı
    const q = query(
      medicinesRef,
      where('country', '==', country),
      orderBy('searchCount', 'desc'),
      limit(50) // Daha fazla çekip client-side filtrele
    );

    const snapshot = await getDocs(q);
    
    const results: MedicineAutocompleteResult[] = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data() as GlobalMedicine;
      const nameLower = data.name.toLowerCase();
      
      // İsim eşleşmesi kontrol et
      if (nameLower.includes(searchLower) || nameLower.startsWith(searchLower)) {
        // Match score hesapla
        let matchScore = 0;
        if (nameLower === searchLower) {
          matchScore = 100;
        } else if (nameLower.startsWith(searchLower)) {
          matchScore = 80;
        } else {
          matchScore = 50;
        }

        // Doğrulanmış ilaçlara bonus
        if (data.isVerified) {
          matchScore += 10;
        }

        results.push({
          id: doc.id,
          name: data.name,
          dosage: data.dosage,
          manufacturer: data.manufacturer,
          matchScore,
        });
      }
    });

    // Score'a göre sırala ve limitle
    return results
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, maxResults);
  } catch (error) {
    log.error('Otomatik tamamlama hatasi', error);
    return [];
  }
}

// ============ İLAÇ DETAYI GETIR ============

/**
 * ID ile ilaç detayını getir
 */
export async function getMedicineById(id: string): Promise<GlobalMedicine | null> {
  try {
    const docRef = doc(db, GLOBAL_MEDICINES_COLLECTION, id);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      return null;
    }

    return { ...snapshot.data(), id: snapshot.id } as GlobalMedicine;
  } catch (error) {
    log.error('Ilac detayi getirme hatasi', error);
    return null;
  }
}

// ============ YENİ İLAÇ EKLE ============

/**
 * Yeni ilaç ekle (AI veya kullanıcı tarafından)
 */
export async function addMedicine(
  medicine: Omit<GlobalMedicine, 'id' | 'createdAt' | 'updatedAt' | 'searchCount' | 'isVerified' | 'addedBy' | 'addedByUserId'>,
  addedBy: 'ai' | 'user' | 'admin',
  userId?: string
): Promise<string> {
  try {
    const now = Timestamp.now();
    const medicinesRef = getGlobalMedicinesRef();
    const newDocRef = doc(medicinesRef);

    const newMedicine: Omit<GlobalMedicine, 'id'> = {
      ...medicine,
      addedBy,
      addedByUserId: userId,
      isVerified: addedBy === 'admin', // Sadece admin eklediğinde doğrulanmış
      searchCount: 0,
      createdAt: now.toDate().toISOString(),
      updatedAt: now.toDate().toISOString(),
    };

    await setDoc(newDocRef, newMedicine);
    return newDocRef.id;
  } catch (error) {
    log.error('Ilac ekleme hatasi', error);
    throw error;
  }
}

// ============ İLAÇ GÜNCELLE ============

/**
 * İlaç bilgilerini güncelle (admin)
 */
export async function updateMedicine(
  id: string,
  updates: Partial<GlobalMedicine>
): Promise<void> {
  try {
    const docRef = doc(db, GLOBAL_MEDICINES_COLLECTION, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now().toDate().toISOString(),
    });
  } catch (error) {
    log.error('Ilac guncelleme hatasi', error);
    throw error;
  }
}

// ============ İLAÇ ONAYLA ============

/**
 * İlacı onayla (admin)
 */
export async function verifyMedicine(id: string): Promise<void> {
  try {
    const docRef = doc(db, GLOBAL_MEDICINES_COLLECTION, id);
    await updateDoc(docRef, {
      isVerified: true,
      updatedAt: Timestamp.now().toDate().toISOString(),
    });
  } catch (error) {
    log.error('Ilac onaylama hatasi', error);
    throw error;
  }
}

// ============ ARAMA SAYISI ARTIR ============

/**
 * İlaç arama sayısını artır (popülerlik için)
 */
async function incrementSearchCount(id: string): Promise<void> {
  try {
    const docRef = doc(db, GLOBAL_MEDICINES_COLLECTION, id);
    await updateDoc(docRef, {
      searchCount: increment(1),
    });
  } catch (error) {
    log.error('Arama sayisi artirma hatasi', error);
  }
}

// ============ POPÜLER İLAÇLAR ============

/**
 * En popüler ilaçları getir
 */
export async function getPopularMedicines(
  country: string = 'TR',
  maxResults: number = 20
): Promise<GlobalMedicine[]> {
  try {
    const medicinesRef = getGlobalMedicinesRef();
    const q = query(
      medicinesRef,
      where('country', '==', country),
      where('isVerified', '==', true),
      orderBy('searchCount', 'desc'),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as GlobalMedicine[];
  } catch (error) {
    log.error('Populer ilaclar getirme hatasi', error);
    return [];
  }
}

// ============ BARKOD VAR MI KONTROL ============

/**
 * Barkodun veritabanında olup olmadığını kontrol et
 */
export async function barcodeExists(barcode: string): Promise<boolean> {
  const medicine = await searchByBarcode(barcode);
  return medicine !== null;
}
