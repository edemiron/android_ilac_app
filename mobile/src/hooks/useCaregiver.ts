/**
 * Caregiver Mode Hook
 *
 * Bakıcı yönetimi için React hook
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createScopedLogger } from '../utils/logger';
import type { CaregiverRelationship, CaregiverInvite, PatientInfo } from '../types';
import {
  createCaregiverInvite,
  getCaregivers,
  removeCaregiver,
  updateCaregiverRelationship,
  getPendingInvites,
  cancelInvite,
  subscribeToCaregivers,
  getPatientsForCaregiver,
  acceptCaregiverInvite,
} from '../services/caregiverService';
import { createQRCodeData } from '../services/qrCodeService';

const log = createScopedLogger('useCaregiver');

export interface UseCaregiverResult {
  // State
  caregivers: CaregiverRelationship[];
  pendingInvites: CaregiverInvite[];
  patients: PatientInfo[];
  isLoading: boolean;

  // QR Code
  qrCodeData: string | null;
  showQRModal: boolean;

  // Actions
  createInvite: (
    email: string,
    permissions?: {
      canViewSchedule: boolean;
      canViewHistory: boolean;
      canReceiveAlerts: boolean;
    }
  ) => Promise<{ success: boolean; inviteCode?: string; error?: string }>;

  acceptInvite: (inviteCode: string) => Promise<{ success: boolean; error?: string }>;

  removeCaregiverRel: (relationshipId: string) => Promise<{ success: boolean }>;
  removePatientRel: (relationshipId: string) => Promise<{ success: boolean; error?: string }>;

  updatePermissions: (
    relationshipId: string,
    permissions: {
      canViewSchedule: boolean;
      canViewHistory: boolean;
      canReceiveAlerts: boolean;
    }
  ) => Promise<void>;

  cancelInviteRel: (inviteCode: string) => Promise<{ success: boolean }>;

  showQRCode: (inviteCode: string) => void;
  hideQRCode: () => void;

  refresh: () => Promise<void>;
}

/**
 * Bakıcı modu hook'u
 */
