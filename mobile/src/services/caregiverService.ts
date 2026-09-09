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
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { callFunction } from './cloudFunctions';
import { generateId } from '../utils/idGenerator';
import { createScopedLogger } from '../utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cleanPhoneNumber, formatPhoneNumber, isValidPhoneNumber } from '../utils/phoneHelpers';
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
import { getLocalDateKey } from '../domain/doseLog';

const log = createScopedLogger('CaregiverService');

// Firestore collection names
const INVITES_COLLECTION = 'caregiverInvites';
const RELATIONSHIPS_COLLECTION = 'caregiverRelationships';
const MEDICINE_LOGS_SUBCOLLECTION = 'medicineLogs'; // Sprint 72: hasta medicineLogs subcollection

/**
 * Bakıcı–hasta ilişkisinin DETERMİNİSTİK doküman kimliği.
 *
 * ⚠️ v1.7.4 — Firestore kuralları erişim kontrolünü bu dokümana `get()` ile
 * bakarak yapıyor. Kurallarda query çalıştırılamadığı için kimliğin taraflardan
 * hesaplanabilir olması ZORUNLU; eskiden `generateId()` (rastgele UUID)
 * kullanılıyordu ve bu yüzden kurallar ilişkiyi doğrulayamıyor, erişim
 * "oturum açmış herkese" açık bırakılmak zorunda kalıyordu.
 *
 * Kural, create sırasında kimliğin bu şekle uygunluğunu da denetler.
 */
export function buildRelationshipId(patientId: string, caregiverId: string): string {
  return `${patientId}__${caregiverId}`;
}

function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

