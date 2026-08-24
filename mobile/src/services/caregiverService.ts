/**
 * Caregiver (Bakıcı) Servisi
 *
 * Hasta kullanıcıların bakıcılarını davet etmesi ve yönetmesi için
 * Firestore tabanlı servis.
 *
 * Özellikler:
 * - 6 haneli davet kodu oluşturma
 * - QR kod ile paylaşım
 * - Bakıcı ilişkisi yönetimi
 * - FCM bildirimleri
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { generateId } from '../utils/idGenerator';
import { createScopedLogger } from '../utils/logger';
// Sprint 7.3: Pure helper'lar ./caregiverHelpers.ts'e tasindi.
// generateInviteCode + isValidInviteCode inline tanimlar kaldirildi,
// re-export ile public API korunuyor.
import {
  generateInviteCode,
  isValidInviteCode,
  isValidFcmToken,
  formatCaregiverNotification,
} from './caregiverHelpers';
export { generateInviteCode, isValidInviteCode };
import type { CaregiverRelationship, CaregiverInvite, PatientInfo } from '../types';

const log = createScopedLogger('CaregiverService');

// Firestore collection names
const INVITES_COLLECTION = 'caregiverInvites';
const RELATIONSHIPS_COLLECTION = 'caregiverRelationships';
const MEDICINE_LOGS_SUBCOLLECTION = 'medicineLogs'; // Sprint 72: hasta medicineLogs subcollection

// Davet kodu geçerlilik süresi (7 gün)
const INVITE_EXPIRY_DAYS = 7;

/**
 * 6 haneli rastgele davet kodu oluştur
 * Okunabilir karakterler: 0-9, A-Z (hariç I, O, Q)
 */

/**
 * Yeni bakıcı daveti oluştur
 */
export async function createCaregiverInvite(
  patientId: string,
  patientName: string,
  caregiverEmail: string,
  permissions: {
    canViewSchedule: boolean;
    canViewHistory: boolean;
    canReceiveAlerts: boolean;
  } = {
    canViewSchedule: true,
    canViewHistory: true,
    canReceiveAlerts: true,
  }
): Promise<{ success: boolean; inviteCode?: string; error?: string }> {
  try {
    const normalizedEmail = (caregiverEmail || '').trim().toLowerCase();
    const isGenericShare = !normalizedEmail || normalizedEmail.includes('@family.share');

    if (!isGenericShare) {
      // Aynı hasta ve aynı e-posta için zaten aktif davet var mı kontrol et
      const existingQuery = query(
        collection(db, INVITES_COLLECTION),
        where('patientId', '==', patientId),
        where('caregiverEmail', '==', normalizedEmail),
        where('status', '==', 'pending')
      );

      const existingSnapshot = await getDocs(existingQuery);
      if (!existingSnapshot.empty) {
        log.warn('Zaten pending davet var', { caregiverEmail: normalizedEmail });
        return {
          success: false,
          error: 'Bu e-posta adresine zaten bekleyen bir davet var.',
        };
      }

      // Aynı e-posta için zaten aktif ilişki var mı kontrol et
      const relationshipQuery = query(
        collection(db, RELATIONSHIPS_COLLECTION),
        where('patientId', '==', patientId),
        where('caregiverEmail', '==', normalizedEmail),
        where('status', '==', 'active')
      );

      const relationshipSnapshot = await getDocs(relationshipQuery);
      if (!relationshipSnapshot.empty) {
        log.warn('Zaten aktif bakıcı ilişkisi var', { caregiverEmail: normalizedEmail });
        return {
          success: false,
          error: 'Bu kişi zaten bakıcınız olarak ekli.',
        };
      }
    }

    // Yeni davet kodu oluştur (benzersiz olmalı)
    let inviteCode: string | undefined;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      inviteCode = generateInviteCode();
      const inviteRef = doc(db, INVITES_COLLECTION, inviteCode);
      const inviteSnap = await getDoc(inviteRef);

      if (!inviteSnap.exists()) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique || !inviteCode) {
      return {
        success: false,
        error: 'Davet kodu oluşturulamadı. Lütfen tekrar deneyin.',
      };
    }

    // Davet bitiş tarihi
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    // Daveti kaydet
    const invite: CaregiverInvite = {
      id: inviteCode,
      patientId,
      patientName,
      caregiverEmail: caregiverEmail.toLowerCase(),
      status: 'pending',
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      permissions,
    };

    await setDoc(doc(db, INVITES_COLLECTION, inviteCode), invite);

    log.info('Bakıcı daveti oluşturuldu', { inviteCode, caregiverEmail });

    return { success: true, inviteCode };
  } catch (error) {
    log.error('Davet oluşturma hatası', error);
    return {
      success: false,
      error: 'Davet oluşturulamadı. Lütfen tekrar deneyin.',
    };
  }
}

