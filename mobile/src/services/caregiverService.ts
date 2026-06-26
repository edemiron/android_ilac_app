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

import { collection, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { generateId } from '../utils/idGenerator';
import { createScopedLogger } from '../utils/logger';
import type {
  CaregiverRelationship,
  CaregiverInvite,
  PatientInfo,
} from '../types';

const log = createScopedLogger('CaregiverService');

// Firestore collection names
const CAREGIVERS_COLLECTION = 'caregivers';
const INVITES_COLLECTION = 'caregiverInvites';
const RELATIONSHIPS_COLLECTION = 'caregiverRelationships';
const PATIENTS_COLLECTION = 'patients';

// Davet kodu geçerlilik süresi (7 gün)
const INVITE_EXPIRY_DAYS = 7;

/**
 * 6 haneli rastgele davet kodu oluştur
 * Okunabilir karakterler: 0-9, A-Z (hariç I, O, Q)
 */
function generateInviteCode(): string {
  const chars = '0123456789ABCDEFGHJKLMNPRSTUVWXYZ'; // I, O, Q çıkarıldı (karışıklık önleme)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Davet kodu validasyonu
 */
export function isValidInviteCode(code: string): boolean {
  // 6 haneli, sadece alfanümerik
  return /^[A-Z0-9]{6}$/.test(code);
}

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
    const db = await import('firebase/firestore').then(m => m.getFirestore());

    // Aynı e-posta için zaten aktif davet var mı kontrol et
    const existingQuery = query(
      collection(db, INVITES_COLLECTION),
      where('caregiverEmail', '==', caregiverEmail.toLowerCase()),
      where('status', '==', 'pending')
    );

    const existingSnapshot = await getDocs(existingQuery);
    if (!existingSnapshot.empty) {
      log.warn('Zaten pending davet var', { caregiverEmail });
      return {
        success: false,
        error: caregiverEmail === 'tr'
          ? 'Bu e-posta adresine zaten bekleyen bir davet var.'
          : 'There is already a pending invite for this email.',
      };
    }

    // Aynı e-posta için zaten aktif ilişki var mı kontrol et
    const relationshipQuery = query(
      collection(db, RELATIONSHIPS_COLLECTION),
      where('patientId', '==', patientId),
      where('caregiverEmail', '==', caregiverEmail.toLowerCase()),
      where('status', '==', 'active')
    );

    const relationshipSnapshot = await getDocs(relationshipQuery);
    if (!relationshipSnapshot.empty) {
      log.warn('Zaten aktif bakıcı ilişkisi var', { caregiverEmail });
      return {
        success: false,
        error: caregiverEmail === 'tr'
          ? 'Bu kişi zaten bakıcınız olarak ekli.'
          : 'This person is already your caregiver.',
      };
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

    const db = await import('firebase/firestore').then(m => m.getFirestore());

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
export async function getCaregivers(
  patientId: string
): Promise<CaregiverRelationship[]> {
  try {
    const db = await import('firebase/firestore').then(m => m.getFirestore());

    const q = query(
      collection(db, RELATIONSHIPS_COLLECTION),
      where('patientId', '==', patientId)
    );

    const snapshot = await getDocs(q);
    const caregivers: CaregiverRelationship[] = [];

    snapshot.forEach(doc => {
      caregivers.push(doc.data() as CaregiverRelationship);
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
    const db = await import('firebase/firestore').then(m => m.getFirestore());

    await deleteDoc(doc(db, RELATIONSHIPS_COLLECTION, relationshipId));

    log.info('Bakıcı ilişkisi kaldırıldı', { relationshipId });

    return { success: true };
  } catch (error) {
    log.error('Bakıcı kaldırma hatası', error);
    return {
      success: false,
      error: 'Bir hata oluştu.',
    };
  }
}

/**
 * Bakıcı ilişkisini güncelle (yetkiler veya durum)
 */
export async function updateCaregiverRelationship(
  relationshipId: string,
  updates: Partial<Pick<CaregiverRelationship, 'status' | 'canViewSchedule' | 'canViewHistory' | 'canReceiveAlerts' | 'caregiverFcmToken'>>
): Promise<{ success: boolean }> {
  try {
    const db = await import('firebase/firestore').then(m => m.getFirestore());

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
export async function getPatientsForCaregiver(
  caregiverId: string
): Promise<PatientInfo[]> {
  try {
    const db = await import('firebase/firestore').then(m => m.getFirestore());

    const q = query(
      collection(db, RELATIONSHIPS_COLLECTION),
      where('caregiverId', '==', caregiverId),
      where('status', '==', 'active')
    );

    const snapshot = await getDocs(q);
    const patients: PatientInfo[] = [];

    for (const relDoc of snapshot.docs) {
      const relationship = relDoc.data() as CaregiverRelationship;

      // Hasta bilgilerini users collection'dan al
      const userRef = doc(db, 'users', relationship.patientId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        patients.push({
          id: relationship.patientId,
          name: userData?.displayName || relationship.patientName || 'Bilinmeyen Hasta',
          email: userData?.email,
          relationshipId: relationship.id,
          status: relationship.status,
        });
      }
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
  const unsubscribePromise = (async () => {
    const db = await import('firebase/firestore').then(m => m.getFirestore());

    const q = query(
      collection(db, RELATIONSHIPS_COLLECTION),
      where('patientId', '==', patientId)
    );

    return onSnapshot(q, (snapshot) => {
      const caregivers: CaregiverRelationship[] = [];
      snapshot.forEach(doc => {
        caregivers.push(doc.data() as CaregiverRelationship);
      });
      callback(caregivers);
    });
  })();

  // Unsubscribe fonksiyonu döndür
  return () => {
    unsubscribePromise.then(unsub => unsub());
  };
}

/**
 * FCM token güncelleme (bildirimler için)
 */
export async function updateCaregiverFcmToken(
  caregiverId: string,
  fcmToken: string
): Promise<void> {
  try {
    const db = await import('firebase/firestore').then(m => m.getFirestore());

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
    const db = await import('firebase/firestore').then(m => m.getFirestore());

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

    // FCM üzerinden bildirim gönder
    const { getMessaging, getToken } = await import('firebase/messaging');
    const messaging = getMessaging();

    // Her bakıcıya bildirim gönder
    for (const doc of snapshot.docs) {
      const relationship = doc.data() as CaregiverRelationship;

      if (!relationship.caregiverFcmToken) {
        continue;
      }

      // Cloud Functions üzerinden bildirim gönder
      // Alternatif: Client-side FCM API (sınırlı)
      log.info('Bakıcı bildirimi', {
        caregiverId: relationship.caregiverId,
        notification,
      });

      // Not: Production'da Cloud Functions kullanılmalı
      // Şimdilik log ile bırakıyoruz
    }
  } catch (error) {
    log.error('Bakıcı bildirim hatası', error);
  }
}

/**
 * Davetleri getir (kullanıcının davetleri)
 */
export async function getPendingInvites(
  patientId: string
): Promise<CaregiverInvite[]> {
  try {
    const db = await import('firebase/firestore').then(m => m.getFirestore());

    const q = query(
      collection(db, INVITES_COLLECTION),
      where('patientId', '==', patientId),
      where('status', '==', 'pending')
    );

    const snapshot = await getDocs(q);
    const invites: CaregiverInvite[] = [];

    snapshot.forEach(doc => {
      invites.push(doc.data() as CaregiverInvite);
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
export async function cancelInvite(inviteCode: string): Promise<{ success: boolean }> {
  try {
    const db = await import('firebase/firestore').then(m => m.getFirestore());

    await deleteDoc(doc(db, INVITES_COLLECTION, inviteCode));

    log.info('Davet iptal edildi', { inviteCode });

    return { success: true };
  } catch (error) {
    log.error('Davet iptal hatası', error);
    return { success: false };
  }
}