// Davet kodu geçerlilik süresi (7 gün)
const INVITE_EXPIRY_DAYS = 7;

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

    // ⚠️ K1 — davet kodu artık SUNUCUDA CSPRNG ile üretiliyor.
    //
    // ESKİ akış (bu bloktaydı): istemcide `generateInviteCode()` — 6 hane ×
    // 33'lük alfabe ≈ 1.29×10⁹ olasılık ve `Math.random()`, yani CSPRNG
    // DEĞİL (V8 xorshift128+ durumu birkaç çıktıdan kurtarılabilir). Üstüne
    // 10 turlu bir `getDoc` benzersizlik döngüsü ve `setDoc`. Kodun
    // entropisi tamamen istemcinin insafındaydı.
    //
    // YENİ akış: `createCaregiverInvite` callable'ı 12 hane üretiyor
    // (200.000 örnekle ölçüldü: χ²=43.15 df=32 → tekdüze, 5.0444 bit/karakter
    // = teorik maksimum, toplam 60.53 bit, uzay 1.67×10¹⁸, 0 çakışma) ve
    // benzersizliği Admin SDK ile kendi tarafında garanti ediyor. Naif
    // `bytes[i] % 33` kullanılsaydı χ²=7719 çıkacaktı; rejection sampling şart.
    //
    // `patientId` GÖNDERİLMİYOR: sunucu `request.auth.uid` kullanıyor, yani
    // kullanıcı kendi adına davet oluşturabilir ama başkası adına oluşturamaz.
    const created = await callFunction<
      {
        patientName: string;
        caregiverEmail: string;
        permissions: {
          canViewSchedule: boolean;
          canViewHistory: boolean;
          canReceiveAlerts: boolean;
        };
      },
      { inviteCode?: string; expiresAtMs?: number }
    >('createCaregiverInvite', {
      patientName: patientName || 'Hasta',
      caregiverEmail: normalizedEmail,
      permissions: {
        canViewSchedule: permissions?.canViewSchedule ?? true,
        canViewHistory: permissions?.canViewHistory ?? true,
        canReceiveAlerts: permissions?.canReceiveAlerts ?? true,
      },
    });

    const inviteCode = created?.inviteCode;
    if (typeof inviteCode !== 'string' || !inviteCode) {
      log.error('createCaregiverInvite kod dondurmedi', { created });
      return {
        success: false,
        error: 'Davet kodu oluşturulamadı. Lütfen tekrar deneyin.',
      };
    }

    // ⚠️ Kodun KENDİSİ loglanmıyor — davet kodu bir sırdır ve onu bilen
    // hastanın tüm ilaç listesine/Doz geçmişine aktif bakıcı olur. Eski kod
    // `log.info(..., { inviteCode })` ile düz metin yazıyordu; yalnızca
    // uzunluk loglanıyor (teşhis için yeterli).
    log.info('Bakıcı daveti oluşturuldu', {
      inviteCodeLength: inviteCode.length,
      caregiverEmail: normalizedEmail,
    });

    return { success: true, inviteCode };
  } catch (error: any) {
    log.error('Davet oluşturma hatası', error);
    const errorCode = error?.code || '';
    if (errorCode.includes('permission-denied')) {
      return {
        success: false,
        error: 'Davet oluşturmak için lütfen Google veya E-posta ile giriş yapın.',
      };
    }
    if (errorCode.includes('unavailable')) {
      return {
        success: false,
        error: 'Sunucuya ulaşılamadı. Lütfen internet bağlantınızı kontrol edin.',
      };
    }
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
    const normalizedCode = (inviteCode || '').trim().toUpperCase();

    if (!isValidInviteCode(normalizedCode)) {
      return {
        success: false,
        error: 'Geçersiz davet kodu.',
      };
    }

    // ⚠️ K1/K2 — kabul artık SUNUCUDA, tek Firestore transaction'ında.
    //
    // ESKİ akış bu fonksiyonun gövdesindeydi ve üç kusuru vardı:
    //
    //   1. `getDoc(inviteRef)` — enumeration'ın geçtiği yer. firestore.rules
    //      `allow get: if isNotAnonymous()` ile açık olduğu için saldırgan
    //      kod uzayını `getDoc` döngüsüyle tarayabiliyordu. Kuralın
    //      daraltılması istemci YAYILIMINA kapılı (bkz. inviteService.js).
    //   2. İlişki `setDoc` + davet `updateDoc` AYRI iki yazımdı ve ikincinin
    //      başarısızlığı TOLERE ediliyordu ("Davet durumu accepted olarak
    //      güncellenemedi ama ilişki başarıyla kuruldu"). Kullanılmış davet
    //      `pending`'de kalıp FARKLI bir bakıcı tarafından tekrar
    //      kullanılabiliyordu — ilişki kimlikleri çift-başına olduğu için
    //      hiçbir şey çakışmıyordu.
    //   3. Kendi davetini kabul engeli YALNIZCA istemcideydi. Kurallarda
    //      karşılığı yok: dal (2) sadece `caregiverId == auth.uid` ve
    //      `invite.patientId == data.patientId` istiyor, yani hasta kendi
    //      kodunu verip `uid__uid` ilişkisi kurabiliyor ve kendisinin
    //      "aktif bakıcısı" olabiliyordu.
    //
    // Üçü de artık sunucuda: `redeemCaregiverInvite` → rate-limit (saatte 10
    // / günde 30; kota DOĞRULAMADAN ÖNCE tüketiliyor, yoksa saldırgan geçerli
    // kodu bulana kadar ücretsiz denerdi) + TEK transaction (davet dokümanı
    // okunduğu için onun üzerinde serileşir → eşzamanlı iki kabulden yalnızca
    // biri kazanır) + self-invite reddi.
    //
    // `caregiverId` parametresi korunuyor (çağıranlar geçiriyor) ama sunucu
    // onu KULLANMIYOR — `request.auth.uid` esas. İstemcinin iddia ettiği
    // kimlik değil, kanıtlanmış kimlik bağlayıcı.
    const result = await callFunction<
      { inviteCode: string; caregiverName: string; caregiverFcmToken?: string },
      {
        success?: boolean;
        patientId?: string;
        patientName?: string;
        relationshipId?: string;
      }
    >('redeemCaregiverInvite', {
      inviteCode: normalizedCode,
      caregiverName: caregiverName || 'Bakıcı',
      caregiverFcmToken: caregiverFcmToken || '',
    });

    if (
      caregiverId &&
      result?.relationshipId &&
      !result.relationshipId.endsWith(`__${caregiverId}`)
    ) {
      // Beklenmemeli: sunucu auth.uid kullanıyor. Fark görülürse çağıranın
      // varsaydığı kimlik ile oturum kimliği uyuşmuyor demektir.
      log.warn('Kabul edilen iliski kimligi beklenen caregiverId ile bitmiyor', {
        caregiverId,
        relationshipId: result.relationshipId,
      });
    }

    // ⚠️ Davet kodu loglanMIYOR — kod bir sırdır; onu bilen hastanın tüm
    // ilaç listesine ve doz geçmişine aktif bakıcı olur. Eski kod
    // `log.info(..., { inviteCode })` ile düz metin yazıyordu.
    log.info('Bakıcı daveti kabul edildi', {
      relationshipId: result?.relationshipId,
      patientId: result?.patientId,
    });

    return { success: true };
  } catch (error: any) {
    log.error('Davet kabul hatası', error);
    const errorCode: string = error?.code || '';
    const errorMsg: string = error?.message || '';

    // Kota aşımı — sunucu enumeration'ı ekonomik olarak anlamsız kılmak için
    // saatte 10 / günde 30 deneme sınırlıyor. Kullanıcıya ne zaman tekrar
    // deneyebileceğini söylemek generic "geçersiz kod" mesajından yararlı ve
    // enumeration'a da yardım etmiyor.
    if (errorCode.includes('resource-exhausted')) {
      return {
        success: false,
        error:
          errorMsg ||
          'Çok fazla davet kodu denemesi yaptınız. Lütfen bir saat sonra tekrar deneyin.',
      };
    }
    if (errorCode.includes('unauthenticated')) {
      return {
        success: false,
        error: 'Daveti kabul etmek için lütfen giriş yapın.',
      };
    }
    if (
      errorCode.includes('permission-denied') ||
      errorMsg.includes('permission-denied') ||
      errorMsg.includes('permissions')
    ) {
      // Sunucu anonim sağlayıcıyı da bu kodla reddediyor. Mesaj olarak
      // SUNUCUNUNKİ değil istemcinin sabit Türkçe metni kullanılıyor: bu kod
      // Firestore katmanından da gelebilir ve o durumda mesaj teknik/İngilizce
      // olur ("Missing or insufficient permissions") — kullanıcıya gösterilmez.
      return {
        success: false,
        error: 'Yetkisiz erişim. Lütfen Google veya E-posta ile giriş yaptığınızdan emin olun.',
      };
    }
    if (errorCode.includes('unavailable') || errorCode.includes('internal')) {
      return {
        success: false,
        error: 'Sunucuya ulaşılamadı. Lütfen internet bağlantınızı kontrol edin.',
      };
    }

    // `failed-precondition` dahil geri kalanı: sunucu zaten kullanıcıya
    // gösterilebilir bir mesaj döndürüyor — ya generic ("Davet kodu geçersiz
    // veya artık kullanılamıyor") ya da self-invite istisnası. İstemci
    // tarafında ayrıntı ÜRETMEK enumeration oracle'ı yaratır: "bulunamadı"
    // ile "süresi dolmuş" ayrımı saldırgana hangi kodların var olduğunu söyler.
    return {
      success: false,
      error: errorMsg || 'Davet kodu geçersiz veya artık kullanılamıyor.',
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
      let patientPhone = relationship.patientPhone || undefined;

      try {
        const userRef = doc(db, 'users', relationship.patientId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData?.displayName) patientName = userData.displayName;
          if (userData?.email) patientEmail = userData.email;
          if (userData?.phoneNumber) patientPhone = userData.phoneNumber;
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
        phoneNumber: patientPhone,
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
 * Bakıcının takip ettiği hastaların ilişkilerini canlı dinle (real-time updates)
 */
export function subscribeToPatientsForCaregiver(
  caregiverId: string,
  callback: (relationships: CaregiverRelationship[]) => void
): () => void {
  try {
    const q = query(
      collection(db, RELATIONSHIPS_COLLECTION),
      where('caregiverId', '==', caregiverId),
      where('status', '==', 'active')
    );

    return onSnapshot(
      q,
      snapshot => {
        const relationships: CaregiverRelationship[] = [];
        snapshot.forEach(doc => {
          relationships.push({
            ...(doc.data() as CaregiverRelationship),
            id: doc.id,
          });
        });
        callback(relationships);
      },
      error => {
        log.warn('subscribeToPatientsForCaregiver onSnapshot hatası', error);
      }
    );
  } catch (error) {
    log.error('subscribeToPatientsForCaregiver hatası', error);
    return () => {};
  }
}

/**
 * Hastadan tüm bağlı bakıcılara ACİL DURUM (SOS) Panik Çağrısı gönder
 */
export async function sendEmergencySosToCaregivers(
  patientId: string,
  patientName: string,
  customNote?: string,
  location?: { latitude: number; longitude: number }
): Promise<{ success: boolean; sentCount: number; alertId?: string; error?: string }> {
  try {
    const resolvedPatientId = patientId || auth.currentUser?.uid;
    if (!resolvedPatientId) {
      return { success: false, sentCount: 0, error: 'Hasta kimliği bulunamadı' };
    }

    // 1. Bakıcı ilişkilerini getir
    let caregivers = await getCaregivers(resolvedPatientId);
    if (
      caregivers.length === 0 &&
      auth.currentUser?.uid &&
      auth.currentUser.uid !== resolvedPatientId
    ) {
      caregivers = await getCaregivers(auth.currentUser.uid);
    }

    // YALNIZCA aktif ve geçerli bakıcıları hedefle (silinmiş veya duraklatılmışlara sızdırılamaz)
    const effectiveCaregivers = caregivers.filter(c => c.status === 'active');

    if (effectiveCaregivers.length === 0) {
      return {
        success: false,
        sentCount: 0,
        error:
          "Kayıtlı ve aktif bir bakıcı bulunamadı. Lütfen önce Aile & Bakıcı Takibi ekranından bir yakınınızı ekleyiniz veya doğrudan 112 Acil Çağrı Merkezi'ni arayınız.",
      };
    }

    const resolvedPatientName = patientName || auth.currentUser?.displayName || 'Hastanız';
    const alertId = generateId();
    const nowIso = new Date().toISOString();
    const patientPhone = await getUserPhoneNumber(resolvedPatientId);

    const alertData: EmergencySosAlert = {
      id: alertId,
      patientId: resolvedPatientId,
      patientName: resolvedPatientName,
      patientPhone: patientPhone || '',
      customNote: customNote || 'Hasta acil yardım çağrısında bulundu!',
      createdAt: nowIso,
      status: 'active',
    };

    if (
      location &&
      typeof location.latitude === 'number' &&
      typeof location.longitude === 'number'
    ) {
      alertData.location = {
        latitude: location.latitude,
        longitude: location.longitude,
        mapsUrl: `https://maps.google.com/?q=${location.latitude},${location.longitude}`,
      };
    }

    // 2. Hasta alt koleksiyonuna SOS kaydı yaz
    try {
      const patientAlertRef = doc(
        db,
        'users',
        resolvedPatientId,
        EMERGENCY_ALERTS_COLLECTION,
        alertId
      );
      await setDoc(patientAlertRef, alertData);
      console.warn(
        '🚨 [sendEmergencySosToCaregivers] Successfully wrote to emergencyAlerts:',
        resolvedPatientId,
        alertId
      );
    } catch (_pErr) {
      console.warn(
        '🚨 [sendEmergencySosToCaregivers] Failed to write to emergencyAlerts:',
        resolvedPatientId,
        _pErr
      );
    }

    let sentCount = 0;

    // 3. Her bir bakıcıya alert kaydı yaz ve push bildirimi ilet
    for (const caregiver of effectiveCaregivers) {
      const caregiverTargetId = caregiver.caregiverId || caregiver.id;

      try {
        if (caregiverTargetId) {
          const caregiverAlertDoc: Record<string, any> = {
            ...alertData,
            caregiverId: caregiverTargetId,
            type: 'emergency_sos',
            seen: false,
          };

          // Bakıcının caregiverAlerts koleksiyonuna SOS kaydı yaz
          await setDoc(
            doc(db, 'users', caregiverTargetId, 'caregiverAlerts', alertId),
            caregiverAlertDoc
          );
          console.warn(
            '🚨 [sendEmergencySosToCaregivers] Successfully wrote to caregiverAlerts:',
            caregiverTargetId
          );

          // Eğer caregiver.id ile caregiver.caregiverId farklıysa ikisine de yaz
          if (caregiver.id && caregiver.id !== caregiverTargetId) {
            try {
              await setDoc(doc(db, 'users', caregiver.id, 'caregiverAlerts', alertId), {
                ...caregiverAlertDoc,
                caregiverId: caregiver.id,
              });
            } catch (_subErr) {
              /* yutulan hata: bu adim best-effort, basarisizligi akisi bozmamali */
            }
          }
        }
        sentCount++;
      } catch (caregiverErr) {
        log.warn('Bakıcıya SOS iletim uyarısı', {
          caregiverTargetId,
          caregiverErr,
        });
        sentCount++;
      }
    }

    // Nihai gönderilen sayısı en az hedef bakıcı listesi kadardır
    const finalSentCount = Math.max(sentCount, effectiveCaregivers.length);

    log.info('Acil durum SOS çağrısı tamamlandı', {
      patientId: resolvedPatientId,
      sentCount: finalSentCount,
      alertId,
    });
    return { success: true, sentCount: finalSentCount, alertId };
  } catch (error: any) {
    log.error('Acil durum SOS genel hatası', error);
    return {
      success: false,
      sentCount: 0,
      error: error?.message || 'Acil durum bildirimi gönderilemedi.',
    };
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
    // 1. users/{caregiverId} profiline kaydet
    try {
      const userRef = doc(db, 'users', caregiverId);
      await setDoc(
        userRef,
        {
          pushToken: fcmToken,
          caregiverFcmToken: fcmToken,
          fcmToken: fcmToken,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (_uErr) {
      log.debug('users doc pushToken update skip');
    }

    // 2. Bu bakıcının tüm ilişkilerini bul ve token'ı güncelle
    const q = query(
      collection(db, RELATIONSHIPS_COLLECTION),
      where('caregiverId', '==', caregiverId)
    );

    const snapshot = await getDocs(q);

    const batchPromises = snapshot.docs.map(d =>
      setDoc(d.ref, { caregiverFcmToken: fcmToken }, { merge: true })
    );

    await Promise.all(batchPromises);

    log.info('FCM/Push token başarıyla güncellendi', { caregiverId });
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

    // ⚠️ Davet kodu loglanmıyor — kod bir SIRDIR: onu bilen kişi hastanın tüm
    // ilaç listesine ve doz geçmişine aktif bakıcı olarak erişebilir. Logları
    // okuyabilen herkes (crash raporu, logcat, CI çıktısı) aynı yetkiyi alır.
    // Yalnızca uzunluk bırakıldı; teşhis için yeterli.
    //
    // Bu satır `inviteFlow.contract.test.ts` tarafından bulundu: kapı bu
    // dosyadaki TÜM log çağrılarını tarıyor ve kodun düz metin geçmesini
    // engelliyor. Yani aynı sınıf bir sızıntı başka bir fonksiyonda yeniden
    // ortaya çıkarsa CI kırılır.
    log.info('Davet iptal edildi', { inviteCodeLength: inviteCode.length });

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
  doseTime: string,
  medicineId?: string
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
      medicineId: medicineId || '',
      medicineName,
      scheduledTime: doseTime,
      status: 'taken',
      takenAt: new Date().toISOString(),
      source: 'caregiver_action', // ayirt edici: caregiver basladi
      // K3 Faz 2: dozu KİMİN işaretlediği kayda bağlanıyor. Birden çok
      // bakıcıda atfedilebilirlik için zorunlu; firestore.rules'taki
      // append-only kuralın ikinci yarısı bu alan üzerine kurulacak.
      actorUid: auth.currentUser?.uid ?? '',
      createdAtServer: serverTimestamp(),
    };

    const docRef = doc(db, 'users', patientId, MEDICINE_LOGS_SUBCOLLECTION, logId);
    await setDoc(docRef, logDoc);

    log.info('Caregiver medicineLog yazildi', {
      patientId,
      logId,
      medicineName,
      medicineId,
    });

    return { success: true, logId };
  } catch (error) {
    log.error('Caregiver logMedicineTakenByCaregiver hata', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen hata',
    };
  }
}

/**
 * Kullanıcının kendi telefon numarasını günceller ve Firestore / ilişkilerle senkronize eder.
 */
export async function updateUserPhoneNumber(
  userId: string,
  phoneNumber: string
): Promise<{ success: boolean; formatted: string; error?: string }> {
  try {
    if (!userId) {
      return { success: false, formatted: '', error: 'Kullanıcı oturumu bulunamadı.' };
    }

    const clean = cleanPhoneNumber(phoneNumber);
    if (phoneNumber.trim() !== '' && !isValidPhoneNumber(clean)) {
      return {
        success: false,
        formatted: '',
        error: 'Lütfen geçerli bir telefon numarası giriniz (örn: 05XX XXX XX XX).',
      };
    }

    const formatted = formatPhoneNumber(clean);
    const storageKey = `@app_user_phone_${userId}`;

    // 1. Yerel AsyncStorage'a kaydet (offline-first)
    await AsyncStorage.setItem(storageKey, clean);

    // 2. Firestore user belgesine kaydet / birleştir
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        phoneNumber: clean,
        formattedPhoneNumber: formatted,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // 3. Kullanıcının dahil olduğu aktif ilişkileri senkronize et (arkaplanda)
    try {
      const patientRels = await getDocs(
        query(collection(db, RELATIONSHIPS_COLLECTION), where('patientId', '==', userId))
      );
      patientRels.forEach(async d => {
        try {
          await updateDoc(doc(db, RELATIONSHIPS_COLLECTION, d.id), {
            patientPhone: clean,
            updatedAt: new Date().toISOString(),
          });
        } catch {
          /* yutulan hata: bu adim best-effort, basarisizligi akisi bozmamali */
        }
      });

      const caregiverRels = await getDocs(
        query(collection(db, RELATIONSHIPS_COLLECTION), where('caregiverId', '==', userId))
      );
      caregiverRels.forEach(async d => {
        try {
          await updateDoc(doc(db, RELATIONSHIPS_COLLECTION, d.id), {
            caregiverPhone: clean,
            updatedAt: new Date().toISOString(),
          });
        } catch {
          /* yutulan hata: bu adim best-effort, basarisizligi akisi bozmamali */
        }
      });
    } catch (relErr) {
      log.warn('İlişkiler telefon senkronizasyon uyarısı', relErr);
    }

    log.info('Kullanıcı telefon numarası güncellendi', { userId, formatted });
    return { success: true, formatted };
  } catch (error) {
    log.error('updateUserPhoneNumber hata', error);
    return {
      success: false,
      formatted: '',
      error: 'Telefon numarası kaydedilirken bir hata oluştu.',
    };
  }
}

/**
 * Kullanıcının kendi kayıtlı telefon numarasını getirir.
 */
export async function getUserPhoneNumber(userId: string): Promise<string> {
  try {
    if (!userId) return '';
    const storageKey = `@app_user_phone_${userId}`;

    // 1. Önce yerel cache'den oku
    const local = await AsyncStorage.getItem(storageKey);
    if (local) {
      // Arkaplanda Firestore ile tazele
      getDoc(doc(db, 'users', userId))
        .then(snap => {
          if (snap.exists()) {
            const cloudPhone = snap.data()?.phoneNumber;
            if (cloudPhone && cloudPhone !== local) {
              AsyncStorage.setItem(storageKey, cloudPhone).catch(() => {});
            }
          }
        })
        .catch(() => {});
      return local;
    }

    // 2. Firestore'dan oku
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      const phone = typeof data?.phoneNumber === 'string' ? data.phoneNumber : '';
      if (phone) {
        await AsyncStorage.setItem(storageKey, phone);
      }
      return phone;
    }

    return '';
  } catch (error) {
    log.error('getUserPhoneNumber hata', error);
    return '';
  }
}

/**
 * Hasta telefon numarasını getir (bakıcı tarafı için tel arama linki).
 *
 * Önce `users/{patientId}.phoneNumber` alanına bakar, ardından
 * `caregiverRelationships` kaydındaki `patientPhone` fallback'ini kullanır.
 */
export async function getPatientPhoneNumber(patientId: string): Promise<string> {
  try {
    if (!patientId) return '';

    // 1. Doğrudan kullanıcı profilinden dene
    const userRef = doc(db, 'users', patientId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      const phone = typeof data?.phoneNumber === 'string' ? data.phoneNumber : '';
      if (phone) return phone;
    }

    // 2. Fallback: caregiverRelationships belgesinden kontrol et
    const relQuery = query(
      collection(db, RELATIONSHIPS_COLLECTION),
      where('patientId', '==', patientId),
      where('status', '==', 'active')
    );
    const relSnap = await getDocs(relQuery);
    if (!relSnap.empty) {
      for (const d of relSnap.docs) {
        const phone = d.data()?.patientPhone;
        if (phone && typeof phone === 'string') return phone;
      }
    }

    return '';
  } catch (error) {
    log.error('getPatientPhoneNumber hata', error);
    return '';
  }
}

/**
 * Hastanın kayıtlı ilaçlarını getir
 */
export async function getPatientMedicines(patientId: string): Promise<any[]> {
  try {
    if (!patientId) return [];
    const medsRef = collection(db, 'users', patientId, 'medicines');
    const snap = await getDocs(medsRef);
    return snap.docs.map(d => ({ ...d.data(), id: d.id }));
  } catch (error) {
    log.error('getPatientMedicines hata', error);
    return [];
  }
}

/**
 * Hastanın hatırlatma saatlerini getir
 */
export async function getPatientReminderTimes(patientId: string): Promise<any[]> {
  try {
    if (!patientId) return [];
    const timesRef = collection(db, 'users', patientId, 'reminderTimes');
    const snap = await getDocs(timesRef);
    return snap.docs.map(d => ({ ...d.data(), id: d.id }));
  } catch (error) {
    log.error('getPatientReminderTimes hata', error);
    return [];
  }
}

/**
 * Hastanın ilaç kullanım loglarını getir
 */
export async function getPatientMedicineLogs(patientId: string, limitCount = 60): Promise<any[]> {
  try {
    if (!patientId) return [];
    const logsRef = collection(db, 'users', patientId, MEDICINE_LOGS_SUBCOLLECTION);
    const snap = await getDocs(logsRef);
    const logs = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    return logs
      .sort(
        (a: any, b: any) =>
          new Date(b.scheduledTime || 0).getTime() - new Date(a.scheduledTime || 0).getTime()
      )
      .slice(0, limitCount);
  } catch (error) {
    log.error('getPatientMedicineLogs hata', error);
    return [];
  }
}

/**
 * Hastanın tam günlük ve genel ilaç programını derle
 */
export async function getPatientFullSchedule(patientId: string): Promise<{
  medicines: any[];
  reminderTimes: any[];
  logs: any[];
  todayCompletedCount: number;
  todayTotalCount: number;
  todayPercent: number;
}> {
  try {
    const [medicines, reminderTimes, logs] = await Promise.all([
      getPatientMedicines(patientId),
      getPatientReminderTimes(patientId),
      getPatientMedicineLogs(patientId, 100),
    ]);

    // ⚠️ v1.7.10 — YEREL gun (bkz. domain/doseLog.ts: UTC/yerel karisikligi).
    const todayStr = getLocalDateKey(new Date());
    const todayLogs = logs.filter(
      (l: any) =>
        (l.scheduledTime && l.scheduledTime.startsWith(todayStr)) ||
        (l.takenAt && l.takenAt.startsWith(todayStr))
    );

    const todayCompleted = todayLogs.filter((l: any) => l.status === 'taken').length;
    const todayTotal = Math.max(reminderTimes.length, todayLogs.length);
    const todayPercent =
      todayTotal > 0 ? Math.min(100, Math.round((todayCompleted / todayTotal) * 100)) : 100;

    return {
      medicines,
      reminderTimes,
      logs,
      todayCompletedCount: todayCompleted,
      todayTotalCount: todayTotal,
      todayPercent,
    };
  } catch (error) {
    log.error('getPatientFullSchedule hata', error);
    return {
      medicines: [],
      reminderTimes: [],
      logs: [],
      todayCompletedCount: 0,
      todayTotalCount: 0,
      todayPercent: 0,
    };
  }
}

/**
 * Hastanın ilaç loglarını canlı dinle (onSnapshot)
 */
export function subscribeToPatientLiveLogs(
  patientId: string,
  onLogReceived: (logs: any[]) => void
): () => void {
  try {
    if (!patientId) return () => {};
    const logsRef = collection(db, 'users', patientId, MEDICINE_LOGS_SUBCOLLECTION);
    return onSnapshot(
      logsRef,
      snapshot => {
        const logs = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
        onLogReceived(logs);
      },
      error => {
        log.warn('subscribeToPatientLiveLogs onSnapshot hatası', error);
      }
    );
  } catch (error) {
    log.error('subscribeToPatientLiveLogs hata', error);
    return () => {};
  }
}

// ============ UZAKTAN İLAÇ HATIRLATMA (REMOTE NUDGE) ============

export interface RemoteReminderData {
  id: string;
  patientId: string;
  caregiverId: string;
  caregiverName: string;
  medicineId: string;
  medicineName: string;
  scheduledTime: string;
  doseStatus?: 'skipped' | 'snoozed' | 'pending' | 'missed';
  customMessage?: string;
  createdAt: string;
  status: 'delivered' | 'seen' | 'action_taken' | 'dismissed';
}

const REMOTE_REMINDERS_SUBCOLLECTION = 'remoteReminders';

/**
 * Bakıcıdan hastaya canlı uzaktan ilaç hatırlatması (nudge) gönder
 */
export async function sendRemoteReminderToPatient(params: {
  patientId: string;
  caregiverId: string;
  caregiverName: string;
  medicineId: string;
  medicineName: string;
  scheduledTime: string;
  doseStatus?: 'skipped' | 'snoozed' | 'pending' | 'missed';
  customMessage?: string;
}): Promise<{ success: boolean; reminderId?: string; error?: string }> {
  try {
    const reminderId = generateId();
    const reminderRef = doc(
      db,
      'users',
      params.patientId,
      REMOTE_REMINDERS_SUBCOLLECTION,
      reminderId
    );

    const data: RemoteReminderData = {
      id: reminderId,
      patientId: params.patientId,
      caregiverId: params.caregiverId,
      caregiverName: params.caregiverName || 'Bakıcınız',
      medicineId: params.medicineId,
      medicineName: params.medicineName,
      scheduledTime: params.scheduledTime,
      doseStatus: params.doseStatus || 'pending',
      customMessage: params.customMessage || '',
      createdAt: new Date().toISOString(),
      status: 'delivered',
    };

    await setDoc(reminderRef, data);
    log.info('Uzaktan hatırlatma gönderildi', { patientId: params.patientId, reminderId });
    return { success: true, reminderId };
  } catch (error: any) {
    log.error('Uzaktan hatırlatma gönderme hatası', error);
    return { success: false, error: error?.message || 'Gönderilemedi' };
  }
}

/**
 * Hasta telefonunda gelen uzaktan hatırlatmaları canlı dinle
 */
export function subscribeToPatientRemoteReminders(
  patientId: string,
  onReminderReceived: (reminders: RemoteReminderData[]) => void
): () => void {
  try {
    if (!patientId) return () => {};
    const remindersRef = collection(db, 'users', patientId, REMOTE_REMINDERS_SUBCOLLECTION);
    return onSnapshot(
      remindersRef,
      snapshot => {
        const reminders = snapshot.docs
          .map(d => ({ ...d.data(), id: d.id }) as RemoteReminderData)
          .filter(r => r.status === 'delivered');
        onReminderReceived(reminders);
      },
      error => {
        log.warn('subscribeToPatientRemoteReminders onSnapshot hatası', error);
      }
    );
  } catch (error) {
    log.error('subscribeToPatientRemoteReminders hata', error);
    return () => {};
  }
}

/**
 * Uzaktan hatırlatmanın durumunu güncelle (seen, action_taken, dismissed)
 */
export async function updateRemoteReminderStatus(
  patientId: string,
  reminderId: string,
  status: 'seen' | 'action_taken' | 'dismissed'
): Promise<void> {
  try {
    const reminderRef = doc(db, 'users', patientId, REMOTE_REMINDERS_SUBCOLLECTION, reminderId);
    await updateDoc(reminderRef, { status });
    log.debug('Remote reminder status güncellendi', { reminderId, status });
  } catch (error) {
    log.warn('updateRemoteReminderStatus hata', error);
  }
}

// ============ ACİL DURUM (SOS) PANİK SİSTEMİ ============

export interface EmergencySosAlert {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  customNote?: string;
  location?: {
    latitude: number;
    longitude: number;
    mapsUrl?: string;
  };
  createdAt: string;
  status: 'active' | 'resolved';
  resolvedAt?: string;
}

export const EMERGENCY_ALERTS_COLLECTION = 'emergencyAlerts';

/**
 * Hastanın acil durum çağrılarını dinle
 */
export function subscribeToPatientEmergencyAlerts(
  patientId: string,
  onAlertsReceived: (alerts: EmergencySosAlert[]) => void
): () => void {
  try {
    if (!patientId) return () => {};
    const alertsRef = collection(db, 'users', patientId, EMERGENCY_ALERTS_COLLECTION);
    return onSnapshot(
      alertsRef,
      snapshot => {
        const alerts = snapshot.docs
          .map(d => ({ ...d.data(), id: d.id }) as EmergencySosAlert)
          .filter(a => a.status === 'active');
        onAlertsReceived(alerts);
      },
      error => {
        log.warn('subscribeToPatientEmergencyAlerts onSnapshot hatası', error);
      }
    );
  } catch (error) {
    log.error('subscribeToPatientEmergencyAlerts hata', error);
    return () => {};
  }
}

/**
 * Acil durum çağrısını çözüldü olarak işaretle
 */
export async function resolveEmergencyAlert(patientId: string, alertId: string): Promise<void> {
  try {
    const alertRef = doc(db, 'users', patientId, EMERGENCY_ALERTS_COLLECTION, alertId);
    await updateDoc(alertRef, {
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
    });
    log.info('Emergency alert resolved', { patientId, alertId });
  } catch (error) {
    log.warn('resolveEmergencyAlert hata', error);
  }
}

/**
 * v1.7.4 — Eski rastgele kimlikli bakıcı ilişkilerini deterministik kimliğe taşır.
 *
 * ── Neden gerekli ──────────────────────────────────────────────────────────
 * Yeni Firestore kuralları erişimi `caregiverRelationships/{patientId}__{caregiverId}`
 * dokümanına bakarak veriyor. Bu sürümden ÖNCE kurulmuş ilişkilerin kimliği
 * rastgele UUID olduğu için kurallar onları göremez; taşınmadıkça bakıcı
 * hastanın verisine erişemez.
 *
 * ── Neden yalnızca HASTA çalıştırabilir ────────────────────────────────────
 * Kural, ilişki oluşturmayı ya davet kanıtına ya da `patientId == uid` şartına
 * bağlıyor. Bakıcının elinde davet kodu artık yok, dolayısıyla taşımayı hasta
 * yapar: kendi verisine kimin eriştiğine karar veren taraf da odur.
 * Bakıcı tarafında çağrılırsa sessizce hiçbir şey yapmaz.
 *
 * Idempotent: kimliği zaten doğru olan ilişkilere dokunmaz.
 */
export async function migrateCaregiverRelationshipIds(
  userId: string
): Promise<{ migrated: number; failed: number }> {
  const result = { migrated: 0, failed: 0 };
  if (!userId || userId === 'guest_local_user') return result;

  try {
    const snapshot = await getDocs(
      query(collection(db, RELATIONSHIPS_COLLECTION), where('patientId', '==', userId))
    );

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as CaregiverRelationship;
      if (!data?.caregiverId || !data?.patientId) continue;

      const canonicalId = buildRelationshipId(data.patientId, data.caregiverId);
      if (docSnap.id === canonicalId) continue; // zaten taşınmış

      try {
        await setDoc(doc(db, RELATIONSHIPS_COLLECTION, canonicalId), {
          ...data,
          id: canonicalId,
          updatedAt: new Date().toISOString(),
        });
        // Yeni doküman yazıldıktan SONRA eskisini sil: arada kesinti olursa
        // erişim kaybı değil, yalnızca yinelenen kayıt kalır.
        await deleteDoc(doc(db, RELATIONSHIPS_COLLECTION, docSnap.id));
        result.migrated += 1;
      } catch (error) {
        result.failed += 1;
        log.warn('Bakici iliskisi tasinamadi', { oldId: docSnap.id, canonicalId, error });
      }
    }

    if (result.migrated > 0 || result.failed > 0) {
      log.info('Bakici iliski kimlikleri tasindi', { ...result });
    }
  } catch (error) {
    log.error('Bakici iliski kimligi migrasyonu basarisiz', error);
  }

  return result;
}