/**
 * Davet kodu ile daveti kabul et
 */
export async function acceptCaregiverInvite(
  inviteCode: string,
  caregiverId: string,
  caregiverName: string,
  caregiverFcmToken?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isValidInviteCode(inviteCode)) {
      return {
        success: false,
        error: 'Geçersiz davet kodu.',
      };
    }

    // Daveti al
    const inviteRef = doc(db, INVITES_COLLECTION, inviteCode);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) {
      return {
        success: false,
        error: 'Davet bulunamadı veya süresi dolmuş.',
      };
    }

    const invite = inviteSnap.data() as CaregiverInvite;

    // Davet durumunu kontrol et
    if (invite.status !== 'pending') {
      return {
        success: false,
        error: 'Bu davet zaten kullanılmış.',
      };
    }

    // Süre kontrolü
    if (new Date(invite.expiresAt) < new Date()) {
      // Daveti expired yap
      await updateDoc(inviteRef, { status: 'expired' });
      return {
        success: false,
        error: 'Davet süresi dolmuş.',
      };
    }

    // İlişki oluştur
    const relationshipId = generateId();
    const relationship: CaregiverRelationship = {
      id: relationshipId,
      patientId: invite.patientId,
      caregiverId,
      caregiverEmail: invite.caregiverEmail,
      caregiverName,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      canViewSchedule: invite.permissions.canViewSchedule,
      canViewHistory: invite.permissions.canViewHistory,
      canReceiveAlerts: invite.permissions.canReceiveAlerts,
      caregiverFcmToken,
    };

    await setDoc(doc(db, RELATIONSHIPS_COLLECTION, relationshipId), relationship);

    // Daveti güncelle (accepted)
    await updateDoc(inviteRef, {
      status: 'accepted',
      acceptedAt: new Date().toISOString(),
    });

    log.info('Bakıcı daveti kabul edildi', { inviteCode, caregiverId });

    return { success: true };
  } catch (error) {
    log.error('Davet kabul hatası', error);
    return {
      success: false,
      error: 'Bir hata oluştu. Lütfen tekrar deneyin.',
    };
  }
}

/**
 * Kullanıcının bakıcı ilişkilerini getir
 */
export async function getCaregivers(patientId: string): Promise<CaregiverRelationship[]> {
  try {
    const q = query(collection(db, RELATIONSHIPS_COLLECTION), where('patientId', '==', patientId));

    const snapshot = await getDocs(q);
    const caregivers: CaregiverRelationship[] = [];

    snapshot.forEach(doc => {
      caregivers.push({
        ...(doc.data() as CaregiverRelationship),
        id: doc.id,
      });
    });

    return caregivers;
  } catch (error) {
    log.error('Bakıcıları getirme hatası', error);
    return [];
  }
}

/**
 * Bakıcı ilişkisini kaldır
 */
export async function removeCaregiver(
  relationshipId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!relationshipId) {
      log.warn('removeCaregiver: relationshipId boş');
      return { success: false, error: 'Geçersiz bakıcı kimliği.' };
    }

    await deleteDoc(doc(db, RELATIONSHIPS_COLLECTION, relationshipId));

    log.info('Bakıcı ilişkisi kaldırıldı', { relationshipId });

    return { success: true };
  } catch (error: unknown) {
    log.error('Bakıcı kaldırma hatası', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bir hata oluştu.',
    };
  }
}