export function useCaregiver(): UseCaregiverResult {
  const { user } = useAuth();
  const [caregivers, setCaregivers] = useState<CaregiverRelationship[]>([]);
  const [pendingInvites, setPendingInvites] = useState<CaregiverInvite[]>([]);
  const [patients, setPatients] = useState<PatientInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);

  const userId = user?.uid;
  const isGuest = !userId || userId === 'guest_local_user';

  // Bakıcıları yükle (Beni takip edenler)
  const loadCaregivers = useCallback(async () => {
    if (isGuest || !userId) {
      setCaregivers([]);
      return;
    }

    setIsLoading(true);
    try {
      const data = await getCaregivers(userId);
      setCaregivers(data);
    } catch (error) {
      log.error('Bakıcılar yüklenemedi', error);
    } finally {
      setIsLoading(false);
    }
  }, [isGuest, userId]);

  // Bekleyen davetleri yükle
  const loadPendingInvites = useCallback(async () => {
    if (isGuest || !userId) {
      setPendingInvites([]);
      return;
    }

    try {
      const data = await getPendingInvites(userId);
      setPendingInvites(data);
    } catch (error) {
      log.error('Davetler yüklenemedi', error);
    }
  }, [isGuest, userId]);

  // Takip ettiğim hastaları yükle (Bakıcı olduğum kişiler)
  const loadPatients = useCallback(async () => {
    if (isGuest || !userId) {
      setPatients([]);
      return;
    }

    try {
      const data = await getPatientsForCaregiver(userId);
      setPatients(data);
    } catch (error) {
      log.error('Hastalar yüklenemedi', error);
    }
  }, [isGuest, userId]);

  // Refresh
  const refresh = useCallback(async () => {
    await Promise.all([loadCaregivers(), loadPendingInvites(), loadPatients()]);
  }, [loadCaregivers, loadPendingInvites, loadPatients]);

  // İlk yükleme
  useEffect(() => {
    loadCaregivers();
    loadPendingInvites();
    loadPatients();
  }, [loadCaregivers, loadPendingInvites, loadPatients]);

  // Real-time updates
  useEffect(() => {
    if (isGuest || !userId) return;

    const unsubscribe = subscribeToCaregivers(userId, data => {
      setCaregivers(data);
    });

    return () => {
      unsubscribe();
    };
  }, [isGuest, userId]);

  // Davet oluştur
  const createInvite = useCallback(
    async (
      email: string,
      permissions = {
        canViewSchedule: true,
        canViewHistory: true,
        canReceiveAlerts: true,
      }
    ) => {
      if (isGuest || !userId) {
        return {
          success: false,
          error:
            'Aile & Bakıcı Takibi bulut senkronizasyonu gerektirir. Lütfen Google veya E-posta ile giriş yapın.',
        };
      }

      const result = await createCaregiverInvite(
        userId,
        user?.displayName || 'Hasta',
        email,
        permissions
      );

      if (result.success && result.inviteCode) {
        // Davet listesini yenile
        await loadPendingInvites();
      }

      return result;
    },
    [isGuest, userId, user?.displayName, loadPendingInvites]
  );

  // Davet kabul et (Bakıcı olarak bir hastaya bağlan)
  const acceptInvite = useCallback(
    async (inviteCode: string) => {
      if (isGuest || !userId) {
        return {
          success: false,
          error:
            'Aile takibine katılmak bulut senkronizasyonu gerektirir. Lütfen Google veya E-posta ile giriş yapın.',
        };
      }

      const result = await acceptCaregiverInvite(
        inviteCode,
        userId,
        user?.displayName || 'Bakıcı',
        ''
      );

      if (result.success) {
        await loadPatients();
      }

      return result;
    },
    [isGuest, userId, user?.displayName, loadPatients]
  );

  // Bakıcı kaldır (Beni takip eden bakıcıyı sil)
  const removeCaregiverRel = useCallback(
    async (relationshipId: string) => {
      const result = await removeCaregiver(relationshipId);

      if (result.success) {
        await loadCaregivers();
      }

      return result;
    },
    [loadCaregivers]
  );

  // Takip edilen hastayı kaldır (Bakıcı olarak takipten ayrıl)
  const removePatientRel = useCallback(
    async (relationshipId: string) => {
      const result = await removeCaregiver(relationshipId);

      if (result.success) {
        await loadPatients();
      }

      return result;
    },
    [loadPatients]
  );

  // Yetkileri güncelle
  const updatePermissions = useCallback(
    async (
      relationshipId: string,
      permissions: {
        canViewSchedule: boolean;
        canViewHistory: boolean;
        canReceiveAlerts: boolean;
      }
    ) => {
      await updateCaregiverRelationship(relationshipId, permissions);
      await loadCaregivers();
    },
    [loadCaregivers]
  );

  // Davet iptal
  const cancelInviteRel = useCallback(
    async (inviteCode: string) => {
      const result = await cancelInvite(inviteCode);

      if (result.success) {
        await loadPendingInvites();
      }

      return result;
    },
    [loadPendingInvites]
  );

  // QR kod göster
  const showQRCode = useCallback((inviteCode: string) => {
    const qrData = createQRCodeData(inviteCode);
    setQrCodeData(qrData);
    setShowQRModal(true);
  }, []);

  // QR kod gizle
  const hideQRCode = useCallback(() => {
    setShowQRModal(false);
    setQrCodeData(null);
  }, []);

  return {
    caregivers,
    pendingInvites,
    patients,
    isLoading,
    qrCodeData,
    showQRModal,
    createInvite,
    acceptInvite,
    removeCaregiverRel,
    removePatientRel,
    updatePermissions,
    cancelInviteRel,
    showQRCode,
    hideQRCode,
    refresh,
  };
}