/**
 * Bakıcı ilişkisini güncelle (yetkiler veya durum)
 */
export async function updateCaregiverRelationship(
  relationshipId: string,
  updates: Partial<
    Pick<
      CaregiverRelationship,
      'status' | 'canViewSchedule' | 'canViewHistory' | 'canReceiveAlerts' | 'caregiverFcmToken'
    >
  >
): Promise<{ success: boolean }> {
  try {
    await updateDoc(doc(db, RELATIONSHIPS_COLLECTION, relationshipId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    log.info('Bakıcı ilişkisi güncellendi', { relationshipId, updates });

    return { success: true };
  } catch (error) {
    log.error('Bakıcı güncelleme hatası', error);
    return { success: false };
  }
}

/**
 * Bakıcının bağlı olduğu hastaları getir
 */
export async function getPatientsForCaregiver(caregiverId: string): Promise<PatientInfo[]> {
  try {
    const q = query(
      collection(db, RELATIONSHIPS_COLLECTION),
      where('caregiverId', '==', caregiverId),
      where('status', '==', 'active')
    );

    const snapshot = await getDocs(q);
    const patients: PatientInfo[] = [];

    for (const relDoc of snapshot.docs) {
      const relationship = {
        ...(relDoc.data() as CaregiverRelationship),
        id: relDoc.id,
      };

      // Hasta bilgilerini users collection'dan al
      let patientName = relationship.patientName || 'Bilinmeyen Hasta';
      let patientEmail: string | undefined = undefined;

      try {
        const userRef = doc(db, 'users', relationship.patientId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData?.displayName) patientName = userData.displayName;
          if (userData?.email) patientEmail = userData.email;
        }
      } catch (_userErr) {
        log.warn('Hasta user dokumani alinamadi, iliskideki isim kullaniliyor', {
          patientId: relationship.patientId,
        });
      }

      patients.push({
        id: relationship.patientId,
        name: patientName,
        email: patientEmail,
        relationshipId: relationship.id,
        status: relationship.status,
        canViewSchedule: relationship.canViewSchedule,
        canViewHistory: relationship.canViewHistory,
        canReceiveAlerts: relationship.canReceiveAlerts,
      });
    }

    return patients;
  } catch (error) {
    log.error('Hastaları getirme hatası', error);
    return [];
  }
}

/**
 * Bakıcı ilişkilerini dinle (real-time updates)
 */
export function subscribeToCaregivers(
  patientId: string,
  callback: (caregivers: CaregiverRelationship[]) => void
): () => void {
  try {
    const q = query(collection(db, RELATIONSHIPS_COLLECTION), where('patientId', '==', patientId));

    return onSnapshot(q, snapshot => {
      const caregivers: CaregiverRelationship[] = [];
      snapshot.forEach(doc => {
        caregivers.push({
          ...(doc.data() as CaregiverRelationship),
          id: doc.id,
        });
      });
      callback(caregivers);
    });
  } catch (error) {
    log.error('subscribeToCaregivers hatası', error);
    return () => {};
  }
}

/**
 * FCM token güncelleme (bildirimler için)
 */
export async function updateCaregiverFcmToken(
  caregiverId: string,
  fcmToken: string
): Promise<void> {
  if (!isValidFcmToken(fcmToken)) {
    log.warn('Gecersiz FCM token format, guncelleme atlandi', {
      caregiverId,
      tokenLength: fcmToken?.length,
    });
    return;
  }

  try {
    // Bu bakıcının tüm aktif ilişkilerini bul ve token'ı güncelle
    const q = query(
      collection(db, RELATIONSHIPS_COLLECTION),
      where('caregiverId', '==', caregiverId),
      where('status', '==', 'active')
    );

    const snapshot = await getDocs(q);

    const batchPromises = snapshot.docs.map(doc =>
      updateDoc(doc.ref, { caregiverFcmToken: fcmToken })
    );

    await Promise.all(batchPromises);

    log.info('FCM token güncellendi', { caregiverId });
  } catch (error) {
    log.error('FCM token güncelleme hatası', error);
  }
}

/**
 * Hasta için ilaç bildirimi gönder (bakıcılara)
 */
export async function notifyCaregivers(
  patientId: string,
  notification: {
    type: 'missed' | 'skipped' | 'taken' | 'snoozed';
    medicineName: string;
    scheduledTime: string;
    message: string;
  }
): Promise<void> {
  try {
    // Aktif ve bildirim almaya izin veren bakıcıları bul
    const q = query(
      collection(db, RELATIONSHIPS_COLLECTION),
      where('patientId', '==', patientId),
      where('status', '==', 'active'),
      where('canReceiveAlerts', '==', true)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      log.debug('Bildirim alacak bakıcı yok');
      return;
    }

    // Her bakıcıya bildirim gönder
    for (const doc of snapshot.docs) {
      const relationship = doc.data() as CaregiverRelationship;

      if (!relationship.caregiverFcmToken) {
        continue;
      }

      const content = formatCaregiverNotification(notification.type, notification.medicineName);

      log.info('Bakıcı bildirimi', {
        caregiverId: relationship.caregiverId,
        notification,
        content,
      });
    }
  } catch (error) {
    log.error('Bakıcı bildirim hatası', error);
  }
}

/**
 * Davetleri getir (kullanıcının davetleri)
 */
export async function getPendingInvites(patientId: string): Promise<CaregiverInvite[]> {
  try {
    const q = query(
      collection(db, INVITES_COLLECTION),
      where('patientId', '==', patientId),
      where('status', '==', 'pending')
    );

    const snapshot = await getDocs(q);
    const invites: CaregiverInvite[] = [];

    snapshot.forEach(doc => {
      invites.push({
        ...(doc.data() as CaregiverInvite),
        id: doc.id,
      });
    });

    return invites;
  } catch (error) {
    log.error('Davetleri getirme hatası', error);
    return [];
  }
}

/**
 * Daveti iptal et
 */
export async function cancelInvite(
  inviteCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, INVITES_COLLECTION, inviteCode));

    log.info('Davet iptal edildi', { inviteCode });

    return { success: true };
  } catch (error: unknown) {
    log.error('Davet iptal hatası', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Davet iptal edilemedi.',
    };
  }
}

// ============================================================================
// Sprint 9.3: ServiceResult<T> wrapper alternatifleri — geriye donuk uyumluluk
// korunarak yeni API ekleniyor. Eski fonksiyonlar (Promise<T | null>, vb.)
// oldugu gibi kalmaya devam ediyor; yeni Service fonksiyonlari ServiceResult<T> doner.
// ============================================================================

import { withServiceResult, type ServiceResult } from './types';

/**
 * Bakici daveti olustur — ServiceResult<T> wrapper.
 * Eski API `{success, inviteCode?, error?}` doner; yeni wrapper basari
 * durumunda inviteCode payload'i doner.
 */
export async function createCaregiverInviteService(
  patientId: string,
  patientName: string,
  caregiverEmail: string,
  permissions: {
    canViewSchedule: boolean;
    canViewHistory: boolean;
    canReceiveAlerts: boolean;
  } = {
    canViewSchedule: true,
    canViewHistory: true,
    canReceiveAlerts: true,
  }
): Promise<ServiceResult<{ inviteCode: string }>> {
  try {
    const result = await createCaregiverInvite(patientId, patientName, caregiverEmail, permissions);
    if (result.success && result.inviteCode) {
      return { ok: true, data: { inviteCode: result.inviteCode } };
    }
    return {
      ok: false,
      error: {
        code: 'API_ERROR',
        message: result.error || 'Davet olusturulamadi',
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: {
        code: 'UNKNOWN',
        message: e instanceof Error ? e.message : 'Bilinmeyen hata',
      },
    };
  }
}

/**
 * Davet kabul et — ServiceResult<T> wrapper.
 */
export async function acceptCaregiverInviteService(
  inviteCode: string,
  caregiverId: string,
  caregiverName: string,
  caregiverFcmToken?: string
): Promise<ServiceResult<{ success: boolean }>> {
  try {
    const result = await acceptCaregiverInvite(
      inviteCode,
      caregiverId,
      caregiverName,
      caregiverFcmToken
    );
    if (result.success) {
      return { ok: true, data: { success: true } };
    }
    return {
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: result.error || 'Davet kabul edilemedi',
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: {
        code: 'UNKNOWN',
        message: e instanceof Error ? e.message : 'Bilinmeyen hata',
      },
    };
  }
}

/**
 * Kullanicinin bakici iliskilerini getir — ServiceResult<T> wrapper.
 */
export async function getCaregiversService(
  patientId: string
): Promise<ServiceResult<CaregiverRelationship[]>> {
  return withServiceResult(() => getCaregivers(patientId), { errorCode: 'API_ERROR' });
}

// ============================================================================
// Sprint 72: Caregiver Event Bridge — caregiver tarafi Firestore entegrasyonu.
// Caregiver telefonda "Hasta Aldi" butonuna bastiginda callback tetiklenir.
// Bu callback patient tarafindaki medicineLogs subcollection'a yeni bir log
// yazar. Production'da Cloud Function uzerinden daha guvenli ama demo icin
// caregiver client-side yazabilir (rule: caregiver relationship active olmali).
// ============================================================================

/**
 * Caregiver tarafindan "Hasta Aldi" aksiyonu — Firestore'a medicineLog yaz.
 *
 * Hasta medicineLogs subcollection path: `users/{patientId}/medicineLogs/{logId}`
 * Bu local medicineStore ile AYNI path kullanir — firestoreSync mantigiyla
 * uyumlu.
 */
export async function logMedicineTakenByCaregiver(
  patientId: string,
  medicineName: string,
  doseTime: string
): Promise<{ success: boolean; logId?: string; error?: string }> {
  try {
    if (!patientId || !medicineName) {
      return {
        success: false,
        error: 'patientId ve medicineName zorunlu',
      };
    }

    const logId = generateId();
    const logDoc = {
      id: logId,
      medicineId: '', // caregiver tarafindan bilinmez — sadece medicineName loglanir
      medicineName,
      scheduledTime: doseTime,
      status: 'taken',
      takenAt: new Date().toISOString(),
      source: 'caregiver_action', // ayirt edici: caregiver basladi
      createdAtServer: serverTimestamp(),
    };

    const docRef = await addDoc(
      collection(db, 'users', patientId, MEDICINE_LOGS_SUBCOLLECTION),
      logDoc
    );

    log.info('Caregiver medicineLog yazildi', {
      patientId,
      logId: docRef.id,
      medicineName,
    });

    return { success: true, logId: docRef.id };
  } catch (error) {
    log.error('Caregiver logMedicineTakenByCaregiver hata', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen hata',
    };
  }
}

/**
 * Hasta telefon numarasini getir (caregiver tarafi icin tel arama linki).
 *
 * Kullanici profilinde `users/{patientId}.phoneNumber` field'i beklenir.
 * Henuz yoksa fallback bos string doner — caregiver "Ara" butonu calismaz.
 */
export async function getPatientPhoneNumber(patientId: string): Promise<string> {
  try {
    if (!patientId) return '';

    const userRef = doc(db, 'users', patientId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      log.warn('Patient user doc bulunamadi, telefon yok', { patientId });
      return '';
    }

    const data = userSnap.data();
    const phone = typeof data?.phoneNumber === 'string' ? data.phoneNumber : '';
    return phone;
  } catch (error) {
    log.error('getPatientPhoneNumber hata', error);
    return '';
  }
}
